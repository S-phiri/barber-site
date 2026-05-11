import { useState, useEffect } from "react";
import { getTimeSlots, http } from "@/lib/api";
import type { TimeSlot } from "@/types/types";
import { toast } from "@/components/ui/use-toast";

export function useSlots(
  date: string,
  barberId: number | null,
  serviceId: number | null,
) {
  const [slots, setSlots] = useState<TimeSlot[]>([]);
  const [blockedDates, setBlockedDates] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSlots = async () => {
    if (!barberId || !serviceId) {
      setSlots([]);
      setBlockedDates([]);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const access =
        typeof window !== "undefined" ? window.localStorage.getItem("access") : null;
      const blockedReq = http("/api/barber/blocked-dates/", {
        method: "GET",
        ...(access ? { headers: { Authorization: `Bearer ${access}` } } : {}),
      });

      const [slotsResult, blockedResult] = await Promise.allSettled([
        getTimeSlots(barberId, serviceId, date),
        blockedReq.then(async (r) => {
          if (!r.ok) return [] as string[];
          const raw = await r.json();
          return Array.isArray(raw)
            ? raw.filter((x): x is string => typeof x === "string" && /^\d{4}-\d{2}-\d{2}$/.test(x))
            : [];
        }),
      ]);

      if (slotsResult.status === "fulfilled") {
        setSlots(slotsResult.value);
      } else {
        const err = slotsResult.reason;
        const errorMessage = err instanceof Error ? err.message : "Failed to load time slots";
        setError(errorMessage);
        setSlots([]);
        toast({
          title: "Error",
          description: errorMessage,
          variant: "destructive",
        });
      }

      setBlockedDates(blockedResult.status === "fulfilled" ? blockedResult.value : []);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to load time slots";
      setError(errorMessage);
      setSlots([]);
      setBlockedDates([]);
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

  return { slots, blockedDates, loading, error, refetch: fetchSlots };
}
