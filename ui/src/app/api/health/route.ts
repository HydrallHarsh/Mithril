import { NextResponse } from "next/server";
import { proxyToBackend } from "@/lib/backend";

export async function GET() {
  const result = await proxyToBackend<{ status: string; service: string }>(
    "/api/health",
  );
  if (result.live) {
    return NextResponse.json(
      { status: "ok", service: "mithril", mode: "live" as const },
      { headers: { "X-Mithril-Source": "backend" } },
    );
  }
  return NextResponse.json(
    { status: "ok", service: "mithril", mode: "mock" as const },
    { headers: { "X-Mithril-Source": "mock" } },
  );
}
