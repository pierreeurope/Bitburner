/// <reference path="../NetScriptDefinitions.d.ts" />

type UpgradeType = "purchase" | "level" | "ram" | "core";

interface UpgradePlan {
  type: UpgradeType;
  nodeIndex?: number;
  cost: number;
  label: string;
}

const DEFAULTS = {
  maxSpendRatio: 0.1,
  sleepMs: 2000,
};

export async function main(ns: NS) {
  const maxSpendRatio = Number(ns.args[0] ?? DEFAULTS.maxSpendRatio);
  const sleepMs = Number(ns.args[1] ?? DEFAULTS.sleepMs);

  ns.disableLog("sleep");
  ns.disableLog("getServerMoneyAvailable");

  while (true) {
    const money = ns.getServerMoneyAvailable("home");
    const budget = money * maxSpendRatio;

    const plan = getBestAffordableUpgrade(ns, budget);
    if (plan) {
      executeUpgrade(ns, plan);
    } else {
      ns.print(
        `No Hacknet upgrades under ${ns.formatNumber(budget)} (ratio ${
          maxSpendRatio
        }).`
      );
    }

    await ns.sleep(sleepMs);
  }
}

function getBestAffordableUpgrade(ns: NS, budget: number): UpgradePlan | null {
  const plans: UpgradePlan[] = [];

  const purchaseCost = ns.hacknet.getPurchaseNodeCost();
  if (isFinite(purchaseCost)) {
    plans.push({
      type: "purchase",
      cost: purchaseCost,
      label: "Purchase new node",
    });
  }

  const nodeCount = ns.hacknet.numNodes();
  for (let i = 0; i < nodeCount; i += 1) {
    plans.push({
      type: "level",
      nodeIndex: i,
      cost: ns.hacknet.getLevelUpgradeCost(i, 1),
      label: `Upgrade node ${i} level`,
    });
    plans.push({
      type: "ram",
      nodeIndex: i,
      cost: ns.hacknet.getRamUpgradeCost(i, 1),
      label: `Upgrade node ${i} RAM`,
    });
    plans.push({
      type: "core",
      nodeIndex: i,
      cost: ns.hacknet.getCoreUpgradeCost(i, 1),
      label: `Upgrade node ${i} cores`,
    });
  }

  const affordable = plans.filter((plan) => plan.cost > 0 && plan.cost <= budget);
  if (affordable.length === 0) return null;

  affordable.sort((a, b) => a.cost - b.cost);
  return affordable[0];
}

function executeUpgrade(ns: NS, plan: UpgradePlan) {
  let success = false;
  switch (plan.type) {
    case "purchase":
      success = ns.hacknet.purchaseNode() !== -1;
      break;
    case "level":
      success = ns.hacknet.upgradeLevel(plan.nodeIndex ?? 0, 1);
      break;
    case "ram":
      success = ns.hacknet.upgradeRam(plan.nodeIndex ?? 0, 1);
      break;
    case "core":
      success = ns.hacknet.upgradeCore(plan.nodeIndex ?? 0, 1);
      break;
    default:
      return;
  }

  if (success) {
    ns.print(`${plan.label} for ${ns.formatNumber(plan.cost)}`);
  } else {
    ns.print(`Failed: ${plan.label}`);
  }
}
