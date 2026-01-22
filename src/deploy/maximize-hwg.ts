import { NS } from "@ns";

const DEFAULTS = {
  refreshMs: 10000,
  maxDepth: 5,
  verbose: true,
  mode: "xp",
  buyBudgetRatio: 0.2,
  maxPurchaseRam: 0,
  prefix: "server",
  upgradeCooldown: 60000, // Only upgrade every 60 seconds
  exportLogs: false, // Set to true to export logs to JSON
};

export async function main(ns: NS) {
  const refreshMs = Number(ns.args[0] ?? DEFAULTS.refreshMs);
  const maxDepth = Number(ns.args[1] ?? DEFAULTS.maxDepth);
  const verbose = String(ns.args[2] ?? "true") !== "false";
  const mode = String(ns.args[3] ?? DEFAULTS.mode);
  const buyBudgetRatio = Number(ns.args[4] ?? DEFAULTS.buyBudgetRatio);
  const maxPurchaseRam = Number(ns.args[5] ?? DEFAULTS.maxPurchaseRam);
  const prefix = String(ns.args[6] ?? DEFAULTS.prefix);
  const exportLogs = String(ns.args[7] ?? "false") === "true";

  const logEntries: any[] = [];

  ns.disableLog("scan");
  ns.disableLog("sleep");
  ns.disableLog("getServerMaxRam");
  ns.disableLog("getServerUsedRam");
  ns.disableLog("getServerNumPortsRequired");
  ns.disableLog("getServerRequiredHackingLevel");
  ns.disableLog("getServerMaxMoney");
  ns.disableLog("getHackingLevel");

  const weakenScript = "workers/weaken-only.js";
  const growScript = "workers/grow-only.js";
  const hackScript = "workers/hack-only.js";

  const weakenRam = ns.getScriptRam(weakenScript);
  const growRam = ns.getScriptRam(growScript);
  const hackRam = ns.getScriptRam(hackScript);
  const minUsefulRam = weakenRam + growRam;

  let lastUpgradeTime = 0;

  while (true) {
    let purchased = ns.getPurchasedServers();
    const targets = findHackableTargets(ns, purchased, maxDepth, false, mode);
    const serverLimit = ns.getPurchasedServerLimit();

    if (verbose) {
      ns.print("=".repeat(60));
      ns.print(`Cycle | Targets: ${targets.length} | Servers: ${purchased.length}/${serverLimit}`);
      ns.print("=".repeat(60));
    }

    // Phase 1: Always try to buy servers until we reach the limit (25)
    const minRam = smallestPowerOfTwoAtLeast(Math.max(weakenRam, growRam));
    
    while (purchased.length < serverLimit) {
      const availableMoney = ns.getServerMoneyAvailable("home");
      const cost = ns.getPurchasedServerCost(minRam);

      if (availableMoney < cost) {
        if (verbose && purchased.length < serverLimit) {
          ns.print(`[Buy] Cannot afford min server (need $${ns.formatNumber(cost, 2)}, have $${ns.formatNumber(availableMoney, 2)})`);
        }
        break;
      }

      const name = nextServerName(ns, prefix, purchased);
      const ramToBuy = maxPurchaseRam && maxPurchaseRam >= minRam
        ? Math.min(maxPurchaseRam, ns.getPurchasedServerMaxRam())
        : bestAffordableRam(ns, minRam, buyBudgetRatio);

      const serverCost = ns.getPurchasedServerCost(ramToBuy);
      if (serverCost > availableMoney * buyBudgetRatio) {
        if (verbose) {
          ns.print(`[Buy] Would exceed budget (${Math.round(buyBudgetRatio * 100)}% of $${ns.formatNumber(availableMoney, 2)})`);
        }
        break;
      }

      if (verbose) {
        ns.print(`[Buy] ${name}: ${ns.formatRam(ramToBuy)} for $${ns.formatNumber(serverCost, 2)}`);
      }

      const newServer = ns.purchaseServer(name, ramToBuy);
      if (!newServer) {
        if (verbose) {
          ns.print(`[Buy] Failed to purchase ${name}`);
        }
        break;
      }
      purchased = ns.getPurchasedServers();
    }

    // Phase 2: Upgrade servers (check every upgradeCooldown ms)
    const now = Date.now();
    const upgradeBudgetRatio = Math.max(buyBudgetRatio * 2.5, 0.5);
    const availableMoney = ns.getServerMoneyAvailable("home");
    
    // Only check for upgrades if cooldown has passed
    if (now - lastUpgradeTime > DEFAULTS.upgradeCooldown) {
      // First: Replace too-small servers (always do this if we can)
      const tooSmall = purchased.filter((s) => ns.getServerMaxRam(s) < minUsefulRam);
      for (const smallServer of tooSmall) {
        const smallRam = ns.getServerMaxRam(smallServer);
        const bestAffordable = bestAffordableRam(ns, minUsefulRam, upgradeBudgetRatio);
        const cost = ns.getPurchasedServerCost(bestAffordable);

        if (bestAffordable > smallRam && cost <= availableMoney * upgradeBudgetRatio) {
          if (verbose) {
            ns.print(`[Replace] ${smallServer}: ${ns.formatRam(smallRam)} -> ${ns.formatRam(bestAffordable)} ($${ns.formatNumber(cost, 2)})`);
          }

          ns.ps(smallServer).forEach((p) => ns.kill(p.pid));
          if (ns.deleteServer(smallServer)) {
            await ns.sleep(100);
            const newServer = ns.purchaseServer(smallServer, bestAffordable);
            if (newServer) {
              purchased = ns.getPurchasedServers();
              lastUpgradeTime = now;
              if (verbose) ns.print(`  ✓ Replaced`);
            }
          }
          break; // Only replace one at a time
        }
      }

      // Second: Upgrade weakest server if all are usable (only if at limit)
      if (tooSmall.length === 0 && purchased.length === serverLimit) {
        const usable = purchased.filter((s) => ns.getServerMaxRam(s) >= minUsefulRam);
        if (usable.length === purchased.length && usable.length > 0) {
          const weakest = purchased.reduce((w, s) =>
            ns.getServerMaxRam(s) < ns.getServerMaxRam(w) ? s : w
          );
          const weakestRam = ns.getServerMaxRam(weakest);
          const bestAffordable = bestAffordableRam(ns, weakestRam + 1, upgradeBudgetRatio);
          const cost = ns.getPurchasedServerCost(bestAffordable);

          // Upgrade if at least 2x better and affordable
          if (bestAffordable > weakestRam * 2 && cost <= availableMoney * upgradeBudgetRatio) {
            if (verbose) {
              ns.print(`[Upgrade] ${weakest}: ${ns.formatRam(weakestRam)} -> ${ns.formatRam(bestAffordable)} ($${ns.formatNumber(cost, 2)})`);
            }

            ns.ps(weakest).forEach((p) => ns.kill(p.pid));
            if (ns.deleteServer(weakest)) {
              await ns.sleep(100);
              const newServer = ns.purchaseServer(weakest, bestAffordable);
              if (newServer) {
                purchased = ns.getPurchasedServers();
                lastUpgradeTime = now;
                if (verbose) ns.print(`  ✓ Upgraded`);
              }
            }
          } else if (verbose && bestAffordable > weakestRam) {
            const nextUpgradeRam = smallestPowerOfTwoAtLeast(weakestRam * 2);
            const nextCost = ns.getPurchasedServerCost(nextUpgradeRam);
            if (nextCost <= availableMoney * upgradeBudgetRatio * 1.5) {
              ns.print(`[Upgrade] ${weakest} (${ns.formatRam(weakestRam)}): Need $${ns.formatNumber(nextCost, 2)} for ${ns.formatRam(nextUpgradeRam)} upgrade`);
            }
          }
        }
      }
    } else if (verbose && purchased.length === serverLimit) {
      const timeLeft = Math.ceil((DEFAULTS.upgradeCooldown - (now - lastUpgradeTime)) / 1000);
      if (timeLeft < 10) {
        ns.print(`[Upgrade] Cooldown: ${timeLeft}s remaining`);
      }
    }

    if (targets.length === 0) {
      if (verbose) ns.print("No targets found.");
      await ns.sleep(refreshMs);
      continue;
    }

    // Refresh server list
    purchased = ns.getPurchasedServers();
    const stats = { weaken: 0, grow: 0, hack: 0, skipped: 0, killed: 0 };

    // Phase 3: Deploy to owned servers - each server checks its own target's phase
    const sortedServers = [...purchased].sort(
      (a, b) => ns.getServerMaxRam(b) - ns.getServerMaxRam(a)
    );

    for (let i = 0; i < sortedServers.length; i++) {
      const server = sortedServers[i];
      const maxRam = ns.getServerMaxRam(server);
      const target = targets[i % targets.length];

      // Get current processes
      const allProcs = ns.ps(server);
      const ourProcs = allProcs.filter(
        (p) => p.filename === weakenScript || p.filename === growScript || p.filename === hackScript
      );
      const otherProcs = allProcs.filter(
        (p) => p.filename !== weakenScript && p.filename !== growScript && p.filename !== hackScript
      );

      // Calculate other scripts RAM
      const otherProcsRam = otherProcs.reduce(
        (sum, p) => sum + ns.getScriptRam(p.filename) * p.threads,
        0
      );
      const freeRam = maxRam - otherProcsRam;

      // Check target's security level to determine phase for THIS target
      const secLevel = ns.getServerSecurityLevel(target);
      const minSec = ns.getServerMinSecurityLevel(target);
      const secBuffer = 2.0; // Small buffer to account for security increases
      const targetNeedsWeaken = secLevel > minSec + secBuffer;
      const phase = targetNeedsWeaken ? "weaken" : "balanced";

      // Check what we're currently running
      const currentWeaken = ourProcs.find(
        (p) => p.filename === weakenScript && String(p.args[0]) === target
      );
      const currentGrow = ourProcs.find(
        (p) => p.filename === growScript && String(p.args[0]) === target
      );
      const currentHack = ourProcs.find(
        (p) => p.filename === hackScript && String(p.args[0]) === target
      );

      // Calculate threads based on THIS target's phase
      let weakenThreads = 0;
      let growThreads = 0;
      let hackThreads = 0;

      if (phase === "weaken") {
        // Phase 1: Only weaken - use all RAM
        weakenThreads = Math.floor(freeRam / weakenRam);
      } else {
        // Phase 2: Balanced 40/40/20 ratio
        if (freeRam >= minUsefulRam) {
          // Allocate 40% weaken, 40% grow, 20% hack
          const weakenRamAlloc = Math.floor(freeRam * 0.4);
          const growRamAlloc = Math.floor(freeRam * 0.4);
          const hackRamAlloc = freeRam - weakenRamAlloc - growRamAlloc;

          weakenThreads = Math.floor(weakenRamAlloc / weakenRam);
          growThreads = Math.floor(growRamAlloc / growRam);
          hackThreads = Math.floor(hackRamAlloc / hackRam);

          // Use any remaining RAM
          const usedRam = weakenThreads * weakenRam + growThreads * growRam + hackThreads * hackRam;
          const remainingRam = freeRam - usedRam;
          
          // Distribute remaining RAM proportionally
          if (remainingRam >= weakenRam) {
            weakenThreads += Math.floor(remainingRam * 0.4 / weakenRam);
          }
          if (remainingRam >= growRam) {
            growThreads += Math.floor(remainingRam * 0.4 / growRam);
          }
          if (remainingRam >= hackRam) {
            hackThreads += Math.floor(remainingRam * 0.2 / hackRam);
          }
        } else {
          // Too small for all three - prioritize weaken and grow
          const halfRam = Math.floor(freeRam / 2);
          weakenThreads = Math.floor(halfRam / weakenRam);
          growThreads = Math.floor((freeRam - weakenThreads * weakenRam) / growRam);
        }
      }

      // Check if we need to redeploy (only if phase changed, target changed, or thread count changed)
      const currentPhase = currentGrow || currentHack ? "balanced" : "weaken";
      const phaseChanged = currentPhase !== phase;
      const targetChanged = currentWeaken && String(currentWeaken.args[0]) !== target;
      const weakenChanged = weakenThreads > 0 && (!currentWeaken || currentWeaken.threads !== weakenThreads);
      const growChanged = growThreads > 0 && (!currentGrow || currentGrow.threads !== growThreads);
      const hackChanged = hackThreads > 0 && (!currentHack || currentHack.threads !== hackThreads);

      const needsRedeploy = phaseChanged || targetChanged || weakenChanged || growChanged || hackChanged;

      if (needsRedeploy) {
        // Kill all our processes on this server (clean slate)
        for (const proc of ourProcs) {
          ns.kill(proc.pid);
          stats.killed += 1;
        }

        await ns.sleep(50);

        // Deploy based on phase
        if (weakenThreads > 0) {
          await ns.scp(weakenScript, server);
          const pid = ns.exec(weakenScript, server, weakenThreads, target);
          if (pid !== 0) {
            stats.weaken += weakenThreads;
          }
        }

        if (growThreads > 0) {
          await ns.scp(growScript, server);
          const pid = ns.exec(growScript, server, growThreads, target);
          if (pid !== 0) {
            stats.grow += growThreads;
          }
        }

        if (hackThreads > 0) {
          await ns.scp(hackScript, server);
          const pid = ns.exec(hackScript, server, hackThreads, target);
          if (pid !== 0) {
            stats.hack += hackThreads;
          }
        }

        if (verbose) {
          const actions = [];
          if (weakenThreads > 0) actions.push(`${weakenThreads}t weaken`);
          if (growThreads > 0) actions.push(`${growThreads}t grow`);
          if (hackThreads > 0) actions.push(`${hackThreads}t hack`);
          ns.print(`  ${server}: ${actions.join(" + ")} -> ${target}`);
        }
      } else {
        stats.skipped += 1;
        if (verbose) {
          const actions = [];
          if (weakenThreads > 0) actions.push(`${weakenThreads}t weaken`);
          if (growThreads > 0) actions.push(`${growThreads}t grow`);
          if (hackThreads > 0) actions.push(`${hackThreads}t hack`);
          ns.print(`  ${server}: Already running (${actions.join(" + ")}) -> ${target}`);
        }
      }
    }

    // Phase 4: Deploy hack to targets - ONLY if needed
    for (const target of targets) {
      if (!ns.hasRootAccess(target)) continue;

      const maxRam = ns.getServerMaxRam(target);
      const usedRam = ns.getServerUsedRam(target);
      const freeRam = maxRam - usedRam;
      const hackThreads = Math.floor(freeRam / hackRam);

      if (hackThreads < 1) continue;

      // Check if already running correctly
      const currentHack = ns.ps(target).find(
        (p) => p.filename === hackScript && String(p.args[0]) === target && p.threads === hackThreads
      );

      if (!currentHack) {
        // Kill existing hack if wrong
        ns.ps(target)
          .filter((p) => p.filename === hackScript)
          .forEach((p) => {
            ns.kill(p.pid);
            stats.killed += 1;
          });

        await ns.sleep(50);

        await ns.scp(hackScript, target);
        const pid = ns.exec(hackScript, target, hackThreads, target);
        if (pid !== 0) {
          stats.hack += hackThreads;
        }
      } else {
        stats.skipped += 1;
      }
    }

    if (verbose) {
      // Count targets in each phase
      const secBuffer = 2.0;
      const targetsNeedingWeaken = targets.filter((t) => {
        const sec = ns.getServerSecurityLevel(t);
        const min = ns.getServerMinSecurityLevel(t);
        return sec > min + secBuffer;
      }).length;
      const targetsInBalanced = targets.length - targetsNeedingWeaken;
      
      ns.print(`\n[Summary] Weaken: ${stats.weaken}t | Grow: ${stats.grow}t | Hack: ${stats.hack}t`);
      ns.print(`  Skipped: ${stats.skipped} | Killed: ${stats.killed}`);
      ns.print(`  Targets: ${targetsInBalanced} balanced, ${targetsNeedingWeaken} weakening`);
      ns.print(`Next refresh in ${Math.round(refreshMs / 1000)}s\n`);
    }

    // Export logs if enabled
    if (exportLogs) {
      const logEntry = {
        timestamp: new Date().toISOString(),
        cycle: {
          targets: targets.length,
          servers: purchased.length,
          stats: { ...stats },
          serverDetails: sortedServers.map((s) => {
            const procs = ns.ps(s);
            const w = procs.find((p) => p.filename === weakenScript);
            const g = procs.find((p) => p.filename === growScript);
            const h = procs.find((p) => p.filename === hackScript);
            return {
              server: s,
              ram: ns.getServerMaxRam(s),
              weaken: w ? w.threads : 0,
              grow: g ? g.threads : 0,
              hack: h ? h.threads : 0,
              target: w ? String(w.args[0]) : g ? String(g.args[0]) : h ? String(h.args[0]) : "none",
            };
          }),
        },
      };
      logEntries.push(logEntry);
      
      // Write to file every 10 cycles to avoid too many writes
      if (logEntries.length >= 10) {
        const logData = {
          script: "deploy/maximize-hwg.js",
          entries: logEntries,
        };
        ns.write("maximize-hwg-logs.json", JSON.stringify(logData, null, 2), "w");
        logEntries.length = 0; // Clear array
      }
    }

    await ns.sleep(refreshMs);
  }
}

