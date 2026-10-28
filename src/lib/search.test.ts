import { ALIASES } from "../data/aliases";
import { CTCAE_VERSIONS, datasets } from "../data/dataset";
import { createSearchIndex, normalize } from "./search";

const index = createSearchIndex(datasets["6.0"].terms, ALIASES["6.0"]);
const names = (q: string) => index.search(q).map((t) => t.term);
const v5 = createSearchIndex(datasets["5.0"].terms, ALIASES["5.0"]);
const v5names = (q: string) => v5.search(q).map((t) => t.term);

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

test("v5.0 index: v6.0 name 'thrombocytopenia' and 'plt' return Platelet count decreased first", () => {
  expect(v5names("thrombocytopenia")[0]).toBe("Platelet count decreased");
  expect(v5names("plt")).toEqual(["Platelet count decreased"]);
  expect(v5names("ANC")[0]).toBe("Neutrophil count decreased");
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

test.each(CTCAE_VERSIONS)("every v%s alias points to an existing term", (version) => {
  expect(() => createSearchIndex(datasets[version].terms, ALIASES[version])).not.toThrow();
  expect(() => createSearchIndex(datasets[version].terms, { x: "No such term" })).toThrow(/unknown term/);
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
