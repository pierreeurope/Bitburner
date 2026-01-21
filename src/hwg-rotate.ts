const DEFAULTS = {
  moneyThreshold: 0.9,
  secBuffer: 1.5,
  cycleSleepMs: 200,
};

export async function main(ns: NS) {
  const moneyThreshold = Number(ns.args[0] ?? DEFAULTS.moneyThreshold);
  const secBuffer = Number(ns.args[1] ?? DEFAULTS.secBuffer);
  const cycleSleepMs = Number(ns.args[2] ?? DEFAULTS.cycleSleepMs);

  ns.disableLog("sleep");

  while (true) {
    const targets = findHackableTargets(ns);
    for (const target of targets) {
      const minSec = ns.getServerMinSecurityLevel(target);
      const maxMoney = ns.getServerMaxMoney(target);
      const curSec = ns.getServerSecurityLevel(target);
      const curMoney = ns.getServerMoneyAvailable(target);

      if (curSec > minSec + secBuffer) {
        await ns.weaken(target);
      } else if (curMoney < maxMoney * moneyThreshold) {
        await ns.grow(target);
      } else {
        await ns.hack(target);
      }
    }

    await ns.sleep(cycleSleepMs);
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
