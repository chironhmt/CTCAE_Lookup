import Fuse from "fuse.js";
import type { CtcaeTerm } from "../data/types";

/** Lowercase and collapse punctuation so "cell-associated" matches "cell associated". */
export function normalize(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

const enum Rank {
  Exact,
  Prefix,
  WordPrefix,
  Substring,
  Fuzzy,
}

export interface SearchIndex {
  search(query: string, limit?: number): CtcaeTerm[];
}

export function createSearchIndex(terms: readonly CtcaeTerm[], aliases: Readonly<Record<string, string>> = {}): SearchIndex {
  const byName = new Map(terms.map((t) => [t.term, t]));
  const entries = terms.map((term) => ({ term, keys: [normalize(term.term)] }));
  const entryByTerm = new Map(entries.map((e) => [e.term, e]));
  for (const [alias, target] of Object.entries(aliases)) {
    const term = byName.get(target);
    if (!term) throw new Error(`Alias "${alias}" points to unknown term "${target}"`);
    entryByTerm.get(term)!.keys.push(normalize(alias));
  }
  const fuse = new Fuse(entries, { keys: ["keys"], threshold: 0.4, ignoreLocation: true, includeScore: true });

  function rank(keys: string[], q: string): Rank | null {
    let best: Rank | null = null;
    for (const key of keys) {
      const r =
        key === q ? Rank.Exact
        : key.startsWith(q) ? Rank.Prefix
        : key.includes(" " + q) ? Rank.WordPrefix
        : key.includes(q) ? Rank.Substring
        : null;
      if (r !== null && (best === null || r < best)) best = r;
    }
    return best;
  }

  return {
    search(query, limit = 50) {
      const q = normalize(query);
      if (!q) return [];
      const ranked: { term: CtcaeTerm; rank: number; score: number }[] = [];
      for (const entry of entries) {
        const r = rank(entry.keys, q);
        if (r !== null) {
          ranked.push({ term: entry.term, rank: r, score: entry.term.term.length });
        }
      }
      // Typo tolerance only when nothing matches literally; otherwise fuzzy hits are noise.
      if (ranked.length === 0) {
        for (const hit of fuse.search(q, { limit })) {
          ranked.push({ term: hit.item.term, rank: Rank.Fuzzy, score: hit.score ?? 1 });
        }
      }
      ranked.sort((a, b) => a.rank - b.rank || a.score - b.score || a.term.term.localeCompare(b.term.term));
      return ranked.slice(0, limit).map((r) => r.term);
    },
  };
}
