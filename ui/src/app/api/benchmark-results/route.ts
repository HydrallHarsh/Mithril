import { readFile } from "fs/promises";
import path from "path";

import { NextResponse } from "next/server";

async function readResultsFile() {
  const candidates = [
    path.resolve(process.cwd(), "..", "benchmark", "results.json"),
    path.resolve(process.cwd(), "benchmark", "results.json"),
  ];

  for (const filePath of candidates) {
    try {
      return await readFile(filePath, "utf8");
    } catch {
      // Try the next likely project root.
    }
  }

  throw new Error("benchmark/results.json not found");
}

export async function GET() {
  try {
    const body = await readResultsFile();
    return new NextResponse(body, {
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to read benchmark results",
      },
      { status: 404 },
    );
  }
}
