const BACKEND_URL = process.env.BACKEND_URL ?? "http://localhost:8000";

export function getBackendUrl(path: string): string {
  return `${BACKEND_URL}${path.startsWith("/") ? path : `/${path}`}`;
}

export async function proxyToBackend<T>(
  path: string,
  init?: RequestInit,
): Promise<{ data: T; live: true } | { error: Error; live: false }> {
  try {
    const res = await fetch(getBackendUrl(path), {
      ...init,
      cache: "no-store",
      headers: {
        "Content-Type": "application/json",
        ...init?.headers,
      },
    });

    if (!res.ok) {
      throw new Error(`Backend ${path} returned ${res.status}`);
    }

    const data = (await res.json()) as T;
    return { data, live: true };
  } catch (error) {
    return {
      error: error instanceof Error ? error : new Error(String(error)),
      live: false,
    };
  }
}
