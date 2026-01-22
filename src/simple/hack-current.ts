import { NS } from "@ns";

/** @param {NS} ns */
export async function main(ns: NS) {
  const target = ns.getHostname();
  
  ns.tprint(`Continuously hacking: ${target}`);
  
  while (true) {
    await ns.hack(target);
  }
}
