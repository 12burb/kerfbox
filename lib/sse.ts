import type { SSEEvent } from "./schema";

/**
 * Pull SSE events off a Response body until it closes or the optional
 * signal aborts. We cancel the reader on abort/throw so the underlying
 * fetch socket is freed promptly — without it, an aborted stream can
 * sit holding a connection until the browser eventually GCs it.
 */
export async function* readSSE(
  response: Response,
  signal?: AbortSignal
): AsyncGenerator<SSEEvent, void, unknown> {
  if (!response.body) throw new Error("No response body.");
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  const onAbort = () => {
    void reader.cancel().catch(() => {});
  };
  if (signal) {
    if (signal.aborted) {
      onAbort();
      throw new DOMException("Aborted", "AbortError");
    }
    signal.addEventListener("abort", onAbort, { once: true });
  }

  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      let idx: number;
      while ((idx = buffer.indexOf("\n\n")) !== -1) {
        const frame = buffer.slice(0, idx);
        buffer = buffer.slice(idx + 2);
        for (const line of frame.split("\n")) {
          if (line.startsWith("data: ")) {
            const payload = line.slice(6);
            try {
              yield JSON.parse(payload) as SSEEvent;
            } catch {
              // skip malformed frame
            }
          }
        }
      }
    }
  } finally {
    if (signal) signal.removeEventListener("abort", onAbort);
    // Abort isn't the only early exit: a consumer that `break`s out of
    // for-await (e.g. on the terminal `kerf` event) lands here via the
    // generator's return() with the reader still holding the socket.
    // cancel() after a clean close is a harmless no-op.
    void reader.cancel().catch(() => {});
  }
}
