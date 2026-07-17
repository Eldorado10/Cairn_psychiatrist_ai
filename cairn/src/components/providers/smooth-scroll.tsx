"use client";

import { useEffect } from "react";
import Lenis from "lenis";
import { gsap, ScrollTrigger } from "@/lib/gsap";

export function SmoothScroll({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    let teardown: (() => void) | null = null;

    const start = () => {
      const lenis = new Lenis({ lerp: 0.08, anchors: true });

      // Lenis and ScrollTrigger share one RAF loop: gsap.ticker drives
      // lenis, lenis notifies ScrollTrigger.
      lenis.on("scroll", ScrollTrigger.update);
      const tick = (time: number) => lenis.raf(time * 1000);
      gsap.ticker.add(tick);
      gsap.ticker.lagSmoothing(0);

      return () => {
        gsap.ticker.remove(tick);
        lenis.destroy();
      };
    };

    // Reduced motion: no Lenis at all — native scroll.
    const apply = () => {
      teardown?.();
      teardown = mq.matches ? null : start();
    };
    apply();
    mq.addEventListener("change", apply);

    return () => {
      mq.removeEventListener("change", apply);
      teardown?.();
    };
  }, []);

  return <>{children}</>;
}
