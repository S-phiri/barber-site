import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { Service, Barber, SlotHold } from "@/types/types";

interface BookingSummaryProps {
  service: Service | null;
  barber: Barber | null;
  heldSlot: SlotHold | null;
  selectedDate: string;
}

function formatPrice(priceCents: number): string {
  return `R${(priceCents / 100).toFixed(2)}`;
}

function formatDateTime(date: string, timestamp: string): string {
  const dateObj = new Date(timestamp);
  return dateObj.toLocaleString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

function formatDuration(minutes: number): string {
  if (minutes < 60) {
    return `${minutes}min`;
  }
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  if (remainingMinutes === 0) {
    return `${hours}h`;
  }
  return `${hours}h ${remainingMinutes}min`;
}

export function BookingSummary({
  service,
  barber,
  heldSlot,
  selectedDate,
}: BookingSummaryProps) {
  if (!service || !barber || !heldSlot) {
    return (
      <Card className="bg-white">
        <CardHeader>
          <CardTitle>Booking Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-500">
            Complete your selection to see booking details.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-white">
      <CardHeader>
        <CardTitle>Booking Summary</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <h4 className="font-semibold text-sm text-gray-600 mb-1">Service</h4>
          <p className="font-medium">{service.name}</p>
          <p className="text-sm text-gray-500">
            {formatDuration(service.duration_min)}
          </p>
        </div>

        <div>
          <h4 className="font-semibold text-sm text-gray-600 mb-1">Barber</h4>
          <p className="font-medium">{barber.display_name}</p>
          <div className="flex flex-wrap gap-1 mt-1">
            {barber.specialties.map((specialty, index) => (
              <Badge key={index} variant="secondary" className="text-xs">
                {specialty}
              </Badge>
            ))}
          </div>
        </div>

        <div>
          <h4 className="font-semibold text-sm text-gray-600 mb-1">
            Date & Time
          </h4>
          <p className="font-medium">
            {/* Use the held slot's timestamp for accurate time display */}
            {new Date(heldSlot.hold_expires_at).toLocaleDateString("en-US", {
              weekday: "long",
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </p>
          <p className="text-sm text-gray-500">
            Time slot reserved until{" "}
            {new Date(heldSlot.hold_expires_at).toLocaleTimeString("en-US", {
              hour: "2-digit",
              minute: "2-digit",
              hour12: false,
            })}
          </p>
        </div>

        <div className="border-t pt-4">
          <div className="flex justify-between items-center">
            <span className="font-semibold">Total:</span>
            <span className="font-bold text-lg">
              {formatPrice(service.price_cents)}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
