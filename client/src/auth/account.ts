import axios from 'axios';

export function accountError(error: unknown): string {
  if (axios.isAxiosError(error)) {
    if (!error.response) return 'We couldn’t connect. Please try again.';
    const message = error.response.data?.message;
    if (typeof message === 'string') return message;
    if (error.response.status === 401) return 'Your session has expired. Please log in again.';
  }
  return 'We couldn’t complete this account request. Please try again.';
}
