import { useCallback, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { AiContext } from './AiContext';
import type { AiPair } from './types';
import type { RecipeInput } from '../recipes/types';
export function AiProvider({ children }: { children: ReactNode }) {
  // AI history and drafts live only in React state. Navigation retains them; refresh clears them.
  const [pairs, setPairs] = useState<AiPair[]>([]);
  const [draft, setDraft] = useState<RecipeInput | null>(null);
  const addPair = useCallback((pair: AiPair) => setPairs((items) => [...items, pair].slice(-3)), []);
  const clearPairs = useCallback(() => setPairs([]), []);
  const value = useMemo(() => ({ pairs, addPair, clearPairs, draft, setDraft }), [pairs, addPair, clearPairs, draft]);
  return <AiContext.Provider value={value}>{children}</AiContext.Provider>;
}
