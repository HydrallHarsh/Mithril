import { NextRequest, NextResponse } from "next/server";
import { proxyToBackend } from "@/lib/backend";
import type { RecallResult } from "@/types";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const result = await proxyToBackend<RecallResult>("/api/recall", {
    method: "POST",
    body: JSON.stringify(body),
  });

  if (result.live) {
    return NextResponse.json(result.data, {
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
