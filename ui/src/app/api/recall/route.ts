import { NextRequest, NextResponse } from "next/server";
import { proxyRawToBackend } from "@/lib/backend";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const result = await proxyRawToBackend("/api/recall", {
    method: "POST",
    body: JSON.stringify(body),
  });

  if (result.live) {
    return NextResponse.json(result.body, {
      status: result.status,
      headers: { "X-Mithril-Source": "backend" },
    });
  }

  return NextResponse.json(
    {
      query: body.query ?? "",
      answer: "Backend offline — start FastAPI to query verified Cognee memory.",
      candidate_count: 0,
      blocked_count: 0,
    },
    { headers: { "X-Mithril-Source": "mock" } },
  );
}
