"use client";

import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import { button, Leva, levaStore, useControls } from "leva";
import { knobs, type KnobDef } from "../../knobs.config";
import { detectProfile } from "./devices";
import {
  applyRelative,
  connectMidi,
  normalizeCC,
  type MidiConnection,
} from "./midi";

function readToken(k: KnobDef): number {
  const raw = getComputedStyle(document.documentElement).getPropertyValue(
    k.cssVar,
  );
  const n = parseFloat(raw);
  return Number.isFinite(n) ? n : k.min;
}

function applyToken(k: KnobDef, value: number) {
  document.documentElement.style.setProperty(k.cssVar, String(value));
}

function Panel({ onCommitted }: { onCommitted: () => void }) {
  // Live phase: values exist only as CSS custom properties on <html> and in
  // the leva store. Source files are never touched until Commit.

  // Commit phase: exactly one write-back, then the panel detaches.
  const commit = useCallback(async (values: Record<string, number>) => {
    const res = await fetch("/api/knobs/commit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ values }),
    });
    if (!res.ok) {
      const detail = await res.json().catch(() => null);
      alert(`Commit failed: ${detail?.error ?? res.statusText}`);
      return;
    }
    // Committed values are in source now — drop the runtime overrides so
    // the page renders from globals.css again, then disconnect.
    for (const k of knobs) {
      document.documentElement.style.removeProperty(k.cssVar);
    }
    onCommitted();
  }, [onCommitted]);

  const [, set] = useControls(() => {
    const schema: Record<
      string,
      {
        value: number;
        min: number;
        max: number;
        step: number;
        label: string;
        onChange: (v: number) => void;
      }
    > = {};
    knobs.forEach((k, i) => {
      schema[k.id] = {
        value: readToken(k),
        min: k.min,
        max: k.max,
        step: k.step,
        label: k.cc !== undefined ? `${k.label} · CC ${k.cc}` : `${k.label} · ${i + 1}`,
        onChange: (v: number) => applyToken(k, v),
      };
    });
    return schema;
  });

  useControls(
    {
      "Commit to source": button((get) =>
        void commit(
          Object.fromEntries(knobs.map((k) => [k.id, get(k.id) as number])),
        ),
      ),
    },
    [commit],
  );

  // Physical knob → CC message → normalized value → leva set() → onChange
  // applies the CSS custom property. Same code path as dragging the slider.
  useEffect(() => {
    type Binding = KnobDef & { mode: "absolute" | "relative"; relScale: number };
    const byCC = new Map<number, Binding>();
    let conn: MidiConnection | null = null;
    let disposed = false;

    // Explicit cc/mode in knobs.config.ts always wins; otherwise assign
    // encoders from the detected device profile in declaration order.
    const rebind = (names: string[]) => {
      byCC.clear();
      const profile = detectProfile(names);
      knobs.forEach((k, i) => {
        const cc = k.cc ?? profile?.encoders[i];
        if (cc === undefined) return;
        byCC.set(cc, {
          ...k,
          cc,
          mode: k.mode ?? profile?.mode ?? "absolute",
          relScale: k.relScale ?? profile?.relScale ?? 1,
        });
      });
      if (profile) {
        console.info(
          `knobtastic: ${profile.label} — CCs ${[...byCC.keys()].join(", ")}`,
        );
      } else if (names.length > 0 && byCC.size === 0) {
        console.warn(
          `knobtastic: unknown controller (${names.join(", ")}) and no explicit cc in knobs.config.ts — knobs unmapped`,
        );
      }
    };

    connectMidi(
      (cc, raw) => {
        const k = byCC.get(cc);
        if (!k) return;
        const next =
          k.mode === "relative"
            ? applyRelative(
                Number(levaStore.get(k.id)),
                raw,
                k.min,
                k.max,
                k.step,
                k.relScale,
              )
            : normalizeCC(raw, k.min, k.max, k.step);
        set({ [k.id]: next } as Parameters<typeof set>[0]);
      },
      (connected, names) => {
        document.documentElement.dataset.midi = connected ? "on" : "off";
        rebind(names);
      },
    ).then((c) => {
      if (disposed) c?.dispose();
      else conn = c;
    });

    return () => {
      disposed = true;
      conn?.dispose();
      delete document.documentElement.dataset.midi;
    };
  }, [set]);

  return (
    <Leva
      titleBar={{ title: "Knobtastic", filter: false }}
      theme={{ sizes: { rootWidth: "300px" } }}
    />
  );
}

const emptySubscribe = () => () => {};

export default function KnobsPanel() {
  // Leva schema reads getComputedStyle, so render strictly after hydration.
  const hydrated = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false,
  );
  const [committed, setCommitted] = useState(false);
  if (!hydrated || committed) return null;
  return <Panel onCommitted={() => setCommitted(true)} />;
}
