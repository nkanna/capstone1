import { createContext } from 'react';
import type { AiState } from './types';
export const AiContext = createContext<AiState | null>(null);
