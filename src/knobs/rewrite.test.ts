import { describe, expect, it } from "vitest";
import { rewriteTokens } from "./rewrite";

const css = `@import "tailwindcss";

/* knobtastic:tokens:start — this block is rewritten by Knobtastic Commit */
:root {
  --primary-h: 258;
  --radius-n: 10;
  --space-n: 0.25;
  --fs-n: 16;
}
/* knobtastic:tokens:end */

:root {
  --primary-h-derived: calc(var(--primary-h) * 1deg);
  --radius: calc(var(--radius-n) * 1px);
}
`;

describe("rewriteTokens", () => {
  it("rewrites values only inside the marker block", () => {
    const out = rewriteTokens(css, { "--primary-h": 120, "--radius-n": 4 });
    expect(out).toContain("--primary-h: 120;");
    expect(out).toContain("--radius-n: 4;");
    // untouched tokens and everything outside the block stay identical
    expect(out).toContain("--space-n: 0.25;");
    expect(out).toContain("--primary-h-derived: calc(var(--primary-h) * 1deg);");
    expect(out).toContain("--radius: calc(var(--radius-n) * 1px);");
  });

  it("handles fractional values", () => {
    const out = rewriteTokens(css, { "--space-n": 0.315 });
    expect(out).toContain("--space-n: 0.315;");
  });

  it("does not partially match longer token names", () => {
    // --primary-h must not swallow --primary-h-derived (outside block anyway),
    // and a block containing both orders must resolve exactly.
    const tricky = css.replace("--primary-h: 258;", "--primary-hx: 1;\n  --primary-h: 258;");
    const out = rewriteTokens(tricky, { "--primary-h": 33 });
    expect(out).toContain("--primary-hx: 1;");
    expect(out).toContain("--primary-h: 33;");
  });

  it("throws when markers are missing", () => {
    expect(() => rewriteTokens(":root { --a: 1; }", { "--a": 2 })).toThrow(
      /markers/,
    );
  });

  it("throws when a token is not declared in the block", () => {
    expect(() => rewriteTokens(css, { "--nope": 5 })).toThrow(/not found/);
  });

  it("is idempotent for repeated commits", () => {
    const once = rewriteTokens(css, { "--fs-n": 18.5 });
    const twice = rewriteTokens(once, { "--fs-n": 18.5 });
    expect(twice).toBe(once);
  });
});
