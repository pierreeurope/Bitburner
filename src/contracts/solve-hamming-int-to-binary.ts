export async function main(ns: NS) {
  const server = String(ns.args[0] ?? "");
  const file = String(ns.args[1] ?? "");
  if (!server || !file) {
    ns.tprint(
      "Usage: run contracts/solve-hamming-int-to-binary.js <server> <contractFile>"
    );
    return;
  }

  const raw = ns.codingcontract.getData(file, server) as number | string;
  const value = BigInt(raw);
  const answer = encodeExtendedHamming(value);
  const result = ns.codingcontract.attempt(answer, file, server, {
    returnReward: true,
  });
  if (result) {
    ns.tprint(`SUCCESS: ${result}`);
  } else {
    ns.tprint("FAILED: incorrect answer");
  }
}

function encodeExtendedHamming(value: bigint): string {
  const dataBits = value.toString(2).split("").map((b) => Number(b));
  const m = dataBits.length;

  let parityCount = 0;
  while (2 ** parityCount < m + parityCount + 1) parityCount += 1;
  const totalLen = m + parityCount + 1; // +1 for overall parity at position 0

  const bits: number[] = Array(totalLen).fill(0);
  const isParityPos = (pos: number) =>
    pos === 0 || (pos & (pos - 1)) === 0;

  // Fill data bits (MSB first) into non-parity positions.
  let dataIdx = 0;
  for (let pos = 1; pos < totalLen; pos += 1) {
    if (isParityPos(pos)) continue;
    bits[pos] = dataBits[dataIdx] ?? 0;
    dataIdx += 1;
  }

  // Set parity bits at positions 1,2,4,8,... to even parity.
  for (let p = 1; p < totalLen; p <<= 1) {
    let ones = 0;
    for (let i = 1; i < totalLen; i += 1) {
      if ((i & p) === 0) continue;
      if (isParityPos(i)) continue; // count data bits only
      ones += bits[i];
    }
    bits[p] = ones % 2;
  }

  // Overall parity bit at position 0 (even parity over all bits).
  let totalOnes = 0;
  for (let i = 1; i < totalLen; i += 1) totalOnes += bits[i];
  bits[0] = totalOnes % 2;

  return bits.join("");
}
