import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/auth";

interface BarberRouteProps {
  children: React.ReactNode;
}

/** Requires authenticated staff (is_staff). Others go to /dashboard. */
export default function BarberRoute({ children }: BarberRouteProps) {
  const { ready, user, isAdmin } = useAuth();

  if (!ready) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        Loading…
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (!isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}
