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
