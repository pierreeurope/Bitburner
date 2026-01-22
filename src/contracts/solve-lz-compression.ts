export async function main(ns: NS) {
  if (ns.args.length < 2) {
    ns.tprint("Usage: run solve-lz-compression.js <server> <contract-file>");
    return;
  }

  const server = String(ns.args[0]);
  const file = String(ns.args[1]);

  const data = ns.codingcontract.getData(file, server);
  const input = String(data);

  const result = compressLZ(input);

  const reward = ns.codingcontract.attempt(result, file, server);
  if (reward) {
    ns.tprint(`Contract solved! Reward: ${reward}`);
  } else {
    ns.tprint("Failed to solve contract.");
  }
}

function compressLZ(input: string): string {
  const n = input.length;
  // dp[i][lastType] = best encoding for input[0..i) where lastType: 0=type1, 1=type2, -1=start
  type State = { cost: number; encoding: string };
  const dp: Array<Array<State>> = Array.from({ length: n + 1 }, () => [
    { cost: Infinity, encoding: "" },
    { cost: Infinity, encoding: "" },
    { cost: Infinity, encoding: "" },
  ]);
  
  // Start state: no chunks yet (lastType = -1, stored at index 2)
  dp[0][2] = { cost: 0, encoding: "" };

  for (let i = 1; i <= n; i++) {
    // Try type 1 chunks (literal) - can follow type 2 or start
    for (let len = 1; len <= 9 && i - len >= 0; len++) {
      const start = i - len;
      const literal = input.substring(start, i);
      
      // Can come from type 2 (index 1) or start (index 2)
      const prevCost = Math.min(
        dp[start][1].cost,
        dp[start][2].cost
      );
      if (prevCost < Infinity) {
        const cost = prevCost + 1 + len; // 1 for length digit, len for chars
        if (cost < dp[i][0].cost) {
          const prevEncoding = dp[start][1].cost < dp[start][2].cost 
            ? dp[start][1].encoding 
            : dp[start][2].encoding;
          dp[i][0] = {
            cost,
            encoding: prevEncoding + len + literal,
          };
        }
      }
    }

    // Try type 2 chunks (reference) - must follow type 1
    for (let len = 1; len <= 9 && i - len >= 0; len++) {
      const start = i - len;
      // Try all possible back references (1-9 positions)
      for (let back = 1; back <= 9 && start - back >= 0; back++) {
        // Check if reference is valid
        let valid = true;
        for (let j = 0; j < len; j++) {
          if (input[start - back + j] !== input[start + j]) {
            valid = false;
            break;
          }
        }
        if (valid) {
          const prevCost = dp[start][0].cost; // Must come from type 1
          if (prevCost < Infinity) {
            const cost = prevCost + 2; // 1 for length, 1 for back distance
            if (cost < dp[i][1].cost) {
              dp[i][1] = {
                cost,
                encoding: dp[start][0].encoding + len + back,
              };
            }
          }
        }
      }
    }
  }

  // Return best encoding (ending with either type 1 or type 2)
  const best = dp[n][0].cost < dp[n][1].cost ? dp[n][0] : dp[n][1];
  return best.encoding;
}
