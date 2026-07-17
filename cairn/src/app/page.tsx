import { Hero } from "@/components/hero/hero";
import { CliniciansSection } from "@/components/sections/clinicians-section";
import { CtaSection } from "@/components/sections/cta-section";
import { HowSection } from "@/components/sections/how-section";
import { WrenSection } from "@/components/sections/wren-section";
import { Navbar } from "@/components/site/navbar";
import { createClient } from "@/lib/supabase/server";

export default async function Home() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const signedIn = Boolean(data?.claims);

  return (
    <>
      <Navbar initialSignedIn={signedIn} />
      <main>
        <Hero />
        <HowSection />
        <WrenSection />
        <CliniciansSection />
        <CtaSection />
      </main>
    </>
  );
}
