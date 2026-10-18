/**
 * MedDRA codes of the adverse events shown on the home screen by default.
 * CTCAE v6.0 renamed two v5.0 terms: "Platelet count decreased" is now
 * "Thrombocytopenia" and "Oral mucositis" is listed as "Mucositis oral".
 */
export const DEFAULT_FAVORITE_IDS: readonly string[] = [
  "10002272", // Anemia
  "10029366", // Neutrophil count decreased
  "10043554", // Thrombocytopenia
  "10049182", // White blood cell decreased
  "10016288", // Febrile neutropenia
  "10028813", // Nausea
  "10047700", // Vomiting
  "10012727", // Diarrhea
  "10028130", // Mucositis oral
  "10016256", // Fatigue
  "10034620", // Peripheral sensory neuropathy
  "10051792", // Infusion related reaction
];
