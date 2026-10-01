import { test, expect } from '@playwright/test';
import { controlledAI, createCreator, localPhoto, noHorizontalOverflow, photoURL, release, removeRecipes, unique } from './helpers';

test.beforeEach(async ({ page }) => { await controlledAI(page); await localPhoto(page); });

test('AI assistant validates, streams progressively, retains three exchanges, and clears on reload', async ({ page, request }) => {
  let calls = 0;
  page.on('request', event => { if (event.method() === 'POST' && event.url().includes('/api/ai/stream')) calls++; });
  await page.goto('/recipes');
  await page.getByRole('navigation', { name: 'Main navigation' }).getByRole('link', { name: 'AI Assistant', exact: true }).click();
  await page.getByRole('button', { name: 'Ask Spoonful', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('Please enter a question.');
  expect(calls).toBe(0);
  const prompt = `e2e:held ${unique()}`;
  await page.getByLabel('Your question', { exact: true }).fill(prompt);
  await page.getByRole('button', { name: 'Ask Spoonful', exact: true }).click();
  await expect(page.getByText('Waiting for the first response…', { exact: true })).toBeVisible();
  await release(request, prompt, 'first');
  const current = page.getByRole('region', { name: 'Current response' });
  await expect(current.getByText('First chunk.', { exact: true })).toBeVisible();
  await expect(current.getByText('Receiving response…', { exact: true })).toBeVisible();
  await expect(page.getByRole('region', { name: 'Session History' })).toHaveCount(0);
  await noHorizontalOverflow(page);
  await release(request, prompt, 'finish');
  const history = page.getByRole('region', { name: 'Session History' });
  await expect(history.getByText('First chunk. Second chunk.', { exact: true })).toBeVisible();
  await expect(current).toHaveCount(0);
  const questions = ['Tip one', 'Tip two', 'Tip three'];
  for (const question of questions) {
    await page.getByLabel('Your question', { exact: true }).fill(question);
    await page.getByRole('button', { name: 'Ask Spoonful', exact: true }).click();
    await expect(history.getByRole('heading', { name: question, exact: true })).toBeVisible();
  }
  await expect(history.getByRole('article')).toHaveCount(3);
  await expect(history.getByRole('heading', { name: prompt, exact: true })).toHaveCount(0);
  await page.getByRole('link', { name: 'Browse Recipes', exact: true }).click();
  await page.getByRole('link', { name: 'AI Assistant', exact: true }).click();
  await expect(history.getByRole('article')).toHaveCount(3);
  await page.reload();
  await expect(page.getByRole('heading', { name: 'AI Assistant', exact: true })).toBeVisible();
  await expect(history).toHaveCount(0);
});

test('AI errors keep the prompt, preserve partial text, and allow retry', async ({ page, request }) => {
  await page.goto('/ai-assistant');
  await page.getByLabel('Your question', { exact: true }).fill('e2e:error quota');
  await page.getByRole('button', { name: 'Ask Spoonful', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('Controlled quota error');
  await expect(page.getByLabel('Your question', { exact: true })).toHaveValue('e2e:error quota');
  await expect(page.getByRole('region', { name: 'Session History' })).toHaveCount(0);
  await page.getByLabel('Your question', { exact: true }).fill('Successful retry');
  await page.getByRole('button', { name: 'Ask Spoonful', exact: true }).click();
  await expect(page.getByRole('region', { name: 'Session History' }).getByRole('heading', { name: 'Successful retry', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Clear History', exact: true }).click();
  const prompt = `e2e:held failure ${unique()}`;
  await page.getByLabel('Your question', { exact: true }).fill(prompt);
  await page.getByRole('button', { name: 'Ask Spoonful', exact: true }).click();
  await release(request, prompt, 'first');
  await expect(page.getByText('First chunk.', { exact: true })).toBeVisible();
  await release(request, prompt, 'fail');
  await expect(page.getByRole('alert')).toContainText('Controlled stream failure');
  await expect(page.getByText('Incomplete response', { exact: true })).toBeVisible();
  await expect(page.getByText('First chunk.', { exact: true })).toBeVisible();
  await expect(page.getByRole('region', { name: 'Session History' })).toHaveCount(0);
});

test('stopping a stream aborts it and allows another question', async ({ page, request }) => {
  const prompt = `e2e:held stop ${unique()}`;
  await page.goto('/ai-assistant');
  await page.getByLabel('Your question', { exact: true }).fill(prompt);
  await page.getByRole('button', { name: 'Ask Spoonful', exact: true }).click();
  await release(request, prompt, 'first');
  await expect(page.getByText('First chunk.', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Stop Response', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Ask Spoonful', exact: true })).toBeEnabled();
  await expect(page.getByRole('region', { name: 'Session History' })).toHaveCount(0);
  await page.getByLabel('Your question', { exact: true }).fill('Question after stopping');
  await page.getByRole('button', { name: 'Ask Spoonful', exact: true }).click();
  await expect(page.getByRole('region', { name: 'Session History' }).getByRole('heading', { name: 'Question after stopping', exact: true })).toBeVisible();
});

test('guest generates a draft, signs in, reviews it, and explicitly saves through the real API', async ({ page, request }) => {
  const user = await createCreator(request);
  const ids: string[] = [];
  let writes = 0;
  page.on('request', event => { if (event.method() === 'POST' && event.url().endsWith('/api/recipes')) writes++; });
  try {
    await page.goto('/recipe-generator');
    await page.getByRole('button', { name: 'Generate Recipe', exact: true }).click();
    await expect(page.getByRole('alert')).toContainText('Please add the ingredients');
    await page.getByLabel('Ingredients you have', { exact: true }).fill('chickpeas, tomatoes');
    await page.getByLabel('Dietary preference', { exact: true }).selectOption('Vegan');
    await page.getByLabel('Cooking time', { exact: true }).selectOption('15');
    await page.getByLabel('Servings', { exact: true }).selectOption('3');
    const generate = page.waitForRequest(event => event.method() === 'POST' && event.url().endsWith('/api/ai/recipe'));
    await page.getByRole('button', { name: 'Generate Recipe', exact: true }).click();
    expect((await generate).postDataJSON()).toEqual({ ingredients: 'chickpeas, tomatoes', diet: 'Vegan', minutes: 15, servings: 3 });
    await expect(page.getByRole('heading', { name: 'Chickpea Test Stew', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Save Recipe', exact: true })).toHaveCount(0);
    expect(writes).toBe(0);
    await noHorizontalOverflow(page);
    await page.getByRole('link', { name: 'Login to Save', exact: true }).click();
    await page.getByLabel('Email', { exact: true }).fill(user.email);
    await page.getByLabel('Password', { exact: true }).fill(user.password);
    await page.getByRole('button', { name: 'Login', exact: true }).click();
    await expect(page).toHaveURL(/\/dashboard$/);
    await page.getByRole('link', { name: 'Recipe Generator', exact: true }).click();
    await expect(page.getByLabel('Recipe Title', { exact: true })).toHaveValue('Chickpea Test Stew');
    await page.getByRole('button', { name: 'Save Recipe', exact: true }).click();
    await expect(page.getByText('Please add a valid http or https image URL.', { exact: true })).toBeVisible();
    expect(writes).toBe(0);
    const title = `Generated E2E Stew ${unique()}`;
    await page.getByLabel('Recipe Title', { exact: true }).fill(title);
    await page.getByLabel('Image URL', { exact: true }).fill(photoURL);
    const saved = page.waitForResponse(event => event.url().endsWith('/api/recipes') && event.request().method() === 'POST');
    await page.getByRole('button', { name: 'Save Recipe', exact: true }).click();
    const response = await saved;
    expect(response.status()).toBe(201);
    const recipe = await response.json() as { _id: string };
    ids.push(recipe._id);
    await expect(page.getByText('Generated recipe saved successfully.', { exact: true })).toBeVisible();
    await expect(page.getByRole('heading', { name: title, exact: true })).toBeVisible();
    expect(writes).toBe(1);
  } finally { await removeRecipes(request, user.token, ids); }
});

test('public navigation and form controls fit the viewport', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Spoonful', exact: true })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Explore Recipes', exact: true })).toBeVisible();
  await noHorizontalOverflow(page);
  for (const [path, heading] of [
    ['/recipes', 'Recipe List'],
    ['/ai-assistant', 'AI Assistant'], ['/recipe-generator', 'Recipe Generator'],
  ]) {
    await page.goto(path);
    await expect(page.getByRole('heading', { name: heading, exact: true })).toBeVisible();
    await noHorizontalOverflow(page);
    const nav = page.getByRole('navigation', { name: 'Main navigation' });
    await expect(nav.getByRole('link', { name: 'AI Assistant', exact: true })).toBeVisible();
    await expect(nav.getByRole('link', { name: 'Recipe Generator', exact: true })).toBeVisible();
  }
});
