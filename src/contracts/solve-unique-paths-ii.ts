type Grid = number[][];

export async function main(ns: NS) {
  const server = String(ns.args[0] ?? "");
  const file = String(ns.args[1] ?? "");
  if (!server || !file) {
    ns.tprint(
      "Usage: run contracts/solve-unique-paths-ii.js <server> <contractFile>"
    );
    return;
  }

  const grid = ns.codingcontract.getData(file, server) as Grid;
  const answer = countUniquePaths(grid);
  const result = ns.codingcontract.attempt(answer, file, server, {
    returnReward: true,
  });

  if (result) {
    ns.tprint(`SUCCESS: ${result}`);
  } else {
    ns.tprint("FAILED: incorrect answer");
  }
}

function countUniquePaths(grid: Grid): number {
  const rows = grid.length;
  if (rows === 0) return 0;
  const cols = grid[0].length;
  if (cols === 0) return 0;
  if (grid[0][0] === 1 || grid[rows - 1][cols - 1] === 1) return 0;

  const dp: number[] = Array(cols).fill(0);
  dp[0] = 1;

  for (let r = 0; r < rows; r += 1) {
    for (let c = 0; c < cols; c += 1) {
      if (grid[r][c] === 1) {
        dp[c] = 0;
      } else if (c > 0) {
        dp[c] += dp[c - 1];
      }
    }
  }

  return dp[cols - 1];
}
