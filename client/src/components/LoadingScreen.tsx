import { BrandLogo } from './BrandLogo';
import './loading-screen.css';

export function LoadingScreen({ message = 'Recipe Manager' }: { message?: string }) {
  return <main className="loading-screen" aria-busy="true">
    <div className="loading-brand"><BrandLogo /></div>
    <p className="loading-caption">{message}</p>
    <span className="sr-only" role="status">Loading. Please wait.</span>
  </main>;
}
