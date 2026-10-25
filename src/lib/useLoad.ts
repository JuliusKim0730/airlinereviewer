"use client";

import { useCallback, useEffect, useState } from "react";

/**
 * Load async data and re-load when `key` changes or `reload()` is called.
 * `key` stands in for the loader's inputs (e.g. `${userId}:${board}`).
 */
export function useLoad<T>(load: () => Promise<T>, key: string): [T | null, () => void] {
  const [state, setState] = useState<{ key: string; value: T } | null>(null);
  const [tick, setTick] = useState(0);
  const fullKey = `${key}#${tick}`;

  useEffect(() => {
    let alive = true;
    load().then(
      (value) => alive && setState({ key: fullKey, value }),
      () => undefined,
    );
    return () => {
      alive = false;
    };
    // The loader is re-created every render; `key` captures what it depends on.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fullKey]);

  const reload = useCallback(() => setTick((t) => t + 1), []);
  // Keep showing the previous value while a reload is in flight.
  return [state ? state.value : null, reload];
}
