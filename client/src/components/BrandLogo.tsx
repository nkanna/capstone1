import iconSheet from '../assets/spoonful-icons.svg';
import './brand-logo.css';

// The supplied export includes a 28px icon at (80, 80) inside a 188px sheet.
// Keep the original SVG intact; the CSS viewport displays its icon region.
export function BrandLogo() {
  return <span className="brand-logo" role="img" aria-label="Spoonful">
    <span className="brand-icon-viewport" aria-hidden="true">
      <span className="brand-icon-crop">
        <img className="brand-icon-sheet" src={iconSheet} width={188} height={188} alt="" />
      </span>
    </span>
    <span aria-hidden="true">poonful</span>
  </span>;
}
