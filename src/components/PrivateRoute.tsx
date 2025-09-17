import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/auth';

interface PrivateRouteProps {
  children: React.ReactNode;
}

export default function PrivateRoute({ children }: PrivateRouteProps) {
  const { ready, user } = useAuth();
  const location = useLocation();

  if (!ready) {
    return <div>Loading...</div>; // or a proper loading component
  }

  if (!user) {
    // Redirect to login with the current path as next parameter
    const next = location.pathname + location.search;
    return <Navigate to={`/login?next=${encodeURIComponent(next)}`} replace />;
  }

  return <>{children}</>;
}
