export async function main(ns: NS) {
  const server = String(ns.args[0] ?? "");
  const file = String(ns.args[1] ?? "");
  if (!server || !file) {
    ns.tprint(
      "Usage: run contracts/solve-caesar-cipher.js <server> <contractFile>"
    );
    return;
  }

  const data = ns.codingcontract.getData(file, server) as [string, number];
  const [plain, shift] = data;
  const answer = caesarCipher(plain, shift);
  const result = ns.codingcontract.attempt(answer, file, server, {
    returnReward: true,
  });
  if (result) {
    ns.tprint(`SUCCESS: ${result}`);
  } else {
    ns.tprint("FAILED: incorrect answer");
  }
}

function caesarCipher(input: string, shift: number): string {
  const aCode = "A".charCodeAt(0);
  const zCode = "Z".charCodeAt(0);
  const span = zCode - aCode + 1;
  let out = "";
  for (const ch of input) {
    if (ch === " ") {
      out += ch;
      continue;
    }
    const code = ch.charCodeAt(0);
    const offset = (code - aCode - (shift % span) + span) % span;
    out += String.fromCharCode(aCode + offset);
  }
  return out;
}
