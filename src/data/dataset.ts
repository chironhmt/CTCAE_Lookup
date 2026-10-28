import v5 from "./ctcae-v5.json";
import v6 from "./ctcae-v6.json";
import type { CtcaeDataset, CtcaeTerm } from "./types";

/** Bundled CTCAE versions, newest first (the order shown in the version menu). */
export const CTCAE_VERSIONS = ["6.0", "5.0"] as const;
export type CtcaeVersion = (typeof CTCAE_VERSIONS)[number];
export const DEFAULT_VERSION: CtcaeVersion = "6.0";

export const datasets: Readonly<Record<CtcaeVersion, CtcaeDataset>> = {
  "6.0": v6 as CtcaeDataset,
  "5.0": v5 as CtcaeDataset,
};

export const termsById: Readonly<Record<CtcaeVersion, ReadonlyMap<string, CtcaeTerm>>> = {
  "6.0": new Map(datasets["6.0"].terms.map((t) => [t.id, t])),
  "5.0": new Map(datasets["5.0"].terms.map((t) => [t.id, t])),
};

/**
 * MedDRA codes of terms that CTCAE renamed between versions, as [v5.0, v6.0]
 * pairs. A favorite saved under either code shows the matching term in each version.
 */
export const RENAMED: readonly (readonly [string, string])[] = [
  ["10035528", "10043554"], // Platelet count decreased → Thrombocytopenia
];

const equivalent = new Map(RENAMED.flatMap(([a, b]) => [[a, b], [b, a]]));

/** The term a saved MedDRA code refers to in the given version, following renames. */
export function resolveTerm(version: CtcaeVersion, id: string): CtcaeTerm | undefined {
  const terms = termsById[version];
  const other = equivalent.get(id);
  return terms.get(id) ?? (other === undefined ? undefined : terms.get(other));
}
