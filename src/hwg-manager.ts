type TargetConfig = {
  moneyThreshold: number;
  secBuffer: number;
  loopSleepMs: number;
};

const DEFAULTS = {
  host: "home",
  maxTargets: 10,
  refreshMs: 5000,
  moneyThreshold: 0.9,
  secBuffer: 1.5,
  loopSleepMs: 200,
};

export async function main(ns: NS) {
  const host = String(ns.args[0] ?? DEFAULTS.host);
  const maxTargets = Number(ns.args[1] ?? DEFAULTS.maxTargets);
  const refreshMs = Number(ns.args[2] ?? DEFAULTS.refreshMs);
  const moneyThreshold = Number(ns.args[3] ?? DEFAULTS.moneyThreshold);
  const secBuffer = Number(ns.args[4] ?? DEFAULTS.secBuffer);
  const loopSleepMs = Number(ns.args[5] ?? DEFAULTS.loopSleepMs);

  const workerScript = "smart-hwg.js";
  ns.disableLog("scan");
  ns.disableLog("sleep");
  ns.disableLog("getServerMaxRam");
  ns.disableLog("getServerUsedRam");
  ns.print(
    `HWG manager starting. host=${host} maxTargets=${maxTargets} refreshMs=${refreshMs}`
  );

  while (true) {
    const targets = findHackableTargets(ns).slice(0, maxTargets);
    const scriptRam = ns.getScriptRam(workerScript);
    const freeRam = ns.getServerMaxRam(host) - ns.getServerUsedRam(host);
    const maxByRam = Math.floor(freeRam / scriptRam);

    let started = 0;
    const startedTargets: string[] = [];
    const skippedTargets: string[] = [];
    for (const target of targets) {
      if (started >= maxByRam) break;
      if (ns.isRunning(workerScript, host, target)) {
        skippedTargets.push(target);
        continue;
      }
      const pid = ns.exec(
        workerScript,
        host,
        1,
        target,
        moneyThreshold,
        secBuffer,
        loopSleepMs
      );
      if (pid !== 0) {
        started += 1;
        startedTargets.push(target);
      }
    }

    ns.print(
      [
        `Targets found=${targets.length}`,
        `freeRam=${ns.formatRam(freeRam)}`,
        `scriptRam=${ns.formatRam(scriptRam)}`,
        `slots=${maxByRam}`,
        `started=${started}`,
        `running=${skippedTargets.length}`,
      ].join(" | ")
    );
    if (startedTargets.length > 0) {
      ns.print(`Started: ${startedTargets.join(", ")}`);
    }
    if (skippedTargets.length > 0) {
      ns.print(`Already running: ${skippedTargets.join(", ")}`);
    }
    ns.print(`Sleeping ${Math.round(refreshMs / 1000)}s...`);

    await ns.sleep(refreshMs);
  }
}

function findHackableTargets(ns: NS): string[] {
  const visited = new Set<string>(["home"]);
  const queue: string[] = ["home"];
  const targets: string[] = [];

  while (queue.length > 0) {
    const current = queue.shift() as string;
    for (const neighbor of ns.scan(current)) {
      if (visited.has(neighbor)) continue;
      visited.add(neighbor);
      queue.push(neighbor);

      if (!ns.hasRootAccess(neighbor)) continue;
      const req = ns.getServerRequiredHackingLevel(neighbor);
      const maxMoney = ns.getServerMaxMoney(neighbor);
      if (req <= ns.getHackingLevel() && maxMoney > 0) {
        targets.push(neighbor);
      }
    }
  }

  return targets;
}
