const { AiError, DIETS, createGeminiService } = require('../services/gemini');

function createAiHandlers({ service = createGeminiService(), timeoutMs = 120000 } = {}) {
  function lifecycle(res) {
    const controller = new AbortController();
    let timedOut = false;
    const timer = setTimeout(() => { timedOut = true; controller.abort(); }, timeoutMs);
    const closed = () => { if (!res.writableEnded) controller.abort(); };
    res.on('close', closed);
    return { signal: controller.signal, timedOut: () => timedOut, clean: () => { clearTimeout(timer); res.off('close', closed); } };
  }
  function failure(res, error, work) {
    if (res.destroyed || res.writableEnded) return;
    const message = work.timedOut() ? 'The AI request timed out. Please try again.'
      : error instanceof AiError ? error.message : 'The AI request failed. Please try again.';
    const status = work.timedOut() ? 504 : error instanceof AiError ? error.status : 502;
    // Log only safe diagnostics: no key, prompt, full upstream response, or request headers.
    console.error('AI request failed:', { status, reason: work.timedOut() ? 'timeout' : error.name });
    if (res.headersSent) { res.write(`data: ${JSON.stringify({ type: 'error', message })}\n\n`); res.end(); }
    else res.status(status).json({ message });
  }
  async function stream(req, res) {
    const prompt = req.body?.prompt;
    if (typeof prompt !== 'string' || !prompt.trim() || prompt.trim().length > 3000) {
      return res.status(400).json({ message: 'Enter a prompt between 1 and 3000 characters.' });
    }
    const work = lifecycle(res);
    let iterator;
    try {
      iterator = service.stream(prompt.trim(), work.signal);
      // Errors before the first token retain a meaningful HTTP error status.
      const first = await iterator.next();
      if (work.signal.aborted) return;
      if (first.done) throw new AiError('Gemini returned an empty answer.');
      res.set({ 'Content-Type': 'text/event-stream; charset=utf-8', 'Cache-Control': 'no-cache, no-transform',
        'Connection': 'keep-alive', 'X-Accel-Buffering': 'no' });
      res.flushHeaders();
      const send = (text) => res.write(`data: ${JSON.stringify({ type: 'token', text })}\n\n`);
      send(first.value);
      for await (const text of iterator) { if (work.signal.aborted) break; send(text); }
      if (!work.signal.aborted) { res.write('data: {"type":"done"}\n\n'); res.end(); }
    } catch (error) { failure(res, error, work); }
    finally { work.clean(); if (iterator) await iterator.return?.().catch(() => {}); }
  }
  async function recipe(req, res) {
    const { ingredients, diet = 'No preference', minutes = 30, servings = 2 } = req.body || {};
    if (typeof ingredients !== 'string' || !ingredients.trim() || ingredients.trim().length > 2000
      || !DIETS.includes(diet) || !Number.isInteger(minutes) || minutes < 5 || minutes > 180
      || !Number.isInteger(servings) || servings < 1 || servings > 8) {
      return res.status(400).json({ message: 'Add ingredients, a supported dietary preference, 5–180 minutes, and 1–8 servings.' });
    }
    const work = lifecycle(res);
    try {
      const result = await service.generateRecipe({ ingredients: ingredients.trim(), diet, minutes, servings }, work.signal);
      if (!work.signal.aborted) res.json({ recipe: result });
    } catch (error) { failure(res, error, work); }
    finally { work.clean(); }
  }
  return { stream, recipe };
}
module.exports = { createAiHandlers };
