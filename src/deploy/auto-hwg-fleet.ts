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
  const maxDepth = Number(ns.args[6] ?? 3);
  const verbose = String(ns.args[7] ?? "true") !== "false";

  ns.disableLog("scan");
  ns.disableLog("sleep");
  ns.disableLog("getServerMaxRam");
  ns.disableLog("getServerUsedRam");
  ns.disableLog("getServerMoneyAvailable");
  ns.disableLog("getServerRequiredHackingLevel");
  ns.disableLog("getServerMaxMoney");
  ns.disableLog("getHackingLevel");
  ns.disableLog("getServerNumPortsRequired");
  ns.disableLog("getServerMoneyAvailable");

  while (true) {
    const purchased = ns.getPurchasedServers();
    const targets = findHackableTargets(ns, purchased, maxDepth, verbose);
    const serverLimit = ns.getPurchasedServerLimit();
    const workerRam = ns.getScriptRam(workerScript);

    const desiredServers = Math.min(targets.length, serverLimit);
    let servers = purchased;

    // Buy more servers if we have fewer servers than targets and can afford it.
    while (servers.length < desiredServers) {
      const ram = bestAffordableRam(ns, workerRam);
      if (ram === 0) {
        if (verbose) ns.print("Cannot afford any new server right now.");
        break;
      }
      const cost = ns.getPurchasedServerCost(ram);
      const name = nextServerName(ns, prefix, servers);
      if (verbose) {
        ns.print(
          `Buying server ${name} with ${ns.formatRam(ram)} for ${ns.formatNumber(
            cost
          )}`
        );
      }
      const purchased = ns.purchaseServer(name, ram);
      if (!purchased) break;
      servers = ns.getPurchasedServers();
    }

    const assignments = assignTargetsToServers(servers, targets);
    const started: string[] = [];
    const skipped: string[] = [];
    const insufficient: string[] = [];

    for (const [server, target] of assignments) {
      const maxRam = ns.getServerMaxRam(server);
      if (maxRam < workerRam) {
        insufficient.push(`${server}(${ns.formatRam(maxRam)})`);
        continue;
      }

      if (ns.isRunning(workerScript, server, target)) {
        skipped.push(`${server}->${target}`);
        continue;
      }

      await ns.scp(workerScript, server);
      const pid = ns.exec(
        workerScript,
        server,
        1,
        target,
        moneyThreshold,
        secBuffer,
        loopSleepMs
      );
      if (pid !== 0) started.push(`${server}->${target}`);
    }

    if (verbose) {
      ns.print(
        [
          `Depth=${maxDepth}`,
          `Targets=${targets.length}`,
          `Servers=${servers.length}/${serverLimit}`,
          `WorkerRAM=${ns.formatRam(workerRam)}`,
          `Started=${started.length}`,
          `Running=${skipped.length}`,
          `LowRAM=${insufficient.length}`,
        ].join(" | ")
      );
      if (targets.length) ns.print(`Targets: ${targets.join(", ")}`);
      if (servers.length) ns.print(`Servers: ${servers.join(", ")}`);
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
  verbose: boolean
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

  // Highest value first.
  targets.sort(
    (a, b) => ns.getServerMaxMoney(b) - ns.getServerMaxMoney(a)
  );
  if (verbose) {
    ns.print(
      `Rooted=${rooted} | Targets(with money)=${targets.length} | Depth=${maxDepth}`
    );
  }
  return targets;
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
  servers: string[],
  targets: string[]
): Array<[string, string]> {
  const pairs: Array<[string, string]> = [];
  const count = Math.min(servers.length, targets.length);
  for (let i = 0; i < count; i += 1) {
    pairs.push([servers[i], targets[i]]);
  }
  return pairs;
}

function smallestPowerOfTwoAtLeast(value: number): number {
  let ram = 1;
  while (ram < value) ram *= 2;
  return Math.max(2, ram);
}

function bestAffordableRam(ns: NS, minRam: number): number {
  const maxPurchasable = ns.getPurchasedServerMaxRam();
  const min = smallestPowerOfTwoAtLeast(minRam);
  let ram = min;
  let best = 0;
  while (ram <= maxPurchasable) {
    const cost = ns.getPurchasedServerCost(ram);
    if (cost <= ns.getServerMoneyAvailable("home")) {
      best = ram;
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
