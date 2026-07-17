import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";
import type { CairnSpecialty } from "./specialties";

// Doctor matching is plain SQL plus a deterministic sort — no model in the
// loop. The model suggests a category; the database picks the human. Doctor
// names never reach (or come from) the model.
export type MatchedDoctor = {
  id: string;
  full_name: string;
  title: string | null;
  specialties: string[];
  languages: string[] | null;
  photo_url: string | null;
  overlapCount: number;
  nextSlotAt: string | null;
};

export async function matchDoctors(
  supabase: SupabaseClient<Database>,
  recommendedSpecialties: readonly CairnSpecialty[],
  limit = 3,
): Promise<MatchedDoctor[]> {
  if (recommendedSpecialties.length === 0) {
    return [];
  }

  const { data, error } = await supabase
    .from("doctors")
    .select(
      "id, full_name, title, specialties, languages, photo_url, availability_slots(starts_at)",
    )
    .eq("is_active", true)
    .overlaps("specialties", [...recommendedSpecialties])
    .eq("availability_slots.is_booked", false)
    .gte("availability_slots.starts_at", new Date().toISOString())
    .order("starts_at", { referencedTable: "availability_slots", ascending: true })
    .limit(1, { referencedTable: "availability_slots" });

  if (error) {
    throw new Error(`Doctor matching query failed: ${error.message}`);
  }

  const wanted = new Set<string>(recommendedSpecialties);

  return (data ?? [])
    .map(({ availability_slots, ...doctor }) => ({
      ...doctor,
      overlapCount: doctor.specialties.filter((s) => wanted.has(s)).length,
      nextSlotAt: availability_slots[0]?.starts_at ?? null,
    }))
    .sort(
      (a, b) =>
        b.overlapCount - a.overlapCount ||
        // Doctors with no open slot sort last.
        (a.nextSlotAt ?? "￿").localeCompare(b.nextSlotAt ?? "￿"),
    )
    .slice(0, limit);
}
