const DEFAULTS = {
  workerScript: "smart-hwg.js",
  prefix: "server",
  refreshMs: 10000,
  moneyThreshold: 0.9,
  secBuffer: 1.5,
  loopSleepMs: 200,
};

export async function main(ns: NS) {
  const workerScript = String(ns.args[0] ?? DEFAULTS.workerScript);
  const prefix = String(ns.args[1] ?? DEFAULTS.prefix);
  const refreshMs = Number(ns.args[2] ?? DEFAULTS.refreshMs);
  const moneyThreshold = Number(ns.args[3] ?? DEFAULTS.moneyThreshold);
  const secBuffer = Number(ns.args[4] ?? DEFAULTS.secBuffer);
  const loopSleepMs = Number(ns.args[5] ?? DEFAULTS.loopSleepMs);
  const maxDepth = Number(ns.args[6] ?? 5);
  const verbose = String(ns.args[7] ?? "true") !== "false";
  const maxPurchaseRam = Number(ns.args[8] ?? 0);
  const includeHome = String(ns.args[9] ?? "false") !== "false";
  const buyBudgetRatio = Number(ns.args[10] ?? 0.2);
  const mode = String(ns.args[11] ?? "xp"); // "money" | "xp"

  ns.disableLog("scan");
  ns.disableLog("sleep");
  ns.disableLog("getServerMaxRam");
  ns.disableLog("getServerUsedRam");
  ns.disableLog("getServerMoneyAvailable");
  ns.disableLog("getServerRequiredHackingLevel");
  ns.disableLog("getServerMaxMoney");
  ns.disableLog("getHackingLevel");
  ns.disableLog("getServerNumPortsRequired");

  while (true) {
    const purchased = ns.getPurchasedServers();
    const workerHosts = includeHome ? ["home", ...purchased] : purchased;
    const targets = findHackableTargets(ns, purchased, maxDepth, verbose, mode);
    const serverLimit = ns.getPurchasedServerLimit();
    const workerRam = ns.getScriptRam(workerScript);

    const desiredServers = Math.min(targets.length, serverLimit);
    const minRam = smallestPowerOfTwoAtLeast(workerRam);
    let servers = purchased;
    let usableServers = servers.filter(
      (s) => ns.getServerMaxRam(s) >= minRam
    );

    // Buy more servers if we have fewer servers than targets and can afford it.
    while (usableServers.length < desiredServers && servers.length < serverLimit) {
      const cost = ns.getPurchasedServerCost(minRam);
      if (ns.getServerMoneyAvailable("home") < cost) {
        if (verbose) ns.print("Cannot afford minimum server right now.");
        break;
      }
      const name = nextServerName(ns, prefix, servers);
      const ramToBuy =
        maxPurchaseRam && maxPurchaseRam >= minRam
          ? Math.min(maxPurchaseRam, ns.getPurchasedServerMaxRam())
          : bestAffordableRam(ns, minRam, buyBudgetRatio);
      if (verbose) {
        ns.print(
          `Buying server ${name} with ${ns.formatRam(ramToBuy)} for ${ns.formatNumber(
            ns.getPurchasedServerCost(ramToBuy)
          )}`
        );
      }
      const purchased = ns.purchaseServer(name, ramToBuy);
      if (!purchased) break;
      servers = ns.getPurchasedServers();
      usableServers = servers.filter((s) => ns.getServerMaxRam(s) >= minRam);
    }

    const assignments = assignTargetsToServers(
      ns,
      includeHome ? ["home", ...usableServers] : usableServers,
      targets,
      workerRam
    );
    const started: string[] = [];
    const skipped: string[] = [];
    const insufficient: string[] = [];

    for (const [server, target, maxThreads] of assignments) {
      const maxRam = ns.getServerMaxRam(server);
      if (maxThreads < 1) {
        insufficient.push(`${server}(${ns.formatRam(maxRam)})`);
        continue;
      }

      const procs = ns.ps(server).filter((p) => p.filename === workerScript);
      const existing = procs.find((p) => String(p.args[0]) === target);
      const needsRestart = !existing || existing.threads !== maxThreads;
      if (!needsRestart) {
        skipped.push(`${server}->${target}(${maxThreads}t)`);
        continue;
      }

      // Stop any existing worker on this server before reassigning.
      for (const p of procs) ns.kill(p.pid);

      if (server !== "home") {
        await ns.scp(workerScript, server);
      }
      const pid = ns.exec(
        workerScript,
        server,
        maxThreads,
        target,
        moneyThreshold,
        secBuffer,
        loopSleepMs
      );
      if (pid !== 0) started.push(`${server}->${target}(${maxThreads}t)`);
    }

    if (verbose) {
      ns.print(
        [
          `Depth=${maxDepth}`,
          `Targets=${targets.length}`,
          `Servers=${servers.length}/${serverLimit}`,
          `WorkerRAM=${ns.formatRam(workerRam)}`,
          `MaxBuyRAM=${maxPurchaseRam ? ns.formatRam(maxPurchaseRam) : "min"}`,
          `MinServerRAM=${ns.formatRam(minRam)}`,
          `UseHome=${includeHome}`,
          `BuyBudget=${Math.round(buyBudgetRatio * 100)}%`,
          `Mode=${mode}`,
          `Started=${started.length}`,
          `Running=${skipped.length}`,
          `LowRAM=${insufficient.length}`,
        ].join(" | ")
      );
      if (targets.length) ns.print(`Targets: ${targets.join(", ")}`);
      if (workerHosts.length) ns.print(`Servers: ${workerHosts.join(", ")}`);
      if (servers.length === serverLimit && usableServers.length < desiredServers) {
        ns.print(
          "At server limit with too-small servers. Delete/replace small servers to cover all targets."
        );
      }
      if (started.length) ns.print(`Started: ${started.join(", ")}`);
      if (skipped.length) ns.print(`Already running: ${skipped.join(", ")}`);
      if (insufficient.length) ns.print(`Too small: ${insufficient.join(", ")}`);
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
    const exp = typeof (ns as any).hackAnalyzeExp === "function"
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

function assignTargetsToServers(
  ns: NS,
  servers: string[],
  targets: string[],
  workerRam: number
): Array<[string, string, number]> {
  const pairs: Array<[string, string, number]> = [];
  if (targets.length === 0) return pairs;

  const sortedServers = [...servers].sort(
    (a, b) => ns.getServerMaxRam(b) - ns.getServerMaxRam(a)
  );

  for (let i = 0; i < sortedServers.length; i += 1) {
    const server = sortedServers[i];
    const target = targets[i % targets.length];
    const maxThreads = Math.floor(ns.getServerMaxRam(server) / workerRam);
    pairs.push([server, target, maxThreads]);
  }
  return pairs;
}

function smallestPowerOfTwoAtLeast(value: number): number {
  let ram = 1;
  while (ram < value) ram *= 2;
  return Math.max(2, ram);
}

function bestAffordableRam(
  ns: NS,
  minRam: number,
  budgetRatio: number
): number {
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

function nextServerName(
  ns: NS,
  prefix: string,
  servers: string[]
): string {
  const existing = new Set(servers);
  let i = 1;
  while (existing.has(`${prefix}${i}`)) i += 1;
  return `${prefix}${i}`;
}
