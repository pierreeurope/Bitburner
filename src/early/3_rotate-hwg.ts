export async function main(ns: NS) {
  const script = "hwg-rotate.js";
  const moneyThreshold = 0.5;
  const secBuffer = 1.5;
  const loopSleepMs = 200;

  if (!ns.fileExists(script, "home")) {
    ns.tprint(`Missing ${script}. Make sure it is synced.`);
    return;
  }

  const pid = ns.exec(script, "home", 1, moneyThreshold, secBuffer, loopSleepMs);
  if (pid === 0) {
    ns.tprint("Failed to start hwg-rotate (not enough RAM).");
  } else {
    ns.tprint(`Started ${script} across rooted targets.`);
  }
}
