# Knobtastic v0 — Design

Date: 2026-07-08. Spec provided by user; this records the confirmed decisions.

## Goal (hero interaction)

Physical MIDI knob tweaks design tokens of a running Next.js + Tailwind site live
(zero recompile), then one **Commit** click writes final values back to source and
the panel detaches.

## Stack

- Next.js 16 (App Router, TypeScript, Turbopack), React 19
- Tailwind CSS v4, CSS-first config: tokens are CSS custom properties in
  `src/app/globals.css`, mapped to utilities via `@theme inline`
- `leva` control panel
- Native Web MIDI API (`navigator.requestMIDIAccess()`), Chrome/Edge only
- No daemon, no Electron, no cloud

## Architecture

```
knobs.config.ts                 # explicit bindings: id, label, cssVar, min, max, step, unit, cc
src/
  app/
    layout.tsx                  # mounts <KnobsPanel/> (development only)
    page.tsx                    # demo landing page styled by the tokens
    globals.css                 # :root tokens inside marker comments + @theme inline mapping
    api/knobs/commit/route.ts   # dev-only POST: rewrites :root token values in globals.css
  knobs/
    KnobsPanel.tsx              # leva panel + live CSS var updates + Commit button
    midi.ts                     # MIDI access, CC listener, 0–127 → min/max normalize
    rewrite.ts                  # pure function: rewrite token values inside marker block
```

## Two phases, strictly separate

- **Live**: knob turn → CC message → normalize → leva `set()` → `onChange` →
  `document.documentElement.style.setProperty(cssVar, value)`. Inline style on
  `<html>` overrides `:root` — runtime only, no source writes, no recompile.
- **Commit**: single POST of current values → route handler validates against
  `knobs.config.ts` (whitelist of cssVars, numeric values only) → rewrites the
  token block in `globals.css` between `/* knobtastic:tokens */` markers →
  panel clears inline overrides and detaches. Guarded to `NODE_ENV=development`.

## Tokens (v0 set)

| id       | cssVar        | drives                                        |
|----------|---------------|-----------------------------------------------|
| primaryHue | `--primary-h` | hue of `--primary: hsl(var(--primary-h) S L)` |
| radius   | `--radius`    | border radius scale                           |
| space    | `--space`     | Tailwind `--spacing` base → whole page rhythm |
| fontSize | `--fs-base`   | `html { font-size }` → all rem-based type     |

Color via single CC: knob drives hue only; saturation/lightness fixed in the
derived `--primary` definition (not committed, not knob-driven).

## Controller modes (added same day)

Default mapping: Ableton Push 1 in User Mode — endless encoders CC 71–74
sending relative two's-complement ticks (`mode: "relative"`, feel tuned via
`relScale`). Absolute 0–127 pots remain supported (`mode: "absolute"`).

## Claude skill (added same day)

`skill/knobtastic/` packages the runtime as an exportable Claude Code skill:
Claude installs the panel into any Next.js + Tailwind project when finishing
UI work, picks the uncertain tokens, hands off to the user's controller,
waits on `scripts/wait-for-commit.sh` (marker-block watcher), then folds the
tuned values into the pending git commit. Packaged artifact:
`dist/knobtastic.skill`; installed copy: `~/.claude/skills/knobtastic`.

## Non-goals (v0)

No AI inference of bindings, no MIDI-learn UI, no multi-controller, no undo,
no frameworks besides Next.js + Tailwind, no accounts/hosting/telemetry.