function findHackableTargets(
  ns: NS,
  purchased: string[],
  maxDepth: number,
  verbose: boolean,
  mode: string
): string[] {
  const purchasedSet = new Set(purchased);
  const visited = new Set<string>(["home"]);
  const queue: Array<{ host: string; depth: number }> = [{ host: "home", depth: 0 }];
  const targets: string[] = [];

  while (queue.length > 0) {
    const current = queue.shift()!;
    for (const neighbor of ns.scan(current.host)) {
      if (visited.has(neighbor)) continue;
      visited.add(neighbor);
      if (current.depth < maxDepth) {
        queue.push({ host: neighbor, depth: current.depth + 1 });
      }

      if (neighbor === "home" || purchasedSet.has(neighbor)) continue;
      if (!ns.hasRootAccess(neighbor)) {
        tryRoot(ns, neighbor, false);
      }
      if (!ns.hasRootAccess(neighbor)) continue;

      const req = ns.getServerRequiredHackingLevel(neighbor);
      const maxMoney = ns.getServerMaxMoney(neighbor);
      if (req <= ns.getHackingLevel() && maxMoney > 0) {
        targets.push(neighbor);
      }
    }
  }

  targets.sort((a, b) => scoreTarget(ns, b, mode) - scoreTarget(ns, a, mode));
  return targets;
}

