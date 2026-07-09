import { NextResponse } from "next/server";
import { proxyToBackend } from "@/lib/backend";
import type { DemoState } from "@/types";

export async function GET() {
  const result = await proxyToBackend<DemoState>("/api/demo");
  if (result.live) {
    return NextResponse.json(result.data, {
      headers: { "X-Mithril-Source": "backend" },
    });
  }
  return NextResponse.json(
    { error: "Backend offline — start FastAPI to load the live demo." },
    { status: 503 },
  );
}
