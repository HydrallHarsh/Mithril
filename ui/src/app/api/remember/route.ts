import { NextRequest, NextResponse } from "next/server";
import { proxyToBackend } from "@/lib/backend";
import type { RememberResult } from "@/types";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const result = await proxyToBackend<RememberResult>("/api/remember", {
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
      error: "Backend unavailable — start FastAPI with `make api` to submit live claims.",
    },
    { status: 503 },
  );
}
