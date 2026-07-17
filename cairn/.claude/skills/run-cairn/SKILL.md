---
name: run-cairn
description: Run, start, build, screenshot, or drive the cairn Next.js app. Boots the pnpm dev server and drives the rendered page headless (navigate, click, type, eval, screenshot) via the CDP driver — use for verifying UI changes in the real app.
---

# Run cairn

Next.js 16 (App Router, Turbopack) + Tailwind v4 app. Driven headless via
`.claude/skills/run-cairn/driver.mjs` — a dependency-free Node script that
launches the system Edge/Chrome and speaks raw Chrome DevTools Protocol.
No Playwright/chromium-cli needed. **All paths below are relative to `cairn/`.**

## Prerequisites

Windows with Node ≥ 22, pnpm, and Edge or Chrome installed (verified with
Node 25.2.1, pnpm 11.13.1, system Edge). Nothing else.

## Setup + build

```bash
pnpm install
```

Native builds (sharp, unrs-resolver) are pre-approved in `pnpm-workspace.yaml`
(`allowBuilds:`). If pnpm prints `ERR_PNPM_IGNORED_BUILDS`, a new native dep
needs adding there — do that, don't run interactive `pnpm approve-builds`.

No separate build step for dev. Production build (if needed): `pnpm build`.

## Run + drive (agent path)

Start the dev server in the background (ready in <2s, serves on
http://localhost:3000):

```bash
pnpm dev   # run_in_background; wait until curl -s -o /dev/null -w '%{http_code}' http://localhost:3000 prints 200
```

Then pipe commands to the driver (run from `cairn/`):

```bash
printf 'goto /\nwait h1\ntext h1\neval getComputedStyle(document.body).backgroundColor\nsleep 800\nss home.png\nquit\n' | node .claude/skills/run-cairn/driver.mjs
```

Expected output for the current homepage: `"Cairn"` for the h1, body
background `rgb(22, 18, 34)` (= `--color-ink`). **Read the .png afterwards to
actually look at it.**

Driver commands (one per line on stdin):

| Command | Does |
| --- | --- |
| `goto <path-or-url>` | navigate; bare paths resolve against `$CAIRN_URL` (default `http://localhost:3000`) |
| `ss [file.png]` | screenshot viewport (1280×800) to file, relative to cwd |
| `eval <js>` | evaluate in page, prints JSON (promises awaited) |
| `text <sel>` / `click <sel>` / `wait <sel>` | innerText / click / poll-15s for first `querySelector` match |
| `type <sel> \| <text>` | set input value React-safely + fire `input` event |
| `wheel <dy> [x y]` | real mouse-wheel event — use this to test Lenis/ScrollTrigger scroll behavior (positive dy = down) |
| `viewport <w> <h>` | resize viewport; `viewport 390 844` for the mobile breakpoint (`mobile: true` under 768) |
| `media <feature> <val>` | emulate media feature, e.g. `media prefers-reduced-motion reduce` (fires matchMedia change listeners live) |
| `sleep <ms>` / `quit` | pause / close browser and exit |

Env: `CAIRN_URL` to point at another port, `DRIVER_BROWSER` to pick the exe.

Stop the server when done: kill the background `pnpm dev` task, or find the
PID with `netstat -ano | grep ':3000' | grep LISTENING` and
`taskkill //PID <pid> //F` (double slashes in Git Bash).

## Run (human path)

`pnpm dev` in a terminal → open http://localhost:3000 → Ctrl-C to stop.

## Test / lint

No test suite yet. `pnpm lint` runs ESLint (passes silently when clean).

## Gotchas

- **pnpm 11 blocks postinstall scripts by default.** sharp and unrs-resolver
  must be listed under `allowBuilds:` in `pnpm-workspace.yaml` (already done);
  the scaffolded placeholder text pnpm generates there is not valid config.
- **shadcn CLI ≥ 4.13 changed its flags:** `-b` is the component library
  (`radix`|`base`), NOT the base color, and init prompts interactively for a
  preset unless you pass one. Non-interactive init that worked here:
  `pnpm dlx shadcn@latest init -b radix -p nova -y` (presets: nova, vega,
  maia, lyra, mira, luma, sera, rhea). Base color lives in `components.json`.
- **Screenshots include Next's dev-tools badge** (dark "N" circle,
  bottom-left). Not a UI bug.
- **VS Code flags `@theme` as "Unknown at rule".** Tailwind v4 syntax; the CSS
  language server just doesn't know it. Harmless.
- Design constraints when changing UI: tokens in `src/app/globals.css` are the
  only allowed colors, and `--color-lamplight` never appears on buttons/text —
  see `CLAUDE.md`.
- **The site uses Lenis smooth scrolling** (disabled under reduced motion).
  `eval window.scrollTo(...)` works, but `wheel` exercises the real
  Lenis→ScrollTrigger path; after a `wheel`, `sleep 1000+` before asserting —
  the scroll lerps. Lenis being active = `lenis` class on `<html>`.
- **Synthetic `.click()` doesn't move keyboard focus**, so focus-restore
  assertions need an explicit `.focus()` before the click (this cost real
  debugging time — the code was right, the test gesture was wrong).
- **The chat Finish flow is slow with a real model**: `POST
  /api/conversations/<id>/finish` runs a structured extraction on
  `openrouter/free` and takes **15–20s**. After clicking the header Finish
  button, `sleep 25000` before `wait section[aria-label="Conversation
  reflection"]`. With `AI_MOCK_MODE=true` it's instant.
- **WebGL works in the headless driver** (SwiftShader, even with
  `--disable-gpu`): the R3F hero blob renders for real. Give it `sleep 4000`
  after load before screenshotting — dynamic import + first frames take a
  few seconds. Under `media prefers-reduced-motion reduce` the canvas is
  replaced by the static orb (`[data-orb-poster]`) — that's by design.

## Troubleshooting

- `ERR no Edge/Chrome found` from driver → set
  `DRIVER_BROWSER='C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe'`
  (or your Chrome path).
- Driver prints `ERR timeout waiting for Page.loadEventFired` → dev server not
  up yet or wrong port; curl the URL first, set `CAIRN_URL` if it moved.
- `Validation failed: - base: Invalid enum value ... received 'neutral'` from
  shadcn init → you used the old-CLI base-color flag; see Gotchas.
