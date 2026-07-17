import { createClient } from "@/lib/supabase/server";
import {
  CliniciansGallery,
  type Clinician,
} from "@/components/sections/clinicians-gallery";

const SEED_CLINICIANS: Clinician[] = [
  {
    id: "11111111-1111-4111-a111-111111111101",
    full_name: "[DEMO] Dr. Amara Osei",
    title: "Clinical Psychologist",
    specialties: ["anxiety", "depression"],
    languages: ["en", "fr"],
    photo_url: null,
  },
  {
    id: "11111111-1111-4111-a111-111111111102",
    full_name: "[DEMO] Dr. Jonas Lindqvist",
    title: "Psychiatrist",
    specialties: ["psychiatry", "depression"],
    languages: ["en", "sv"],
    photo_url: null,
  },
  {
    id: "11111111-1111-4111-a111-111111111103",
    full_name: "[DEMO] Dr. Priya Raman",
    title: "Trauma Therapist",
    specialties: ["trauma", "anxiety"],
    languages: ["en", "ta"],
    photo_url: null,
  },
  {
    id: "11111111-1111-4111-a111-111111111104",
    full_name: "[DEMO] Dr. Mateo Alvarez",
    title: "Adolescent Counselor",
    specialties: ["adolescent", "relationships"],
    languages: ["en", "es"],
    photo_url: null,
  },
  {
    id: "11111111-1111-4111-a111-111111111105",
    full_name: "[DEMO] Dr. Hana Sato",
    title: "Addiction Specialist",
    specialties: ["addiction", "depression"],
    languages: ["en", "ja"],
    photo_url: null,
  },
  {
    id: "11111111-1111-4111-a111-111111111106",
    full_name: "[DEMO] Dr. Leah Rosen",
    title: "Grief Counselor",
    specialties: ["grief", "relationships"],
    languages: ["en", "he"],
    photo_url: null,
  },
];

export async function CliniciansSection() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("doctors")
    .select("id, full_name, title, specialties, languages, photo_url")
    .eq("is_active", true)
    .order("full_name");

  if (error) {
    console.error("Unable to load clinician profiles", error.message);
  }

  const clinicians = data?.length ? (data as Clinician[]) : SEED_CLINICIANS;

  return <CliniciansGallery clinicians={clinicians} />;
}
