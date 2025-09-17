import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { useSlots } from "@/hooks/useSlots";
import { holdTimeSlot } from "@/lib/api";
import { toast } from "@/components/ui/use-toast";
import type { TimeSlot, SlotHold } from "@/types/types";
import dayjs from "dayjs";

interface SlotCalendarProps {
  barberId: number;
  serviceId: number;
  selectedDate: string;
  onDateChange: (date: string) => void;
  onSlotHold: (slot: SlotHold) => void;
  disabled?: boolean;
}

function formatTime(timestamp: string): string {
  return dayjs(timestamp).format("HH:mm");
}

function formatDate(dateString: string): string {
  return dayjs(dateString).format("dddd, MMMM D, YYYY");
}

export function SlotCalendar({
  barberId,
  serviceId,
  selectedDate,
  onDateChange,
  onSlotHold,
  disabled = false,
}: SlotCalendarProps) {
  const { slots, loading, error, refetch } = useSlots(
    selectedDate,
    barberId,
    serviceId,
  );
  const [holdingSlot, setHoldingSlot] = useState<number | null>(null);

  // Generate next 7 days for date picker using dayjs
  const availableDates = Array.from({ length: 7 }, (_, i) => {
    return dayjs().add(i, "day").format("YYYY-MM-DD");
  });

  const handleSlotClick = async (slot: TimeSlot) => {
    if (disabled || holdingSlot) return;

    try {
      setHoldingSlot(slot.id);
      const heldSlot = await holdTimeSlot({
        start: slot.start_ts,
        barber_id: barberId,
        service_id: serviceId,
        ttlSeconds: 600, // 10 minutes
      });
      onSlotHold(heldSlot);
      toast({
        title: "Slot Reserved",
        description: "You have 10 minutes to complete your booking.",
      });
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to hold slot";

      // Handle specific error cases
      if (
        errorMessage.includes("409") ||
        errorMessage.toLowerCase().includes("conflict")
      ) {
        toast({
          title: "Slot Unavailable",
          description: "This slot was just taken. Please pick another.",
          variant: "destructive",
        });
        refetch(); // Refresh slots
      } else {
        toast({
          title: "Error",
          description: errorMessage,
          variant: "destructive",
        });
      }
    } finally {
      setHoldingSlot(null);
    }
  };

  return (
    <div className="bg-white space-y-6">
      {/* Date Picker */}
      <Card>
        <CardHeader>
          <CardTitle>Select Date</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-2">
            {availableDates.map((date) => (
              <Button
                key={date}
                variant={selectedDate === date ? "default" : "outline"}
                className="text-xs p-2 h-auto flex flex-col"
                onClick={() => onDateChange(date)}
                disabled={disabled}
              >
                <span className="font-semibold">
                  {dayjs(date).format("ddd")}
                </span>
                <span>
                  {dayjs(date).format("D")}
                </span>
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Time Slots */}
      <Card>
        <CardHeader>
          <CardTitle>Available Times - {formatDate(selectedDate)}</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <Spinner size="lg" />
            </div>
          ) : error ? (
            <div className="text-center py-8">
              <p className="text-red-600 mb-4">Could not load slots, please try again.</p>
              <Button onClick={refetch} variant="outline">
                Try Again
              </Button>
            </div>
          ) : slots.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <p>No Available Slots</p>
              <p className="text-sm mt-2">Try selecting a different date.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {slots.map((slot) => (
                <Button
                  key={slot.id}
                  variant="outline"
                  className="h-auto py-3 flex flex-col"
                  onClick={() => handleSlotClick(slot)}
                  disabled={disabled || holdingSlot === slot.id}
                >
                  {holdingSlot === slot.id ? (
                    <Spinner size="sm" />
                  ) : (
                    <>
                      <span className="font-semibold">
                        {formatTime(slot.start_ts)}
                      </span>
                      <span className="text-xs text-gray-500">
                        {formatTime(slot.end_ts)}
                      </span>
                    </>
                  )}
                </Button>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}