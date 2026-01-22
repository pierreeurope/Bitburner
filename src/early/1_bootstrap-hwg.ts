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

  // Check if target is hackable
  if (!ns.hasRootAccess(target)) {
    ns.tprint(`Target ${target} is not rooted. Attempting to root...`);
    // Try basic rooting
    if (ns.fileExists("BruteSSH.exe", "home")) ns.brutessh(target);
    if (ns.fileExists("FTPCrack.exe", "home")) ns.ftpcrack(target);
    if (ns.getServerNumPortsRequired(target) <= 2 && ns.fileExists("NUKE.exe", "home")) {
      ns.nuke(target);
    }
    if (!ns.hasRootAccess(target)) {
      ns.tprint(`Cannot root ${target}. Skipping.`);
      return;
    }
  }

  const reqLevel = ns.getServerRequiredHackingLevel(target);
  const myLevel = ns.getHackingLevel();
  if (myLevel < reqLevel) {
    ns.tprint(`Hacking level ${myLevel} < required ${reqLevel} for ${target}.`);
    return;
  }

  const pid = ns.exec(script, "home", 1, target, moneyThreshold, secBuffer, loopSleepMs);
  if (pid === 0) {
    ns.tprint("Failed to start smart-hwg (not enough RAM).");
  } else {
    ns.tprint(`Started ${script} on ${target} (minSec=${ns.getServerMinSecurityLevel(target)}).`);
  }
}
