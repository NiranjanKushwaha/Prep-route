import { API_BASE_URL, STORAGE_KEYS } from "@/constants/common.constant";

export interface ApiResponse<T> {
  /** Some endpoints use `success`; staging uses `status: "success" | "error"`. */
  success?: boolean;
  status?: string;
  data: T;
  message?: string;
  errors?: unknown;
}

export class ApiError extends Error {
  status: number;
  data: unknown;
  constructor(message: string, status: number, data?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.data = data;
  }
}

/** Transient failures worth retrying (network blips, gateway timeouts, rate limits). */
export function isRetryableError(error: unknown): boolean {
  if (!(error instanceof ApiError)) return true;
  if (error.status === 0 || error.status === 408 || error.status === 429) return true;
  return error.status >= 500;
}

function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(STORAGE_KEYS.TOKEN);
}

function clearSession() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(STORAGE_KEYS.TOKEN);
  window.localStorage.removeItem(STORAGE_KEYS.USER);
}

function extractMessage(body: unknown, fallback: string): string {
  if (!body || typeof body !== "object") return fallback;
  const record = body as Record<string, unknown>;

  // Express-validator style: { errors: [{ msg, path }] }
  if (Array.isArray(record.errors) && record.errors.length > 0) {
    const parts = record.errors
      .map((item) => {
        if (!item || typeof item !== "object") return null;
        const err = item as { msg?: unknown; path?: unknown };
        if (typeof err.msg !== "string") return null;
        return typeof err.path === "string" && err.path ? `${err.path}: ${err.msg}` : err.msg;
      })
      .filter((v): v is string => !!v);
    if (parts.length) return parts.join("; ");
  }

  for (const key of ["message", "error", "detail"] as const) {
    const value = record[key];
    if (typeof value === "string" && value.trim()) return value;
  }
  return fallback;
}

const REQUEST_TIMEOUT_MS = 30_000;

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/json",
    ...(options.headers as Record<string, string> | undefined),
  };
  if (token) headers.Authorization = `Bearer ${token}`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  // Honour an external signal if the caller already passed one.
  if (options.signal) {
    if (options.signal.aborted) controller.abort();
    else {
      options.signal.addEventListener("abort", () => controller.abort(), { once: true });
    }
  }

  let res: Response;
  try {
    res = await fetch(`${API_BASE_URL}${path}`, {
      ...options,
      headers,
      signal: controller.signal,
    });
  } catch (err) {
    clearTimeout(timeoutId);
    if (err instanceof DOMException && err.name === "AbortError") {
      throw new ApiError("Request timed out. Please try again.", 408);
    }
    throw new ApiError("Unable to reach the server. Check your connection and try again.", 0, err);
  } finally {
    clearTimeout(timeoutId);
  }

  const contentType = res.headers.get("content-type") ?? "";
  const isJson = contentType.includes("application/json");
  let body: unknown = null;
  if (res.status !== 204) {
    body = isJson ? await res.json().catch(() => null) : await res.text().catch(() => null);
  }

  if (!res.ok) {
    const message = extractMessage(body, `Request failed with status ${res.status}`);
    // Only wipe the session on an authenticated request — never on login itself.
    if (res.status === 401 && token) clearSession();
    throw new ApiError(message, res.status, body);
  }

  // Some endpoints return HTTP 200 with a failed business envelope.
  if (body && typeof body === "object") {
    const record = body as { success?: unknown; status?: unknown };
    if (record.success === false || record.status === "error") {
      throw new ApiError(extractMessage(body, "Request failed"), res.status, body);
    }
  }

  return body as T;
}

export const restService = {
  get: <T>(path: string) => request<T>(path, { method: "GET" }),
  post: <T>(path: string, data?: unknown) =>
    request<T>(path, {
      method: "POST",
      body: data !== undefined ? JSON.stringify(data) : undefined,
    }),
  put: <T>(path: string, data?: unknown) =>
    request<T>(path, {
      method: "PUT",
      body: data !== undefined ? JSON.stringify(data) : undefined,
    }),
  patch: <T>(path: string, data?: unknown) =>
    request<T>(path, {
      method: "PATCH",
      body: data !== undefined ? JSON.stringify(data) : undefined,
    }),
  delete: <T>(path: string) => request<T>(path, { method: "DELETE" }),
};

export function unwrap<T>(res: ApiResponse<T>): T {
  return res.data;
}
