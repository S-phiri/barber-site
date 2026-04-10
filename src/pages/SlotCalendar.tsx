import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { SlotCalendar as SlotCalendarComponent } from "@/components/SlotCalendar";
import { CountdownTimer } from "@/components/CountdownTimer";
import { useBooking } from "@/contexts/BookingContext";
import { track } from "@/lib/analytics";
import type { SlotHold } from "@/types/types";

export default function SlotCalendar() {
  const {
    serviceId,
    barberId,
    selectedDate,
    heldSlot,
    setSelectedDate,
    setHeldSlot,
    setSlotId,
  } = useBooking();
  const navigate = useNavigate();

  // Redirect if missing required data
  useEffect(() => {
    if (!serviceId || !barberId) {
      navigate("/booking");
    }
  }, [serviceId, barberId, navigate]);

  if (!serviceId || !barberId) {
    return null;
  }

  const handleSlotHold = (slot: SlotHold) => {
    track("slot_held", { slot_id: slot.id });
    setHeldSlot(slot);
    setSlotId(slot.id);
  };

  const handleSlotExpire = () => {
    track("slot_expired", { slot_id: heldSlot?.id });
    setHeldSlot(null);
    setSlotId(null);
  };

  const handleContinue = () => {
    if (heldSlot) {
      navigate("/checkout");
    }
  };

  const handleBack = () => {
    navigate("/barbers");
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
              <h1 className="text-3xl font-bold text-gray-900">
                Select Time Slot
              </h1>
              <p className="text-gray-600 mt-2">
                Choose your preferred appointment time
              </p>
            </div>
          </div>
          {heldSlot && (
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-600">Slot reserved:</span>
              <CountdownTimer
                expiresAt={heldSlot.hold_expires_at}
                onExpire={handleSlotExpire}
              />
            </div>
          )}
        </div>

        <div className="space-y-6">
          <SlotCalendarComponent
            barberId={barberId}
            serviceId={serviceId}
            selectedDate={selectedDate}
            onDateChange={setSelectedDate}
            onSlotHold={handleSlotHold}
            disabled={!!heldSlot}
          />

          {heldSlot && (
            <div className="flex justify-center">
              <Button size="lg" onClick={handleContinue}>
                Continue to Booking
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
