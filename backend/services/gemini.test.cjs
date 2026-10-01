const test = require('node:test');
const assert = require('node:assert/strict');
const { createGeminiService, validateGeneratedRecipe, AiError } = require('./gemini');
const encoder = new TextEncoder();
const env = { GEMINI_API_KEY: 'unit-test-key', GEMINI_MODEL: 'gemini-3.6-flash' };
function sse(events, tiny = false) {
  const bytes = encoder.encode(events.map(event => `data: ${JSON.stringify(event)}\r\n\r\n`).join(''));
  return new Response(new ReadableStream({ start(controller) { if (tiny) { for (const byte of bytes) controller.enqueue(Uint8Array.of(byte)); } else controller.enqueue(bytes); controller.close(); } }));
}
const piece = (text, finishReason) => ({ candidates: [{ content: { parts: [{ text }] }, ...(finishReason ? { finishReason } : {}) }] });
async function collect(iterator) { const parts = []; for await (const part of iterator) parts.push(part); return parts; }
const draft = () => ({ title: ' Tofu Rice ', description: ' Dinner ', ingredients: [{ name: ' Tofu ', quantity: ' 1 block ' }], instructions: [{ description: ' Cook tofu. ' }], tags: ['vegan', 'vegan'], ownerId: 'injected' });
test('missing backend key fails before contacting Gemini', async () => {
  let called = false; const service = createGeminiService({ env: {}, fetchImpl: async () => { called = true; } });
  await assert.rejects(collect(service.stream('hello', new AbortController().signal)), error => error instanceof AiError && error.status === 503);
  assert.equal(called, false);
});
test('stream forwards real chunks and keeps the API key only in the upstream header', async () => {
  const service = createGeminiService({ env, fetchImpl: async (url, options) => {
    assert.equal(url.includes('unit-test-key'), false); assert.match(url, /streamGenerateContent\?alt=sse$/);
    assert.equal(options.headers['x-goog-api-key'], env.GEMINI_API_KEY);
    assert.equal(options.body.includes('unit-test-key'), false);
    return sse([piece('Crème '), piece('🥄', 'STOP')], true);
  } });
  assert.deepEqual(await collect(service.stream('hello', new AbortController().signal)), ['Crème ', '🥄']);
});
test('stream omits Gemini thinking parts', async () => {
  const service = createGeminiService({ env, fetchImpl: async () => sse([{ candidates: [{ content: { parts: [{ thought: true, text: 'Internal reasoning' }, { text: 'Answer' }] }, finishReason: 'STOP' }] }]) });
  assert.deepEqual(await collect(service.stream('hello', new AbortController().signal)), ['Answer']);
});
test('stream rejects truncated and blocked responses', async () => {
  for (const events of [[piece('Partial')], [piece('Partial', 'MAX_TOKENS')], [{ promptFeedback: { blockReason: 'SAFETY' } }]]) {
    const service = createGeminiService({ env, fetchImpl: async () => sse(events) });
    await assert.rejects(collect(service.stream('hello', new AbortController().signal)), AiError);
  }
});
test('upstream rate limiting becomes a safe 429 error', async () => {
  const service = createGeminiService({ env, fetchImpl: async () => new Response('rate limit', { status: 429 }) });
  await assert.rejects(collect(service.stream('hello', new AbortController().signal)), error => error.status === 429 && !error.message.includes('unit-test-key'));
});
test('recipe generation requests a schema and returns editable fields with no fabricated photo', async () => {
  const service = createGeminiService({ env, fetchImpl: async (url, options) => {
    assert.match(url, /:generateContent$/); const body = JSON.parse(options.body);
    assert.equal(body.generationConfig.responseMimeType, 'application/json');
    assert.equal(body.generationConfig.responseSchema.type, 'OBJECT');
    assert.equal(JSON.parse(body.contents[0].parts[0].text).dietaryPreference, 'Vegan');
    return Response.json({ candidates: [{ finishReason: 'STOP', content: { parts: [{ text: JSON.stringify(draft()) }] } }] });
  } });
  const result = await service.generateRecipe({ ingredients: 'tofu, rice', diet: 'Vegan', minutes: 30, servings: 2 }, new AbortController().signal);
  assert.equal(result.title, 'Tofu Rice'); assert.equal(result.image, ''); assert.equal(result.ownerId, undefined);
  assert.deepEqual(result.instructions, [{ step: 1, description: 'Cook tofu.' }]); assert.deepEqual(result.tags, ['vegan']);
});
test('recipe generation rejects malformed model output', async () => {
  const service = createGeminiService({ env, fetchImpl: async () => Response.json({ candidates: [{ finishReason: 'STOP', content: { parts: [{ text: 'invalid json' }] } }] }) });
  await assert.rejects(service.generateRecipe({ ingredients: 'tofu', diet: 'Vegan', minutes: 30, servings: 2 }, new AbortController().signal), AiError);
});
test('generated recipe validation rejects missing ingredients or instruction descriptions', () => {
  assert.throws(() => validateGeneratedRecipe({ ...draft(), ingredients: [] }), AiError);
  assert.throws(() => validateGeneratedRecipe({ ...draft(), instructions: [{}] }), AiError);
});
test('cancellation is passed to the upstream request', async () => {
  const work = new AbortController(); work.abort();
  const service = createGeminiService({ env, fetchImpl: async (_, options) => { assert.equal(options.signal, work.signal); options.signal.throwIfAborted(); } });
  await assert.rejects(collect(service.stream('hello', work.signal)), error => error.name === 'AbortError');
});

