/**
 * MedDRA codes of the adverse events shown on the home screen by default.
 * Shown in this order. CTCAE v6.0 renamed the v5.0 term "Platelet count
 * decreased" to "Thrombocytopenia".
 */
export const DEFAULT_FAVORITE_IDS: readonly string[] = [
  "10029366", // Neutrophil count decreased
  "10043554", // Thrombocytopenia
  "10002272", // Anemia
  "10028813", // Nausea
  "10047700", // Vomiting
  "10012727", // Diarrhea
  "10051792", // Infusion related reaction
  "10034620", // Peripheral sensory neuropathy
];
