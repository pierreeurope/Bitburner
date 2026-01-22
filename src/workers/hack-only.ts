import { NS } from "@ns";

/** @param {NS} ns */
export async function main(ns: NS) {
  const target = String(ns.args[0]);
  if (!target) {
    ns.tprint("Usage: run hack-only.js <target>");
    return;
  }

  ns.disableLog("sleep");
  ns.disableLog("hack");

  while (true) {
    await ns.hack(target);
  }
}
