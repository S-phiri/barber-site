import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { BookingSummary } from "@/components/BookingSummary";
import { CheckoutButton } from "@/components/CheckoutButton";
import { CountdownTimer } from "@/components/CountdownTimer";
import { useBooking } from "@/contexts/BookingContext";
import { useBookings } from "@/hooks/useBookings";
import { useServices } from "@/hooks/useServices";
import { useBarbers } from "@/hooks/useBarbers";
import { toast } from "@/components/ui/use-toast";
import { track } from "@/lib/analytics";

export default function Checkout() {
  const {
    serviceId,
    barberId,
    slotId,
    selectedDate,
    heldSlot,
    setHeldSlot,
    resetBooking,
  } = useBooking();
  const { createBooking } = useBookings();
  const { services } = useServices();
  const { barbers } = useBarbers();
  const [bookingId, setBookingId] = useState<number | null>(null);
  const [creating, setCreating] = useState(false);
  const navigate = useNavigate();

  const service = services.find((s) => s.id === serviceId);
  const barber = barbers.find((b) => b.id === barberId);

  // Redirect if missing required data
  useEffect(() => {
    if (!serviceId || !barberId || !slotId || !heldSlot) {
      navigate("/services");
    }
  }, [serviceId, barberId, slotId, heldSlot, navigate]);

  if (!serviceId || !barberId || !slotId || !heldSlot) {
    return null;
  }

  const handleCreateBooking = async () => {
    if (creating || bookingId) return;

    try {
      setCreating(true);
      track("booking_creation_started", {
        service_id: serviceId,
        barber_id: barberId,
        slot_id: slotId,
      });

      const response = await createBooking({
        barber_id: barberId,
        service_id: serviceId,
        slot_id: slotId,
      });

      if (response) {
        setBookingId(response.id);
        track("booking_created", {
          booking_id: response.id,
          status: response.status,
        });
        toast({
          title: "Booking Created",
          description: "Your booking has been created successfully.",
        });
      }
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to create booking";
      track("booking_creation_failed", {
        service_id: serviceId,
        barber_id: barberId,
        slot_id: slotId,
        error: errorMessage,
      });
    } finally {
      setCreating(false);
    }
  };

  const handleSlotExpire = () => {
    track("slot_expired_during_checkout", { slot_id: slotId });
    setHeldSlot(null);
    toast({
      title: "Slot Expired",
      description: "Your time slot has expired. Please select a new slot.",
      variant: "destructive",
    });
    navigate("/calendar");
  };

  const handleBack = () => {
    navigate("/calendar");
  };

  return (
    <div className="bg-white min-h-screen">
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center">
            <Button variant="outline" onClick={handleBack} className="mr-4">
              ← Back
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Checkout</h1>
              <p className="text-gray-600 mt-2">
                Review and confirm your booking
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-600">Slot reserved:</span>
            <CountdownTimer
              expiresAt={heldSlot.hold_expires_at}
              onExpire={handleSlotExpire}
            />
          </div>
        </div>

        <div className="max-w-2xl mx-auto space-y-6">
          <BookingSummary
            service={service || null}
            barber={barber || null}
            heldSlot={heldSlot}
            selectedDate={selectedDate}
          />

          <div className="flex flex-col space-y-4">
            {!bookingId ? (
              <Button
                size="lg"
                onClick={handleCreateBooking}
                disabled={creating}
                className="w-full"
              >
                {creating ? (
                  <>
                    <Spinner size="sm" className="mr-2" />
                    Creating Booking...
                  </>
                ) : (
                  "Continue"
                )}
              </Button>
            ) : (
              <CheckoutButton bookingId={bookingId} className="w-full" />
            )}

            <Button
              variant="outline"
              onClick={() => {
                resetBooking();
                navigate("/my-bookings");
              }}
              className="w-full"
            >
              View My Bookings
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
