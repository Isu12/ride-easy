import { useCallback, useEffect, useRef, useState } from "react";
import { subscribe } from "@/lib/db";

/**
 * Load data from the API and keep it fresh when the data store changes
 * (admin edits show up on the public site straight away, even in another tab).
 * Refreshes after the first load happen quietly, without showing skeletons again.
 */
export function useData<T>(load: () => Promise<T>, deps: unknown[] = []) {
  const [data, setData] = useState<T | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const loadRef = useRef(load);
  loadRef.current = load;

  const run = useCallback(async (quiet: boolean) => {
    if (!quiet) setLoading(true);
    try {
      const result = await loadRef.current();
      setData(result);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    run(false);
    const unsubscribe = subscribe(() => active && run(true));
    return () => {
      active = false;
      unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return { data, error, loading, reload: () => run(true) };
}
