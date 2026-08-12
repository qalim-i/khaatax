import { useFocusEffect } from 'expo-router';
import { useCallback, useRef } from 'react';

/**
 * Re-runs a hook's `refresh` whenever the screen comes back into focus.
 *
 * Every data hook here fetches once from `useEffect` on mount. That is not enough
 * on its own: the tab navigator keeps screens *mounted* in the background, so
 * returning to a tab never remounts it and never refetches. The visible symptom
 * is stale figures — log an expense, go back to Home, and the MTD total still
 * shows the old number until the app is fully reloaded.
 *
 * The first focus is skipped because mount has already fetched; without that
 * guard every screen would fire two identical queries on open.
 */
export function useRefreshOnFocus(refresh: () => void) {
  const skipFirstFocus = useRef(true);

  useFocusEffect(
    useCallback(() => {
      if (skipFirstFocus.current) {
        skipFirstFocus.current = false;
        return;
      }
      refresh();
    }, [refresh])
  );
}
