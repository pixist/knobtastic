---
name: knobtastic
description: Let the user tune design tokens (colors, radius, spacing, type scale) of a Next.js + Tailwind app by hand with a physical MIDI controller before values are committed to source. Use this whenever UI/styling work in a Next.js + Tailwind project is about to be committed and the user might want to fine-tune visual values; whenever the user mentions knobtastic, MIDI, knobs, a hardware controller (Ableton Push, Akai, etc.), "tuning by hand", or picking final design values live; when the user asks to "let me tweak it" after you built or restyled UI; and when invoked as /knobtastic — with optional natural-language arguments like "bind the hero gradient hue to knob 2" or "use my nanoKONTROL". Instead of guessing final values yourself, install the panel and hand the decision to the user's hands.
---

# Knobtastic — hand the final design values to the user's knobs

You built or changed UI. Instead of committing your best-guess values for
color, radius, spacing, or type scale, wire those values to a MIDI
controller, let the user tune them live on the running page, and only then
commit. The user's Commit click writes the values into source; you fold that
into the change you were about to commit.

Two phases, strictly separate — never blur them:

- **Live**: knob turns mutate runtime CSS custom properties only. No file
  writes, no recompile.
- **Commit**: the user clicks "Commit to source" in the panel; a dev-only
  API route rewrites the token block in the global CSS. One write, then the
  panel detaches.

## Workflow

### 1. Preflight

Confirm the project is Next.js + Tailwind and runs with a dev server. Check
whether Knobtastic is already installed (a `knobs.config.ts` at the project
root). If installed, skip to step 4.

### 2. Install the runtime (once per project)

Install leva (`pnpm add leva` / npm / yarn — match the project's lockfile),
then copy from this skill's `assets/`:

| Asset | Destination |
|---|---|
| `knobs.config.ts` | project root |
| `KnobsPanel.tsx`, `midi.ts`, `rewrite.ts`, `devices.ts` | `src/knobs/` |
| `commit-route.ts` | `src/app/api/knobs/commit/route.ts` |

Adjust relative import paths if the project layout differs (no `src/`,
different alias). Mount the panel in the root layout, development only:

```tsx
{process.env.NODE_ENV === "development" && <KnobsPanel />}
```

### 3. Choose and wire the tokens (the judgment step)

Pick 3–8 high-leverage design variables from the work you just did — the
ones you were least sure about. Good candidates: primary color hue, border
radius scale, spacing scale, root font size, accent saturation/lightness.

Wire them as **unitless numeric** CSS custom properties inside a
marker-fenced block in the project's global CSS, deriving the united values
below it — see `assets/tokens.css` for the pattern. Unitless matters: the
panel, the MIDI mapping, and the commit rewriter all deal in plain numbers,
and CSS `calc()` derives px/rem/deg from them. The marker comments are
load-bearing — Commit rewrites only what sits between them.

Then point the existing styles at the derived tokens (Tailwind v4:
`@theme inline`; v3: reference `var(--…)` from `tailwind.config`). Keep this
diff minimal — every touched line should serve a knob.

Declare each token in `knobs.config.ts` with sensible `min`/`max` (the range
the design could plausibly want, not the theoretical one) and the CC numbers
for the user's controller (step 4).

### 4. Map the controller (mostly automatic)

Detection happens at two layers — prefer letting them work over asking:

**Runtime (in the browser).** The panel reads Web MIDI input names, matches
them against the profiles in `devices.ts` (Ableton Push → relative CC 71–78;
Akai MPK Mini → absolute CC 70–77; Korg nanoKONTROL2 → absolute CC 16–23),
and assigns encoders to knobs **in declaration order**. So the only mapping
decision you make is ordering `knobs.config.ts` most-crucial-first — leave
`cc` and `mode` unset and the first declared token lands on the first
physical knob of whatever the user plugs in, including mid-session hot-plug.

**Terminal (before handoff).** To know what the user has plugged in, check:
`amidi -l` (Linux/ALSA; ignore "Midi Through"), or `lsusb`, or on macOS
`system_profiler SPUSBDataType`. Use the result to tell the user concretely
which physical knobs will do what, and to catch unknown controllers early.

When the controller matches no profile: ask the user for the CC numbers of a
few knobs (or have them twist one and read the browser console), then either
set explicit `cc`/`mode` per knob in `knobs.config.ts` or add a profile to
`devices.ts` (name regex + encoder CC list + mode). Explicit `cc` in the
config always overrides detection — use it when the user states a preference
like "hue on knob 3" (set that knob's `cc` to the profile's third encoder).

Feel: for relative encoders, value change per tick = `step * relScale`.
Push note: User Mode is entered with the **User** button.

### Handling natural-language arguments

The user may invoke `/knobtastic <request>`. Interpret, don't pattern-match:

- **Bare `/knobtastic`** — run the full workflow below.
- **"bind/tie <description> [to knob N]"** — e.g. "tie the card shadow
  depth to a knob": find (or create) the CSS variable behind that
  description, wire it as a unitless token (step 3), and add it to
  `knobs.config.ts` — at position N if given, else where its importance
  ranks. Then continue the flow, or just report the new binding if a tuning
  session is already running (config edits hot-reload).
- **"use/controller <device>"** — pin the mapping for that device: verify a
  profile exists in `devices.ts`, add one if not.
- **"unbind/remove <description>"** — delete the matching entry from
  `knobs.config.ts`.

### 5. Launch and hand off

Start the dev server in the background and give the user precise
instructions, e.g.:

> Open http://localhost:3000 in **Chrome** (Web MIDI doesn't exist in
> Firefox/Safari), allow MIDI access, put the Push in **User Mode** (User
> button). Encoders 1–4 drive hue / radius / spacing / type. When it looks
> right, click **"Commit to source"** in the panel.

The leva sliders drive the exact same code path, so the user can tune
without hardware too.

### 6. Wait for the user's Commit

Run this skill's `scripts/wait-for-commit.sh <path-to-global-css>` as a
background task — it exits when the marker block changes (or times out after
30 min). Do not poll in a foreground loop and do not proceed on your own:
the whole point is that the user picks the values. If it times out, ask the
user how they want to continue.

### 7. Fold into the commit

Show the user the resulting token diff (`git diff -- <global-css>`). Then
commit it together with the UI work it tunes — the tuned values are part of
that change, not a separate cleanup. Leave the Knobtastic runtime installed;
it is dev-only and inert in production builds (the commit route refuses
outside `NODE_ENV=development`).

## Pitfalls

- The commit route whitelists variables against `knobs.config.ts` and clamps
  to min/max — if a commit 400s, the config and the CSS block have drifted.
- `@property` + a short `transition` on `:root` turns quantized MIDI steps
  into smooth motion; without it, 128-step controllers feel notchy.
- Multiple MIDI devices: the runtime listens to all inputs, so a stray
  device sending the same CCs will fight the mapped one — unplug or remap.
- If the dev server picks a non-default port (3000 busy), tell the user the
  actual URL from the server log.
