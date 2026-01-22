import { NS } from "@ns";

/** @param {NS} ns */
export async function main(ns: NS) {
  const target = String(ns.args[0]);
  if (!target) {
    ns.tprint("Usage: run weaken-only.js <target>");
    return;
  }

  const server = ns.getHostname();
  const threads = ns.args[1] ? Number(ns.args[1]) : 1;

  // Enable all logging for visibility
  ns.print(`[${server}] Starting weaken worker: ${threads} thread(s) -> ${target}`);

  let operationCount = 0;
  while (true) {
    const beforeSec = ns.getServerSecurityLevel(target);
    const minSec = ns.getServerMinSecurityLevel(target);
    const weakenTime = ns.getWeakenTime(target);
    
    await ns.weaken(target);
    operationCount += 1;
    
    const afterSec = ns.getServerSecurityLevel(target);
    const secReduced = beforeSec - afterSec;
    
    // Log every operation or every 5 operations if very frequent
    if (operationCount % 5 === 0 || secReduced > 0.01 || operationCount === 1) {
      ns.print(
        `[${server}] Weaken #${operationCount} -> ${target}: ` +
        `Security ${beforeSec.toFixed(2)} -> ${afterSec.toFixed(2)} ` +
        `(reduced ${secReduced.toFixed(3)}, min: ${minSec.toFixed(2)}) ` +
        `| Time: ${(weakenTime / 1000).toFixed(1)}s`
      );
    }
  }
}
