type CrimeResult = {
  name: string;
  chance: number;
  money: number;
  time: number;
  moneyPerSec: number;
  expectedPerSec: number;
};

export async function main(ns: NS) {
  if (!ns.singularity) {
    ns.tprint("Singularity API not available. You need the Singularity API access.");
    return;
  }

  const crimes = ns.singularity.getCrimeNames();
  const results: CrimeResult[] = crimes.map((name) => {
    const stats = ns.singularity.getCrimeStats(name);
    const chance = ns.singularity.getCrimeChance(name);
    const moneyPerSec = stats.money / (stats.time / 1000);
    const expectedPerSec = moneyPerSec * chance;
    return {
      name,
      chance,
      money: stats.money,
      time: stats.time,
      moneyPerSec,
      expectedPerSec,
    };
  });

  results.sort((a, b) => b.expectedPerSec - a.expectedPerSec);

  ns.tprint("Best crime by expected money/sec:");
  const best = results[0];
  ns.tprint(
    `${best.name} | chance=${formatPct(best.chance)} | ` +
      `money=${ns.formatNumber(best.money)} | ` +
      `time=${formatTime(best.time)} | ` +
      `expected/sec=${ns.formatNumber(best.expectedPerSec)}`
  );

  ns.tprint("All crimes (expected money/sec):");
  for (const r of results) {
    ns.tprint(
      `${r.name} | chance=${formatPct(r.chance)} | ` +
        `expected/sec=${ns.formatNumber(r.expectedPerSec)} | ` +
        `money=${ns.formatNumber(r.money)} | time=${formatTime(r.time)}`
    );
  }
}

function formatPct(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

function formatTime(ms: number): string {
  const sec = Math.round(ms / 1000);
  if (sec < 60) return `${sec}s`;
  const min = Math.floor(sec / 60);
  const rem = sec % 60;
  return `${min}m ${rem}s`;
}
