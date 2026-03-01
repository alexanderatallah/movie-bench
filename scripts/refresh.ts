import { execSync } from "child_process";

const steps = [
  { name: "Fetch movies", cmd: "tsx scripts/fetch-movies.ts" },
  { name: "Run benchmark", cmd: "tsx scripts/run-benchmark.ts" },
  { name: "Build data", cmd: "tsx scripts/build-data.ts" },
];

for (const step of steps) {
  console.log(`\n${"=".repeat(60)}`);
  console.log(`  ${step.name}`);
  console.log(`${"=".repeat(60)}\n`);
  execSync(step.cmd, { stdio: "inherit", env: { ...process.env } });
}

console.log("\n✓ Refresh complete!");
