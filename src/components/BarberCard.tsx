import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { Barber } from "@/types/types";

interface BarberCardProps {
  barber: Barber;
  onSelect: (barber: Barber) => void;
  disabled?: boolean;
}

export function BarberCard({
  barber,
  onSelect,
  disabled = false,
}: BarberCardProps) {
  return (
    <Card
      className="bg-white hover:shadow-lg transition-shadow cursor-pointer border border-silver-200 hover:border-silver-400"
      onClick={() => !disabled && onSelect(barber)}
    >
      <CardHeader>
        <CardTitle className="text-lg font-semibold text-black">
          {barber.display_name}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div>
            <span className="text-sm text-silver-600 block mb-2">
              Specialties:
            </span>
            <div className="flex flex-wrap gap-1">
              {barber.specialties.map((specialty, index) => (
                <Badge key={index} variant="secondary" className="text-xs bg-silver-100 text-silver-700">
                  {specialty}
                </Badge>
              ))}
            </div>
          </div>
          <Button
            className="w-full mt-4 bg-black hover:bg-charcoal-800 text-white"
            disabled={disabled}
            onClick={(e) => {
              e.stopPropagation();
              onSelect(barber);
            }}
          >
            Select Barber
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
