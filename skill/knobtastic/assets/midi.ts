/**
 * Web MIDI plumbing — no server, no bridge. Listens on every connected
 * input and forwards control-change messages as (cc, 0–127).
 */

import { isVirtualPort } from "./devices";

export type CCHandler = (cc: number, value: number) => void;
export type StatusHandler = (connected: boolean, names: string[]) => void;

export interface MidiConnection {
  dispose(): void;
}

const CC_STATUS = 0xb0;

export async function connectMidi(
  onCC: CCHandler,
  onStatus: StatusHandler,
): Promise<MidiConnection | null> {
  if (!("requestMIDIAccess" in navigator)) {
    onStatus(false, []);
    return null;
  }

  let access: MIDIAccess;
  try {
    access = await navigator.requestMIDIAccess();
  } catch {
    onStatus(false, []);
    return null;
  }

  const handleMessage = (e: Event) => {
    const data = (e as MIDIMessageEvent).data;
    if (!data || data.length < 3) return;
    if ((data[0] & 0xf0) === CC_STATUS) onCC(data[1], data[2]);
  };

  const attachAll = () => {
    const names: string[] = [];
    for (const input of access.inputs.values()) {
      input.removeEventListener("midimessage", handleMessage);
      input.addEventListener("midimessage", handleMessage);
      const name = input.name ?? "unknown";
      // ALSA's "Midi Through" exists with no device attached — don't let it
      // light the LED or win device detection.
      if (input.state === "connected" && !isVirtualPort(name)) {
        names.push(name);
      }
    }
    onStatus(names.length > 0, names);
  };

  // Re-attach when a controller is plugged in or removed mid-session.
  access.addEventListener("statechange", attachAll);
  attachAll();

  return {
    dispose() {
      access.removeEventListener("statechange", attachAll);
      for (const input of access.inputs.values()) {
        input.removeEventListener("midimessage", handleMessage);
      }
    },
  };
}

/** Normalize a 0–127 CC value into [min, max], snapped to step. */
export function normalizeCC(
  raw: number,
  min: number,
  max: number,
  step: number,
): number {
  const scaled = min + (raw / 127) * (max - min);
  const snapped = Math.round(scaled / step) * step;
  return clampTrim(snapped, min, max, step);
}

/**
 * Decode a relative CC tick (two's complement, 7-bit) as sent by endless
 * encoders — e.g. Ableton Push 1/2 in User Mode: 1..63 = clockwise ticks,
 * 127..65 = counterclockwise (127 is -1). Fast turns send larger magnitudes.
 */
export function decodeRelative(raw: number): number {
  return raw < 64 ? raw : raw - 128;
}

/** Apply a relative tick to the current value: delta scaled by step. */
export function applyRelative(
  current: number,
  raw: number,
  min: number,
  max: number,
  step: number,
  relScale = 1,
): number {
  const next = current + decodeRelative(raw) * step * relScale;
  return clampTrim(next, min, max, step);
}

function clampTrim(value: number, min: number, max: number, step: number) {
  // trim float noise from fractional steps (e.g. 0.005)
  const decimals = Math.max(0, -Math.floor(Math.log10(step))) + 1;
  return Math.min(max, Math.max(min, Number(value.toFixed(decimals))));
}
