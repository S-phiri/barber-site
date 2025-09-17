import { useEffect, useState } from "react";
import { getBarbers, getBarberBySlug } from "@/lib/api";

export function useBarbers(defaultSlug = "ramad") {
  const [barbers, setBarbers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<unknown>(null);

  useEffect(() => {
    (async () => {
      try {
        let list = await getBarbers();
        if (!Array.isArray(list) || list.length === 0) {
          const b = await getBarberBySlug(defaultSlug);
          list = [b];
        }
        setBarbers(list);
      } catch (e) {
        setError(e);
      } finally {
        setLoading(false);
      }
    })();
  }, [defaultSlug]);

  return { barbers, loading, error };
}
