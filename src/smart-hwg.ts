const DEFAULTS = {
  target: "n00dles",
  moneyThreshold: 0.5,
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
    const minSec = ns.getServerMinSecurityLevel(target);
    const maxMoney = ns.getServerMaxMoney(target);
    const curSec = ns.getServerSecurityLevel(target);
    const curMoney = ns.getServerMoneyAvailable(target);

    // Always weaken first until we reach minimum security
    if (curSec > minSec + secBuffer) {
      await ns.weaken(target);
    } else if (curMoney < maxMoney * moneyThreshold) {
      // Grow if money is below threshold
      await ns.grow(target);
    } else {
      // Hack when security is low and money is high
      await ns.hack(target);
    }

    await ns.sleep(loopSleepMs);
  }
}
