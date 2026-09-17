"use client";

import {
  useCallback,
  useEffect,
  useState,
  useSyncExternalStore,
} from "react";
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

function Panel({
  onCommitted,
  onHide,
}: {
  onCommitted: () => void;
  onHide: () => void;
}) {
  // Live phase: values exist only as CSS custom properties on <html> and in
  // the leva store. Source files are never touched until Commit.

  // Relative encoders accumulate sub-step deltas here: leva snaps the stored
  // value for display, but the accumulator keeps the fine position so slow
  // turns move in both directions (reading the snapped value back would
  // swallow ticks smaller than one step).
  const [acc] = useState(() => new Map<string, number>());

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
        onChange: (v: number) => {
          applyToken(k, v);
          // Resync the accumulator when the slider (not a MIDI tick) moves a
          // token far from the fine position. A programmatic set() from a
          // relative tick lands within half a step of the accumulator, so the
          // guard leaves it alone; a drag jumps further and re-anchors it.
          const a = acc.get(k.id);
          if (a !== undefined && Math.abs(v - a) > k.step / 2 + 1e-9) {
            acc.set(k.id, v);
          }
        },
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
      "Hide panel": button(() => onHide()),
    },
    [commit, onHide],
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
      acc.clear();
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
        let next: number;
        if (k.mode === "relative") {
          // Accumulate against the fine position, not the snapped leva value,
          // so sub-step ticks are never lost.
          const base = acc.get(k.id) ?? Number(levaStore.get(k.id));
          next = applyRelative(base, raw, k.min, k.max, k.step, k.relScale);
          acc.set(k.id, next);
        } else {
          next = normalizeCC(raw, k.min, k.max, k.step);
        }
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
  }, [set, acc]);

  return (
    <Leva
      titleBar={{ title: "Knobtastic", filter: false }}
      theme={{ sizes: { rootWidth: "300px" } }}
    />
  );
}

/** Collapsed launcher — exposing the panel is what connects MIDI, so the Web
 *  MIDI permission prompt only fires on this deliberate click (or when the
 *  browser already granted it), never unannounced on page load. */
function Launcher({ onExpose }: { onExpose: () => void }) {
  return (
    <button
      type="button"
      onClick={onExpose}
      title="Bind a MIDI controller to your design tokens"
      style={{
        position: "fixed",
        top: 12,
        right: 12,
        zIndex: 1000,
        display: "flex",
        alignItems: "center",
        gap: 8,
        padding: "8px 12px",
        borderRadius: 8,
        border: "1px solid rgba(255,255,255,0.16)",
        background: "#181c20",
        color: "#e6e8ea",
        font: "500 12px/1 ui-monospace, SFMono-Regular, Menlo, monospace",
        letterSpacing: "0.08em",
        cursor: "pointer",
        boxShadow: "0 2px 12px rgba(0,0,0,0.35)",
      }}
    >
      <span
        aria-hidden
        style={{
          width: 8,
          height: 8,
          borderRadius: "50%",
          background: "#8b5cf6",
          boxShadow: "0 0 8px #8b5cf6",
        }}
      />
      KNOBTASTIC
    </button>
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
  const [exposed, setExposed] = useState(false);

  // Auto-expose (and so auto-connect MIDI) only when the browser already
  // granted MIDI access — a returning dev skips the click, a first-time visit
  // never triggers a permission prompt it didn't ask for.
  useEffect(() => {
    if (!("permissions" in navigator)) return;
    let cancelled = false;
    navigator.permissions
      .query({ name: "midi" as PermissionName })
      .then((p) => {
        if (!cancelled && p.state === "granted") setExposed(true);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  if (!hydrated || committed) return null;
  if (!exposed) return <Launcher onExpose={() => setExposed(true)} />;
  return (
    <Panel
      onCommitted={() => setCommitted(true)}
      onHide={() => setExposed(false)}
    />
  );
}
