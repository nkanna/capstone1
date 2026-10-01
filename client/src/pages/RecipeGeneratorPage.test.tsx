import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router';
import { expect, it, vi } from 'vitest';
import { AuthProvider } from '../auth/AuthProvider';
import { AiProvider } from '../ai/AiProvider';
import { api } from '../lib/api';
import { exampleRecipe, logIn } from '../test/recipeFixtures';
import { RecipeGeneratorPage } from './RecipeGeneratorPage';
function Destination() { return <h1>{useLocation().state?.notice}</h1>; }
function generator() { render(<MemoryRouter><AuthProvider><AiProvider><Routes><Route path="/" element={<RecipeGeneratorPage />} /><Route path="/dashboard" element={<Destination />} /></Routes></AiProvider></AuthProvider></MemoryRouter>); }
it('rejects missing ingredients before contacting the backend', async () => {
  const post = vi.spyOn(api, 'post'); generator(); await userEvent.click(screen.getByRole('button', { name: 'Generate Recipe' }));
  expect(screen.getByRole('alert')).toHaveTextContent('Please add the ingredients'); expect(post).not.toHaveBeenCalled();
});
it('uses a distinct ingredients/preferences request and lets guests review the recipe', async () => {
  const post = vi.spyOn(api, 'post').mockResolvedValue({ data: { recipe: { ...exampleRecipe, image: '' } } }); generator();
  await userEvent.type(screen.getByLabelText('Ingredients you have'), 'chickpeas, spinach');
  await userEvent.selectOptions(screen.getByLabelText('Dietary preference'), 'Vegan'); await userEvent.selectOptions(screen.getByLabelText('Cooking time'), '15');
  await userEvent.click(screen.getByRole('button', { name: 'Generate Recipe' }));
  expect(await screen.findByRole('heading', { name: 'Chickpea Stew' })).toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'Login to Save' })).toBeInTheDocument(); expect(screen.queryByRole('button', { name: 'Save Recipe' })).not.toBeInTheDocument();
  expect(post).toHaveBeenCalledWith('/api/ai/recipe', { ingredients: 'chickpeas, spinach', diet: 'Vegan', minutes: 15, servings: 2 }, expect.objectContaining({ timeout: 120000 }));
});
it('requires a photo URL and an explicit save before creating a generated recipe', async () => {
  logIn(); const post = vi.spyOn(api, 'post').mockResolvedValueOnce({ data: { recipe: { ...exampleRecipe, image: '' } } }).mockResolvedValueOnce({ data: exampleRecipe });
  generator(); await userEvent.type(screen.getByLabelText('Ingredients you have'), 'chickpeas'); await userEvent.click(screen.getByRole('button', { name: 'Generate Recipe' }));
  await screen.findByRole('button', { name: 'Save Recipe' }); expect(post).toHaveBeenCalledTimes(1);
  await userEvent.click(screen.getByRole('button', { name: 'Save Recipe' })); expect(post).toHaveBeenCalledTimes(1);
  await userEvent.type(screen.getByLabelText('Image URL'), 'https://example.com/stew.jpg'); await userEvent.click(screen.getByRole('button', { name: 'Save Recipe' }));
  expect(await screen.findByRole('heading', { name: 'Generated recipe saved successfully.' })).toBeInTheDocument();
  expect(post).toHaveBeenLastCalledWith('/api/recipes', expect.objectContaining({ title: 'Chickpea Stew', image: 'https://example.com/stew.jpg' }));
});
it('keeps inputs available for retry if generation fails', async () => {
  vi.spyOn(api, 'post').mockRejectedValue({ isAxiosError: true, response: { status: 429, data: { message: 'Please wait and try again.' } } }); generator();
  await userEvent.type(screen.getByLabelText('Ingredients you have'), 'chickpeas'); await userEvent.click(screen.getByRole('button', { name: 'Generate Recipe' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('Please wait'); expect(screen.getByLabelText('Ingredients you have')).toHaveValue('chickpeas');
  expect(screen.getByRole('button', { name: 'Generate Recipe' })).toBeEnabled();
});
