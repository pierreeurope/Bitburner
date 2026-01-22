export async function main(ns: NS) {
  const server = String(ns.args[0] ?? "");
  const file = String(ns.args[1] ?? "");
  if (!server || !file) {
    ns.tprint(
      "Usage: run contracts/solve-hamming-binary-to-int.js <server> <contractFile>"
    );
    return;
  }

  const encoded = String(ns.codingcontract.getData(file, server));
  const answer = decodeExtendedHamming(encoded);
  const result = ns.codingcontract.attempt(answer, file, server, {
    returnReward: true,
  });
  if (result) {
    ns.tprint(`SUCCESS: ${result}`);
  } else {
    ns.tprint("FAILED: incorrect answer");
  }
}

function decodeExtendedHamming(encoded: string): number {
  const bits = encoded.split("").map((b) => Number(b));
  const totalLen = bits.length;

  const isParityPos = (pos: number) =>
    pos === 0 || (pos & (pos - 1)) === 0;

  // Compute syndrome
  let syndrome = 0;
  for (let p = 1; p < totalLen; p <<= 1) {
    let ones = 0;
    for (let i = 1; i < totalLen; i += 1) {
      if ((i & p) === 0) continue;
      ones += bits[i];
    }
    if (ones % 2 !== 0) syndrome += p;
  }

  // Overall parity
  let totalOnes = 0;
  for (let i = 0; i < totalLen; i += 1) totalOnes += bits[i];
  const overallParity = totalOnes % 2;

  // Fix error if needed
  if (syndrome !== 0 && overallParity === 1) {
    bits[syndrome] ^= 1;
  } else if (syndrome === 0 && overallParity === 1) {
    bits[0] ^= 1;
  }

  // Extract data bits (MSB first, skipping parity positions)
  let dataBits = "";
  for (let i = 1; i < totalLen; i += 1) {
    if (!isParityPos(i)) dataBits += bits[i];
  }

  return Number(BigInt("0b" + dataBits));
}
