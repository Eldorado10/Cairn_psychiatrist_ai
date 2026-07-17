"use client";

import { useEffect, useRef } from "react";
import { Languages } from "lucide-react";
import { gsap } from "@/lib/gsap";

export type Clinician = {
  id: string;
  full_name: string;
  title: string | null;
  specialties: string[];
  languages: string[] | null;
  photo_url: string | null;
};

function initials(name: string) {
  return name
    .replace("[DEMO]", "")
    .trim()
    .split(/\s+/)
    .filter((part) => !part.endsWith("."))
    .slice(0, 2)
    .map((part) => part[0])
    .join("");
}

export function CliniciansGallery({ clinicians }: { clinicians: Clinician[] }) {
  const sectionRef = useRef<HTMLElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const section = sectionRef.current;
    const track = trackRef.current;
    if (!section || !track) return;

    const media = gsap.matchMedia();
    let tween: gsap.core.Tween | null = null;

    media.add(
      "(min-width: 1024px) and (prefers-reduced-motion: no-preference)",
      () => {
        const travel = () =>
          Math.max(0, track.scrollWidth - document.documentElement.clientWidth + 96);

        tween = gsap.to(track, {
          x: () => -travel(),
          ease: "none",
          scrollTrigger: {
            trigger: section,
            start: "top top",
            end: () => `+=${Math.max(travel(), window.innerWidth)}`,
            pin: true,
            scrub: 0.8,
            anticipatePin: 1,
            invalidateOnRefresh: true,
          },
        });

        return () => {
          tween?.scrollTrigger?.kill();
          tween?.kill();
          tween = null;
        };
      },
    );

    return () => {
      tween?.scrollTrigger?.kill();
      tween?.kill();
      media.revert();
    };
  }, []);

  return (
    <section
      ref={sectionRef}
      id="clinicians"
      className="overflow-hidden bg-ink px-6 py-28 lg:flex lg:min-h-screen lg:items-center lg:py-0"
    >
      <div className="mx-auto w-full max-w-6xl">
        <div className="mb-12 max-w-2xl lg:mb-16">
          <p className="text-sm uppercase tracking-[0.22em] text-eucalyptus">
            People, not profiles
          </p>
          <h2 className="mt-6 font-display text-display-md md:text-display-lg">
            Find someone who understands the shape of it.
          </h2>
        </div>

        {clinicians.length > 0 ? (
          <div ref={trackRef} className="clinician-track gap-6 lg:pr-24">
            {clinicians.map((doctor) => (
              <article
                key={doctor.id}
                className="clinician-card overflow-hidden rounded-2xl border border-veil bg-surface"
              >
                {doctor.photo_url ? (
                  <div
                    role="img"
                    aria-label={`Portrait of ${doctor.full_name}`}
                    className="aspect-[4/3] bg-cover bg-center"
                    style={{ backgroundImage: `url(${doctor.photo_url})` }}
                  />
                ) : (
                  <div
                    role="img"
                    aria-label={`Portrait placeholder for ${doctor.full_name}`}
                    className="flex aspect-[4/3] items-center justify-center bg-veil font-display text-display-sm text-eucalyptus"
                  >
                    {initials(doctor.full_name)}
                  </div>
                )}

                <div className="p-6">
                  <h3 className="font-display text-3xl">
                    {doctor.full_name.replace("[DEMO] ", "")}
                  </h3>
                  <p className="mt-2 text-mute">{doctor.title}</p>

                  <div className="mt-5 flex flex-wrap gap-2">
                    {doctor.specialties.map((specialty) => (
                      <span
                        key={specialty}
                        className="rounded-full bg-veil px-3 py-1 text-xs capitalize text-bone"
                      >
                        {specialty}
                      </span>
                    ))}
                  </div>

                  <div className="mt-6 flex items-center gap-2 border-t border-veil pt-5 text-sm text-mute">
                    <Languages className="size-4 text-eucalyptus" aria-hidden />
                    <span>
                      {doctor.languages?.map((language) => language.toUpperCase()).join(" · ") ||
                        "Language details available on request"}
                    </span>
                  </div>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-veil bg-surface p-8 text-mute">
            Clinician profiles are being prepared. Please check back shortly.
          </div>
        )}
      </div>
    </section>
  );
}
