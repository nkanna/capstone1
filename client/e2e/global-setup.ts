import { request } from '@playwright/test';
import { apiURL } from './helpers';

export default async function setup() {
  const api = await request.newContext();
  try {
    const response = await api.get(`${apiURL}/api/recipes`, { timeout: 10000 });
    if (!response.ok() || !Array.isArray(await response.json())) {
      throw new Error('The recipes API did not return a recipe list.');
    }
  } catch {
    throw new Error('Start the Spoonful backend first: from backend/, run docker compose -f docker-compose.dev.yml up --build -d.');
  } finally { await api.dispose(); }
}
