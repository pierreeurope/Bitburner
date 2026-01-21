type FactionInfo = {
  name: string;
  rep: number;
};

export async function main(ns: NS) {
  const now = new Date().toISOString();
  const money = ns.getServerMoneyAvailable("home");
  const hacking = ns.getHackingLevel();
  const homeRam = ns.getServerMaxRam("home");
  const homeUsed = ns.getServerUsedRam("home");

  ns.tprint("=== Pre-Augmentation Checklist ===");
  ns.tprint(`Time: ${now}`);
  ns.tprint(`Money: ${ns.formatNumber(money)}`);
  ns.tprint(`Hacking level: ${hacking}`);
  ns.tprint(`Home RAM: ${ns.formatRam(homeRam)} (used ${ns.formatRam(homeUsed)})`);

  const purchased = ns.getPurchasedServers();
  ns.tprint(`Purchased servers: ${purchased.length}`);
  for (const server of purchased) {
    ns.tprint(
      `  ${server} | RAM ${ns.formatRam(ns.getServerMaxRam(server))} | ` +
        `running scripts ${ns.ps(server).length}`
    );
  }

  const contracts = countContracts(ns);
  ns.tprint(`Coding contracts remaining: ${contracts}`);

  if (ns.singularity) {
    const player = ns.getPlayer();
    const factions = player.factions.map((name) => ({
      name,
      rep: ns.singularity.getFactionRep(name),
    }));
    factions.sort((a, b) => b.rep - a.rep);

    const owned = ns.singularity.getOwnedAugmentations(true);
    const installed = ns.singularity.getOwnedAugmentations(false);

    ns.tprint(`Factions (${factions.length}):`);
    for (const f of factions) {
      ns.tprint(`  ${f.name} | rep ${ns.formatNumber(f.rep)}`);
    }

    ns.tprint(`Augmentations installed: ${installed.length}`);
    for (const aug of installed) ns.tprint(`  ${aug}`);
    ns.tprint(`Augmentations purchased (includes installed): ${owned.length}`);
  } else {
    ns.tprint(
      "Singularity API not available: faction reps and augment lists skipped."
    );
  }

  ns.tprint("Checklist reminders:");
  ns.tprint("- Finish or solve coding contracts you care about");
  ns.tprint("- Spend excess money on home RAM/cores or servers");
  ns.tprint("- Make sure your local scripts are synced (Remote API)");
}

function countContracts(ns: NS): number {
  const visited = new Set<string>(["home"]);
  const queue: string[] = ["home"];
  let count = 0;

  while (queue.length > 0) {
    const host = queue.shift() as string;
    for (const neighbor of ns.scan(host)) {
      if (visited.has(neighbor)) continue;
      visited.add(neighbor);
      queue.push(neighbor);
    }
    count += ns.ls(host, ".cct").length;
  }

  return count;
}
