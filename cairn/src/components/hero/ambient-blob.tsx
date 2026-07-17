"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState, type MutableRefObject } from "react";
import { OrbPoster } from "@/components/hero/orb-poster";

const BlobCanvas = dynamic(() => import("@/components/hero/blob-canvas"), {
  ssr: false,
  loading: () => <OrbPoster />,
});

type Mode = "canvas" | "fallback";

export function AmbientBlob({
  distort,
}: {
  distort?: MutableRefObject<number>;
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [mode, setMode] = useState<Mode>("fallback");
  const [frameloop, setFrameloop] = useState<"always" | "never">("never");

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

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const observer = new IntersectionObserver(([entry]) => {
      setFrameloop(entry.isIntersecting ? "always" : "never");
    });
    observer.observe(root);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={rootRef} className="absolute inset-0">
      {mode === "canvas" ? (
        <BlobCanvas
          frameloop={frameloop}
          onReady={() => undefined}
          distort={distort}
        />
      ) : (
        <OrbPoster />
      )}
    </div>
  );
}
