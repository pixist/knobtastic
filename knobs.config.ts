/**
 * Knobtastic bindings — v0 declares these explicitly, no auto-inference.
 *
 * Each entry binds one MIDI CC to one CSS custom property. Tokens are
 * unitless numbers; globals.css derives the united values (px/rem) from
 * them, so live updates and commit both deal in plain numbers.
 *
 * `cc` and `mode` are optional: when omitted, the panel detects the
 * connected controller by name (src/knobs/devices.ts) and assigns its
 * encoders to knobs in declaration order — put the most crucial token
 * first and it lands on the first physical knob. Declare `cc` explicitly
 * to pin a knob or to support an unknown controller.
 *
 * Two encoder modes:
 * - "absolute": pots that send 0–127 (Akai MPK etc). Normalized to
 *   [min, max] and snapped to `step`.
 * - "relative": endless encoders sending two's-complement ticks
 *   (Ableton Push 1/2 in User Mode, encoders CC 71–78). Each tick moves
 *   the value by `step * relScale`.
 */

export type KnobMode = "absolute" | "relative";

export interface KnobDef {
  /** Panel control key and commit payload key. */
  id: string;
  /** Label shown in the panel and on the faceplate. */
  label: string;
  /** Unitless CSS custom property this knob drives, e.g. "--radius-n". */
  cssVar: string;
  min: number;
  max: number;
  step: number;
  /** MIDI control-change number (0–127). Omit to auto-assign by device. */
  cc?: number;
  /** Encoder type — see header comment. Omit to follow the device profile. */
  mode?: KnobMode;
  /** Relative mode only: value change per tick = step * relScale. */
  relScale?: number;
  /** Display-only unit for readouts, e.g. "px". */
  unitLabel?: string;
  /** Display-only multiplier for readouts (e.g. 100 to show 0.25 as 25). */
  readoutScale?: number;
}

/** Declaration order = physical knob order when cc is auto-assigned. */
export const knobs: KnobDef[] = [
  {
    id: "primaryHue",
    label: "Hue",
    cssVar: "--primary-h",
    min: 0,
    max: 360,
    step: 1,
    relScale: 2,
    unitLabel: "°",
  },
  {
    id: "radius",
    label: "Radius",
    cssVar: "--radius-n",
    min: 0,
    max: 28,
    step: 1,
    relScale: 0.5,
    unitLabel: "px",
  },
  {
    id: "space",
    label: "Space",
    cssVar: "--space-n",
    min: 0.14,
    max: 0.42,
    step: 0.005,
    unitLabel: "%",
    readoutScale: 100,
  },
  {
    id: "fontSize",
    label: "Type",
    cssVar: "--fs-n",
    min: 13,
    max: 20,
    step: 0.5,
    relScale: 0.5,
    unitLabel: "px",
  },
];
