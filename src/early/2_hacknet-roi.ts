export async function main(ns: NS) {
  const script = "hacknet-manager.js";
  const spendRatio = 0.1;
  const sleepMs = 1000;

  if (!ns.fileExists(script, "home")) {
    ns.tprint(`Missing ${script}. Make sure it is synced.`);
    return;
  }

  const pid = ns.exec(script, "home", 1, spendRatio, sleepMs);
  if (pid === 0) {
    ns.tprint("Failed to start hacknet-manager (not enough RAM).");
  } else {
    ns.tprint(`Started ${script} with spendRatio=${spendRatio}.`);
  }
}
