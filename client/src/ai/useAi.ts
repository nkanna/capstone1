import { useContext } from 'react';
import { AiContext } from './AiContext';
export function useAi() {
  const value = useContext(AiContext);
  if (!value) throw new Error('useAi requires AiProvider');
  return value;
}