test('a temporary upstream error is retried once before tokens, without buffering the successful stream', async () => {
  let calls = 0;
  let waits = 0;
  let output;
  const upstream = new ReadableStream({ start(controller) {
    output = controller;
    controller.enqueue(encoder.encode(`data: ${JSON.stringify(piece('First '))}\n\n`));
  } });
  const service = createGeminiService({ env,
    waitImpl: async (ms, signal) => { assert.ok(ms >= 800 && ms < 1000); assert.equal(signal.aborted, false); waits++; },
    fetchImpl: async () => ++calls === 1 ? new Response('Upstream unavailable', { status: 503 }) : new Response(upstream),
  });
  const iterator = service.stream('hello', new AbortController().signal);
  assert.deepEqual(await iterator.next(), { value: 'First ', done: false });
  assert.equal(calls, 2); assert.equal(waits, 1);
  output.enqueue(encoder.encode(`data: ${JSON.stringify(piece('second', 'STOP'))}\n\n`));
  output.close();
  assert.deepEqual(await collect(iterator), ['second']);
});

test('retry is bounded to two total attempts and records the safe upstream status', async () => {
  let calls = 0;
  const service = createGeminiService({ env, waitImpl: async () => {}, fetchImpl: async () => {
    calls++; return new Response('Private provider details including unit-test-key', { status: 503 });
  } });
  await assert.rejects(collect(service.stream('hello', new AbortController().signal)), error =>
    error instanceof AiError && error.upstreamStatus === 503 && !error.message.includes('unit-test-key'));
  assert.equal(calls, 2);
});

test('only the selected transient HTTP 5xx statuses get a retry', async () => {
  for (const status of [500, 502, 503, 504]) {
    let calls = 0;
    const service = createGeminiService({ env, waitImpl: async () => {},
      fetchImpl: async () => ++calls === 1 ? new Response('temporary', { status }) : sse([piece('Success', 'STOP')]),
    });
    assert.deepEqual(await collect(service.stream('hello', new AbortController().signal)), ['Success']);
    assert.equal(calls, 2);
  }
});

test('invalid requests, authentication errors, unknown models, and quotas are not retried', async () => {
  for (const status of [400, 401, 403, 404, 429]) {
    let calls = 0;
    const service = createGeminiService({ env, waitImpl: async () => assert.fail('Unexpected retry'),
      fetchImpl: async () => { calls++; return new Response('unit-test-key', { status }); },
    });
    await assert.rejects(collect(service.stream('hello', new AbortController().signal)), error =>
      error.upstreamStatus === status && !error.message.includes('unit-test-key'));
    assert.equal(calls, 1);
  }
});

test('aborting during the retry wait prevents a second upstream call', async () => {
  const work = new AbortController();
  let calls = 0;
  const service = createGeminiService({ env,
    waitImpl: async (_, signal) => { work.abort(); signal.throwIfAborted(); },
    fetchImpl: async () => { calls++; return new Response('temporary', { status: 503 }); },
  });
  await assert.rejects(collect(service.stream('hello', work.signal)), error => error.name === 'AbortError');
  assert.equal(calls, 1);
});

test('a stream interrupted after a delivered token is not retried', async () => {
  let calls = 0;
  const service = createGeminiService({ env, waitImpl: async () => assert.fail('Unexpected retry'),
    fetchImpl: async () => { calls++; return sse([piece('Already delivered')]); },
  });
  const iterator = service.stream('hello', new AbortController().signal);
  assert.deepEqual(await iterator.next(), { value: 'Already delivered', done: false });
  await assert.rejects(iterator.next(), AiError);
  assert.equal(calls, 1);
});

test('the recipe-generator request also recovers from a temporary HTTP 5xx', async () => {
  let calls = 0;
  const service = createGeminiService({ env, waitImpl: async () => {}, fetchImpl: async () => {
    if (++calls === 1) return new Response('temporary', { status: 500 });
    return Response.json({ candidates: [{ finishReason: 'STOP', content: { parts: [{ text: JSON.stringify(draft()) }] } }] });
  } });
  const result = await service.generateRecipe({ ingredients: 'tofu', diet: 'Vegan', minutes: 30, servings: 2 }, new AbortController().signal);
  assert.equal(result.title, 'Tofu Rice'); assert.equal(calls, 2);
});
