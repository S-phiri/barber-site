import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/auth";

export default function RequireAuth() {
  const { ready, access } = useAuth();
  const loc = useLocation();
  if (!ready) return null;                           // or a loader
  if (!access) return <Navigate to="/login" replace state={{ from: loc }} />;
  return <Outlet />;
}
