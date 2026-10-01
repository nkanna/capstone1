import { Link, useLocation } from 'react-router';
import { BrandLogo } from '../components/BrandLogo';

export function LandingPage() {
  const location = useLocation();
  return (
    <main className="landing-page">
      <div className="landing-content">
        {typeof location.state?.notice === 'string' && <p className="success-message landing-notice" role="status">{location.state.notice}</p>}
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
