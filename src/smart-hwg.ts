const DEFAULTS = {
  target: "n00dles",
  moneyThreshold: 0.9,
  secBuffer: 1.5,
  loopSleepMs: 200,
};

export async function main(ns: NS) {
  const target = String(ns.args[0] ?? DEFAULTS.target);
  const moneyThreshold = Number(ns.args[1] ?? DEFAULTS.moneyThreshold);
  const secBuffer = Number(ns.args[2] ?? DEFAULTS.secBuffer);
  const loopSleepMs = Number(ns.args[3] ?? DEFAULTS.loopSleepMs);

  ns.disableLog("sleep");
  ns.disableLog("getServerSecurityLevel");
  ns.disableLog("getServerMoneyAvailable");

  while (true) {
    const server = ns.getServer(target);
    const minSec = server.minDifficulty ?? ns.getServerMinSecurityLevel(target);
    const maxMoney = server.moneyMax ?? ns.getServerMaxMoney(target);
    const curSec = server.hackDifficulty ?? ns.getServerSecurityLevel(target);
    const curMoney = server.moneyAvailable ?? ns.getServerMoneyAvailable(target);

    if (curSec > minSec + secBuffer) {
      await ns.weaken(target);
    } else if (curMoney < maxMoney * moneyThreshold) {
      await ns.grow(target);
    } else {
      await ns.hack(target);
    }

    await ns.sleep(loopSleepMs);
  }
}
