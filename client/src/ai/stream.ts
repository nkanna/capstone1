import axios from 'axios';
import { api } from '../lib/api';

export async function* readSse(body: ReadableStream<Uint8Array>) {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let pending = '';
  let lines: string[] = [];
  function line(value: string): string | null {
    if (!value) { const result = lines.join('\n'); lines = []; return result || null; }
    if (value.startsWith('data:')) lines.push(value.slice(5).replace(/^ /, ''));
    return null;
  }
  try {
    while (true) {
      const { value, done } = await reader.read();
      pending += done ? decoder.decode() : decoder.decode(value, { stream: true });
      if (pending.length > 1024 * 1024) throw new Error('The AI response was too large.');
      let index: number;
      while ((index = pending.indexOf('\n')) >= 0) {
        const event = line(pending.slice(0, index).replace(/\r$/, ''));
        pending = pending.slice(index + 1);
        if (event) yield event;
      }
      if (done) {
        if (pending) line(pending.replace(/\r$/, ''));
        const event = line('');
        if (event) yield event;
        break;
      }
    }
  } finally { await reader.cancel().catch(() => {}); reader.releaseLock(); }
}

export async function aiErrorMessage(error: unknown): Promise<string> {
  if (axios.isAxiosError(error)) {
    if (!error.response) return 'We couldn’t connect to the AI service. Please try again.';
    let data = error.response.data;
    if (data && typeof data.getReader === 'function') {
      const reader = (data as ReadableStream<Uint8Array>).getReader();
      let text = '';
      const decoder = new TextDecoder();
      try {
        while (text.length < 16000) { const { value, done } = await reader.read(); if (done) break; text += decoder.decode(value, { stream: true }); }
        data = JSON.parse(text + decoder.decode());
      } catch { data = null; }
      finally { await reader.cancel().catch(() => {}); reader.releaseLock(); }
    }
    if (typeof data?.message === 'string') return data.message;
    if (error.response.status === 429) return 'The AI request limit was reached. Please wait and try again.';
    return 'The AI service could not complete your request. Please try again.';
  }
  return error instanceof Error ? error.message : 'The AI request failed. Please try again.';
}

export async function streamAssistant(prompt: string, onToken: (text: string) => void, signal: AbortSignal): Promise<string> {
  const trimmed = prompt.trim();
  if (!trimmed) throw new Error('Please enter a question.');
  const { data } = await api.post<ReadableStream<Uint8Array>>('/api/ai/stream', { prompt: trimmed }, {
    adapter: 'fetch', responseType: 'stream', signal, timeout: 120000, headers: { Accept: 'text/event-stream' },
  });
  if (!data || typeof data.getReader !== 'function') throw new Error('Your browser could not read the AI stream.');
  let response = '';
  let complete = false;
  for await (const raw of readSse(data)) {
    signal.throwIfAborted();
    let event;
    try { event = JSON.parse(raw); } catch { throw new Error('The AI stream was interrupted. Please try again.'); }
    if (event.type === 'error') throw new Error(typeof event.message === 'string' ? event.message : 'The AI request failed.');
    if (event.type === 'done') { complete = true; break; }
    if (event.type === 'token' && typeof event.text === 'string') { response += event.text; onToken(event.text); }
  }
  if (!complete || !response.trim()) throw new Error('The AI stream ended before the answer was complete. Please try again.');
  return response;
}
