import { knobs } from "../../knobs.config";

function knobVars(cssVar: string, min: number, max: number, scale?: number) {
  return {
    "--v": `var(${cssVar})`,
    "--min": min,
    "--max": max,
    "--scale": scale ?? 1,
  } as React.CSSProperties;
}

export default function Home() {
  return (
    <main className="flex-1">
      {/* Top rail */}
      <header className="border-b border-line">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <span className="font-mono text-sm font-semibold tracking-[0.35em] text-ink">
            KNOBTASTIC
          </span>
          <span className="flex items-center gap-3 font-mono text-xs text-ink-soft">
            <span className="led" aria-hidden />
            MIDI
          </span>
        </div>
      </header>

      {/* Hero */}
      <section className="mx-auto max-w-6xl px-6 pt-20 pb-14">
        <p
          className="rise font-mono text-xs font-medium tracking-[0.3em] text-primary-deep"
          style={{ "--rise-delay": "0ms" } as React.CSSProperties}
        >
          MIDI IN — CSS OUT
        </p>
        <h1
          className="rise mt-6 max-w-3xl text-[clamp(2.4rem,6vw,4.2rem)] leading-[1.04] font-extrabold [font-stretch:118%]"
          style={{ "--rise-delay": "80ms" } as React.CSSProperties}
        >
          Tune your interface
          <br />
          like a <span className="text-primary">synth</span>.
        </h1>
        <p
          className="rise mt-7 max-w-xl text-lg leading-relaxed text-ink-soft"
          style={{ "--rise-delay": "160ms" } as React.CSSProperties}
        >
          Knobtastic binds a MIDI controller to your CSS design tokens. Twist a
          knob to explore live — no rebuild, no reload. Hit Commit and the
          final values land in{" "}
          <span className="font-mono text-[0.92em] text-ink">globals.css</span>.
        </p>
        <div
          className="rise mt-9 flex flex-wrap gap-4"
          style={{ "--rise-delay": "240ms" } as React.CSSProperties}
        >
          <a
            href="#faceplate"
            className="rounded-md bg-primary px-6 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-primary-deep"
          >
            Start twisting
          </a>
          <a
            href="#declare"
            className="rounded-md border border-line bg-panel-raised px-6 py-3 text-sm font-semibold text-ink transition-colors hover:border-ink-soft"
          >
            Read the config
          </a>
        </div>
      </section>

      {/* Faceplate — pointers rotate straight from the live CSS tokens */}
      <section id="faceplate" className="mx-auto max-w-6xl px-6 pb-20">
        <div
          className="rise rounded-xl border border-line bg-panel-raised px-8 py-10 shadow-sm"
          style={{ "--rise-delay": "320ms" } as React.CSSProperties}
        >
          <div className="grid grid-cols-2 gap-10 sm:grid-cols-4">
            {knobs.map((k, i) => (
              <div
                key={k.id}
                className="flex flex-col items-center gap-4"
                style={knobVars(k.cssVar, k.min, k.max, k.readoutScale)}
              >
                <div className="knob" role="img" aria-label={`${k.label} knob`} />
                <div className="text-center">
                  <p className="font-mono text-[0.7rem] tracking-[0.2em] text-ink-soft">
                    {k.cc !== undefined ? `CC ${k.cc}` : `ENC ${i + 1}`} ·{" "}
                    {k.label.toUpperCase()}
                  </p>
                  <p className="mt-1 font-mono text-sm font-semibold text-ink">
                    <span className="readout" />
                    {k.unitLabel}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Two phases + config */}
      <section className="mx-auto max-w-6xl px-6 pb-24">
        <div className="grid gap-6 md:grid-cols-3">
          <div className="rounded-lg border border-line bg-panel-raised p-8">
            <p className="font-mono text-xs tracking-[0.25em] text-primary-deep">
              LIVE
            </p>
            <h2 className="mt-4 text-xl font-bold">Runtime only</h2>
            <p className="mt-3 leading-relaxed text-ink-soft">
              Knob turns mutate CSS custom properties on the page — nothing is
              compiled, nothing is written. Your source stays untouched while
              you explore.
            </p>
          </div>
          <div className="rounded-lg border border-line bg-panel-raised p-8">
            <p className="font-mono text-xs tracking-[0.25em] text-primary-deep">
              COMMIT
            </p>
            <h2 className="mt-4 text-xl font-bold">One write, then done</h2>
            <p className="mt-3 leading-relaxed text-ink-soft">
              One click writes the final values back into the token block of
              globals.css, then the panel disconnects. The diff is yours to
              review.
            </p>
          </div>
          <div
            id="declare"
            className="rounded-lg border border-line bg-panel-raised p-8"
          >
            <p className="font-mono text-xs tracking-[0.25em] text-primary-deep">
              DECLARE
            </p>
            <h2 className="mt-4 text-xl font-bold">knobs.config.ts</h2>
            <pre className="mt-3 overflow-x-auto rounded-md bg-ink p-4 font-mono text-[0.72rem] leading-relaxed text-panel">
              {`{
  id: "radius",
  cssVar: "--radius-n",
  min: 0, max: 28, step: 1,
  cc: 71,
}`}
            </pre>
          </div>
        </div>
      </section>

      {/* Footer rail */}
      <footer className="border-t border-line">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-6 py-5 font-mono text-xs text-ink-soft">
          <span>Chrome · Web MIDI · any class-compliant controller</span>
          <span>values commit to src/app/globals.css</span>
        </div>
      </footer>
    </main>
  );
}
