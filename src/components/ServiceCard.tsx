import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { Service } from "@/types/types";

interface ServiceCardProps {
  service: Service;
  onSelect: (service: Service) => void;
  disabled?: boolean;
}

function formatPrice(priceCents: number): string {
  return `R${(priceCents / 100).toFixed(2)}`;
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

export function ServiceCard({
  service,
  onSelect,
  disabled = false,
}: ServiceCardProps) {
  return (
    <Card
      className="bg-white hover:shadow-lg transition-shadow cursor-pointer border border-silver-200 hover:border-silver-400"
      onClick={() => !disabled && onSelect(service)}
    >
      <CardHeader>
        <CardTitle className="text-lg font-semibold text-black">{service.name}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-sm text-silver-600">Duration:</span>
            <span className="font-medium text-black">
              {formatDuration(service.duration_min)}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-silver-600">Price:</span>
            <span className="font-bold text-xl text-black">
              {formatPrice(service.price_cents)}
            </span>
          </div>
          <div className="h-[1px] w-full bg-gradient-to-r from-transparent via-silver-300 to-transparent my-2"></div>
          <Button
            className="w-full mt-4 bg-black hover:bg-charcoal-800 text-white"
            disabled={disabled}
            onClick={(e) => {
              e.stopPropagation();
              onSelect(service);
            }}
          >
            Select Service
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
