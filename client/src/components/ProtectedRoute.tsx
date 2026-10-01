import { Navigate, Outlet, useLocation } from 'react-router';
import { useAuth } from '../auth/useAuth';

export function ProtectedRoute() {
  const { session } = useAuth();
  const location = useLocation();
  return session
    ? <Outlet />
    : <Navigate to="/login" replace state={{ from: location.pathname }} />;
}
