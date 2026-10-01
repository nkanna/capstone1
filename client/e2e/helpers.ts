import { randomUUID } from 'node:crypto';
import { expect } from '@playwright/test';
import type { APIRequestContext, Page } from '@playwright/test';

export const apiURL = (process.env.E2E_API_URL || 'http://localhost:3000').replace(/\/+$/, '');
export const aiURL = 'http://127.0.0.1:4188';
export const photoURL = 'https://images.example.test/spoonful.svg';
export const unique = () => randomUUID();
export const credentials = () => ({ email: `spoonful-e2e-${unique()}@example.test`, password: `Test-${unique()}!` });
export const authHeaders = (token: string) => ({ Authorization: `Bearer ${token}` });

export async function createCreator(request: APIRequestContext) {
  const user = credentials();
  const response = await request.post(`${apiURL}/api/users/signup`, { data: user });
  expect(response.ok()).toBeTruthy();
  const { token } = await response.json() as { token: string };
  expect(typeof token).toBe('string');
  const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString('utf8')) as { user: { _id: string } };
  return { ...user, token, id: payload.user._id };
}

export async function login(page: Page, user: { email: string; password: string }) {
  await page.goto('/login');
  await page.getByLabel('Email', { exact: true }).fill(user.email);
  await page.getByLabel('Password', { exact: true }).fill(user.password);
  await page.getByRole('button', { name: 'Login', exact: true }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.getByRole('heading', { name: 'Your Recipes', exact: true })).toBeVisible();
}

export async function localPhoto(page: Page) {
  await page.route('https://images.example.test/**', route => route.fulfill({
    contentType: 'image/svg+xml',
    body: '<svg xmlns="http://www.w3.org/2000/svg" width="800" height="500"><rect width="800" height="500" fill="#C1E0A6"/><circle cx="400" cy="250" r="150" fill="#FFF7E6"/></svg>',
  }));
}

export async function removeRecipes(request: APIRequestContext, token: string, ids: string[]) {
  for (const id of ids) {
    const response = await request.delete(`${apiURL}/api/recipes/${id}`, { headers: authHeaders(token) });
    expect([200, 404], `Cleanup of test recipe ${id}`).toContain(response.status());
  }
}

// Only AI traffic is redirected. Auth and recipe CRUD still use the real backend.
export async function controlledAI(page: Page) {
  await page.route('**/api/ai/**', route => {
    const path = new URL(route.request().url()).pathname;
    return route.continue({ url: `${aiURL}${path}` });
  });
}

export async function release(request: APIRequestContext, prompt: string, action: 'first' | 'finish' | 'fail') {
  await expect.poll(async () => {
    const response = await request.get(`${aiURL}/health`);
    const { prompts } = await response.json() as { prompts: string[] };
    return prompts.includes(prompt);
  }).toBe(true);
  const response = await request.post(`${aiURL}/control`, { data: { prompt, action } });
  expect(response.ok()).toBeTruthy();
}

export async function noHorizontalOverflow(page: Page) {
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(1);
}
