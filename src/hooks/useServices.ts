import { useState, useEffect } from "react";
import { getServices } from "@/lib/api";
import type { Service } from "@/types/types";
import { toast } from "@/components/ui/use-toast";

export function useServices() {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchServices() {
      try {
        setLoading(true);
        setError(null);
        const data = await getServices();
        setServices(data);
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Failed to load services";
        setError(errorMessage);
        toast({
          title: "Error",
          description: errorMessage,
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    }

    fetchServices();
  }, []);

  return { services, loading, error, refetch: () => fetchServices() };
}