function scoreTarget(ns: NS, host: string, mode: string): number {
  if (mode === "xp") {
    const hackTime = ns.getHackTime(host);
    const exp = typeof (ns as any).hackAnalyzeExp === "function"
      ? (ns as any).hackAnalyzeExp(host, 1)
      : 1;
    return exp / Math.max(1, hackTime);
  }
  const maxMoney = ns.getServerMaxMoney(host);
  const hackTime = ns.getHackTime(host);
  return maxMoney / Math.max(1, hackTime);
}

function tryRoot(ns: NS, host: string, verbose: boolean) {
  const required = ns.getServerNumPortsRequired(host);
  let opened = 0;

  if (ns.fileExists("BruteSSH.exe", "home")) { ns.brutessh(host); opened++; }
  if (ns.fileExists("FTPCrack.exe", "home")) { ns.ftpcrack(host); opened++; }
  if (ns.fileExists("relaySMTP.exe", "home")) { ns.relaysmtp(host); opened++; }
  if (ns.fileExists("HTTPWorm.exe", "home")) { ns.httpworm(host); opened++; }
  if (ns.fileExists("SQLInject.exe", "home")) { ns.sqlinject(host); opened++; }

  if (opened >= required) {
    ns.nuke(host);
  }
}

function smallestPowerOfTwoAtLeast(value: number): number {
  let ram = 1;
  while (ram < value) ram *= 2;
  return Math.max(2, ram);
}

function bestAffordableRam(ns: NS, minRam: number, budgetRatio: number): number {
  const maxPurchasable = ns.getPurchasedServerMaxRam();
  const min = smallestPowerOfTwoAtLeast(minRam);
  const budget = ns.getServerMoneyAvailable("home") * budgetRatio;
  let ram = min;
  let best = min;
  while (ram <= maxPurchasable) {
    const cost = ns.getPurchasedServerCost(ram);
    if (cost <= budget) {
      best = ram;
    } else {
      break;
    }
    ram *= 2;
  }
  return best;
}

function nextServerName(ns: NS, prefix: string, servers: string[]): string {
  const existing = new Set(servers);
  let i = 1;
  while (existing.has(`${prefix}${i}`)) i++;
  return `${prefix}${i}`;
}
