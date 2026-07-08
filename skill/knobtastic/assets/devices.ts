import type { KnobMode } from "../../knobs.config";

/**
 * Known-controller profiles. When knobs.config.ts omits `cc`/`mode`, the
 * panel detects the connected device by its Web MIDI input name and assigns
 * encoders to knobs in declaration order — declare the most crucial token
 * first and it lands on the first physical knob.
 */

export interface DeviceProfile {
  /** Tested against every MIDI input name. */
  match: RegExp;
  label: string;
  mode: KnobMode;
  /** CC numbers in physical left-to-right order. */
  encoders: number[];
  /** Default per-tick feel for relative encoders. */
  relScale?: number;
}

export const deviceProfiles: DeviceProfile[] = [
  {
    // User Mode (hold the User button): 8 endless encoders above the display.
    match: /push/i,
    label: "Ableton Push (User Mode)",
    mode: "relative",
    encoders: [71, 72, 73, 74, 75, 76, 77, 78],
  },
  {
    // MPK Mini mk3 factory program.
    match: /mpk\s?mini/i,
    label: "Akai MPK Mini",
    mode: "absolute",
    encoders: [70, 71, 72, 73, 74, 75, 76, 77],
  },
  {
    // nanoKONTROL2 default scene, knob row.
    match: /nanokontrol/i,
    label: "Korg nanoKONTROL2",
    mode: "absolute",
    encoders: [16, 17, 18, 19, 20, 21, 22, 23],
  },
];

/** Ports that exist without any device attached (ALSA's virtual thru). */
export function isVirtualPort(name: string): boolean {
  return /through|thru/i.test(name);
}

export function detectProfile(inputNames: string[]): DeviceProfile | null {
  for (const name of inputNames) {
    if (isVirtualPort(name)) continue;
    const profile = deviceProfiles.find((p) => p.match.test(name));
    if (profile) return profile;
  }
  return null;
}
