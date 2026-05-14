import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useLogStore, type TodayData } from "@/store/logStore";

const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export function useTodayData() {
  const { today, lastFetchedAt, setToday } = useLogStore();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    const isStale = !lastFetchedAt || Date.now() - lastFetchedAt > CACHE_TTL;

    // Cache is fresh — skip the fetch entirely
    if (!isStale && today) return;

    setLoading(true);
    setError(false);

    api
      .get<TodayData>("/log/today")
      .then((r) => setToday(r.data))
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, []);

  // Call this after any mutation to force a background refresh
  function refetch() {
    setLoading(true);
    api
      .get<TodayData>("/log/today")
      .then((r) => setToday(r.data))
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }

  return { today, loading, error, refetch };
}
