type ContractInfo = {
  server: string;
  file: string;
  type: string;
  reward: string;
  data: string;
  description?: string;
};

export async function main(ns: NS) {
  const includeDescription = ns.args.includes("--desc");

  const contracts = findContracts(ns, includeDescription);
  if (contracts.length === 0) {
    ns.tprint("No coding contracts found.");
    return;
  }

  ns.tprint(`Found ${contracts.length} contract(s):`);
  for (const c of contracts) {
    ns.tprint(
      `[${c.server}] ${c.file} | ${c.type} | Reward: ${c.reward} | Data: ${c.data}`
    );
    if (c.description) {
      ns.tprint(`  Description: ${c.description}`);
    }
  }
}

function findContracts(ns: NS, includeDescription: boolean): ContractInfo[] {
  const visited = new Set<string>(["home"]);
  const queue: string[] = ["home"];
  const results: ContractInfo[] = [];

  while (queue.length > 0) {
    const host = queue.shift() as string;
    for (const neighbor of ns.scan(host)) {
      if (visited.has(neighbor)) continue;
      visited.add(neighbor);
      queue.push(neighbor);
    }

    const files = ns.ls(host, ".cct");
    for (const file of files) {
      const type = ns.codingcontract.getContractType(file, host);
      const data = ns.codingcontract.getData(file, host);
      const reward = ns.codingcontract.getReward(file, host);
      const entry: ContractInfo = {
        server: host,
        file,
        type,
        reward,
        data: stringifyData(data),
      };
      if (includeDescription) {
        entry.description = ns.codingcontract.getDescription(file, host);
      }
      results.push(entry);
    }
  }

  return results;
}

function stringifyData(data: unknown): string {
  if (typeof data === "string") return data;
  try {
    return JSON.stringify(data);
  } catch {
    return String(data);
  }
}
