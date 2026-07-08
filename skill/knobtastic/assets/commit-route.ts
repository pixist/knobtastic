import { promises as fs } from "fs";
import path from "path";
import { NextResponse } from "next/server";
import { knobs } from "../../../../../knobs.config";
import { rewriteTokens } from "../../../../knobs/rewrite";

const TOKEN_FILE = "src/app/globals.css";

/**
 * The one write-back of the commit phase. Runs inside the dev server (which
 * already has the source on disk), so no daemon is needed. Values are
 * whitelisted against knobs.config.ts and clamped to each knob's range.
 */
export async function POST(req: Request) {
  if (process.env.NODE_ENV !== "development") {
    return NextResponse.json(
      { error: "Commit is only available on the dev server." },
      { status: 403 },
    );
  }

  let body: { values?: Record<string, unknown> };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const byId = new Map(knobs.map((k) => [k.id, k]));
  const cssValues: Record<string, number> = {};
  for (const [id, raw] of Object.entries(body.values ?? {})) {
    const k = byId.get(id);
    if (!k) {
      return NextResponse.json(
        { error: `Unknown knob "${id}".` },
        { status: 400 },
      );
    }
    const n = Number(raw);
    if (!Number.isFinite(n)) {
      return NextResponse.json(
        { error: `Value for "${id}" is not a number.` },
        { status: 400 },
      );
    }
    cssValues[k.cssVar] = Math.min(k.max, Math.max(k.min, n));
  }

  if (Object.keys(cssValues).length === 0) {
    return NextResponse.json({ error: "No values to commit." }, { status: 400 });
  }

  const file = path.join(process.cwd(), TOKEN_FILE);
  const css = await fs.readFile(file, "utf8");
  await fs.writeFile(file, rewriteTokens(css, cssValues), "utf8");

  return NextResponse.json({ ok: true, file: TOKEN_FILE, values: cssValues });
}
