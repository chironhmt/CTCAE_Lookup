import type { CtcaeVersion } from "./dataset";

/** Common clinical abbreviations and synonyms whose target term exists in every version. */
const COMMON: Readonly<Record<string, string>> = {
  "oral mucositis": "Mucositis oral",
  anc: "Neutrophil count decreased",
  neutropenia: "Neutrophil count decreased",
  wbc: "White blood cell decreased",
  leukopenia: "White blood cell decreased",
  hgb: "Anemia",
  hb: "Anemia",
  fn: "Febrile neutropenia",
  stomatitis: "Mucositis oral",
  irr: "Infusion related reaction",
  crs: "Cytokine release syndrome",
  tls: "Tumor lysis syndrome",
  alt: "Alanine aminotransferase increased",
  ast: "Aspartate aminotransferase increased",
};

/**
 * Extra English search keys mapped to the term they should find in each
 * CTCAE version, including names the other version uses for the same term.
 */
export const ALIASES: Readonly<Record<CtcaeVersion, Readonly<Record<string, string>>>> = {
  "6.0": {
    ...COMMON,
    // v5.0 name
    "platelet count decreased": "Thrombocytopenia",
    plt: "Thrombocytopenia",
    icans: "Immune effector cell-associated neurotoxicity syndrome",
    gvhd: "Graft versus host disease",
  },
  "5.0": {
    ...COMMON,
    // v6.0 name
    thrombocytopenia: "Platelet count decreased",
    plt: "Platelet count decreased",
  },
};
