// @vitest-environment node
import { execFileSync } from "node:child_process";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import ExcelJS from "exceljs";
import { beforeAll, describe, expect, test } from "vitest";
import generated from "../src/data/ctcae-v6.json";
import { DEFAULT_FAVORITE_IDS } from "../src/data/defaults";
import type { CtcaeDataset } from "../src/data/types";
import { buildDataset, readSheetRows, type SheetRow } from "./parse-ctcae";

const XLSX = "data/raw/NCIt_CTCAE 6.0.xlsx";
const json = generated as CtcaeDataset;

const row = (term: string, meddraCode = "1", definition = ""): SheetRow => ({
  rowNumber: 0,
  term,
  definition,
  meddraCode,
  meddraVersion: "28.0",
});

describe("buildDataset", () => {
  test("groups grade rows under their term and tracks the SOC heading", () => {
    const ds = buildDataset([
      row("Blood and lymphatic system disorders", ""),
      row("Anemia", "1", "def"),
      row("Grade 1 Anemia", "1", "g1"),
      row("Grade 3 Anemia", "1", "g3"),
    ]);
    expect(ds.terms).toEqual([
      { id: "1", term: "Anemia", soc: "Blood and lymphatic system disorders", definition: "def", grades: { 1: "g1", 3: "g3" } },
    ]);
  });

  test("fails on a grade row without a parent term", () => {
    expect(() => buildDataset([row("SOC", ""), row("Grade 1 Anemia", "1")])).toThrow(/no parent term/);
  });

  test("fails on a term without grades", () => {
    expect(() => buildDataset([row("SOC", ""), row("Anemia", "1")])).toThrow(/has no grades/);
  });

  test("fails on a duplicate MedDRA code", () => {
    expect(() =>
      buildDataset([row("SOC", ""), row("A", "1"), row("Grade 1 A", "1"), row("B", "1")]),
    ).toThrow(/duplicate MedDRA code/);
  });
});

describe("readSheetRows", () => {
  test("build-data exits non-zero when a required column is missing", async () => {
    const dir = mkdtempSync(join(tmpdir(), "ctcae-"));
    const file = join(dir, "bad.xlsx");
    const wb = new ExcelJS.Workbook();
    wb.addWorksheet("CTCAE 6.0").addRow(["CTCAE Preferred Term", "MedDRA Code", "MedDRA Version"]);
    await wb.xlsx.writeFile(file);

    await expect(readSheetRows(file)).rejects.toThrow(/missing required column\(s\): CTCAE 6.0 Definition/);
    expect(() =>
      execFileSync("npx", ["tsx", "scripts/build-data.ts", file, join(dir, "out.json")], { stdio: "pipe" }),
    ).toThrow();
  });
});

describe("generated ctcae-v6.json", () => {
  let rows: SheetRow[];
  beforeAll(async () => {
    rows = await readSheetRows(XLSX);
  });

  test("is up to date with the XLSX", () => {
    expect(buildDataset(rows)).toEqual(json);
  });

  test("contains 850 terms with unique MedDRA codes", () => {
    expect(json.terms).toHaveLength(850);
    expect(new Set(json.terms.map((t) => t.id)).size).toBe(850);
    const termRows = rows.filter((r) => r.meddraCode && !/^Grade [1-5] /.test(r.term));
    expect(json.terms).toHaveLength(termRows.length);
  });

  test("Anemia grade 3 matches the CTCAE text", () => {
    const anemia = json.terms.find((t) => t.term === "Anemia");
    expect(anemia?.grades[3]).toBe("Hgb <8.0 g/dL; <4.9 mmol/L; <80 g/L; transfusion indicated");
    expect(anemia?.grades[5]).toBe("Death");
  });

  test("every default favorite resolves to a v6.0 term", () => {
    const names = DEFAULT_FAVORITE_IDS.map((id) => json.terms.find((t) => t.id === id)?.term);
    expect(names).toEqual([
      "Anemia",
      "Neutrophil count decreased",
      "Thrombocytopenia",
      "White blood cell decreased",
      "Febrile neutropenia",
      "Nausea",
      "Vomiting",
      "Diarrhea",
      "Mucositis oral",
      "Fatigue",
      "Peripheral sensory neuropathy",
      "Infusion related reaction",
    ]);
  });

  test("20 sampled terms match the raw XLSX cells", async () => {
    // Read cells by position, independently of readSheetRows' header lookup.
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.readFile(XLSX);
    const raw: { term: string; def: string; code: string }[] = [];
    wb.worksheets[0]!.eachRow((r, n) => {
      if (n > 1) raw.push({ term: r.getCell(5).text, def: r.getCell(6).text, code: r.getCell(8).text });
    });

    let seed = 42;
    const next = () => (seed = (seed * 1103515245 + 12345) % 2 ** 31);
    const sample = new Set<number>();
    while (sample.size < 20) sample.add(next() % json.terms.length);

    for (const i of sample) {
      const term = json.terms[i]!;
      const source = raw.filter((r) => r.code === term.id);
      expect(source.find((r) => r.term === term.term)?.def.trim()).toBe(term.definition);
      for (const [level, text] of Object.entries(term.grades)) {
        expect(source.find((r) => r.term === `Grade ${level} ${term.term}`)?.def.trim()).toBe(text);
      }
      expect(source).toHaveLength(1 + Object.keys(term.grades).length);
    }
  });
});
