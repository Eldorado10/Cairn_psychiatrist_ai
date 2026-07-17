// Static stand-in for the 3D blob: the dynamic-import poster, and the
// permanent render under prefers-reduced-motion or when WebGL is missing.
// The lamplight core here is the sanctioned non-canvas use of that token —
// it depicts the same inner glow the hero's pointLight produces.
export function OrbPoster() {
  return (
    <div
      aria-hidden
      data-orb-poster
      className="pointer-events-none absolute inset-0 flex items-center justify-center overflow-hidden"
    >
      <div
        className="size-[min(70vmin,40rem)] rounded-full opacity-80 blur-2xl"
        style={{
          background:
            "radial-gradient(circle at 50% 55%, var(--color-lamplight) 0%, var(--color-eucalyptus) 32%, color-mix(in oklab, var(--color-eucalyptus) 35%, transparent) 58%, transparent 72%)",
        }}
      />
    </div>
  );
}
