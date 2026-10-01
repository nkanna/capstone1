import { useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { Header } from '../components/Header';
import { useAi } from '../ai/useAi';
import { aiErrorMessage, streamAssistant } from '../ai/stream';
type Active = { prompt: string; response: string; phase: 'waiting' | 'streaming' | 'failed' | 'cancelled' };
export function AiAssistantPage() {
  const { pairs, addPair, clearPairs } = useAi();
  const [prompt, setPrompt] = useState('');
  const [active, setActive] = useState<Active | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const request = useRef<AbortController | null>(null);
  useEffect(() => () => { request.current?.abort(); }, []);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (request.current) return;
    const question = prompt.trim();
    if (!question) { setError('Please enter a question.'); return; }
    const work = new AbortController();
    request.current = work;
    setBusy(true); setError(''); setNotice('');
    setActive({ prompt: question, response: '', phase: 'waiting' });
    try {
      const response = await streamAssistant(question, (text) => {
        if (!work.signal.aborted) setActive((value) => value ? { ...value, response: value.response + text, phase: 'streaming' } : value);
      }, work.signal);
      if (!work.signal.aborted) { addPair({ id: crypto.randomUUID(), prompt: question, response }); setActive(null); setPrompt(''); setNotice('Response complete.'); }
    } catch (cause) {
      if (!work.signal.aborted) {
        const message = await aiErrorMessage(cause);
        if (!work.signal.aborted) { setError(message); setActive((value) => value ? { ...value, phase: 'failed' } : value); }
      }
    } finally { if (request.current === work) { request.current = null; if (!work.signal.aborted) setBusy(false); } }
  }
  function stop() {
    request.current?.abort(); request.current = null; setBusy(false);
    setActive((value) => value ? { ...value, phase: 'cancelled' } : value); setNotice('Response stopped.');
  }
  return <><Header /><main className="page-container ai-page">
    <h1>AI Assistant</h1><p className="intro">Ask a cooking question, find a substitution, or get advice for your next meal.</p>
    <form onSubmit={(event) => void submit(event)} noValidate>
      <div className="field"><label htmlFor="ai-prompt">Your question</label><textarea id="ai-prompt" rows={3} maxLength={3000} value={prompt} disabled={busy}
        onChange={(event) => setPrompt(event.target.value)} placeholder="What can I use instead of eggs in pancakes?" aria-invalid={Boolean(error)} aria-describedby={error ? 'ai-error' : undefined} /></div>
      {error && <p id="ai-error" className="form-error" role="alert">{error}</p>}
      <div className="ai-actions"><button className="button button-primary" type="submit" disabled={busy}>{busy ? 'Answering…' : 'Ask Spoonful'}</button>
        {busy && <button className="button button-secondary" type="button" onClick={stop}>Stop Response</button>}</div>
    </form>
    {notice && <p className="ai-notice" role="status">{notice}</p>}
    {active && <section className="ai-answer" aria-label="Current response">
      <h2>{active.prompt}</h2>
      {active.phase === 'waiting' && <p role="status">Waiting for the first response…</p>}
      {active.phase === 'streaming' && <p className="stream-status" role="status">Receiving response…</p>}
      {active.phase === 'failed' && active.response && <p className="stream-status">Incomplete response</p>}
      {active.phase === 'cancelled' && <p className="stream-status">Response stopped</p>}
      {active.response && <div className="ai-response">{active.response}</div>}
    </section>}
    {pairs.length > 0 && <section className="ai-history" aria-labelledby="history-title"><div className="history-heading"><h2 id="history-title">Session History</h2>
      <button className="text-button" disabled={busy} onClick={clearPairs}>Clear History</button></div>
      <p className="field-hint">Your last three completed exchanges. Refreshing clears this history.</p>
      {pairs.map((pair) => <article className="ai-answer" key={pair.id}><h3>{pair.prompt}</h3><div className="ai-response">{pair.response}</div></article>)}
    </section>}
  </main></>;
}
