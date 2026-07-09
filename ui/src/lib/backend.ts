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

/**
 * Like {@link proxyToBackend} but preserves the backend's HTTP status and JSON
 * body when the response is a *handled* error (e.g. 429 rate-limited). Only a
 * transport failure (backend unreachable) resolves to `live: false`.
 */
export async function proxyRawToBackend(
  path: string,
  init?: RequestInit,
): Promise<
  | { live: true; status: number; body: unknown }
  | { live: false; error: Error }
> {
  try {
    const res = await fetch(getBackendUrl(path), {
      ...init,
      cache: "no-store",
      headers: {
        "Content-Type": "application/json",
        ...init?.headers,
      },
    });

    let body: unknown = null;
    try {
      body = await res.json();
    } catch {
      body = null;
    }
    return { live: true, status: res.status, body };
  } catch (error) {
    return {
      live: false,
      error: error instanceof Error ? error : new Error(String(error)),
    };
  }
}
