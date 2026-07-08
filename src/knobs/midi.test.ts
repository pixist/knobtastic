import { describe, expect, it } from "vitest";
import { applyRelative, decodeRelative, normalizeCC } from "./midi";

describe("normalizeCC (absolute pots)", () => {
  it("maps the 0–127 range onto min/max", () => {
    expect(normalizeCC(0, 0, 360, 1)).toBe(0);
    expect(normalizeCC(127, 0, 360, 1)).toBe(360);
    expect(normalizeCC(64, 0, 28, 1)).toBe(14);
  });

  it("snaps to fractional steps without float noise", () => {
    expect(normalizeCC(64, 0.14, 0.42, 0.005)).toBe(0.28);
    expect(normalizeCC(127, 13, 20, 0.5)).toBe(20);
  });
});

describe("decodeRelative (two's complement, Push 1 User Mode)", () => {
  it("decodes clockwise ticks as positive", () => {
    expect(decodeRelative(1)).toBe(1);
    expect(decodeRelative(3)).toBe(3);
    expect(decodeRelative(63)).toBe(63);
  });

  it("decodes counterclockwise ticks as negative", () => {
    expect(decodeRelative(127)).toBe(-1);
    expect(decodeRelative(126)).toBe(-2);
    expect(decodeRelative(65)).toBe(-63);
  });
});

describe("applyRelative (endless encoders)", () => {
  it("moves by step per tick and clamps at the range edges", () => {
    expect(applyRelative(10, 1, 0, 28, 1)).toBe(11);
    expect(applyRelative(10, 127, 0, 28, 1)).toBe(9);
    expect(applyRelative(28, 1, 0, 28, 1)).toBe(28);
    expect(applyRelative(0, 127, 0, 28, 1)).toBe(0);
  });

  it("scales ticks by relScale, including sub-step moves", () => {
    expect(applyRelative(180, 1, 0, 360, 1, 2)).toBe(182);
    expect(applyRelative(10, 1, 0, 28, 1, 0.5)).toBe(10.5);
  });

  it("handles fast turns (larger tick magnitudes)", () => {
    expect(applyRelative(0.25, 3, 0.14, 0.42, 0.005)).toBe(0.265);
    expect(applyRelative(0.25, 125, 0.14, 0.42, 0.005)).toBe(0.235);
  });
});
