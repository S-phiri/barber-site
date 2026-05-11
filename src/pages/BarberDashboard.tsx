import { useAuth } from "@/contexts/auth";
import BarberDashboardRevamp from "@/revamp/BarberDashboard";
import RevampLayout from "@/revamp/RevampLayout";
import { Defs, ToastProvider } from "@/revamp/shared";

export default function BarberDashboard() {
  const { user } = useAuth();
  const displayName = String(user?.name || user?.username || "Barber");

  return (
    <RevampLayout>
      <ToastProvider>
        <Defs />
        <BarberDashboardRevamp displayName={displayName} />
      </ToastProvider>
    </RevampLayout>
  );
}

