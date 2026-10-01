import test from 'node:test';
import assert from 'node:assert/strict';
import { createFixtureServer } from './ai-fixture.mjs';

async function withServer(run) {
  const server = createFixtureServer();
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  try { await run(`http://127.0.0.1:${server.address().port}`); }
  finally { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); }
}
const post = (url, data) => fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });

test('the browser fixture releases a real first network chunk before completion', () => withServer(async base => {
  const pending = post(`${base}/api/ai/stream`, { prompt: 'e2e:held transport' });
  for (let attempt = 0; attempt < 100; attempt++) {
    const { prompts } = await (await fetch(`${base}/health`)).json();
    if (prompts.includes('e2e:held transport')) break;
    if (attempt === 99) assert.fail('The stream did not open.');
  }
  assert.equal((await post(`${base}/control`, { prompt: 'e2e:held transport', action: 'first' })).status, 200);
  const response = await pending;
  assert.equal(response.headers.get('content-type'), 'text/event-stream');
  const reader = response.body.getReader();
  const first = new TextDecoder().decode((await reader.read()).value);
  assert.match(first, /First chunk/);
  assert.doesNotMatch(first, /Second chunk|"done"/);
  assert.equal((await post(`${base}/control`, { prompt: 'e2e:held transport', action: 'finish' })).status, 200);
  let rest = '';
  while (true) { const item = await reader.read(); if (item.done) break; rest += new TextDecoder().decode(item.value); }
  assert.match(rest, /Second chunk/);
  assert.match(rest, /"done"/);
}));

test('the fixture returns JSON errors and a structured recipe without an image URL', () => withServer(async base => {
  const failure = await post(`${base}/api/ai/stream`, { prompt: 'e2e:error' });
  assert.equal(failure.status, 429);
  const response = await post(`${base}/api/ai/recipe`, { ingredients: 'chickpeas' });
  const { recipe } = await response.json();
  assert.equal(recipe.image, '');
  assert.equal(recipe.ingredients.length, 2);
  assert.equal(recipe.instructions[0].step, 1);
}));
