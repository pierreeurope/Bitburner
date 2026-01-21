type Matrix = number[][];

export async function main(ns: NS) {
  const server = String(ns.args[0] ?? "");
  const file = String(ns.args[1] ?? "");
  if (!server || !file) {
    ns.tprint(
      "Usage: run contracts/solve-spiralize-matrix.js <server> <contractFile>"
    );
    return;
  }

  const matrix = ns.codingcontract.getData(file, server) as Matrix;
  const answer = spiralize(matrix);
  const result = ns.codingcontract.attempt(answer, file, server, {
    returnReward: true,
  });
  if (result) {
    ns.tprint(`SUCCESS: ${result}`);
  } else {
    ns.tprint("FAILED: incorrect answer");
  }
}

function spiralize(matrix: Matrix): number[] {
  const result: number[] = [];
  if (matrix.length === 0) return result;
  let top = 0;
  let bottom = matrix.length - 1;
  let left = 0;
  let right = matrix[0].length - 1;

  while (top <= bottom && left <= right) {
    for (let c = left; c <= right; c += 1) result.push(matrix[top][c]);
    top += 1;

    for (let r = top; r <= bottom; r += 1) result.push(matrix[r][right]);
    right -= 1;

    if (top <= bottom) {
      for (let c = right; c >= left; c -= 1) result.push(matrix[bottom][c]);
      bottom -= 1;
    }

    if (left <= right) {
      for (let r = bottom; r >= top; r -= 1) result.push(matrix[r][left]);
      left += 1;
    }
  }

  return result;
}
