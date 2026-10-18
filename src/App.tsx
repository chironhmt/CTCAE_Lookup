import { useMemo, useState } from "react";
import { SearchBar } from "./components/SearchBar";
import { TermCard } from "./components/TermCard";
import { ALIASES } from "./data/aliases";
import { dataset, termsById } from "./data/dataset";
import { DEFAULT_FAVORITE_IDS } from "./data/defaults";
import type { CtcaeTerm } from "./data/types";
import { createSearchIndex } from "./lib/search";
import { addRecent, loadFavorites, loadRecent, saveFavorites, saveRecent } from "./lib/storage";
import { strings } from "./strings";

const index = createSearchIndex(dataset.terms, ALIASES);
const knownIds = new Set(termsById.keys());
const MAX_SUGGESTIONS = 8;

export default function App() {
  const [query, setQuery] = useState("");
  const [favorites, setFavorites] = useState(() => loadFavorites(knownIds, DEFAULT_FAVORITE_IDS));
  const [recent, setRecent] = useState(loadRecent);

  // Persist only on user actions, so users who never customized keep getting the current defaults.
  function updateFavorites(next: string[]) {
    setFavorites(next);
    saveFavorites(next);
  }
  function updateRecent(next: string[]) {
    setRecent(next);
    saveRecent(next);
  }

  const results = useMemo(() => index.search(query), [query]);
  const searching = query.trim() !== "";
  const favoriteSet = new Set(favorites);
  const favoriteTerms = favorites.map((id) => termsById.get(id)).filter((t): t is CtcaeTerm => t !== undefined);

  function toggleFavorite(id: string) {
    updateFavorites(favorites.includes(id) ? favorites.filter((x) => x !== id) : [...favorites, id]);
  }

  const cards = (terms: CtcaeTerm[]) => (
    <ul className="grid gap-4 lg:grid-cols-2">
      {terms.map((term) => (
        <li key={term.id} className="min-w-0">
          <TermCard term={term} isFavorite={favoriteSet.has(term.id)} onToggleFavorite={toggleFavorite} />
        </li>
      ))}
    </ul>
  );

  return (
    <div className="flex min-h-screen flex-col bg-slate-50 text-slate-900">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-6xl px-4 py-4">
          <h1 className="text-2xl font-bold">{strings.appTitle}</h1>
          <p className="text-sm text-slate-600">
            {strings.appSubtitle} · {strings.sourceName}
          </p>
          <div className="mt-3">
            <SearchBar
              query={query}
              onQueryChange={setQuery}
              suggestions={results.slice(0, MAX_SUGGESTIONS).map((t) => t.term)}
              recent={recent}
              onCommit={(q) => updateRecent(addRecent(recent, q))}
              onClearRecent={() => updateRecent([])}
            />
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6">
        {searching ? (
          <section aria-labelledby="results-heading">
            <h2 id="results-heading" className="mb-3 text-sm font-medium text-slate-600" aria-live="polite">
              {results.length > 0 ? strings.resultsCount(results.length) : strings.noResults}
            </h2>
            {results.length > 0 ? cards(results) : <p className="text-slate-600">{strings.noResultsHint}</p>}
          </section>
        ) : (
          <section aria-labelledby="favorites-heading">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <h2 id="favorites-heading" className="text-lg font-semibold">
                {strings.favoritesHeading}
              </h2>
              <button
                type="button"
                onClick={() => updateFavorites([...DEFAULT_FAVORITE_IDS])}
                className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-100"
              >
                {strings.resetFavorites}
              </button>
            </div>
            {favoriteTerms.length > 0 ? cards(favoriteTerms) : <p className="text-slate-600">{strings.favoritesEmpty}</p>}
          </section>
        )}
      </main>

      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto max-w-6xl px-4 py-4 text-xs text-slate-600">
          <p>
            {strings.sourceLabel} {strings.sourceName} · {strings.meddraVersion(dataset.meddraVersion)}.{" "}
            {strings.sourceCredit}{" "}
            <a href={strings.sourceUrl} target="_blank" rel="noreferrer" className="text-blue-700 underline">
              {strings.sourceLinkText}
            </a>
          </p>
          <p className="mt-1 font-medium text-slate-700">{strings.disclaimer}</p>
        </div>
      </footer>
    </div>
  );
}
