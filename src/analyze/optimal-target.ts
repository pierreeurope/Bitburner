export async function main(ns: NS) {
  const targets = findHackableTargets(ns);
  if (targets.length === 0) {
    ns.tprint("No hackable targets found.");
    return;
  }

  const myLevel = ns.getHackingLevel();
  const analysis = targets.map((target) => {
    const minSec = ns.getServerMinSecurityLevel(target);
    const maxMoney = ns.getServerMaxMoney(target);
    const reqLevel = ns.getServerRequiredHackingLevel(target);
    const hackTime = ns.getHackTime(target);
    const growTime = ns.getGrowTime(target);
    const weakenTime = ns.getWeakenTime(target);

    // Estimate XP per second (hack gives XP, higher servers give more)
    // XP scales with server level, approximate formula
    const baseXP = reqLevel * 0.1; // Rough estimate
    const xpPerHack = baseXP;
    const xpPerSecond = xpPerHack / hackTime;

    // Estimate money per second
    const hackPercent = ns.hackAnalyze(target);
    const moneyPerHack = maxMoney * hackPercent;
    const moneyPerSecond = moneyPerHack / hackTime;

    // Overall score (weighted: XP focus = 70% XP, 30% money)
    const score = xpPerSecond * 0.7 + moneyPerSecond * 0.3;

    return {
      target,
      reqLevel,
      maxMoney,
      minSec,
      hackTime,
      xpPerSecond,
      moneyPerSecond,
      score,
    };
  });

  // Sort by score (best first)
  analysis.sort((a, b) => b.score - a.score);

  ns.tprint("\n=== Optimal Target Analysis (XP-focused) ===\n");
  ns.tprint("Rank | Target | ReqLvl | MaxMoney | XP/sec | Money/sec | Score");
  ns.tprint("-----|--------|--------|----------|--------|-----------|------");
  analysis.forEach((a, i) => {
    ns.tprint(
      `${(i + 1).toString().padStart(4)} | ${a.target.padEnd(6)} | ${a.reqLevel
        .toString()
        .padStart(6)} | ${ns.formatNumber(a.maxMoney).padStart(8)} | ${a.xpPerSecond
        .toFixed(2)
        .padStart(6)} | ${ns.formatNumber(a.moneyPerSecond).padStart(9)} | ${a.score.toFixed(2)}`
    );
  });

  const best = analysis[0];
  ns.tprint(`\n🎯 Best target: ${best.target}`);
  ns.tprint(`   XP/sec: ${best.xpPerSecond.toFixed(2)}`);
  ns.tprint(`   Money/sec: ${ns.formatNumber(best.moneyPerSecond)}`);
  ns.tprint(`\n💡 Strategy:`);
  ns.tprint(
    `   Focus all threads on ${best.target} for maximum XP/money efficiency.`
  );
  ns.tprint(
    `   Or distribute across top 3-5 targets for better parallelization.`
  );
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
