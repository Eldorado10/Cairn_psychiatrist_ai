"use client";

import { AmbientBlob } from "@/components/hero/ambient-blob";

export function CtaSection() {
  return (
    <section
      id="cta"
      className="relative flex min-h-[105svh] items-center justify-center overflow-hidden bg-ink px-6 py-32 text-center"
    >
      <div className="pointer-events-none absolute inset-0" aria-hidden>
        <AmbientBlob />
      </div>

      <div className="relative z-10 flex flex-col items-center">
        <h2 className="max-w-3xl font-display text-display-md md:text-display-lg">
          You do not have to know what to call it yet.
        </h2>
        <a
          href="/chat"
          className="mt-10 rounded-full bg-eucalyptus px-7 py-3 font-medium text-ink transition-colors hover:bg-eucalyptus/85 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-bone"
        >
          Talk to Wren
        </a>
      </div>
    </section>
  );
}
