import {
  addRecent,
  FAVORITES_KEY,
  loadFavorites,
  loadRecent,
  loadVersion,
  RECENT_KEY,
  saveFavorites,
  saveRecent,
  saveVersion,
  VERSION_KEY,
} from "./storage";

const known = new Set(["a", "b", "c"]);
const defaults = ["a", "b"];

afterEach(() => {
  localStorage.clear();
  vi.restoreAllMocks();
});

test("favorites default when nothing is saved", () => {
  expect(loadFavorites(known, defaults)).toEqual(["a", "b"]);
});

test("favorites round-trip under the v1 key", () => {
  saveFavorites(["c", "a"]);
  expect(JSON.parse(localStorage.getItem(FAVORITES_KEY)!)).toEqual(["c", "a"]);
  expect(loadFavorites(known, defaults)).toEqual(["c", "a"]);
});

test("an empty saved favorites list stays empty", () => {
  saveFavorites([]);
  expect(loadFavorites(known, defaults)).toEqual([]);
});

test("unknown favorite IDs are dropped on load", () => {
  saveFavorites(["a", "gone", "c"]);
  expect(loadFavorites(known, defaults)).toEqual(["a", "c"]);
});

test("duplicate favorite IDs are removed on load", () => {
  saveFavorites(["a", "c", "a"]);
  expect(loadFavorites(known, defaults)).toEqual(["a", "c"]);
});

test("invalid JSON falls back to defaults", () => {
  localStorage.setItem(FAVORITES_KEY, "{not json");
  localStorage.setItem(RECENT_KEY, '{"x":1}');
  expect(loadFavorites(known, defaults)).toEqual(["a", "b"]);
  expect(loadRecent()).toEqual([]);
});

test("throwing storage falls back to defaults and writes do not throw", () => {
  vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
    throw new Error("blocked");
  });
  vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
    throw new Error("blocked");
  });
  expect(loadFavorites(known, defaults)).toEqual(["a", "b"]);
  expect(loadRecent()).toEqual([]);
  expect(() => saveFavorites(["a"])).not.toThrow();
  expect(() => saveRecent(["x"])).not.toThrow();
});

test("recent searches: newest first, case-insensitive de-dup, max 10", () => {
  let recent: string[] = [];
  for (const q of ["nausea", "anemia", "Nausea", "  "]) recent = addRecent(recent, q);
  expect(recent).toEqual(["Nausea", "anemia"]);

  for (let i = 0; i < 12; i++) recent = addRecent(recent, `q${i}`);
  expect(recent).toHaveLength(10);
  expect(recent[0]).toBe("q11");

  saveRecent(recent);
  expect(loadRecent()).toEqual(recent);
});

test("version round-trips and falls back when missing or no longer offered", () => {
  const versions = ["6.0", "5.0"];
  expect(loadVersion(versions, "6.0")).toBe("6.0");
  saveVersion("5.0");
  expect(JSON.parse(localStorage.getItem(VERSION_KEY)!)).toBe("5.0");
  expect(loadVersion(versions, "6.0")).toBe("5.0");
  localStorage.setItem(VERSION_KEY, JSON.stringify("4.03"));
  expect(loadVersion(versions, "6.0")).toBe("6.0");
});
