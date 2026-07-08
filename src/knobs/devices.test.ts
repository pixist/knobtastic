import { describe, expect, it } from "vitest";
import { detectProfile, isVirtualPort } from "./devices";

describe("isVirtualPort", () => {
  it("flags ALSA thru ports that exist without hardware", () => {
    expect(isVirtualPort("Midi Through Port-0")).toBe(true);
    expect(isVirtualPort("Ableton Push User Port")).toBe(false);
  });
});

describe("detectProfile", () => {
  it("detects a Push and maps its user-mode encoders", () => {
    const p = detectProfile(["Midi Through Port-0", "Ableton Push MIDI 2"]);
    expect(p?.label).toContain("Push");
    expect(p?.mode).toBe("relative");
    expect(p?.encoders[0]).toBe(71);
  });

  it("detects absolute controllers", () => {
    expect(detectProfile(["MPK mini 3"])?.mode).toBe("absolute");
    expect(detectProfile(["nanoKONTROL2 MIDI 1"])?.encoders[0]).toBe(16);
  });

  it("ignores virtual ports and unknown devices", () => {
    expect(detectProfile(["Midi Through Port-0"])).toBeNull();
    expect(detectProfile(["Some Random Synth"])).toBeNull();
    expect(detectProfile([])).toBeNull();
  });
});
