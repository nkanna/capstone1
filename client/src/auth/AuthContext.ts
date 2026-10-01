import { createContext } from 'react';
import type { Session } from './session';

export type AuthValue = {
  session: Session | null;
  signIn: (token: string) => void;
  signOut: () => void;
};

export const AuthContext = createContext<AuthValue | null>(null);
