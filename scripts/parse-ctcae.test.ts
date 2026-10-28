// @vitest-environment node
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import * as XLSX from "xlsx";
import { describe, expect, test } from "vitest";
import v5json from "../src/data/ctcae-v5.json";
import v6json from "../src/data/ctcae-v6.json";
import { RENAMED, resolveTerm, type CtcaeVersion } from "../src/data/dataset";
import { DEFAULT_FAVORITE_IDS } from "../src/data/defaults";
import type { CtcaeDataset } from "../src/data/types";
import { buildDataset, readSheet, type SheetRow } from "./parse-ctcae";

const row = (term: string, meddraCode = "1", definition = "", ncitTerm = ""): SheetRow => ({
  rowNumber: 0,
  term,
  ncitTerm,
  definition,
  meddraCode,
  meddraVersion: "28.0",
});

describe("buildDataset", () => {
  test("groups grade rows under their term and tracks the SOC heading", () => {
    const ds = buildDataset(
      [
        row("Blood and lymphatic system disorders", ""),
        row("Anemia", "1", "def"),
        row("Grade 1 Anemia", "1", "g1"),
        row("Grade 3 Anemia", "1", "g3"),
      ],
      "6.0",
    );
    expect(ds.version).toBe("6.0");
    expect(ds.terms).toEqual([
      { id: "1", term: "Anemia", soc: "Blood and lymphatic system disorders", definition: "def", grades: { 1: "g1", 3: "g3" } },
    ]);
  });

  test("takes the SOC from the NCIt term when the CTCAE term is blank (v5.0)", () => {
    const ds = buildDataset(
      [
        row("", "", "", "CTCAE by Body System"),
        row("", "", "", "Neoplasms Benign, Malignant and Unspecified (Incl Cysts and Polyps), CTCAE"),
        row("A", "1"),
        row("Grade 1 A", "1", "g1"),
      ],
      "5.0",
    );
    expect(ds.terms[0]?.soc).toBe("Neoplasms benign, malignant and unspecified (incl cysts and polyps)");
  });

  test("accepts grade rows listed before their term", () => {
    const ds = buildDataset([row("SOC", ""), row("Grade 1 A", "1", "g1"), row("A", "1", "def")], "5.0");
    expect(ds.terms[0]?.grades).toEqual({ 1: "g1" });
  });

  test("fails on a grade row without a parent term", () => {
    expect(() => buildDataset([row("SOC", ""), row("Grade 1 Anemia", "1")], "6.0")).toThrow(/no parent term/);
  });

  test("fails on a term without grades", () => {
    expect(() => buildDataset([row("SOC", ""), row("Anemia", "1")], "6.0")).toThrow(/has no grades/);
  });

  test("fails on a term before any SOC heading", () => {
    expect(() =>
      buildDataset([row("", "", "", "CTCAE by Body System"), row("A", "1"), row("Grade 1 A", "1")], "5.0"),
    ).toThrow(/has no System Organ Class/);
  });

  test("fails on a duplicate MedDRA code", () => {
    expect(() =>
      buildDataset([row("SOC", ""), row("A", "1"), row("Grade 1 A", "1"), row("B", "1")], "6.0"),
    ).toThrow(/duplicate MedDRA code/);
  });
});

describe("readSheet", () => {
  test("build-data exits non-zero when a required column is missing", () => {
    const dir = mkdtempSync(join(tmpdir(), "ctcae-"));
    const file = join(dir, "bad.xlsx");
    const wb = XLSX.utils.book_new();
    const header = ["NCIt Preferred Term", "CTCAE Preferred Term", "MedDRA Code", "MedDRA Version"];
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([header]), "CTCAE 6.0");
    writeFileSync(file, XLSX.write(wb, { type: "buffer", bookType: "xlsx" }));

    expect(() => readSheet(file)).toThrow(/missing required column\(s\): CTCAE <version> Definition/);
    expect(() =>
      execFileSync("npx", ["tsx", "scripts/build-data.ts", file, join(dir, "out.json")], { stdio: "pipe" }),
    ).toThrow();
  });
});

