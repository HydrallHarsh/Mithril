import { NextRequest, NextResponse } from "next/server";
import { proxyRawToBackend } from "@/lib/backend";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const result = await proxyRawToBackend("/api/remember", {
    method: "POST",
    body: JSON.stringify(body),
  });

  if (result.live) {
    // Forward the backend status verbatim so a 429 (rate limited) reaches the
    // client with its retry_after payload intact.
    return NextResponse.json(result.body, {
      status: result.status,
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
