/**
 * Commit phase: rewrite token values inside the marker-fenced block of a
 * CSS file. Pure string-to-string — the API route owns file IO.
 */

const START_MARKER = "/* knobtastic:tokens:start";
const END_MARKER = "/* knobtastic:tokens:end";

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function rewriteTokens(
  css: string,
  values: Record<string, number>,
): string {
  const start = css.indexOf(START_MARKER);
  const end = css.indexOf(END_MARKER);
  if (start === -1 || end === -1 || end < start) {
    throw new Error("knobtastic token markers not found in CSS");
  }

  let block = css.slice(start, end);
  for (const [cssVar, value] of Object.entries(values)) {
    const re = new RegExp(`(${escapeRegExp(cssVar)}(?![\\w-])\\s*:\\s*)[^;]+`);
    if (!re.test(block)) {
      throw new Error(`token ${cssVar} not found in the marker block`);
    }
    block = block.replace(re, `$1${value}`);
  }

  return css.slice(0, start) + block + css.slice(end);
}
