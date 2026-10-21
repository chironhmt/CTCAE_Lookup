export const FAVORITES_KEY = "ctcae.favorites.v1";
export const RECENT_KEY = "ctcae.recent.v1";
export const FAVORITES_HIDDEN_KEY = "ctcae.favoritesHidden.v1";
export const MAX_RECENT = 10;

/** localStorage may be missing or throw (private mode, blocked site data). */
function readJson(key: string): unknown {
  try {
    const raw = window.localStorage.getItem(key);
    return raw === null ? undefined : JSON.parse(raw);
  } catch {
    return undefined;
  }
}

function writeJson(key: string, value: unknown): void {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage unavailable: keep working in memory for this session.
  }
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((v) => typeof v === "string");
}

/** Saved favorite IDs that still exist, or the defaults when nothing valid is saved. */
export function loadFavorites(knownIds: ReadonlySet<string>, defaults: readonly string[]): string[] {
  const saved = readJson(FAVORITES_KEY);
  if (!isStringArray(saved)) return [...defaults];
  return [...new Set(saved)].filter((id) => knownIds.has(id));
}

export function saveFavorites(ids: readonly string[]): void {
  writeJson(FAVORITES_KEY, ids);
}

export function loadRecent(): string[] {
  const saved = readJson(RECENT_KEY);
  return isStringArray(saved) ? saved.slice(0, MAX_RECENT) : [];
}

/** Put a query first, dropping earlier case-insensitive duplicates. */
export function addRecent(recent: readonly string[], query: string): string[] {
  const q = query.trim();
  if (!q) return [...recent];
  const lower = q.toLowerCase();
  return [q, ...recent.filter((r) => r.toLowerCase() !== lower)].slice(0, MAX_RECENT);
}

export function saveRecent(recent: readonly string[]): void {
  writeJson(RECENT_KEY, recent);
}

export function loadFavoritesHidden(): boolean {
  return readJson(FAVORITES_HIDDEN_KEY) === true;
}

export function saveFavoritesHidden(hidden: boolean): void {
  writeJson(FAVORITES_HIDDEN_KEY, hidden);
}
