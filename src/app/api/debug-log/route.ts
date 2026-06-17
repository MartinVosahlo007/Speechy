import { appendFile } from "node:fs/promises";
import path from "node:path";
import { NextRequest, NextResponse } from "next/server";

const LOG_PATH = path.join(process.cwd(), "debug-26eaee.log");

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
    if (!body) {
      return NextResponse.json({ error: "Invalid body." }, { status: 400 });
    }
    const line = `${JSON.stringify({ sessionId: "26eaee", timestamp: Date.now(), ...body })}\n`;
    await appendFile(LOG_PATH, line, "utf8");
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Log write failed." }, { status: 500 });
  }
}
