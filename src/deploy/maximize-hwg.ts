import { NS } from "@ns";

const DEFAULTS = {
  refreshMs: 10000,
  maxDepth: 5,
  verbose: true,
  mode: "xp", // "money" | "xp"
};

export async function main(ns: NS) {
  const refreshMs = Number(ns.args[0] ?? DEFAULTS.refreshMs);
  const maxDepth = Number(ns.args[1] ?? DEFAULTS.maxDepth);
  const verbose = String(ns.args[2] ?? "true") !== "false";
  const mode = String(ns.args[3] ?? DEFAULTS.mode);

  ns.disableLog("scan");
  ns.disableLog("sleep");
  ns.disableLog("getServerMaxRam");
  ns.disableLog("getServerUsedRam");
  ns.disableLog("getServerMoneyAvailable");
  ns.disableLog("getServerRequiredHackingLevel");
  ns.disableLog("getServerMaxMoney");
  ns.disableLog("getHackingLevel");
  ns.disableLog("getServerNumPortsRequired");

  const weakenScript = "workers/weaken-only.js";
  const growScript = "workers/grow-only.js";
  const hackScript = "workers/hack-only.js";

  const weakenRam = ns.getScriptRam(weakenScript);
  const growRam = ns.getScriptRam(growScript);
  const hackRam = ns.getScriptRam(hackScript);

  while (true) {
    const purchased = ns.getPurchasedServers();
    const targets = findHackableTargets(ns, purchased, maxDepth, verbose, mode);

    if (targets.length === 0) {
      if (verbose) ns.print("No hackable targets found.");
      await ns.sleep(refreshMs);
      continue;
    }

    // Deploy weaken/grow to owned servers, hack to targets themselves
    const stats = {
      weakenDeployed: 0,
      growDeployed: 0,
      hackDeployed: 0,
      skipped: 0,
    };

    // Phase 1: Kill all existing workers on owned servers to free up RAM
    for (const server of purchased) {
      const procs = ns.ps(server);
      for (const proc of procs) {
        if (
          proc.filename === weakenScript ||
          proc.filename === growScript ||
          proc.filename === hackScript
        ) {
          ns.kill(proc.pid);
        }
      }
    }

    // Phase 2: Deploy weaken/grow to owned servers, maximizing RAM usage
    // Sort servers by RAM (largest first) for better distribution
    const sortedServers = [...purchased].sort(
      (a, b) => ns.getServerMaxRam(b) - ns.getServerMaxRam(a)
    );

    // Distribute servers across targets (round-robin)
    // If we have more servers than targets, multiple servers work on same target
    for (let i = 0; i < sortedServers.length; i++) {
      const server = sortedServers[i];
      const maxRam = ns.getServerMaxRam(server);
      const usedRam = ns.getServerUsedRam(server);
      const freeRam = maxRam - usedRam;

      // Assign this server to targets round-robin
      const targetIndex = i % targets.length;
      const target = targets[targetIndex];

      // Split RAM between weaken and grow (50/50 split to maximize both)
      const ramForWeaken = Math.floor(freeRam / 2);
      const ramForGrow = freeRam - ramForWeaken;

      const weakenThreads = Math.floor(ramForWeaken / weakenRam);
      const growThreads = Math.floor(ramForGrow / growRam);

      // Deploy weaken (maximize threads)
      if (weakenThreads >= 1) {
        await ns.scp(weakenScript, server);
        const pid = ns.exec(weakenScript, server, weakenThreads, target);
        if (pid !== 0) {
          stats.weakenDeployed += weakenThreads;
          if (verbose)
            ns.print(
              `Deployed ${weakenThreads}t weaken on ${server}(${ns.formatRam(maxRam)}) -> ${target}`
            );
        }
      }

      // Deploy grow (maximize threads)
      if (growThreads >= 1) {
        await ns.scp(growScript, server);
        const pid = ns.exec(growScript, server, growThreads, target);
        if (pid !== 0) {
          stats.growDeployed += growThreads;
          if (verbose)
            ns.print(
              `Deployed ${growThreads}t grow on ${server}(${ns.formatRam(maxRam)}) -> ${target}`
            );
        }
      }
    }

    // Phase 3: Deploy hack to targets themselves (using their own RAM)
    for (const target of targets) {
      if (!ns.hasRootAccess(target)) continue;

      // Kill any existing hack scripts on the target
      const procs = ns.ps(target);
      for (const proc of procs) {
        if (proc.filename === hackScript) {
          ns.kill(proc.pid);
        }
      }

      const maxRam = ns.getServerMaxRam(target);
      const usedRam = ns.getServerUsedRam(target);
      const freeRam = maxRam - usedRam;
      const hackThreads = Math.floor(freeRam / hackRam);

      if (hackThreads >= 1) {
        await ns.scp(hackScript, target);
        const pid = ns.exec(hackScript, target, hackThreads, target);
        if (pid !== 0) {
          stats.hackDeployed += hackThreads;
          if (verbose)
            ns.print(
              `Deployed ${hackThreads}t hack on ${target} (using ${target}'s RAM)`
            );
        }
      }
    }

    if (verbose) {
      ns.print(
        [
          `Targets=${targets.length}`,
          `Weaken=${stats.weakenDeployed}t`,
          `Grow=${stats.growDeployed}t`,
          `Hack=${stats.hackDeployed}t`,
          `Skipped=${stats.skipped}`,
        ].join(" | ")
      );
      if (targets.length > 0) {
        ns.print(`Targets: ${targets.join(", ")}`);
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
  const queue: Array<{ host: string; depth: number }> = [
    { host: "home", depth: 0 },
  ];
  const targets: string[] = [];
  let rooted = 0;

  while (queue.length > 0) {
    const current = queue.shift() as { host: string; depth: number };
    for (const neighbor of ns.scan(current.host)) {
      if (visited.has(neighbor)) continue;
      visited.add(neighbor);
      if (current.depth < maxDepth) {
        queue.push({ host: neighbor, depth: current.depth + 1 });
      } else if (verbose) {
        ns.print(`Depth cap reached at ${neighbor} (depth ${current.depth + 1})`);
      }

      if (neighbor === "home") continue;
      if (purchasedSet.has(neighbor)) continue;
      if (!ns.hasRootAccess(neighbor)) {
        tryRoot(ns, neighbor, verbose);
      }
      if (!ns.hasRootAccess(neighbor)) continue;
      rooted += 1;
      const req = ns.getServerRequiredHackingLevel(neighbor);
      const maxMoney = ns.getServerMaxMoney(neighbor);
      if (req <= ns.getHackingLevel() && maxMoney > 0) {
        targets.push(neighbor);
      }
    }
  }

  targets.sort((a, b) => scoreTarget(ns, b, mode) - scoreTarget(ns, a, mode));
  if (verbose) {
    ns.print(
      `Rooted=${rooted} | Targets(with money)=${targets.length} | Depth=${maxDepth}`
    );
  }
  return targets;
}

function scoreTarget(ns: NS, host: string, mode: string): number {
  if (mode === "xp") {
    const hackTime = ns.getHackTime(host);
    const exp =
      typeof (ns as any).hackAnalyzeExp === "function"
        ? (ns as any).hackAnalyzeExp(host, 1)
        : 1;
    return exp / Math.max(1, hackTime);
  }
  // default: money per second approximation
  const maxMoney = ns.getServerMaxMoney(host);
  const hackTime = ns.getHackTime(host);
  return maxMoney / Math.max(1, hackTime);
}

function tryRoot(ns: NS, host: string, verbose: boolean) {
  const required = ns.getServerNumPortsRequired(host);
  let opened = 0;

  if (ns.fileExists("BruteSSH.exe", "home")) {
    ns.brutessh(host);
    opened += 1;
  }
  if (ns.fileExists("FTPCrack.exe", "home")) {
    ns.ftpcrack(host);
    opened += 1;
  }
  if (ns.fileExists("relaySMTP.exe", "home")) {
    ns.relaysmtp(host);
    opened += 1;
  }
  if (ns.fileExists("HTTPWorm.exe", "home")) {
    ns.httpworm(host);
    opened += 1;
  }
  if (ns.fileExists("SQLInject.exe", "home")) {
    ns.sqlinject(host);
    opened += 1;
  }

  if (opened >= required) {
    ns.nuke(host);
    if (verbose) ns.print(`Rooted ${host} with ${opened}/${required} ports`);
  } else if (verbose) {
    ns.print(`Cannot root ${host}: ${opened}/${required} ports`);
  }
}
