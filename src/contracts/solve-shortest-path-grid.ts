type Grid = number[][];

type Node = {
  r: number;
  c: number;
  path: string;
};

export async function main(ns: NS) {
  const server = String(ns.args[0] ?? "");
  const file = String(ns.args[1] ?? "");
  if (!server || !file) {
    ns.tprint(
      "Usage: run contracts/solve-shortest-path-grid.js <server> <contractFile>"
    );
    return;
  }

  const grid = ns.codingcontract.getData(file, server) as Grid;
  const answer = shortestPath(grid);
  const result = ns.codingcontract.attempt(answer, file, server, {
    returnReward: true,
  });
  if (result) {
    ns.tprint(`SUCCESS: ${result}`);
  } else {
    ns.tprint("FAILED: incorrect answer");
  }
}

function shortestPath(grid: Grid): string {
  const rows = grid.length;
  if (rows === 0) return "";
  const cols = grid[0].length;
  if (cols === 0) return "";
  if (grid[0][0] === 1 || grid[rows - 1][cols - 1] === 1) return "";

  const visited = Array.from({ length: rows }, () =>
    Array(cols).fill(false)
  );
  const queue: Node[] = [{ r: 0, c: 0, path: "" }];
  visited[0][0] = true;

  const dirs = [
    { dr: 1, dc: 0, ch: "D" },
    { dr: 0, dc: 1, ch: "R" },
    { dr: -1, dc: 0, ch: "U" },
    { dr: 0, dc: -1, ch: "L" },
  ];

  while (queue.length > 0) {
    const cur = queue.shift() as Node;
    if (cur.r === rows - 1 && cur.c === cols - 1) return cur.path;
    for (const d of dirs) {
      const nr = cur.r + d.dr;
      const nc = cur.c + d.dc;
      if (nr < 0 || nc < 0 || nr >= rows || nc >= cols) continue;
      if (visited[nr][nc]) continue;
      if (grid[nr][nc] === 1) continue;
      visited[nr][nc] = true;
      queue.push({ r: nr, c: nc, path: cur.path + d.ch });
    }
  }

  return "";
}
