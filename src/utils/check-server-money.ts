import { NS } from "@ns";

/** @param {NS} ns */
export async function main(ns: NS) {
  const hostname = ns.args[0] as string || "home";
  
  const current = ns.getServerMoneyAvailable(hostname);
  const max = ns.getServerMaxMoney(hostname);
  const percentage = max > 0 ? (current / max * 100).toFixed(2) : "0.00";
  
  ns.tprint(`Server: ${hostname}`);
  ns.tprint(`Current money: $${ns.formatNumber(current, 2)}`);
  ns.tprint(`Max money: $${ns.formatNumber(max, 2)}`);
  ns.tprint(`Percentage: ${percentage}%`);
}
