const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const { createAiHandlers } = require('./ai');
const { AiError } = require('../services/gemini');
async function withApi(service, run, timeoutMs = 120000) {
  const app = express(); app.use(express.json());
  const handlers = createAiHandlers({ service, timeoutMs });
  app.post('/api/ai/stream', handlers.stream); app.post('/api/ai/recipe', handlers.recipe);
  const server = await new Promise(resolve => { const value = app.listen(0, '127.0.0.1', () => resolve(value)); });
  const base = `http://127.0.0.1:${server.address().port}`;
  const post = (route, body, extra = {}) => fetch(base + route, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), ...extra });
  try { await run(post); } finally { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); }
}
test('empty and oversized prompts are rejected before calling the AI', async () => {
  let called = false;
  await withApi({ async *stream() { called = true; } }, async post => {
    for (const prompt of ['', '   ', 'x'.repeat(3001)]) {
      const response = await post('/api/ai/stream', { prompt }); assert.equal(response.status, 400);
    }
    assert.equal(called, false);
  });
});
test('a public stream delivers its first token before generation finishes', async () => {
  let release;
  const gate = new Promise(resolve => { release = resolve; });
  await withApi({ async *stream(prompt) { assert.equal(prompt, 'hello'); yield 'First '; await gate; yield 'second'; } }, async post => {
    const response = await post('/api/ai/stream', { prompt: ' hello ' });
    assert.equal(response.status, 200); assert.match(response.headers.get('content-type'), /text\/event-stream/);
    const reader = response.body.getReader();
    const first = new TextDecoder().decode((await reader.read()).value);
    assert.match(first, /First /); assert.equal(first.includes('"done"'), false);
    release();
    let rest = ''; while (true) { const result = await reader.read(); if (result.done) break; rest += new TextDecoder().decode(result.value); }
    assert.match(rest, /second/); assert.match(rest, /"type":"done"/);
  });
});
test('an upstream error before the first token retains its HTTP status', async () => {
  await withApi({ async *stream() { throw new AiError('Unavailable', 503); } }, async post => {
    const response = await post('/api/ai/stream', { prompt: 'hello' });
    assert.equal(response.status, 503); assert.deepEqual(await response.json(), { message: 'Unavailable' });
  });
});
test('an error after a token sends an error event and no completion event', async () => {
  await withApi({ async *stream() { yield 'Partial'; throw new AiError('Interrupted'); } }, async post => {
    const response = await post('/api/ai/stream', { prompt: 'hello' }); const body = await response.text();
    assert.match(body, /Partial/); assert.match(body, /"type":"error"/); assert.equal(body.includes('"type":"done"'), false);
  });
});
test('recipe generator validates its independent structured request', async () => {
  let called = false;
  await withApi({ async generateRecipe() { called = true; } }, async post => {
    for (const body of [{ ingredients: '' }, { ingredients: 'tofu', minutes: 0 }, { ingredients: 'tofu', servings: 9 }, { ingredients: 'tofu', diet: 'unknown' }]) {
      assert.equal((await post('/api/ai/recipe', body)).status, 400);
    }
    assert.equal(called, false);
  });
});
test('recipe generation is public and passes ingredients/preferences to the service', async () => {
  const recipe = { title: 'Tofu Rice', image: '', ingredients: [], instructions: [], tags: [] };
  await withApi({ async generateRecipe(input) { assert.deepEqual(input, { ingredients: 'tofu, rice', diet: 'Vegan', minutes: 15, servings: 2 }); return recipe; } }, async post => {
    const response = await post('/api/ai/recipe', { ingredients: ' tofu, rice ', diet: 'Vegan', minutes: 15, servings: 2 });
    assert.equal(response.status, 200); assert.deepEqual(await response.json(), { recipe });
  });
});
test('timeout aborts the upstream work and returns 504', async () => {
  let aborted = false;
  await withApi({ async *stream(_, signal) {
    await new Promise((_, reject) => signal.addEventListener('abort', () => { aborted = true; reject(new Error('aborted')); }, { once: true }));
  } }, async post => {
    const response = await post('/api/ai/stream', { prompt: 'hello' }); assert.equal(response.status, 504); assert.equal(aborted, true);
  }, 30);
});
test('closing a streamed request aborts the upstream work', async () => {
  let aborted;
  const cancelled = new Promise(resolve => { aborted = resolve; });
  await withApi({ async *stream(_, signal) {
    yield 'First';
    await new Promise((_, reject) => signal.addEventListener('abort', () => { aborted(); reject(new Error('client left')); }, { once: true }));
  } }, async post => {
    const response = await post('/api/ai/stream', { prompt: 'hello' }); const reader = response.body.getReader();
    await reader.read(); await reader.cancel();
    await Promise.race([cancelled, new Promise((_, reject) => { const timer = setTimeout(() => reject(new Error('Upstream was not aborted')), 1500); timer.unref(); })]);
  });
});
