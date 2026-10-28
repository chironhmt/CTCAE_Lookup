import { useMemo, useState } from "react";
import { SearchBar } from "./components/SearchBar";
import { TermCard } from "./components/TermCard";
import { ALIASES } from "./data/aliases";
import { CTCAE_VERSIONS, DEFAULT_VERSION, datasets, resolveTerm, termsById, type CtcaeVersion } from "./data/dataset";
import { DEFAULT_FAVORITE_IDS } from "./data/defaults";
import type { CtcaeTerm } from "./data/types";
import { createSearchIndex, type SearchIndex } from "./lib/search";
import {
  addRecent,
  loadFavorites,
  loadFavoritesHidden,
  loadRecent,
  loadVersion,
  saveFavorites,
  saveFavoritesHidden,
  saveRecent,
  saveVersion,
} from "./lib/storage";
import { strings } from "./strings";

const indexes = Object.fromEntries(
  CTCAE_VERSIONS.map((v) => [v, createSearchIndex(datasets[v].terms, ALIASES[v])]),
) as Record<CtcaeVersion, SearchIndex>;
// Favorites are shared across versions, so keep codes that exist in any of them.
const knownIds = new Set(CTCAE_VERSIONS.flatMap((v) => [...termsById[v].keys()]));
const MAX_SUGGESTIONS = 8;

export default function App() {
  const [query, setQuery] = useState("");
  const [version, setVersion] = useState(() => loadVersion(CTCAE_VERSIONS, DEFAULT_VERSION));
  const [favorites, setFavorites] = useState(() => loadFavorites(knownIds, DEFAULT_FAVORITE_IDS));
  const [recent, setRecent] = useState(loadRecent);
  const [favoritesHidden, setFavoritesHidden] = useState(loadFavoritesHidden);
  const dataset = datasets[version];

  // Persist only on user actions, so users who never customized keep getting the current defaults.
  function updateFavorites(next: string[]) {
    setFavorites(next);
    saveFavorites(next);
  }
  function updateRecent(next: string[]) {
    setRecent(next);
    saveRecent(next);
  }
  function toggleFavoritesHidden() {
    setFavoritesHidden(!favoritesHidden);
    saveFavoritesHidden(!favoritesHidden);
  }
  function changeVersion(next: CtcaeVersion) {
    setVersion(next);
    saveVersion(next);
  }

  const results = useMemo(() => indexes[version].search(query), [query, version]);
  const searching = query.trim() !== "";
  // A favorite saved in one version may be missing from another, or saved under both a
  // term's old and new code; show each term once and count the missing ones.
  const resolved = favorites.map((id) => resolveTerm(version, id));
  const favoriteTerms = [...new Set(resolved.filter((t): t is CtcaeTerm => t !== undefined))];
  const missingFavorites = resolved.filter((t) => t === undefined).length;
  const favoriteSet = new Set(favoriteTerms.map((t) => t.id));

  function toggleFavorite(id: string) {
    updateFavorites(
      favoriteSet.has(id) ? favorites.filter((x) => resolveTerm(version, x)?.id !== id) : [...favorites, id],
    );
  }

  const cards = (terms: CtcaeTerm[], collapsible = false) => (
    <ul className="grid items-start gap-4 lg:grid-cols-2">
      {terms.map((term) => (
        <li key={term.id} className="min-w-0">
          <TermCard
            term={term}
            isFavorite={favoriteSet.has(term.id)}
            onToggleFavorite={toggleFavorite}
            collapsible={collapsible}
          />
        </li>
      ))}
    </ul>
  );

  return (
    <div className="flex min-h-screen flex-col bg-slate-200 text-slate-900">
      <header className="border-b border-slate-300 bg-slate-100">
        <div className="mx-auto max-w-6xl px-4 py-4">
          <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
            <h1 className="text-3xl font-bold sm:text-4xl">{strings.appTitle}</h1>
            <p className="ml-auto text-right text-sm text-slate-600">
              {strings.appSubtitle} ·{" "}
              <select
                aria-label={strings.versionLabel}
                value={version}
                onChange={(e) => changeVersion(e.target.value as CtcaeVersion)}
                className="cursor-pointer rounded border border-slate-300 bg-white py-0.5 pr-1 pl-1.5 text-sm font-medium text-slate-800 hover:border-slate-400 focus:outline-2 focus:outline-blue-600"
              >
                {CTCAE_VERSIONS.map((v) => (
                  <option key={v} value={v}>
                    {strings.versionName(v)}
                  </option>
                ))}
              </select>{" "}
              {strings.sourceOrg}
            </p>
          </div>
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
              <h2 id="favorites-heading" className="text-xl font-semibold">
                {strings.favoritesHeading}
              </h2>
              <div className="flex gap-2">
                {!favoritesHidden && (
                  <button
                    type="button"
                    onClick={() => updateFavorites([...DEFAULT_FAVORITE_IDS])}
                    className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-100"
                  >
                    {strings.resetFavorites}
                  </button>
                )}
                <button
                  type="button"
                  onClick={toggleFavoritesHidden}
                  aria-expanded={!favoritesHidden}
                  aria-controls="favorites-list"
                  className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-100"
                >
                  {favoritesHidden ? strings.showFavorites : strings.hideFavorites}
                </button>
              </div>
            </div>
            <div id="favorites-list" hidden={favoritesHidden}>
              {favoriteTerms.length > 0 ? cards(favoriteTerms, true) : <p className="text-slate-600">{strings.favoritesEmpty}</p>}
              {missingFavorites > 0 && (
                <p className="mt-3 text-sm text-slate-600">{strings.favoritesNotInVersion(missingFavorites, version)}</p>
              )}
            </div>
          </section>
        )}
      </main>

      <footer className="border-t border-slate-300 bg-slate-100">
        <div className="mx-auto max-w-6xl px-4 py-4 text-xs text-slate-600">
          <p>
            {strings.sourceCredit(dataset.version, dataset.meddraVersion)} {strings.trademarkNotice} {strings.copyright}
          </p>
        </div>
      </footer>
    </div>
  );
}
