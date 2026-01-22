export async function main(ns: NS) {
  const server = String(ns.args[0] ?? "");
  const file = String(ns.args[1] ?? "");
  if (!server || !file) {
    ns.tprint(
      "Usage: run contracts/solve-max-subarray-sum.js <server> <contractFile>"
    );
    return;
  }

  const arr = ns.codingcontract.getData(file, server) as number[];
  const answer = maxSubarraySum(arr);
  const result = ns.codingcontract.attempt(answer, file, server, {
    returnReward: true,
  });
  if (result) {
    ns.tprint(`SUCCESS: ${result}`);
  } else {
    ns.tprint("FAILED: incorrect answer");
  }
}

function maxSubarraySum(nums: number[]): number {
  let best = nums[0] ?? 0;
  let cur = nums[0] ?? 0;
  for (let i = 1; i < nums.length; i += 1) {
    cur = Math.max(nums[i], cur + nums[i]);
    best = Math.max(best, cur);
  }
  return best;
}
