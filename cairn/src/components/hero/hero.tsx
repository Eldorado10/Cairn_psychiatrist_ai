"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import { gsap, SplitText } from "@/lib/gsap";
import { OrbPoster } from "./orb-poster";

// The canvas never renders on the server; the poster stands in while the
// three.js bundle loads.
const BlobCanvas = dynamic(() => import("./blob-canvas"), {
  ssr: false,
  loading: () => <OrbPoster />,
});

type Mode = "canvas" | "fallback" | null;

export function Hero() {
  const sectionRef = useRef<HTMLElement>(null);
  const copyRef = useRef<HTMLDivElement>(null);
  const headlineRef = useRef<HTMLHeadingElement>(null);
  const animated = useRef(false);

  const [mode, setMode] = useState<Mode>(null);
  const [frameloop, setFrameloop] = useState<"always" | "never">("always");
  const [canvasReady, setCanvasReady] = useState(false);

  // Reduced motion OR no WebGL -> static orb. No exceptions.
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const decide = () => {
      if (mq.matches) {
        setMode("fallback");
        return;
      }
      const probe = document.createElement("canvas");
      const gl = probe.getContext("webgl2") ?? probe.getContext("webgl");
      setMode(gl ? "canvas" : "fallback");
    };
    decide();
    mq.addEventListener("change", decide);
    return () => mq.removeEventListener("change", decide);
  }, []);

  // frameloop="always" while the hero is on screen, paused when it isn't.
  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;
    const io = new IntersectionObserver(([entry]) => {
      setFrameloop(entry.isIntersecting ? "always" : "never");
    });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // Headline reveal: only after the blob exists (canvas ready, or the
  // static fallback which is present immediately). Runs once.
  useEffect(() => {
    if (animated.current || !mode) return;
    if (mode === "canvas" && !canvasReady) return;
    animated.current = true;

    const copy = copyRef.current;
    const h1 = headlineRef.current;
    if (!copy || !h1) return;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      gsap.set(copy, { autoAlpha: 1 });
      return;
    }

    let split: SplitText | null = null;
    let tl: gsap.core.Timeline | null = null;
    let cancelled = false;

    // Line splitting needs final font metrics.
    document.fonts.ready.then(() => {
      if (cancelled) return;
      split = SplitText.create(h1, { type: "lines" });
      tl = gsap.timeline();
      tl.set(copy, { autoAlpha: 1 });
      tl.from(split.lines, {
        y: 40,
        autoAlpha: 0,
        stagger: 0.08,
        duration: 0.9,
        ease: "power3.out",
      });
      tl.from(
        copy.querySelectorAll("[data-hero-support]"),
        { y: 16, autoAlpha: 0, stagger: 0.1, duration: 0.6, ease: "power3.out" },
        "-=0.45",
      );
    });

    return () => {
      cancelled = true;
      tl?.kill();
      split?.revert();
    };
  }, [mode, canvasReady]);

  return (
    <section
      ref={sectionRef}
      id="hero"
      data-frameloop={frameloop}
      className="relative flex min-h-screen items-center overflow-hidden"
    >
      <div className="absolute inset-0" aria-hidden>
        {mode === "canvas" ? (
          <BlobCanvas frameloop={frameloop} onReady={() => setCanvasReady(true)} />
        ) : (
          <OrbPoster />
        )}
      </div>

      <div className="relative z-10 mx-auto w-full max-w-6xl px-6 pt-16">
        <div ref={copyRef} className="max-w-4xl opacity-0">
          <h1
            ref={headlineRef}
            className="font-display text-[clamp(3rem,8vw,7.5rem)] leading-[1.02] tracking-[-0.03em]"
          >
            Some things are easier to say at 2am.
          </h1>
          <p
            data-hero-support
            className="mt-6 max-w-xl text-lg leading-8 text-mute"
          >
            Wren listens whenever you need to talk, then helps you find the
            right person to talk to next.
          </p>
          <div data-hero-support className="mt-8 flex flex-wrap gap-4">
            <a
              href="/chat"
              className="rounded-full bg-eucalyptus px-7 py-3 font-medium text-ink transition-colors hover:bg-eucalyptus/85 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-bone"
            >
              Talk to Wren
            </a>
            <a
              href="#how"
              className="rounded-full border border-veil px-7 py-3 font-medium text-bone transition-colors hover:bg-veil/40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-eucalyptus"
            >
              How Cairn works
            </a>
          </div>
        </div>

        {/* Permanent safety line. Never remove, never animate, never hide
            behind a disclosure — it must be visible from first paint. */}
        <p className="mt-10 text-[13px] text-mute">
          Wren is an AI assistant, not a doctor. It can&apos;t diagnose or
          prescribe.
        </p>
      </div>
    </section>
  );
}
