import { NS } from "@ns";

/** @param {NS} ns */
export async function main(ns: NS) {
  const scriptName = String(ns.args[0] || "deploy/maximize-hwg.js");
  const outputFile = String(ns.args[1] || "logs.json");
  const maxLines = Number(ns.args[2] || 1000);

  ns.tprint(`Exporting logs from ${scriptName} to ${outputFile}...`);

  // Get all running instances of the script
  const processes = ns.ps("home").filter((p) => p.filename === scriptName);
  
  if (processes.length === 0) {
    ns.tprint(`No running instances of ${scriptName} found.`);
    return;
  }

  // Collect log data
  const logData: any = {
    timestamp: new Date().toISOString(),
    script: scriptName,
    processes: processes.length,
    logs: [],
  };

  // Note: Bitburner doesn't have a direct way to read script logs
  // We'll create a structure that can be filled manually or via a modified script
  ns.tprint(`Found ${processes.length} running instance(s).`);
  ns.tprint(`To export logs, you'll need to modify ${scriptName} to write logs to a file.`);
  ns.tprint(`Creating template log structure...`);

  // Write template
  const template = JSON.stringify(logData, null, 2);
  ns.write(outputFile, template, "w");
  
  ns.tprint(`Template written to ${outputFile}`);
  ns.tprint(`Modify ${scriptName} to use ns.write() to append log entries.`);
}
