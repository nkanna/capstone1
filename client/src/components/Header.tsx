import { Link } from 'react-router';
import { BrandLogo } from './BrandLogo';
import { AccountMenu } from './AccountMenu';
import accountIcon from '../assets/account-circle.svg';

export function Header() {
  return (
    <header className="site-header">
      <Link to="/" className="brand" aria-label="Spoonful home"><BrandLogo /></Link>
      <nav aria-label="Main navigation">
        <AccountMenu iconSrc={accountIcon} />
      </nav>
    </header>
  );
}
