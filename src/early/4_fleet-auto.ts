export async function main(ns: NS) {
  const script = "deploy/auto-hwg-fleet.js";
  const worker = "smart-hwg.js";
  const prefix = "server";
  const refreshMs = 10000;
  const moneyThreshold = 0.9;
  const secBuffer = 1.5;
  const loopSleepMs = 200;
  const maxDepth = 5;
  const verbose = true;
  const maxPurchaseRam = 0;
  const includeHome = false;
  const buyBudgetRatio = 0.2;
  const mode = "xp";

  if (!ns.fileExists(script, "home")) {
    ns.tprint(`Missing ${script}. Make sure it is synced.`);
    return;
  }

  const pid = ns.exec(
    script,
    "home",
    1,
    worker,
    prefix,
    refreshMs,
    moneyThreshold,
    secBuffer,
    loopSleepMs,
    maxDepth,
    verbose,
    maxPurchaseRam,
    includeHome,
    buyBudgetRatio,
    mode
  );
  if (pid === 0) {
    ns.tprint("Failed to start auto-hwg-fleet (not enough RAM).");
  } else {
    ns.tprint(`Started ${script} with worker ${worker}.`);
  }
}
