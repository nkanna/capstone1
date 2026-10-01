import type { RecipeInput } from '../recipes/types';
export type AiPair = { id: string; prompt: string; response: string };
export type AiState = { pairs: AiPair[]; addPair: (pair: AiPair) => void; clearPairs: () => void;
  draft: RecipeInput | null; setDraft: (draft: RecipeInput | null) => void };
