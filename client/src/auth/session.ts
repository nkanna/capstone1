export const SESSION_KEY = 'spoonful.token';

export type Session = {
  token: string;
  expiresAt: number;
  user: { id: string; email: string };
};

// Decoding supports the UI only. The backend verifies the JWT signature.
export function decodeSession(token: string): Session | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, '=');
    const bytes = Uint8Array.from(atob(padded), (c) => c.charCodeAt(0));
    const payload = JSON.parse(new TextDecoder().decode(bytes));
    if (typeof payload.exp !== 'number' || !Number.isFinite(payload.exp)) return null;
    const expiresAt = payload.exp * 1000;
    if (expiresAt <= Date.now() || !payload.user || typeof payload.user !== 'object') return null;
    return {
      token,
      expiresAt,
      user: {
        id: String(payload.user._id || ''),
        email: typeof payload.user.email === 'string' ? payload.user.email : '',
      },
    };
  } catch {
    return null;
  }
}

export function readSession(): Session | null {
  try {
    const token = sessionStorage.getItem(SESSION_KEY);
    return token ? decodeSession(token) : null;
  } catch {
    return null;
  }
}
