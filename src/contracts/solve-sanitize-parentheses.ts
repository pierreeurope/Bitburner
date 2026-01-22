export async function main(ns: NS) {
  if (ns.args.length < 2) {
    ns.tprint("Usage: run solve-sanitize-parentheses.js <server> <contract-file>");
    return;
  }

  const server = String(ns.args[0]);
  const file = String(ns.args[1]);

  const data = ns.codingcontract.getData(file, server);
  const input = String(data);

  const result = sanitizeParentheses(input);

  const reward = ns.codingcontract.attempt(result, file, server);
  if (reward) {
    ns.tprint(`Contract solved! Reward: ${reward}`);
  } else {
    ns.tprint("Failed to solve contract.");
  }
}

function sanitizeParentheses(s: string): string[] {
  // First, find minimum removals needed
  const minRemovals = findMinRemovals(s);
  if (minRemovals === -1) return [""];

  // Generate all valid strings with exactly minRemovals removed
  const result: Set<string> = new Set();
  generateValid(s, 0, 0, 0, minRemovals, "", result);
  
  return Array.from(result);
}

function findMinRemovals(s: string): number {
  let left = 0;
  let right = 0;
  let removals = 0;

  for (const c of s) {
    if (c === "(") {
      left++;
    } else if (c === ")") {
      if (left > 0) {
        left--;
      } else {
        right++;
      }
    }
  }

  return left + right;
}

function generateValid(
  s: string,
  index: number,
  leftCount: number,
  rightCount: number,
  removalsLeft: number,
  current: string,
  result: Set<string>
) {
  if (index === s.length) {
    if (leftCount === 0 && rightCount === 0 && removalsLeft === 0) {
      result.add(current);
    }
    return;
  }

  const c = s[index];

  // Skip this character (remove it) if it's a parenthesis and we have removals left
  if (removalsLeft > 0 && (c === "(" || c === ")")) {
    generateValid(
      s,
      index + 1,
      leftCount,
      rightCount,
      removalsLeft - 1,
      current,
      result
    );
  }

  // Keep this character
  if (c === "(") {
    generateValid(
      s,
      index + 1,
      leftCount + 1,
      rightCount,
      removalsLeft,
      current + c,
      result
    );
  } else if (c === ")") {
    if (leftCount > rightCount) {
      generateValid(
        s,
        index + 1,
        leftCount,
        rightCount + 1,
        removalsLeft,
        current + c,
        result
      );
    }
  } else {
    // Regular character, always keep
    generateValid(
      s,
      index + 1,
      leftCount,
      rightCount,
      removalsLeft,
      current + c,
      result
    );
  }
}
