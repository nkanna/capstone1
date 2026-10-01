import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { AuthContext } from './AuthContext';
import { decodeSession, readSession, SESSION_KEY } from './session';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState(readSession);

  const signOut = useCallback(() => {
    try { sessionStorage.removeItem(SESSION_KEY); } catch { /* In-memory logout still works. */ }
    setSession(null);
  }, []);

  const signIn = useCallback((token: string) => {
    const next = decodeSession(token);
    if (!next) throw new Error('Invalid session response');
    sessionStorage.setItem(SESSION_KEY, token);
    setSession(next);
  }, []);

  useEffect(() => {
    if (!session) return;
    const timeout = window.setTimeout(signOut, Math.max(0, session.expiresAt - Date.now()));
    const checkExpiry = () => { if (session.expiresAt <= Date.now()) signOut(); };
    window.addEventListener('focus', checkExpiry);
    document.addEventListener('visibilitychange', checkExpiry);
    return () => {
      window.clearTimeout(timeout);
      window.removeEventListener('focus', checkExpiry);
      document.removeEventListener('visibilitychange', checkExpiry);
    };
  }, [session, signOut]);

  const value = useMemo(() => ({ session, signIn, signOut }), [session, signIn, signOut]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
