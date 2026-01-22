export async function main(ns: NS) {
  if (ns.args.length < 2) {
    ns.tprint("Usage: run solve-square-root.js <server> <contract-file>");
    return;
  }

  const server = String(ns.args[0]);
  const file = String(ns.args[1]);

  const data = ns.codingcontract.getData(file, server);
  const num = BigInt(data);

  // Use Newton's method for square root of BigInt
  // Start with an initial guess: sqrt(n) ≈ n / 2
  let x = num / 2n;
  let prev = 0n;

  // Newton's method: x_new = (x + n/x) / 2
  while (x !== prev) {
    prev = x;
    x = (x + num / x) / 2n;
  }

  // Round to nearest integer
  const result = x.toString();

  const reward = ns.codingcontract.attempt(result, file, server);
  if (reward) {
    ns.tprint(`Contract solved! Reward: ${reward}`);
  } else {
    ns.tprint("Failed to solve contract.");
  }
}
