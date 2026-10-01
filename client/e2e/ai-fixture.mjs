// Local test server only. No Gemini SDK, API key, database, or app route changes.
import http from 'node:http';

export function createFixtureServer() {
  const pending = new Map();
  const event = (response, value) => response.write(`data: ${JSON.stringify(value)}\n\n`);
  const start = response => {
    response.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache' });
    response.flushHeaders();
  };
  const json = (response, status, value) => {
    response.writeHead(status, { 'Content-Type': 'application/json' });
    response.end(JSON.stringify(value));
  };
  return http.createServer(async (request, response) => {
    response.setHeader('Access-Control-Allow-Origin', '*');
    response.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, Accept');
    response.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    if (request.method === 'OPTIONS') { response.writeHead(204); response.end(); return; }
    const path = new URL(request.url, 'http://localhost').pathname;
    if (path === '/health') { json(response, 200, { prompts: [...pending.keys()] }); return; }
    let body;
    try {
      let raw = '';
      for await (const chunk of request) raw += chunk;
      body = JSON.parse(raw || '{}');
    } catch { json(response, 400, { message: 'Invalid JSON' }); return; }
    if (request.method !== 'POST') { json(response, 404, { message: 'Unknown test route' }); return; }
    if (path === '/control') {
      const stream = pending.get(body.prompt);
      if (!stream) { json(response, 404, { message: 'Stream not pending' }); return; }
      if (body.action === 'first' && !stream.started) {
        start(stream.response); stream.started = true;
        event(stream.response, { type: 'token', text: 'First chunk. ' });
      } else if (body.action === 'finish' && stream.started) {
        event(stream.response, { type: 'token', text: 'Second chunk.' });
        event(stream.response, { type: 'done' }); stream.response.end();
      } else if (body.action === 'fail' && stream.started) {
        event(stream.response, { type: 'error', message: 'Controlled stream failure. Please retry.' });
        stream.response.end();
      } else { json(response, 400, { message: 'Invalid control action' }); return; }
      json(response, 200, { ok: true }); return;
    }
    if (path === '/api/ai/stream') {
      const prompt = typeof body.prompt === 'string' ? body.prompt.trim() : '';
      if (!prompt) { json(response, 400, { message: 'Please enter a question.' }); return; }
      if (prompt.startsWith('e2e:error')) { json(response, 429, { message: 'Controlled quota error. Please retry.' }); return; }
      if (prompt.startsWith('e2e:held')) {
        if (pending.has(prompt)) { json(response, 409, { message: 'Duplicate test prompt' }); return; }
        pending.set(prompt, { response, started: false });
        response.on('close', () => pending.delete(prompt));
        return;
      }
      start(response);
      event(response, { type: 'token', text: 'Cooking tip: ' });
      event(response, { type: 'token', text: `Answer for ${prompt}.` });
      event(response, { type: 'done' }); response.end(); return;
    }
    if (path === '/api/ai/recipe') {
      if (!body.ingredients?.trim()) { json(response, 400, { message: 'Please add ingredients.' }); return; }
      json(response, 200, { recipe: {
        title: 'Chickpea Test Stew', description: 'A deterministic recipe for browser tests.', image: '',
        ingredients: [{ name: 'Chickpeas', quantity: '1 cup' }, { name: 'Tomatoes', quantity: '2' }],
        instructions: [{ step: 1, description: 'Combine and simmer for 15 minutes.' }], tags: ['vegan', 'easy'],
      } }); return;
    }
    json(response, 404, { message: 'Unknown test route' });
  });
}

// Importing this module for transport checks does not start a background server.
if (process.argv[1] && import.meta.url === new URL(`file://${process.argv[1]}`).href) {
  createFixtureServer().listen(4188, '127.0.0.1', () => console.log('AI browser test fixture on port 4188'));
}
