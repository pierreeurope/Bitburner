import { NS } from "@ns";

/** @param {NS} ns */
export async function main(ns: NS) {
  const target = String(ns.args[0]);
  if (!target) {
    ns.tprint("Usage: run grow-only.js <target>");
    return;
  }

  const server = ns.getHostname();
  const threads = ns.args[1] ? Number(ns.args[1]) : 1;

  // Enable all logging for visibility
  ns.print(`[${server}] Starting grow worker: ${threads} thread(s) -> ${target}`);

  let operationCount = 0;
  while (true) {
    const beforeMoney = ns.getServerMoneyAvailable(target);
    const maxMoney = ns.getServerMaxMoney(target);
    const growTime = ns.getGrowTime(target);
    const percentage = maxMoney > 0 ? (beforeMoney / maxMoney * 100) : 0;
    
    const growth = await ns.grow(target);
    operationCount += 1;
    
    const afterMoney = ns.getServerMoneyAvailable(target);
    const moneyGained = afterMoney - beforeMoney;
    
    // Log every operation or every 5 operations if very frequent
    if (operationCount % 5 === 0 || growth > 1.01 || operationCount === 1) {
      ns.print(
        `[${server}] Grow #${operationCount} -> ${target}: ` +
        `$${ns.formatNumber(beforeMoney, 2)} -> $${ns.formatNumber(afterMoney, 2)} ` +
        `(+${ns.formatNumber(moneyGained, 2)}, ${percentage.toFixed(1)}% of max) ` +
        `| Growth: ${(growth * 100).toFixed(2)}% | Time: ${(growTime / 1000).toFixed(1)}s`
      );
    }
  }
}
