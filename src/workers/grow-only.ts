import { NS } from "@ns";

/** @param {NS} ns */
export async function main(ns: NS) {
  const target = String(ns.args[0]);
  if (!target) {
    ns.tprint("Usage: run grow-only.js <target>");
    return;
  }

  ns.disableLog("sleep");
  ns.disableLog("grow");

  while (true) {
    await ns.grow(target);
  }
}
