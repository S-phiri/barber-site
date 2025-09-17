import { useState, useEffect } from "react";
import { getTimeSlots } from "@/lib/api";
import type { TimeSlot } from "@/types/types";
import { toast } from "@/components/ui/use-toast";

export function useSlots(
  date: string,
  barberId: number | null,
  serviceId: number | null,
) {
  const [slots, setSlots] = useState<TimeSlot[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSlots = async () => {
    if (!barberId || !serviceId) {
      setSlots([]);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const data = await getTimeSlots(barberId, serviceId, date);
      setSlots(data);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to load time slots";
      setError(errorMessage);
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSlots();
  }, [date, barberId, serviceId]);

  return { slots, loading, error, refetch: fetchSlots };
}
