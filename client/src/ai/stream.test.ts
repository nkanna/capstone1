// @vitest-environment node
import { afterEach, expect, it, vi } from 'vitest';
import { streamAssistant } from './stream';
const encoder = new TextEncoder();
function frame(event: object) { return `data: ${JSON.stringify(event)}\r\n\r\n`; }
afterEach(() => { vi.unstubAllGlobals(); });
it('uses the real Axios fetch adapter and delivers text before stream completion', async () => {
  let feed!: ReadableStreamDefaultController<Uint8Array>;
  const body = new ReadableStream<Uint8Array>({ start(controller) { feed = controller; } });
  const fetch = vi.fn(async (request: Request) => {
    expect(request.url).toBe('http://localhost:3000/api/ai/stream');
    expect(JSON.parse(await request.text())).toEqual({ prompt: 'How do I cook tofu?' });
    expect(request.headers.has('x-goog-api-key')).toBe(false);
    return new Response(body, { headers: { 'Content-Type': 'text/event-stream' } });
  });
  vi.stubGlobal('fetch', fetch);
  let first!: () => void;
  const firstToken = new Promise<void>((resolve) => { first = resolve; });
  const tokens: string[] = [];
  let complete = false;
  const result = streamAssistant(' How do I cook tofu? ', (text) => { tokens.push(text); first(); }, new AbortController().signal).then((answer) => { complete = true; return answer; });
  feed.enqueue(encoder.encode(frame({ type: 'token', text: 'Press it. ' })));
  await firstToken;
  expect(tokens).toEqual(['Press it. ']); expect(complete).toBe(false);
  feed.enqueue(encoder.encode(frame({ type: 'token', text: 'Then fry it.' }) + frame({ type: 'done' })));
  feed.close();
  expect(await result).toBe('Press it. Then fry it.');
});
it('handles byte-by-byte UTF-8 characters and split SSE event boundaries', async () => {
  const bytes = encoder.encode(': heartbeat\r\n\r\n' + frame({ type: 'token', text: 'Crème 🥄' }) + frame({ type: 'done' }));
  const body = new ReadableStream<Uint8Array>({ start(controller) { for (const byte of bytes) controller.enqueue(Uint8Array.of(byte)); controller.close(); } });
  vi.stubGlobal('fetch', vi.fn(async () => new Response(body)));
  expect(await streamAssistant('hello', vi.fn(), new AbortController().signal)).toBe('Crème 🥄');
});
it('rejects an empty prompt without making an HTTP request', async () => {
  const fetch = vi.fn(); vi.stubGlobal('fetch', fetch);
  await expect(streamAssistant('   ', vi.fn(), new AbortController().signal)).rejects.toThrow('Please enter a question.');
  expect(fetch).not.toHaveBeenCalled();
});
it('reports a mid-stream failure and does not treat partial text as complete', async () => {
  const body = new ReadableStream<Uint8Array>({ start(controller) { controller.enqueue(encoder.encode(frame({ type: 'token', text: 'Partial' }) + frame({ type: 'error', message: 'Try again.' }))); controller.close(); } });
  vi.stubGlobal('fetch', vi.fn(async () => new Response(body)));
  await expect(streamAssistant('hello', vi.fn(), new AbortController().signal)).rejects.toThrow('Try again.');
});
it('rejects a stream that closes without a completion event', async () => {
  const body = new ReadableStream<Uint8Array>({ start(controller) { controller.enqueue(encoder.encode(frame({ type: 'token', text: 'Partial' }))); controller.close(); } });
  vi.stubGlobal('fetch', vi.fn(async () => new Response(body)));
  await expect(streamAssistant('hello', vi.fn(), new AbortController().signal)).rejects.toThrow('before the answer was complete');
});
