import { Link, NavLink, useNavigate } from 'react-router';
import { useAuth } from '../auth/useAuth';
import { BrandLogo } from './BrandLogo';

export function Header() {
  const { session, signOut } = useAuth();
  const navigate = useNavigate();
  return (
    <header className="site-header">
      <Link to="/" className="brand" aria-label="Spoonful home"><BrandLogo /></Link>
      <nav aria-label="Main navigation">
        <NavLink to="/recipes">Browse Recipes</NavLink>
        <NavLink to="/ai-assistant">AI Assistant</NavLink>
        <NavLink to="/recipe-generator">Recipe Generator</NavLink>
        {session ? (
          <>
            <NavLink to="/dashboard">Dashboard</NavLink>
            <button className="text-button" onClick={() => { signOut(); navigate('/'); }}>Log Out</button>
          </>
        ) : <NavLink to="/login">Login</NavLink>}
      </nav>
    </header>
  );
}
