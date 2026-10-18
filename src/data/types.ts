export type GradeLevel = 1 | 2 | 3 | 4 | 5;

export const GRADE_LEVELS: readonly GradeLevel[] = [1, 2, 3, 4, 5];

export interface CtcaeTerm {
  /** MedDRA code, used as the stable key across CTCAE versions. */
  id: string;
  term: string;
  /** MedDRA System Organ Class. */
  soc: string;
  definition: string;
  /** Grade criteria text. A missing grade does not apply to this term. */
  grades: Partial<Record<GradeLevel, string>>;
}

export interface CtcaeDataset {
  version: string;
  source: string;
  meddraVersion: string;
  terms: CtcaeTerm[];
}
