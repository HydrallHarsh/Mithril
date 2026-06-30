import { NextResponse } from "next/server";
import { proxyToBackend } from "@/lib/backend";
import { MOCK_REPUTATION } from "@/lib/mock-data";

export async function GET() {
  const result = await proxyToBackend<typeof MOCK_REPUTATION>("/api/reputation");
  if (result.live) {
    return NextResponse.json(result.data, {
      headers: { "X-Mithril-Source": "backend" },
    });
  }
  return NextResponse.json(MOCK_REPUTATION, {
    headers: { "X-Mithril-Source": "mock" },
  });
}
