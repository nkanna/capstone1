import { startTransition, useEffect, useId, useRef, useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router';
import { useAuth } from '../auth/useAuth';
import './account-menu.css';

// Display the original 32px Figma export inside its 48px click target.
export function AccountMenu({ iconSrc }: { iconSrc: string }) {
  const { session, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const panelId = useId();
  const [openAt, setOpenAt] = useState<string | null>(null);
  const container = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const open = openAt === location.key;

  useEffect(() => {
    if (!open) return;
    function outside(event: PointerEvent) {
      if (event.target instanceof Node && !container.current?.contains(event.target)) setOpenAt(null);
    }
    function escape(event: KeyboardEvent) {
      if (event.key !== 'Escape') return;
      setOpenAt(null);
      trigger.current?.focus();
    }
    document.addEventListener('pointerdown', outside);
    document.addEventListener('keydown', escape);
    return () => {
      document.removeEventListener('pointerdown', outside);
      document.removeEventListener('keydown', escape);
    };
  }, [open]);

  return <div className="account-menu" ref={container} onBlur={(event) => {
    if (event.relatedTarget instanceof Node && !event.currentTarget.contains(event.relatedTarget)) setOpenAt(null);
  }}>
    <button type="button" className="account-trigger" aria-label="Main menu" title="Navigation and account"
      aria-expanded={open} aria-controls={panelId} ref={trigger}
      onClick={() => setOpenAt(open ? null : location.key)}>
      <img src={iconSrc} width={32} height={32} alt="" />
    </button>
    {open && <div id={panelId} className="account-panel">
      {session && <p className="account-email">{session.user.email}</p>}
      <NavLink to="/recipes" onClick={() => setOpenAt(null)}>Browse Recipes</NavLink>
      <NavLink to="/ai-assistant" onClick={() => setOpenAt(null)}>AI Assistant</NavLink>
      <NavLink to="/recipe-generator" onClick={() => setOpenAt(null)}>Recipe Generator</NavLink>
      <div className="account-session-actions">
        {session ? <>
          <NavLink to="/profile" onClick={() => setOpenAt(null)}>Your Profile</NavLink>
          <NavLink to="/dashboard" onClick={() => setOpenAt(null)}>Dashboard</NavLink>
          <button type="button" onClick={() => {
            setOpenAt(null);
            startTransition(() => { signOut(); navigate('/'); });
          }}>Log Out</button>
        </> : <>
          <NavLink to="/login" onClick={() => setOpenAt(null)}>Login</NavLink>
          <NavLink to="/signup" onClick={() => setOpenAt(null)}>Create Account</NavLink>
        </>}
      </div>
    </div>}
  </div>;
}