const VERSIONS: {
  version: CtcaeVersion;
  file: string;
  json: CtcaeDataset;
  count: number;
  meddra: string;
  defaults: string[];
}[] = [
  {
    version: "6.0",
    file: "data/raw/NCIt_CTCAE 6.0.xlsx",
    json: v6json as CtcaeDataset,
    count: 850,
    meddra: "28.0",
    defaults: [
      "Neutrophil count decreased",
      "Thrombocytopenia",
      "Anemia",
      "Nausea",
      "Vomiting",
      "Diarrhea",
      "Infusion related reaction",
      "Peripheral sensory neuropathy",
    ],
  },
  {
    version: "5.0",
    file: "data/raw/NCIt_CTCAE_5.0.xls",
    json: v5json as CtcaeDataset,
    count: 837,
    meddra: "20.1",
    defaults: [
      "Neutrophil count decreased",
      "Platelet count decreased",
      "Anemia",
      "Nausea",
      "Vomiting",
      "Diarrhea",
      "Infusion related reaction",
      "Peripheral sensory neuropathy",
    ],
  },
];

describe.each(VERSIONS)("generated CTCAE v$version JSON", ({ version, file, json, count, meddra, defaults }) => {
  const sheet = readSheet(file);

  test("is up to date with the source workbook", () => {
    expect(sheet.version).toBe(version);
    expect(buildDataset(sheet.rows, sheet.version)).toEqual(json);
    expect(json.meddraVersion).toBe(meddra);
  });

  test(`contains ${count} terms with unique MedDRA codes`, () => {
    expect(json.terms).toHaveLength(count);
    expect(new Set(json.terms.map((t) => t.id)).size).toBe(count);
    const termRows = sheet.rows.filter((r) => r.meddraCode && !/^Grade [1-5] /.test(r.term));
    expect(json.terms).toHaveLength(termRows.length);
  });

  test("Anemia grade 3 matches the CTCAE text", () => {
    const anemia = json.terms.find((t) => t.term === "Anemia");
    expect(anemia?.grades[3]).toBe("Hgb <8.0 g/dL; <4.9 mmol/L; <80 g/L; transfusion indicated");
    expect(anemia?.grades[5]).toBe("Death");
  });

  test("every default favorite resolves to a term", () => {
    expect(DEFAULT_FAVORITE_IDS.map((id) => resolveTerm(version, id)?.term)).toEqual(defaults);
  });

  test("20 sampled terms match the raw workbook cells", () => {
    // Read cells by position, independently of readSheet's header lookup.
    const wb = XLSX.read(readFileSync(file));
    const table = XLSX.utils.sheet_to_json<string[]>(wb.Sheets[wb.SheetNames[0]!]!, { header: 1, defval: "", raw: false });
    const raw = table.slice(1).map((r) => ({ term: String(r[4]).trim(), def: String(r[5]), code: String(r[7]) }));

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

test("every SOC name in v5.0 matches a v6.0 SOC name", () => {
  const v6Socs = new Set((v6json as CtcaeDataset).terms.map((t) => t.soc));
  expect((v5json as CtcaeDataset).terms.map((t) => t.soc).filter((s) => !v6Socs.has(s))).toEqual([]);
});

test("each renamed pair maps a v5.0-only code to a v6.0-only code", () => {
  const ids = (ds: CtcaeDataset) => new Set(ds.terms.map((t) => t.id));
  const [v5ids, v6ids] = [ids(v5json as CtcaeDataset), ids(v6json as CtcaeDataset)];
  for (const [v5id, v6id] of RENAMED) {
    expect([v5ids.has(v5id), v6ids.has(v5id), v5ids.has(v6id), v6ids.has(v6id)]).toEqual([true, false, false, true]);
  }
});
