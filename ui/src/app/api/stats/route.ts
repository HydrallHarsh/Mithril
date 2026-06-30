import { NextResponse } from "next/server";
import { proxyToBackend } from "@/lib/backend";
import { MOCK_STATS } from "@/lib/mock-data";

export async function GET() {
  const result = await proxyToBackend<typeof MOCK_STATS>("/api/stats");
  if (result.live) {
    return NextResponse.json(result.data, {
      headers: { "X-Mithril-Source": "backend" },
    });
  }
  return NextResponse.json(MOCK_STATS, {
    headers: { "X-Mithril-Source": "mock" },
  });
}
