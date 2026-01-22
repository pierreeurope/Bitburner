export async function main(ns: NS) {
  if (ns.args.length < 2) {
    ns.tprint("Usage: run solve-unique-paths-i.js <server> <contract-file>");
    return;
  }

  const server = String(ns.args[0]);
  const file = String(ns.args[1]);

  const data = ns.codingcontract.getData(file, server);
  const [rows, cols] = data as [number, number];

  // Number of unique paths = C(rows+cols-2, rows-1)
  // We need (rows-1) down moves and (cols-1) right moves
  // Total moves = rows + cols - 2
  const result = binomialCoefficient(rows + cols - 2, rows - 1);

  const reward = ns.codingcontract.attempt(result, file, server);
  if (reward) {
    ns.tprint(`Contract solved! Reward: ${reward}`);
  } else {
    ns.tprint("Failed to solve contract.");
  }
}

function binomialCoefficient(n: number, k: number): number {
  if (k > n - k) k = n - k; // Use symmetry
  let result = 1;
  for (let i = 0; i < k; i++) {
    result = result * (n - i) / (i + 1);
  }
  return result;
}
