export async function main(ns: NS) {
  const server = String(ns.args[0] ?? "");
  const file = String(ns.args[1] ?? "");
  if (!server || !file) {
    ns.tprint(
      "Usage: run contracts/solve-total-ways-to-sum.js <server> <contractFile>"
    );
    return;
  }

  const n = Number(ns.codingcontract.getData(file, server));
  const answer = totalWaysToSum(n);
  const result = ns.codingcontract.attempt(answer, file, server, {
    returnReward: true,
  });
  if (result) {
    ns.tprint(`SUCCESS: ${result}`);
  } else {
    ns.tprint("FAILED: incorrect answer");
  }
}

function totalWaysToSum(n: number): number {
  // Number of integer partitions of n, excluding the partition of n itself.
  const dp = Array(n + 1).fill(0);
  dp[0] = 1;
  for (let i = 1; i <= n; i += 1) {
    for (let j = i; j <= n; j += 1) {
      dp[j] += dp[j - i];
    }
  }
  return dp[n] - 1;
}
