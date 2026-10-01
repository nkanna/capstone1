import { Link } from 'react-router';
import { BrandLogo } from '../components/BrandLogo';

export function LandingPage() {
  return (
    <main className="landing-page">
      <div className="landing-content">
        <h1 className="landing-brand" aria-label="Spoonful"><BrandLogo /></h1>
        <p className="landing-subtitle">Recipe Manager</p>
        <div className="button-stack">
          <Link className="button button-primary" to="/recipes">Explore Recipes</Link>
          <Link className="button button-secondary" to="/login">Login</Link>
          <Link className="text-link" to="/signup">Create an Account</Link>
        </div>
      </div>
    </main>
  );
}
