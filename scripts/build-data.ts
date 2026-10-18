import { writeFileSync } from "node:fs";
import { buildDataset, readSheetRows } from "./parse-ctcae";

const input = process.argv[2] ?? "data/raw/NCIt_CTCAE 6.0.xlsx";
const output = process.argv[3] ?? "src/data/ctcae-v6.json";

const dataset = buildDataset(await readSheetRows(input));
writeFileSync(output, JSON.stringify(dataset) + "\n");
console.log(`Wrote ${dataset.terms.length} terms to ${output}`);
