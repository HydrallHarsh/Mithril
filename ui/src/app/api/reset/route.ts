import { NextResponse } from "next/server";
import { proxyToBackend } from "@/lib/backend";

export async function POST() {
  const result = await proxyToBackend<{ status: string; message: string }>(
    "/api/reset",
    { method: "POST" },
  );

  if (result.live) {
    return NextResponse.json(result.data, {
      headers: { "X-Mithril-Source": "backend" },
    });
  }

  return NextResponse.json(
    { error: "Backend unavailable — cannot reset live data." },
    { status: 503 },
  );
}
