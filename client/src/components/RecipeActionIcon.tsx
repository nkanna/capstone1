import cardSheet from '../assets/spoonful-card.svg';

// Keep the supplied SVG intact. Its footer contains the exact 48px action
// slots used by the Figma card: delete at (260, 400), edit at (316, 400).
export function RecipeActionIcon({ kind }: { kind: 'delete' | 'edit' }) {
  return <span className={`recipe-action-icon recipe-action-icon-${kind}`} aria-hidden="true">
    <img src={cardSheet} width={460} height={544} alt="" />
  </span>;
}
