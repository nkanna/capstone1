import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Link, Route, Routes } from 'react-router';
import { expect, it, vi } from 'vitest';
import { AuthProvider } from '../auth/AuthProvider';
import { AiProvider } from '../ai/AiProvider';
import * as streaming from '../ai/stream';
import { AiAssistantPage } from './AiAssistantPage';
function assistant() { render(<MemoryRouter initialEntries={['/ai-assistant']}><AuthProvider><AiProvider><Routes>
  <Route path="/ai-assistant" element={<AiAssistantPage />} /><Route path="/recipes" element={<Link to="/ai-assistant">Return to Assistant</Link>} />
</Routes></AiProvider></AuthProvider></MemoryRouter>); }
it('rejects an empty guest prompt before contacting the backend', async () => {
  const stream = vi.spyOn(streaming, 'streamAssistant'); assistant();
  await userEvent.click(screen.getByRole('button', { name: 'Ask Spoonful' }));
  expect(screen.getByRole('alert')).toHaveTextContent('Please enter a question.'); expect(stream).not.toHaveBeenCalled();
});
it('shows the waiting state, then progressive text, then the completed exchange', async () => {
  let token!: (text: string) => void; let finish!: (value: string) => void;
  vi.spyOn(streaming, 'streamAssistant').mockImplementation((_, onToken) => { token = onToken; return new Promise((resolve) => { finish = resolve; }); });
  assistant(); await userEvent.type(screen.getByLabelText('Your question'), 'Egg substitute?');
  await userEvent.click(screen.getByRole('button', { name: 'Ask Spoonful' }));
  expect(screen.getByText('Waiting for the first response…')).toBeInTheDocument();
  act(() => token('Use ')); expect(screen.getByText('Use')).toBeInTheDocument(); expect(screen.getByText('Receiving response…')).toBeInTheDocument();
  await act(async () => { token('flaxseed.'); finish('Use flaxseed.'); });
  expect(screen.getByRole('heading', { name: 'Session History' })).toBeInTheDocument();
  expect(screen.getByText('Use flaxseed.')).toBeInTheDocument(); expect(screen.getByLabelText('Your question')).toHaveValue('');
});
it('keeps only three completed exchanges and retains them through navigation', async () => {
  vi.spyOn(streaming, 'streamAssistant').mockImplementation(async (prompt) => `Answer to ${prompt}`);
  assistant();
  for (const prompt of ['Question one', 'Question two', 'Question three', 'Question four']) {
    await userEvent.type(screen.getByLabelText('Your question'), prompt); await userEvent.click(screen.getByRole('button', { name: 'Ask Spoonful' }));
    await screen.findByText(`Answer to ${prompt}`);
  }
  expect(screen.queryByRole('heading', { name: 'Question one' })).not.toBeInTheDocument();
  expect(screen.getByRole('heading', { name: 'Question two' })).toBeInTheDocument();
  await userEvent.click(screen.getByRole('link', { name: 'Browse Recipes' })); await userEvent.click(screen.getByRole('link', { name: 'Return to Assistant' }));
  expect(screen.getByText('Answer to Question four')).toBeInTheDocument(); expect(sessionStorage.length).toBe(0); expect(localStorage.length).toBe(0);
});
it('shows errors and does not add failed requests to history', async () => {
  vi.spyOn(streaming, 'streamAssistant').mockRejectedValue(new Error('AI unavailable.')); assistant();
  await userEvent.type(screen.getByLabelText('Your question'), 'Help'); await userEvent.click(screen.getByRole('button', { name: 'Ask Spoonful' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('AI unavailable.');
  expect(screen.queryByRole('heading', { name: 'Session History' })).not.toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Ask Spoonful' })).toBeEnabled();
});
it('stops an in-flight response without adding it to history', async () => {
  let signal!: AbortSignal;
  vi.spyOn(streaming, 'streamAssistant').mockImplementation((_, __, abort) => { signal = abort; return new Promise(() => {}); });
  assistant(); await userEvent.type(screen.getByLabelText('Your question'), 'Help'); await userEvent.click(screen.getByRole('button', { name: 'Ask Spoonful' }));
  await userEvent.click(screen.getByRole('button', { name: 'Stop Response' })); expect(signal.aborted).toBe(true);
  expect(screen.queryByRole('heading', { name: 'Session History' })).not.toBeInTheDocument(); expect(screen.getByRole('button', { name: 'Ask Spoonful' })).toBeEnabled();
});
