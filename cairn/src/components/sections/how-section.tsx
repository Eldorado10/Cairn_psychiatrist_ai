"use client";

import { useEffect, useRef } from "react";
import { gsap } from "@/lib/gsap";
import { AmbientBlob } from "@/components/hero/ambient-blob";

const STEPS = [
  {
    number: "01",
    title: "Talk",
    copy: "Say what is happening in your own words. Wren makes room for the unfinished version, without asking you to package it neatly.",
  },
  {
    number: "02",
    title: "Understand",
    copy: "A few careful questions help separate the immediate pressure from the pattern underneath it, while keeping uncertainty visible.",
  },
  {
    number: "03",
    title: "Meet",
    copy: "When talking to someone would help, Cairn narrows the search and brings forward clinicians whose work fits what you described.",
  },
] as const;

export function HowSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const stepsRef = useRef<HTMLDivElement>(null);
  const blobRef = useRef<HTMLDivElement>(null);
  const distort = useRef(0.42);

  useEffect(() => {
    const section = sectionRef.current;
    const stepsRoot = stepsRef.current;
    const blob = blobRef.current;
    if (!section || !stepsRoot || !blob) return;

    const steps = gsap.utils.toArray<HTMLElement>(
      stepsRoot.querySelectorAll("[data-how-step]"),
    );
    const media = gsap.matchMedia();
    let timeline: gsap.core.Timeline | null = null;

    media.add(
      "(min-width: 768px) and (prefers-reduced-motion: no-preference)",
      () => {
        gsap.set(steps.slice(1), { autoAlpha: 0, y: 36 });
        gsap.set(blob, { xPercent: 18, scale: 0.72 });

        timeline = gsap.timeline({
          defaults: { ease: "none" },
          scrollTrigger: {
            trigger: section,
            start: "top top",
            end: "+=300%",
            pin: true,
            scrub: 0.8,
            anticipatePin: 1,
            invalidateOnRefresh: true,
          },
        });

        timeline
          .to(steps[0], { autoAlpha: 0, y: -28, duration: 0.35 }, 0.72)
          .to(steps[1], { autoAlpha: 1, y: 0, duration: 0.35 }, 0.92)
          .to(
            distort,
            { current: 0.28, duration: 0.5, ease: "power2.inOut" },
            0.75,
          )
          .to(blob, { scale: 0.64, duration: 0.5 }, 0.75)
          .to(steps[1], { autoAlpha: 0, y: -28, duration: 0.35 }, 1.72)
          .to(steps[2], { autoAlpha: 1, y: 0, duration: 0.35 }, 1.92)
          .to(
            distort,
            { current: 0.14, duration: 0.5, ease: "power2.inOut" },
            1.75,
          )
          .to(blob, { scale: 0.56, duration: 0.5 }, 1.75)
          .to({}, { duration: 0.7 });

        return () => {
          timeline?.scrollTrigger?.kill();
          timeline?.kill();
          timeline = null;
        };
      },
    );

    return () => {
      timeline?.scrollTrigger?.kill();
      timeline?.kill();
      media.revert();
    };
  }, []);

  return (
    <section
      ref={sectionRef}
      id="how"
      className="relative min-h-screen overflow-hidden bg-ink px-6 py-28 md:flex md:items-center md:py-0"
    >
      <div className="relative z-10 mx-auto w-full max-w-6xl">
        <p className="mb-14 text-sm uppercase tracking-[0.22em] text-eucalyptus">
          How Cairn works
        </p>

        <div
          ref={stepsRef}
          className="grid gap-16 md:relative md:min-h-[24rem] md:max-w-2xl"
        >
          {STEPS.map((step, index) => (
            <article
              key={step.number}
              data-how-step
              className={`md:absolute md:inset-0 md:flex md:flex-col md:justify-center ${
                index > 0 ? "md:motion-safe:opacity-0" : ""
              }`}
            >
              <span className="font-body text-sm tabular-nums text-mute">
                {step.number}
              </span>
              <h2 className="mt-5 font-display text-display-lg md:text-display-xl">
                {step.title}
              </h2>
              <p className="mt-6 max-w-xl text-lg leading-8 text-mute">
                {step.copy}
              </p>
            </article>
          ))}
        </div>
      </div>

      <div
        ref={blobRef}
        aria-hidden
        className="pointer-events-none absolute -right-[26vmin] top-1/2 hidden size-[min(82vmin,52rem)] -translate-y-1/2 md:block"
      >
        <AmbientBlob distort={distort} />
      </div>
    </section>
  );
}
