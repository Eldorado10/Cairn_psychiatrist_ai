// The single source of truth for specialty strings. These must stay in sync
// with the values seeded into doctors.specialties (supabase/seed.sql) — the
// assessment model is only allowed to emit values from this set, and doctor
// matching overlaps against it.
export const CAIRN_SPECIALTIES = [
  "anxiety",
  "depression",
  "trauma",
  "adolescent",
  "addiction",
  "relationships",
  "grief",
  "psychiatry",
] as const;

export type CairnSpecialty = (typeof CAIRN_SPECIALTIES)[number];
