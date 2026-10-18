import ExcelJS from "exceljs";
import type { CtcaeDataset, CtcaeTerm, GradeLevel } from "../src/data/types";

export const REQUIRED_HEADERS = [
  "CTCAE Preferred Term",
  "CTCAE 6.0 Definition",
  "MedDRA Code",
  "MedDRA Version",
] as const;

const GRADE_ROW = /^Grade ([1-5]) (.+)$/;

/** One data row of the NCIt CTCAE sheet, reduced to the columns we use. */
export interface SheetRow {
  rowNumber: number;
  term: string;
  definition: string;
  meddraCode: string;
  meddraVersion: string;
}

export async function readSheetRows(xlsxPath: string): Promise<SheetRow[]> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(xlsxPath);
  const sheet = workbook.worksheets[0];
  if (!sheet) throw new Error(`${xlsxPath}: workbook has no sheets`);

  const headers = new Map<string, number>();
  sheet.getRow(1).eachCell((cell, col) => headers.set(cell.text.trim(), col));
  const missing = REQUIRED_HEADERS.filter((h) => !headers.has(h));
  if (missing.length > 0) {
    throw new Error(`${xlsxPath}: missing required column(s): ${missing.join(", ")}`);
  }
  const col = (name: (typeof REQUIRED_HEADERS)[number]) => headers.get(name)!;

  const rows: SheetRow[] = [];
  sheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;
    const text = (name: (typeof REQUIRED_HEADERS)[number]) => row.getCell(col(name)).text.trim();
    rows.push({
      rowNumber,
      term: text("CTCAE Preferred Term"),
      definition: text("CTCAE 6.0 Definition"),
      meddraCode: text("MedDRA Code"),
      meddraVersion: text("MedDRA Version"),
    });
  });
  return rows;
}

/**
 * Group sheet rows into terms. Rows without a MedDRA code are System Organ
 * Class headings; term rows are followed by "Grade N <term>" rows that share
 * the term's MedDRA code.
 */
export function buildDataset(rows: SheetRow[]): CtcaeDataset {
  const terms: CtcaeTerm[] = [];
  const byCode = new Map<string, CtcaeTerm>();
  let soc = "";
  let termRowCount = 0;

  for (const row of rows) {
    if (!row.meddraCode) {
      soc = row.term;
      continue;
    }
    const grade = GRADE_ROW.exec(row.term);
    if (!grade) {
      termRowCount++;
      if (byCode.has(row.meddraCode)) {
        throw new Error(`Row ${row.rowNumber}: duplicate MedDRA code ${row.meddraCode}`);
      }
      if (!soc) throw new Error(`Row ${row.rowNumber}: term "${row.term}" has no System Organ Class`);
      const term: CtcaeTerm = { id: row.meddraCode, term: row.term, soc, definition: row.definition, grades: {} };
      terms.push(term);
      byCode.set(row.meddraCode, term);
      continue;
    }
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
    version: "6.0",
    source: "NCI Common Terminology Criteria for Adverse Events (CTCAE) v6.0",
    meddraVersion: rows.find((r) => r.meddraVersion)?.meddraVersion ?? "",
    terms,
  };
}
