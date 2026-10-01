import axios from 'axios';
import { readSession } from '../auth/session';

export const api = axios.create({
  baseURL: (import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000').replace(/\/+$/, ''),
  timeout: 15000,
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
