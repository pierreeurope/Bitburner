export async function main(ns: NS) {
  const server = String(ns.args[0] ?? "");
  const file = String(ns.args[1] ?? "");
  if (!server || !file) {
    ns.tprint(
      "Usage: run contracts/solve-rle-compression.js <server> <contractFile>"
    );
    return;
  }

  const input = String(ns.codingcontract.getData(file, server));
  const answer = rleCompress(input);
  const result = ns.codingcontract.attempt(answer, file, server, {
    returnReward: true,
  });
  if (result) {
    ns.tprint(`SUCCESS: ${result}`);
  } else {
    ns.tprint("FAILED: incorrect answer");
  }
}

function rleCompress(input: string): string {
  if (input.length === 0) return "";
  let out = "";
  let count = 1;
  for (let i = 1; i <= input.length; i += 1) {
    const prev = input[i - 1];
    const cur = input[i];
    if (cur === prev && count < 9) {
      count += 1;
    } else {
      out += `${count}${prev}`;
      count = 1;
    }
  }
  return out;
}
