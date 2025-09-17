import { useNavigate, Navigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { ServiceCard } from "@/components/ServiceCard";
import { EmptyState } from "@/components/EmptyState";
import { useBooking } from "@/contexts/BookingContext";
import { useAuth } from "@/auth";
import { track } from "@/lib/analytics";
import type { Service } from "@/types/types";

export default function Services() {
  const { services, servicesLoading, setServiceId, resetBooking } = useBooking();
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  // Gate booking flow to signed-in users
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  const handleServiceSelect = (service: Service) => {
    track("service_selected", {
      service_id: service.id,
      service_name: service.name,
    });
    setServiceId(service.id);
    navigate("/barbers");
  };

  const handleLogout = () => {
    resetBooking();
    logout();
    navigate("/login");
  };

  if (servicesLoading) {
    return (
      <div className="bg-white min-h-screen flex items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="bg-white min-h-screen">
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-black">Stay Faded</h1>
            <p className="text-silver-600 mt-2">Choose your service</p>
          </div>
          <Button variant="outline" onClick={handleLogout} className="border-silver-300 text-silver-700 hover:bg-silver-50">
            Sign Out
          </Button>
        </div>

        {!Array.isArray(services) || services.length === 0 ? (
          <EmptyState
            title="No Services Available"
            description="There are currently no services available for booking."
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {services.map((service) => (
              <ServiceCard
                key={service.id}
                service={service}
                onSelect={handleServiceSelect}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
