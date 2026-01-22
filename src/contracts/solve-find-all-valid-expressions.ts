export async function main(ns: NS) {
  const server = String(ns.args[0] ?? "");
  const file = String(ns.args[1] ?? "");
  if (!server || !file) {
    ns.tprint(
      "Usage: run contracts/solve-find-all-valid-expressions.js <server> <contractFile>"
    );
    return;
  }

  const data = ns.codingcontract.getData(file, server) as [string, number];
  const [digits, target] = data;
  const answer = findExpressions(digits, target);
  const result = ns.codingcontract.attempt(answer, file, server, {
    returnReward: true,
  });
  if (result) {
    ns.tprint(`SUCCESS: ${result}`);
  } else {
    ns.tprint("FAILED: incorrect answer");
  }
}

function findExpressions(digits: string, target: number): string[] {
  const results: string[] = [];

  const dfs = (
    index: number,
    expr: string,
    value: number,
    lastMul: number
  ) => {
    if (index === digits.length) {
      if (value === target) results.push(expr);
      return;
    }

    for (let i = index; i < digits.length; i += 1) {
      if (i !== index && digits[index] === "0") break;
      const part = digits.slice(index, i + 1);
      const num = Number(part);
      if (index === 0) {
        dfs(i + 1, part, num, num);
      } else {
        dfs(i + 1, `${expr}+${part}`, value + num, num);
        dfs(i + 1, `${expr}-${part}`, value - num, -num);
        dfs(
          i + 1,
          `${expr}*${part}`,
          value - lastMul + lastMul * num,
          lastMul * num
        );
      }
    }
  };

  dfs(0, "", 0, 0);
  return results;
}
