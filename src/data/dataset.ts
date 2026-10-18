import raw from "./ctcae-v6.json";
import type { CtcaeDataset, CtcaeTerm } from "./types";

export const dataset = raw as CtcaeDataset;

export const termsById: ReadonlyMap<string, CtcaeTerm> = new Map(dataset.terms.map((t) => [t.id, t]));
