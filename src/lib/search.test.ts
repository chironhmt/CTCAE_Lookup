import { dataset } from "../data/dataset";
import { ALIASES } from "../data/aliases";
import { createSearchIndex, normalize } from "./search";

const index = createSearchIndex(dataset.terms, ALIASES);
const names = (q: string) => index.search(q).map((t) => t.term);

test("normalize lowercases and collapses punctuation", () => {
  expect(normalize("  Cell-Associated  (Neuro) ")).toBe("cell associated neuro");
});

test("exact match ranks first", () => {
  expect(names("Nausea")[0]).toBe("Nausea");
  expect(names("anemia")[0]).toBe("Anemia");
});

test("'neutrophil' returns Neutrophil count decreased first", () => {
  expect(names("neutrophil")[0]).toBe("Neutrophil count decreased");
});

test("typo 'neutropenai' finds Febrile neutropenia in the top 3", () => {
  expect(names("neutropenai").slice(0, 3)).toContain("Febrile neutropenia");
});

test("v5.0 name 'platelet count decreased' returns Thrombocytopenia first", () => {
  expect(names("platelet count decreased")[0]).toBe("Thrombocytopenia");
});

test("abbreviations resolve through aliases", () => {
  expect(names("ANC")[0]).toBe("Neutrophil count decreased");
  expect(names("crs")[0]).toBe("Cytokine release syndrome");
});

test("ranks prefix before word-prefix before substring", () => {
  const index = createSearchIndex([
    { id: "1", term: "Ear pain", soc: "s", definition: "", grades: { 1: "x" } },
    { id: "2", term: "Fear", soc: "s", definition: "", grades: { 1: "x" } },
    { id: "3", term: "Right ear swelling", soc: "s", definition: "", grades: { 1: "x" } },
  ]);
  expect(index.search("ear").map((t) => t.term)).toEqual(["Ear pain", "Right ear swelling", "Fear"]);
});

test("nonsense query returns no results", () => {
  expect(index.search("zzzzqqq")).toEqual([]);
  expect(index.search("   ")).toEqual([]);
});

test("every alias points to an existing term", () => {
  expect(() => createSearchIndex(dataset.terms, ALIASES)).not.toThrow();
  expect(() => createSearchIndex(dataset.terms, { x: "No such term" })).toThrow(/unknown term/);
});

test("a query over all 850 terms takes under 100ms", () => {
  for (const q of ["neutropenai", "pain", "a", "increased", "zzzzqqq"]) {
    const start = performance.now();
    index.search(q);
    expect(performance.now() - start).toBeLessThan(100);
  }
});

test("fuzzy matches are not mixed into literal matches", () => {
  expect(names("fever")).not.toContain("Vertigo");
  expect(names("plt")).toEqual(["Thrombocytopenia"]);
});
