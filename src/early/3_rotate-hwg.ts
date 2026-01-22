export async function main(ns: NS) {
  const script = "hwg-rotate.js";
  const moneyThreshold = 0.5;
  const secBuffer = 1.5;
  const loopSleepMs = 200;

  if (!ns.fileExists(script, "home")) {
    ns.tprint(`Missing ${script}. Make sure it is synced.`);
    return;
  }

  // Check if we have any hackable targets
  const targets = findHackableTargets(ns);
  if (targets.length === 0) {
    ns.tprint("No hackable targets found. Root some servers first.");
    return;
  }

  const pid = ns.exec(script, "home", 1, moneyThreshold, secBuffer, loopSleepMs);
  if (pid === 0) {
    ns.tprint("Failed to start hwg-rotate (not enough RAM).");
  } else {
    ns.tprint(`Started ${script} across ${targets.length} targets.`);
  }
}

function findHackableTargets(ns: NS): string[] {
  const targets: string[] = [];
  const visited = new Set<string>(["home"]);
  const queue: string[] = ["home"];

  while (queue.length > 0) {
    const host = queue.shift() as string;
    for (const neighbor of ns.scan(host)) {
      if (visited.has(neighbor)) continue;
      visited.add(neighbor);
      queue.push(neighbor);

      if (neighbor === "home") continue;
      if (!ns.hasRootAccess(neighbor)) continue;
      const req = ns.getServerRequiredHackingLevel(neighbor);
      const maxMoney = ns.getServerMaxMoney(neighbor);
      if (req <= ns.getHackingLevel() && maxMoney > 0) {
        targets.push(neighbor);
      }
    }
  }

  return targets;
}
