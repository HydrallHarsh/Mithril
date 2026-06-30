import { NextResponse } from "next/server";
import { proxyToBackend } from "@/lib/backend";
import { MOCK_CONFIG } from "@/lib/mock-data";

export async function GET() {
  const result = await proxyToBackend<typeof MOCK_CONFIG>("/api/config");
  if (result.live) {
    return NextResponse.json(result.data, {
      headers: { "X-Mithril-Source": "backend" },
    });
  }
  return NextResponse.json(MOCK_CONFIG, {
    headers: { "X-Mithril-Source": "mock" },
  });
}
