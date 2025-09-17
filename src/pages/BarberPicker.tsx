import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { BarberCard } from "@/components/BarberCard";
import { EmptyState } from "@/components/EmptyState";
import { useBarbers } from "@/hooks/useBarbers";
import { useBooking } from "@/contexts/BookingContext";
import { track } from "@/lib/analytics";
import type { Barber } from "@/types/types";

export default function BarberPicker() {
  const { barbers, loading, error } = useBarbers();
  const { serviceId, setBarberId } = useBooking();
  const navigate = useNavigate();

  // Redirect if no service selected
  if (!serviceId) {
    navigate("/services");
    return null;
  }

  const handleBarberSelect = (barber: Barber) => {
    track("barber_selected", {
      barber_id: barber.id,
      barber_name: barber.display_name,
    });
    setBarberId(barber.id);
    navigate("/calendar");
  };

  const handleBack = () => {
    navigate("/services");
  };

  if (loading) {
    return (
      <div className="bg-white min-h-screen flex items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white min-h-screen flex items-center justify-center">
        <EmptyState
          title="Error Loading Barbers"
          description={error}
          actionLabel="Try Again"
          onAction={() => window.location.reload()}
        />
      </div>
    );
  }

  return (
    <div className="bg-white min-h-screen">
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center mb-8">
          <Button variant="outline" onClick={handleBack} className="mr-4 border-silver-300 text-silver-700 hover:bg-silver-50">
            ← Back
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-black">
              Choose Your Barber
            </h1>
            <p className="text-silver-600 mt-2">
              Select a barber for your appointment
            </p>
          </div>
        </div>

        {barbers.length === 0 ? (
          <EmptyState
            title="No Barbers Available"
            description="There are currently no barbers available for booking."
            actionLabel="Back to Services"
            onAction={handleBack}
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {barbers.map((barber) => (
              <BarberCard
                key={barber.id}
                barber={barber}
                onSelect={handleBarberSelect}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
