export type Ingredient = { name: string; quantity: string };
export type Instruction = { step: number; description: string };
export type RecipeInput = { title: string; description: string; image: string; ingredients: Ingredient[]; instructions: Instruction[]; tags: string[] };
export type Recipe = { _id: string; title: string; description?: string; image?: string; ingredients: Ingredient[]; instructions: Instruction[]; tags: string[]; ownerId: string; createdAt?: string };
export function safeImageUrl(value?: string): string | undefined {
  try { const url = new URL(value || ''); return ['http:', 'https:'].includes(url.protocol) ? url.href : undefined; }
  catch { return undefined; }
}
