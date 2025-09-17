import { useState, useCallback } from "react";
import { createBooking, getMyBookings } from "@/lib/api";
import type {
  Booking,
  CreateBookingRequest,
  CreateBookingResponse,
} from "@/types/types";
import { toast } from "@/components/ui/use-toast";

export function useBookings() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchBookings = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getMyBookings();
      setBookings(data);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to load bookings";
      setError(errorMessage);
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, []);

  const createNewBooking = useCallback(
    async (
      request: CreateBookingRequest,
    ): Promise<CreateBookingResponse | null> => {
      try {
        setLoading(true);
        setError(null);
        const response = await createBooking(request);
        // Refresh bookings list
        await fetchBookings();
        return response;
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Failed to create booking";
        setError(errorMessage);
        toast({
          title: "Error",
          description: errorMessage,
          variant: "destructive",
        });
        return null;
      } finally {
        setLoading(false);
      }
    },
    [fetchBookings],
  );

  return {
    bookings,
    loading,
    error,
    fetchBookings,
    createBooking: createNewBooking,
  };
}
