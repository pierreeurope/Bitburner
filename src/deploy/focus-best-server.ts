export async function main(ns: NS) {
  const workerScript = String(ns.args[0] ?? "smart-hwg.js");
  const refreshMs = Number(ns.args[1] ?? 10000);
  const moneyThreshold = Number(ns.args[2] ?? 0.5);
  const secBuffer = Number(ns.args[3] ?? 1.5);
  const loopSleepMs = Number(ns.args[4] ?? 200);

  ns.disableLog("scan");
  ns.disableLog("sleep");

  while (true) {
    const bestTarget = findBestTarget(ns);
    if (!bestTarget) {
      ns.print("No hackable targets found.");
      await ns.sleep(refreshMs);
      continue;
    }

    const purchased = ns.getPurchasedServers();
    const allServers = [...purchased, "home"]; // Include home for focus mode

    // Deploy to all servers, all targeting the best server
    for (const server of allServers) {
      const maxRam = ns.getServerMaxRam(server);
      const workerRam = ns.getScriptRam(workerScript);
      const maxThreads = Math.floor(maxRam / workerRam);

      if (maxThreads < 1) continue;

      // Check if already running correctly
      const procs = ns.ps(server).filter((p) => p.filename === workerScript);
      const existing = procs.find((p) => String(p.args[0]) === bestTarget);
      if (existing && existing.threads === maxThreads) continue;

      // Kill any existing workers
      for (const p of procs) ns.kill(p.pid);

      // Deploy with max threads
      await ns.scp(workerScript, server);
      const pid = ns.exec(
        workerScript,
        server,
        maxThreads,
        bestTarget,
        moneyThreshold,
        secBuffer,
        loopSleepMs
      );
      if (pid !== 0) {
        ns.print(
          `Deployed ${maxThreads}t on ${server} -> ${bestTarget}`
        );
      }
    }

    ns.print(`Focus mode: All servers targeting ${bestTarget}`);
    await ns.sleep(refreshMs);
  }
}

function findBestTarget(ns: NS): string | null {
  const targets = findHackableTargets(ns);
  if (targets.length === 0) return null;

  let best: { target: string; score: number } | null = null;

  for (const target of targets) {
    const reqLevel = ns.getServerRequiredHackingLevel(target);
    const maxMoney = ns.getServerMaxMoney(target);
    const hackTime = ns.getHackTime(target);

    // XP-focused scoring
    const baseXP = reqLevel * 0.1;
    const xpPerSecond = baseXP / hackTime;
    const hackPercent = ns.hackAnalyze(target);
    const moneyPerSecond = (maxMoney * hackPercent) / hackTime;
    const score = xpPerSecond * 0.7 + moneyPerSecond * 0.3;

    if (!best || score > best.score) {
      best = { target, score };
    }
  }

  return best?.target ?? null;
}

function findHackableTargets(ns: NS): string[] {
  const visited = new Set<string>(["home"]);
  const queue: string[] = ["home"];
  const targets: string[] = [];

  while (queue.length > 0) {
    const current = queue.shift() as string;
    for (const neighbor of ns.scan(current)) {
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
