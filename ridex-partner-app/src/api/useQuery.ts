import { useCallback, useEffect, useRef, useState } from 'react';

import { ApiError } from './problem';

type State<T> = { data: T | null; loading: boolean; error: string | null };

/**
 * ponytail: a twenty-line fetch hook rather than TanStack Query.
 *
 * The same one the console runs on. A screen needs load, error and refetch; it does not yet need
 * caching, background refresh or mutations. Swap when one actually wants them.
 */
export function useQuery<T>(fetcher: () => Promise<T>, deps: unknown[] = []): State<T> & {
  /** Resolves when the reload lands, so a pull-to-refresh spinner can stop on time. */
  refetch: () => Promise<void>;
} {
  const [state, setState] = useState<State<T>>({ data: null, loading: true, error: null });
  const [nonce, setNonce] = useState(0);

  const waiting = useRef<(() => void)[]>([]);
  const refetch = useCallback(
    () =>
      new Promise<void>((resolve) => {
        waiting.current.push(resolve);
        setNonce((value) => value + 1);
      }),
    [],
  );
  const settle = () => {
    const done = waiting.current;
    waiting.current = [];
    done.forEach((resolve) => resolve());
  };

  useEffect(() => {
    let cancelled = false;
    setState((previous) => ({ ...previous, loading: true, error: null }));

    fetcher()
      .then((data) => {
        // Guarded because a resolved request for a screen the user has already left would
        // otherwise set state on an unmounted tree.
        if (cancelled) return;
        setState({ data, loading: false, error: null });
        settle();
      })
      .catch((caught) => {
        if (cancelled) return;
        const message = caught instanceof ApiError ? caught.userMessage : 'Could not load.';
        setState({ data: null, loading: false, error: message });
        settle();
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, nonce]);

  return { ...state, refetch };
}
