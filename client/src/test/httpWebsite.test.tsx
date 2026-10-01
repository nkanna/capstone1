import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { RecipeForm } from '../components/RecipeForm';
import { AiAssistantPage } from '../pages/AiAssistantPage';
import { AuthProvider } from '../auth/AuthProvider';
import { AiProvider } from '../ai/AiProvider';
import * as streaming from '../ai/stream';
import { exampleRecipe } from './recipeFixtures';

beforeEach(() => { vi.stubGlobal('crypto', { randomUUID: undefined }); });
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });

it('creates and manages ingredient and instruction rows without secure-context UUID support', async () => {
  render(<MemoryRouter><RecipeForm onSave={vi.fn()} /></MemoryRouter>);
  await userEvent.type(screen.getByLabelText('Ingredient 1'), 'Tofu');
  await userEvent.click(screen.getByRole('button', { name: 'Add Ingredient' }));
  await userEvent.type(screen.getByLabelText('Ingredient 2'), 'Spinach');
  await userEvent.click(screen.getByRole('button', { name: 'Remove ingredient 1' }));
  expect(screen.getByLabelText('Ingredient 1')).toHaveValue('Spinach');
  await userEvent.click(screen.getByRole('button', { name: 'Add Step' }));
  await userEvent.type(screen.getByLabelText('Step 2'), 'Serve warm.');
  await userEvent.click(screen.getByRole('button', { name: 'Remove step 1' }));
  expect(screen.getByLabelText('Step 1')).toHaveValue('Serve warm.');
});

it('opens a prefilled recipe for editing without secure-context UUID support', () => {
  render(<MemoryRouter><RecipeForm initial={exampleRecipe} onSave={vi.fn()} /></MemoryRouter>);
  expect(screen.getByLabelText('Ingredient 1')).toHaveValue('Chickpeas');
  expect(screen.getByLabelText('Step 1')).toHaveValue(exampleRecipe.instructions[0].description);
});

it('records a completed AI exchange without secure-context UUID support', async () => {
  vi.spyOn(streaming, 'streamAssistant').mockImplementation(async (_, onToken) => {
    onToken('Use lentils.'); return 'Use lentils.';
  });
  render(<MemoryRouter><AuthProvider><AiProvider><AiAssistantPage /></AiProvider></AuthProvider></MemoryRouter>);
  await userEvent.type(screen.getByLabelText('Your question'), 'What protein can I use?');
  await userEvent.click(screen.getByRole('button', { name: 'Ask Spoonful' }));
  expect(await screen.findByRole('region', { name: 'Session History' })).toHaveTextContent('Use lentils.');
  expect(screen.getByText('Response complete.')).toBeInTheDocument();
  expect(screen.queryByRole('alert')).not.toBeInTheDocument();
});
