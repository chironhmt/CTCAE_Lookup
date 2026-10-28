import { writeFileSync } from "node:fs";
import { buildDataset, readSheet } from "./parse-ctcae";

/** Source workbook → generated JSON for each bundled CTCAE version. */
export const SOURCES = [
  { input: "data/raw/NCIt_CTCAE 6.0.xlsx", output: "src/data/ctcae-v6.json" },
  { input: "data/raw/NCIt_CTCAE_5.0.xls", output: "src/data/ctcae-v5.json" },
];

// With arguments, convert one file: `npm run data -- <input> <output>`.
const [input, output] = process.argv.slice(2);
const jobs = input && output ? [{ input, output }] : SOURCES;

for (const job of jobs) {
  const { version, rows } = readSheet(job.input);
  const dataset = buildDataset(rows, version);
  writeFileSync(job.output, JSON.stringify(dataset) + "\n");
  console.log(`Wrote ${dataset.terms.length} CTCAE v${version} terms to ${job.output}`);
}
