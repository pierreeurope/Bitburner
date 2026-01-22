export async function main(ns: NS) {
  const server = String(ns.args[0] ?? "");
  const file = String(ns.args[1] ?? "");
  if (!server || !file) {
    ns.tprint(
      "Usage: run contracts/solve-stock-trader-ii.js <server> <contractFile>"
    );
    return;
  }

  const prices = ns.codingcontract.getData(file, server) as number[];
  const answer = maxProfitUnlimited(prices);
  const result = ns.codingcontract.attempt(answer, file, server, {
    returnReward: true,
  });
  if (result) {
    ns.tprint(`SUCCESS: ${result}`);
  } else {
    ns.tprint("FAILED: incorrect answer");
  }
}

function maxProfitUnlimited(prices: number[]): number {
  let profit = 0;
  for (let i = 1; i < prices.length; i += 1) {
    const diff = prices[i] - prices[i - 1];
    if (diff > 0) profit += diff;
  }
  return profit;
}
