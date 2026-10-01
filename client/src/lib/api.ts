import axios from 'axios';
import { readSession } from '../auth/session';

const backendURL = (import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000').replace(/\/+$/, '');

function demoTunnelHeaders(url: string): Record<string, string> {
  try {
    const hostname = new URL(url).hostname;
    if (/(^|\.)ngrok(-free)?\.(app|dev|io)$/i.test(hostname)) {
      return { 'ngrok-skip-browser-warning': '1' };
    }
  } catch { /* Relative API URLs do not need a tunnel header. */ }
  return {};
}

export const api = axios.create({
  baseURL: backendURL,
  timeout: 15000,
  headers: demoTunnelHeaders(backendURL),
});

api.interceptors.request.use((config) => {
  const session = readSession();
  if (session) config.headers.Authorization = `Bearer ${session.token}`;
  return config;
});

export function errorMessage(error: unknown, fallback: string): string {
  if (!axios.isAxiosError(error)) return fallback;
  if (!error.response) return 'We couldn’t connect. Please try again.';
  if (error.response.status === 401) return 'Your email or password is incorrect. Please try again.';
  if (error.response.data?.code === 11000) return 'An account with this email already exists. Try logging in.';
  return fallback;
}
