const MODEL = 'gemini-3.6-flash';
const DIETS = ['No preference', 'Vegetarian', 'Vegan', 'Gluten-free'];

class AiError extends Error {
  constructor(message, status = 502) { super(message); this.name = 'AiError'; this.status = status; }
}

// Decode SSE by lines: neither network chunks nor UTF-8 characters necessarily
// align with one Gemini event. Comments and empty metadata events are ignored.
async function* sseData(body) {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let pending = '';
  let data = [];
  function line(value) {
    if (!value) { const result = data.join('\n'); data = []; return result || null; }
    if (value.startsWith('data:')) data.push(value.slice(5).replace(/^ /, ''));
    return null;
  }
  try {
    while (true) {
      const { value, done } = await reader.read();
      pending += done ? decoder.decode() : decoder.decode(value, { stream: true });
      if (pending.length > 1024 * 1024) throw new AiError('The AI response was too large.');
      let index;
      while ((index = pending.indexOf('\n')) >= 0) {
        const result = line(pending.slice(0, index).replace(/\r$/, ''));
        pending = pending.slice(index + 1);
        if (result) yield result;
      }
      if (done) {
        if (pending) line(pending.replace(/\r$/, ''));
        const result = line('');
        if (result) yield result;
        break;
      }
    }
  } finally { await reader.cancel().catch(() => {}); reader.releaseLock(); }
}

function recipeSchema() {
  return { type: 'OBJECT', required: ['title', 'description', 'ingredients', 'instructions', 'tags'], properties: {
    title: { type: 'STRING' }, description: { type: 'STRING' },
    ingredients: { type: 'ARRAY', items: { type: 'OBJECT', required: ['name', 'quantity'], properties: { name: { type: 'STRING' }, quantity: { type: 'STRING' } } } },
    instructions: { type: 'ARRAY', items: { type: 'OBJECT', required: ['description'], properties: { description: { type: 'STRING' } } } },
    tags: { type: 'ARRAY', items: { type: 'STRING' } },
  } };
}

function validateGeneratedRecipe(value) {
  const nonempty = (item) => typeof item === 'string' && Boolean(item.trim());
  if (!value || !nonempty(value.title) || typeof value.description !== 'string'
    || !Array.isArray(value.ingredients) || !value.ingredients.length
    || !value.ingredients.every((item) => nonempty(item?.name) && nonempty(item?.quantity))
    || !Array.isArray(value.instructions) || !value.instructions.length
    || !value.instructions.every((item) => nonempty(item?.description))
    || !Array.isArray(value.tags) || !value.tags.every((item) => typeof item === 'string')) {
    throw new AiError('The generated recipe was incomplete. Please generate another recipe.');
  }
  return { title: value.title.trim(), description: value.description.trim(), image: '',
    ingredients: value.ingredients.map((item) => ({ name: item.name.trim(), quantity: item.quantity.trim() })),
    instructions: value.instructions.map((item, index) => ({ step: index + 1, description: item.description.trim() })),
    tags: [...new Set(value.tags.map((tag) => tag.trim()).filter(Boolean))] };
}

function createGeminiService({ fetchImpl = globalThis.fetch, env = process.env } = {}) {
  async function request(method, payload, signal) {
    const key = env.GEMINI_API_KEY?.trim();
    if (!key) throw new AiError('The AI service is temporarily unavailable. Please try again later.', 503);
    const model = env.GEMINI_MODEL?.trim() || MODEL;
    if (!/^[a-zA-Z0-9._-]+$/.test(model)) throw new AiError('The AI service is temporarily unavailable. Please try again later.', 503);
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:${method}${method === 'streamGenerateContent' ? '?alt=sse' : ''}`;
    const response = await fetchImpl(url, { method: 'POST', signal,
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key }, body: JSON.stringify(payload) });
    if (!response.ok) {
      await response.body?.cancel().catch(() => {});
      if (response.status === 429) throw new AiError('Gemini’s request limit was reached. Please wait and try again.', 429);
      if ([401, 403].includes(response.status)) throw new AiError('The AI service could not authenticate. Please try again later.');
      if (response.status === 404) throw new AiError('The configured AI model is unavailable. Please try again later.');
      throw new AiError('Gemini could not answer this request. Please try again.');
    }
    return response;
  }
  async function* stream(prompt, signal) {
    const response = await request('streamGenerateContent', {
      systemInstruction: { parts: [{ text: 'You are Spoonful’s friendly cooking assistant. Answer clearly and concisely. Use plain text, short paragraphs, and numbered steps when useful.' }] },
      contents: [{ role: 'user', parts: [{ text: prompt }] }], generationConfig: { maxOutputTokens: 4096, thinkingConfig: { thinkingLevel: 'low' } },
    }, signal);
    if (!response.body) throw new AiError('Gemini returned an empty response.');
    let finished = false;
    let hasText = false;
    for await (const data of sseData(response.body)) {
      if (data === '[DONE]') continue;
      let event;
      try { event = JSON.parse(data); } catch { throw new AiError('The AI stream was interrupted. Please try again.'); }
      if (event.error || event.promptFeedback?.blockReason) throw new AiError('Gemini could not answer this prompt. Please try a different question.', 422);
      const candidate = event.candidates?.[0];
      for (const part of candidate?.content?.parts || []) {
        if (!part.thought && typeof part.text === 'string' && part.text) { hasText = true; yield part.text; }
      }
      if (candidate?.finishReason) {
        if (candidate.finishReason !== 'STOP') throw new AiError('The answer was not completed. Please try a shorter or different question.', 422);
        finished = true;
      }
    }
    if (!finished || !hasText) throw new AiError('The AI stream ended before the answer was complete. Please try again.');
  }
  async function generateRecipe({ ingredients, diet, minutes, servings }, signal) {
    const response = await request('generateContent', {
      systemInstruction: { parts: [{ text: 'Create one practical cooking recipe. Follow the dietary preference and approximate cooking time. Use the supplied ingredients where possible; list any extra pantry ingredients explicitly with quantities. Return only the requested JSON recipe, without image URLs.' }] },
      contents: [{ role: 'user', parts: [{ text: JSON.stringify({ ingredients, dietaryPreference: diet, cookingMinutes: minutes, servings }) }] }],
      generationConfig: { maxOutputTokens: 8192, thinkingConfig: { thinkingLevel: 'low' }, responseMimeType: 'application/json', responseSchema: recipeSchema() },
    }, signal);
    const data = await response.json();
    const candidate = data.candidates?.[0];
    if (data.promptFeedback?.blockReason || candidate?.finishReason !== 'STOP') throw new AiError('Gemini did not complete a recipe. Please adjust your ingredients and try again.', 422);
    const result = (candidate.content?.parts || []).filter((part) => !part.thought && typeof part.text === 'string').map((part) => part.text).join('');
    let value;
    try { value = JSON.parse(result); } catch { throw new AiError('The generated recipe could not be read. Please try again.'); }
    return validateGeneratedRecipe(value);
  }
  return { stream, generateRecipe };
}

module.exports = { AiError, DIETS, sseData, validateGeneratedRecipe, createGeminiService };
