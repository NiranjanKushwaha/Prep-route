// Production React does not rethrow boundary-caught errors to window.onerror, so
// anything an error boundary swallows has to be forwarded to the console explicitly.

function describe(error: unknown): string {
  // Loaders and server functions commonly throw a raw Response, whose String()
  // form is the opaque "[object Response]" — pull out the status and URL instead.
  if (error instanceof Response) {
    return `Response ${error.status}${error.url ? ` at ${error.url}` : ""}`;
  }
  return error instanceof Error ? error.message : String(error);
}

export function reportError(error: unknown, context: Record<string, unknown> = {}) {
  if (typeof window === "undefined") return;

  console.error("[error-boundary]", describe(error), {
    route: window.location.pathname,
    stack: error instanceof Error ? error.stack : undefined,
    ...context,
  });
}
