type Step = {
  script: string;
  args: (string | number | boolean)[];
  label: string;
};

export async function main(ns: NS) {
  const steps: Step[] = [
    { script: "early/1_bootstrap-hwg.js", args: [], label: "bootstrap HWG" },
    { script: "early/2_hacknet-roi.js", args: [], label: "hacknet ROI" },
    { script: "early/3_rotate-hwg.js", args: [], label: "rotate HWG" },
    { script: "early/4_fleet-auto.js", args: [], label: "auto fleet" },
  ];

  const launched: string[] = [];
  for (const step of steps) {
    if (!ns.fileExists(step.script, "home")) {
      ns.tprint(`Missing ${step.script}, skipping.`);
      continue;
    }
    const pid = ns.exec(step.script, "home", 1, ...step.args);
    if (pid === 0) {
      ns.tprint(`Not enough RAM to start ${step.label}.`);
      break;
    }
    launched.push(step.label);
    await ns.sleep(100);
  }

  if (launched.length === 0) {
    ns.tprint("No steps launched.");
  } else {
    ns.tprint(`Launched: ${launched.join(", ")}`);
  }
}
