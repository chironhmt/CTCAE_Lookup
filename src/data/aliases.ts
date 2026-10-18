/**
 * Extra English search keys mapped to the CTCAE v6.0 term they should find:
 * common clinical abbreviations and v5.0 names that v6.0 renamed.
 */
export const ALIASES: Readonly<Record<string, string>> = {
  // v5.0 names
  "platelet count decreased": "Thrombocytopenia",
  "oral mucositis": "Mucositis oral",
  // Abbreviations and synonyms
  anc: "Neutrophil count decreased",
  neutropenia: "Neutrophil count decreased",
  wbc: "White blood cell decreased",
  leukopenia: "White blood cell decreased",
  plt: "Thrombocytopenia",
  hgb: "Anemia",
  hb: "Anemia",
  fn: "Febrile neutropenia",
  stomatitis: "Mucositis oral",
  irr: "Infusion related reaction",
  crs: "Cytokine release syndrome",
  icans: "Immune effector cell-associated neurotoxicity syndrome",
  tls: "Tumor lysis syndrome",
  alt: "Alanine aminotransferase increased",
  ast: "Aspartate aminotransferase increased",
  gvhd: "Graft versus host disease",
};
