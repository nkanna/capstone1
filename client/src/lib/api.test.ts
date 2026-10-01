// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

beforeEach(() => { vi.resetModules(); });
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); });

describe('demo tunnel requests', () => {
  it.each([
    ['https://demo.ngrok-free.app', '1'],
    ['https://demo.ngrok-free.dev', '1'],
    ['https://demo.ngrok.app', '1'],
    ['http://localhost:3000', null],
    ['https://demo.trycloudflare.com', null],
    ['https://demo.ngrok-free.app.example.test', null],
  ])('uses the expected tunnel header for %s', async (baseURL, expectedHeader) => {
    vi.stubEnv('VITE_BACKEND_URL', `${baseURL}/`);
    let outgoing: Request | undefined;
    vi.stubGlobal('fetch', vi.fn(async (request: Request) => {
      outgoing = request;
      return Response.json([]);
    }));
    const { api } = await import('./api');
    await api.get('/api/recipes', { adapter: 'fetch' });
    expect(outgoing?.url).toBe(`${baseURL}/api/recipes`);
    expect(outgoing?.headers.get('ngrok-skip-browser-warning')).toBe(expectedHeader);
    expect(outgoing?.headers.has('x-goog-api-key')).toBe(false);
  });
  it('puts the tunnel header on the Axios streaming request too', async () => {
    vi.stubEnv('VITE_BACKEND_URL', 'https://demo.ngrok-free.app');
    let outgoing: Request | undefined;
    vi.stubGlobal('fetch', vi.fn(async (request: Request) => {
      outgoing = request;
      return new Response('data: {"type":"done"}\n\n', { headers: { 'Content-Type': 'text/event-stream' } });
    }));
    const { api } = await import('./api');
    const response = await api.post('/api/ai/stream', { prompt: 'hello' }, { adapter: 'fetch', responseType: 'stream' });
    expect(outgoing?.headers.get('ngrok-skip-browser-warning')).toBe('1');
    expect(typeof response.data.getReader).toBe('function');
    await response.data.cancel();
  });
});
