import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/auth";
import CustomerDashboard from "@/revamp/CustomerDashboard";
import RevampLayout from "@/revamp/RevampLayout";
import { Defs, ToastProvider } from "@/revamp/shared";

export default function Dashboard() {
  const { user } = useAuth();

  if (user?.is_staff) {
    return <Navigate to="/barber-dashboard" replace />;
  }

  const displayName = String(user?.name || user?.username || "there");

  return (
    <RevampLayout>
      <ToastProvider>
        <Defs />
        <CustomerDashboard displayName={displayName} />
      </ToastProvider>
    </RevampLayout>
  );
}
