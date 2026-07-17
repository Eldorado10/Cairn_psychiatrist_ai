# Cairn

Next.js (App Router) + TypeScript (strict) + Tailwind CSS v4 + shadcn/ui (radix, neutral base, CSS variables). Package manager is **pnpm**. Path alias: `@/*` → `src/*`.

- Dev server: `pnpm dev` (http://localhost:3000)
- Build: `pnpm build` · Lint: `pnpm lint`
- Key libs: gsap, lenis, three / @react-three/fiber / @react-three/drei, motion, zod, @supabase/supabase-js + @supabase/ssr, ai, @openrouter/ai-sdk-provider

## Design tokens — the ONLY colors allowed

Defined in `src/app/globals.css` under `@theme`. **No arbitrary hex/oklch/rgb values anywhere else in the app** — no `bg-[#...]`, no inline color styles, no one-off palette additions. If a color is missing, change the token layer, not the call site.

| Token | Value | Role |
| --- | --- | --- |
| `--color-ink` | `#161222` | App background |
| `--color-surface` | `#221B34` | Cards, raised surfaces |
| `--color-veil` | `#332948` | Borders, inputs, muted surfaces |
| `--color-bone` | `#F2EDE6` | Primary text |
| `--color-mute` | `#A398B8` | Secondary text |
| `--color-eucalyptus` | `#7FB6A0` | Primary accent, focus rings |
| `--color-lamplight` | `#E8B04B` | **Reserved — see below** |
| `--color-risk-low` | `#7FB6A0` | Risk scale |
| `--color-risk-moderate` | `#D9C078` | Risk scale |
| `--color-risk-elevated` | `#D98E5F` | Risk scale |
| `--color-risk-high` | `#C4635F` | Risk scale |

### The lamplight rule

`--color-lamplight` is reserved **exclusively** for the 3D hero's inner glow. It must **never** appear on buttons, text, icons, borders, or any UI chrome. If you're reaching for a warm accent in UI, you're wrong — use `eucalyptus` or the risk scale. (The one sanctioned non-canvas use: the static orb poster in `src/components/hero/orb-poster.tsx`, which depicts that same inner glow for reduced-motion/no-WebGL users.)

The shadcn semantic variables (`--background`, `--primary`, …) in `globals.css` are mapped onto these tokens. The app is **dark-only**: `body` is `bg-ink text-bone font-body`.

## Typography

- `--font-display` → Instrument Serif (via `next/font/google`, **weight 400 only** — never bold/italicize display type)
- `--font-body` → Inter Tight (body and all UI)
- Display sizes: `text-display-sm|md|lg|xl` utilities (defined in `@theme`); `md` and up carry tight tracking (`-0.03em`). Always pair with `font-display`.
- Respect `prefers-reduced-motion`: global overrides in `globals.css` kill transforms and drop animation durations to 0.01ms. Don't fight them.

## Folder structure

```
cairn/
  src/
    app/            # App Router routes, layout.tsx, globals.css (token layer)
    components/     # Shared components; components/ui/ is shadcn-managed
    lib/            # Utilities (lib/utils.ts: cn helper)
    hooks/          # Shared hooks
  public/           # Static assets
  components.json   # shadcn config
  .claude/skills/run-cairn/   # How to run & drive the app (agents: use this)
```

## Environment variables

**No secret may ever be prefixed `NEXT_PUBLIC_`** — with exactly two exceptions:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

Everything else (service-role keys, OpenRouter/AI keys, webhook secrets, …) is server-only: unprefixed, read only in server code, never imported into a client component.
