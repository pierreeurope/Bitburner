import { NS } from "@ns";

/** @param {NS} ns */
export async function main(ns: NS) {
  const target = String(ns.args[0]);
  if (!target) {
    ns.tprint("Usage: run hack-only.js <target>");
    return;
  }

  const server = ns.getHostname();
  const threads = ns.args[1] ? Number(ns.args[1]) : 1;

  // Enable all logging for visibility
  ns.print(`[${server}] Starting hack worker: ${threads} thread(s) -> ${target}`);

  let operationCount = 0;
  let totalHacked = 0;
  while (true) {
    const beforeMoney = ns.getServerMoneyAvailable(target);
    const maxMoney = ns.getServerMaxMoney(target);
    const hackTime = ns.getHackTime(target);
    const percentage = maxMoney > 0 ? (beforeMoney / maxMoney * 100) : 0;
    
    const hacked = await ns.hack(target);
    operationCount += 1;
    totalHacked += hacked;
    
    const afterMoney = ns.getServerMoneyAvailable(target);
    
    // Log every operation or every 5 operations if very frequent
    if (operationCount % 5 === 0 || hacked > 0 || operationCount === 1) {
      ns.print(
        `[${server}] Hack #${operationCount} -> ${target}: ` +
        `Hacked $${ns.formatNumber(hacked, 2)} ` +
        `($${ns.formatNumber(beforeMoney, 2)} -> $${ns.formatNumber(afterMoney, 2)}, ${percentage.toFixed(1)}% of max) ` +
        `| Total: $${ns.formatNumber(totalHacked, 2)} | Time: ${(hackTime / 1000).toFixed(1)}s`
      );
    }
  }
}
