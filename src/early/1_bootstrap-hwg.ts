export async function main(ns: NS) {
  const target = String(ns.args[0] ?? "n00dles");
  const script = "smart-hwg.js";
  const moneyThreshold = 0.5;
  const secBuffer = 1.5;
  const loopSleepMs = 200;

  if (!ns.fileExists(script, "home")) {
    ns.tprint(`Missing ${script}. Make sure it is synced.`);
    return;
  }

  const pid = ns.exec(script, "home", 1, target, moneyThreshold, secBuffer, loopSleepMs);
  if (pid === 0) {
    ns.tprint("Failed to start smart-hwg (not enough RAM).");
  } else {
    ns.tprint(`Started ${script} on ${target}.`);
  }
}
