type UpgradeType = "purchase" | "level" | "ram" | "core";

interface UpgradePlan {
  type: UpgradeType;
  nodeIndex?: number;
  cost: number;
  label: string;
  gainPerSec: number;
  roi: number;
}

const DEFAULTS = {
  maxSpendRatio: 1,
  sleepMs: 1000,
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

  const nodeCount = ns.hacknet.numNodes();
  const minNodeProduction = nodeCount
    ? Math.min(
        ...Array.from({ length: nodeCount }, (_, i) =>
          ns.hacknet.getNodeStats(i).production
        )
      )
    : 0;

  const purchaseCost = ns.hacknet.getPurchaseNodeCost();
  if (isFinite(purchaseCost)) {
    const gain = estimateNewNodeGainPerSec(ns, minNodeProduction);
    plans.push({
      type: "purchase",
      cost: purchaseCost,
      label: "Purchase new node",
      gainPerSec: gain,
      roi: gain / purchaseCost,
    });
  }

  for (let i = 0; i < nodeCount; i += 1) {
    const stats = ns.hacknet.getNodeStats(i);
    const levelGain = estimateUpgradeGainPerSec(ns, stats, "level");
    plans.push({
      type: "level",
      nodeIndex: i,
      cost: ns.hacknet.getLevelUpgradeCost(i, 1),
      label: `Upgrade node ${i} level`,
      gainPerSec: levelGain,
      roi: levelGain / ns.hacknet.getLevelUpgradeCost(i, 1),
    });
    const ramGain = estimateUpgradeGainPerSec(ns, stats, "ram");
    plans.push({
      type: "ram",
      nodeIndex: i,
      cost: ns.hacknet.getRamUpgradeCost(i, 1),
      label: `Upgrade node ${i} RAM`,
      gainPerSec: ramGain,
      roi: ramGain / ns.hacknet.getRamUpgradeCost(i, 1),
    });
    const coreGain = estimateUpgradeGainPerSec(ns, stats, "core");
    plans.push({
      type: "core",
      nodeIndex: i,
      cost: ns.hacknet.getCoreUpgradeCost(i, 1),
      label: `Upgrade node ${i} cores`,
      gainPerSec: coreGain,
      roi: coreGain / ns.hacknet.getCoreUpgradeCost(i, 1),
    });
  }

  const affordable = plans.filter((plan) => plan.cost > 0 && plan.cost <= budget);
  if (affordable.length === 0) return null;

  affordable.sort((a, b) => b.roi - a.roi);
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
    ns.print(
      `${plan.label} for ${ns.formatNumber(plan.cost)} | +${ns.formatNumber(
        plan.gainPerSec
      )}/sec | ROI ${plan.roi.toFixed(6)}`
    );
  } else {
    ns.print(`Failed: ${plan.label}`);
  }
}

function estimateUpgradeGainPerSec(
  ns: NS,
  stats: any,
  type: UpgradeType
): number {
  const production = stats.production || 0;
  if (type === "level") {
    return stats.level > 0 ? production / stats.level : production;
  }
  if (type === "ram") {
    return production * 0.5; // assume ~50% gain when RAM doubles
  }
  if (type === "core") {
    return production * (1 / (stats.cores + 5));
  }
  return 0;
}

function estimateNewNodeGainPerSec(ns: NS, baseline: number): number {
  return baseline > 0 ? baseline : 1;
}
