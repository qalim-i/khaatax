import { useCallback, useEffect, useRef, useState } from 'react';

import { logError, toUserMessage } from '@/lib/errors';

interface AsyncDataOptions {
  /** Describes the action that failed ("Could not load parties."), not the cause. */
  fallbackMessage: string;
  /** Tag for the dev-only log line. */
  context: string;
  /** Values the fetcher closes over. Changing one re-runs it, like useEffect deps. */
  deps?: readonly unknown[];
}

/**
 * One fetch-on-mount-and-on-demand loader, shared by every read hook.
 *
 * Each hook used to carry its own copy of this: `loading`/`error` state, a
 * `useCallback` load, a `useEffect` to fire it, and the same try/catch. Nine
 * copies drifted — two had no `try/catch` at all, so a thrown (rather than
 * returned) failure left `loading` stuck true and the screen spinning forever.
 *
 * The part that only ONE copy had, and the reason this exists:
 *
 *   **A sequence guard against out-of-order responses.** Two loads in flight
 *   resolve in whatever order the network decides, and the older one landing
 *   last overwrites the newer result. That is not hypothetical here — the
 *   Expense List and the Outstanding Report re-fetch on every filter change, so
 *   tapping a category and then a date could leave the first query's rows on
 *   screen underneath the second query's filter chips. `useRefreshOnFocus` on
 *   fast tab-switching is a second route to the same overlap.
 *
 * Every `setState` below is gated on the request still being the newest one.
 *
 * The fetcher is held in a ref rather than being a dependency, so callers can
 * pass an inline closure without memoising it — an unmemoised fetcher in the
 * dependency array is a new value every render and would loop forever. What the
 * closure reads goes in `deps` instead.
 *
 * On failure the previous `data` is deliberately kept rather than cleared: a
 * failed background refresh should leave the last good figures on screen under
 * an error banner, not blank the report.
 */
export function useAsyncData<T>(
  fetcher: () => Promise<T>,
  { fallbackMessage, context, deps = [] }: AsyncDataOptions
) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const requestIdRef = useRef(0);
  const fetcherRef = useRef(fetcher);

  useEffect(() => {
    fetcherRef.current = fetcher;
  });

  const load = useCallback(async () => {
    const requestId = ++requestIdRef.current;
    setLoading(true);

    try {
      const result = await fetcherRef.current();
      if (requestId !== requestIdRef.current) return;
      setData(result);
      setError(null);
    } catch (err) {
      if (requestId !== requestIdRef.current) return;
      logError(context, err);
      setError(toUserMessage(err, fallbackMessage));
    } finally {
      if (requestId === requestIdRef.current) setLoading(false);
    }
  }, [context, fallbackMessage]);

  useEffect(() => {
    // Fetching on mount is the whole purpose of this hook, and Supabase is
    // exactly the "external system" the rule's own guidance says effects are
    // for. The cascading render it warns about is one `setLoading(true)`, which
    // is the loading state the screens read. The alternative is a fetching
    // library, which this project has deliberately not taken on.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
    // Unmounting, or a deps change, retires whatever is in flight: bumping the
    // counter makes the pending response fail its own identity check.
    return () => {
      requestIdRef.current += 1;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [load, ...deps]);

  return {
    data,
    /** A request is in flight, first or otherwise. */
    loading,
    /**
     * In flight AND nothing to show yet.
     *
     * The distinction the screens actually want. Gating a spinner on `loading`
     * alone means every focus refresh — which `useRefreshOnFocus` fires on every
     * return to a tab — tears the rendered content down and puts a spinner in
     * its place for the length of a round trip. On the Expense Dashboard that
     * blanked the category breakdown and the trend chart each time the tab was
     * opened. Stale figures for one round trip beat a flash of nothing.
     */
    initialLoading: loading && data === null,
    error,
    refresh: load,
  };
}

/**
 * One shared empty array, so the null case is reference-stable.
 *
 * `data ?? []` allocates a fresh array on every render while the first load is
 * in flight, and hooks feed this straight into `useMemo` deps — so every
 * dependent recomputes each pass for the whole loading window. Returning one
 * instance makes those memos hold. Frozen because a caller mutating it would
 * corrupt every other hook's empty state.
 */
const EMPTY: readonly never[] = Object.freeze([]);

/**
 * `data` is null until the first load resolves. Read hooks that front a list
 * want an empty array in that window rather than a null check at every call
 * site.
 */
export function orEmpty<T>(data: T[] | null): T[] {
  return data ?? (EMPTY as unknown as T[]);
}
