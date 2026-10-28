import { readFileSync } from "node:fs";
import * as XLSX from "xlsx";
import type { CtcaeDataset, CtcaeTerm, GradeLevel } from "../src/data/types";

/** Accepted header names per column; NCI renamed some columns between CTCAE releases. */
export const REQUIRED_HEADERS = {
  term: ["CTCAE Preferred Term", "CTCAE PT"],
  ncitTerm: ["NCIt Preferred Term", "NCIt PT"],
  meddraCode: ["MedDRA Code"],
  meddraVersion: ["MedDRA Version"],
} as const;

/** "CTCAE 6.0 Definition"; also tells us which CTCAE version the sheet is. */
const DEFINITION_HEADER = /^CTCAE (\d+\.\d+) Definition$/;

const GRADE_ROW = /^Grade ([1-5]) (.+)$/;

/** One data row of the NCIt CTCAE sheet, reduced to the columns we use. */
export interface SheetRow {
  rowNumber: number;
  term: string;
  /** NCIt preferred term, e.g. "Blood and Lymphatic System Disorders, CTCAE". */
  ncitTerm: string;
  definition: string;
  meddraCode: string;
  meddraVersion: string;
}

export interface Sheet {
  /** CTCAE version from the definition column header, e.g. "6.0". */
  version: string;
  rows: SheetRow[];
}

/** Read the first sheet of an NCIt CTCAE workbook (.xlsx or legacy .xls). */
export function readSheet(path: string): Sheet {
  const workbook = XLSX.read(readFileSync(path));
  const sheetName = workbook.SheetNames[0];
  if (sheetName === undefined) throw new Error(`${path}: workbook has no sheets`);
  const table = XLSX.utils.sheet_to_json<string[]>(workbook.Sheets[sheetName]!, {
    header: 1,
    defval: "",
    raw: false,
    // Keep blank rows so array index + 1 is the sheet row number; they are dropped below.
    blankrows: true,
  });

  const header = (table[0] ?? []).map((h) => String(h).trim());
  const definitionCol = header.findIndex((h) => DEFINITION_HEADER.test(h));
  const cols = Object.fromEntries(
    Object.entries(REQUIRED_HEADERS).map(([key, names]) => [key, header.findIndex((h) => names.includes(h as never))]),
  ) as Record<keyof typeof REQUIRED_HEADERS, number>;
  const missing = Object.entries(cols)
    .filter(([, col]) => col === -1)
    .map(([key]) => REQUIRED_HEADERS[key as keyof typeof REQUIRED_HEADERS].join(" or "));
  if (definitionCol === -1) missing.push("CTCAE <version> Definition");
  if (missing.length > 0) {
    throw new Error(`${path}: missing required column(s): ${missing.join(", ")}`);
  }

  const rows: SheetRow[] = [];
  table.forEach((cells, index) => {
    if (index === 0 || cells.every((cell) => String(cell).trim() === "")) return;
    const text = (col: number) => String(cells[col] ?? "").trim();
    rows.push({
      rowNumber: index + 1,
      term: text(cols.term),
      ncitTerm: text(cols.ncitTerm),
      definition: text(definitionCol),
      meddraCode: text(cols.meddraCode),
      meddraVersion: text(cols.meddraVersion),
    });
  });
  return { version: DEFINITION_HEADER.exec(header[definitionCol]!)![1]!, rows };
}

/**
 * System Organ Class name for a heading row. v5.0 leaves the CTCAE term blank
 * on these rows, so fall back to the NCIt term ("Cardiac Disorders, CTCAE")
 * in MedDRA's sentence case ("Cardiac disorders").
 */
function socName(row: SheetRow): string {
  if (row.term) return row.term;
  const name = row.ncitTerm.replace(/, CTCAE( \d+\.\d+)?$/, "");
  return name.charAt(0).toUpperCase() + name.slice(1).toLowerCase();
}

/**
 * Group sheet rows into terms. Rows without a MedDRA code are System Organ
 * Class headings; each term has "Grade N <term>" rows that share its MedDRA
 * code. Grade rows usually follow their term, but v5.0 lists one term after
 * its grades, so grades are attached once all terms are known.
 */
export function buildDataset(rows: SheetRow[], version: string): CtcaeDataset {
  const terms: CtcaeTerm[] = [];
  const byCode = new Map<string, CtcaeTerm>();
  const gradeRows: { row: SheetRow; grade: RegExpExecArray }[] = [];
  let soc = "";
  let termRowCount = 0;

  for (const row of rows) {
    if (!row.meddraCode) {
      // The "CTCAE by Body System" root row is not an organ class.
      soc = /by Body System$/.test(row.ncitTerm) ? "" : socName(row);
      continue;
    }
    const grade = GRADE_ROW.exec(row.term);
    if (grade) {
      gradeRows.push({ row, grade });
      continue;
    }
    termRowCount++;
    if (byCode.has(row.meddraCode)) {
      throw new Error(`Row ${row.rowNumber}: duplicate MedDRA code ${row.meddraCode}`);
    }
    if (!soc) throw new Error(`Row ${row.rowNumber}: term "${row.term}" has no System Organ Class`);
    const term: CtcaeTerm = { id: row.meddraCode, term: row.term, soc, definition: row.definition, grades: {} };
    terms.push(term);
    byCode.set(row.meddraCode, term);
  }

  for (const { row, grade } of gradeRows) {
    const [, level, name] = grade;
    const parent = byCode.get(row.meddraCode);
    if (!parent || parent.term.toLowerCase() !== name!.toLowerCase()) {
      throw new Error(`Row ${row.rowNumber}: grade row "${row.term}" has no parent term`);
    }
    parent.grades[Number(level) as GradeLevel] = row.definition;
  }

  if (terms.length !== termRowCount) {
    throw new Error(`Term count ${terms.length} does not match ${termRowCount} term rows`);
  }
  if (terms.length === 0) throw new Error("No terms found");
  for (const term of terms) {
    if (Object.keys(term.grades).length === 0) throw new Error(`Term "${term.term}" has no grades`);
  }

  return {
    version,
    source: `NCI Common Terminology Criteria for Adverse Events (CTCAE) v${version}`,
    meddraVersion: rows.find((r) => r.meddraVersion)?.meddraVersion ?? "",
    terms,
  };
}
