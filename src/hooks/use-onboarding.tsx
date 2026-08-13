import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren,
} from 'react';

import { logError } from '@/lib/errors';
import { onboardingSeenKey, slidesFor, type WalkthroughSlide } from '@/lib/onboarding';
import { useAuth } from '@/hooks/use-auth';

interface OnboardingState {
  /** True while the walkthrough should be on screen. */
  visible: boolean;
  /** Role-filtered; empty until a profile has loaded. */
  slides: WalkthroughSlide[];
  /** Finish or skip — marks it seen so it does not return on the next launch. */
  dismiss: () => void;
  /** Reopen it on demand from Profile. Does not clear the stored flag. */
  replay: () => void;
}

const OnboardingContext = createContext<OnboardingState | null>(null);

export function OnboardingProvider({ children }: PropsWithChildren) {
  const { appUser, loading } = useAuth();
  /*
    Holds the id of the user the walkthrough is open FOR, rather than a bare
    boolean. Signing out or switching accounts then closes it by making the id
    stop matching — no effect has to reach in and set it false, which would be a
    cascading render on every auth change.
  */
  const [showForUserId, setShowForUserId] = useState<string | null>(null);

  const userId = appUser?.id ?? null;
  const role = appUser?.role ?? null;
  const visible = !loading && userId !== null && showForUserId === userId;

  /*
    Gated on the profile rather than the session: the slide set depends on the
    role, and opening before `appUser` resolves would show a manager the owner's
    tour for a frame.
  */
  useEffect(() => {
    let cancelled = false;

    if (loading || !userId) return;

    AsyncStorage.getItem(onboardingSeenKey(userId))
      .then((seen) => {
        if (cancelled) return;
        if (seen === null) setShowForUserId(userId);
      })
      .catch((error) => {
        // Deliberately does NOT fall back to showing the tour. A device whose
        // storage cannot be read cannot be written either, so the "seen" flag
        // would never stick and the modal would greet the user on every single
        // launch — worse than never running it at all.
        logError('OnboardingProvider.readSeenFlag', error);
      });

    return () => {
      cancelled = true;
    };
  }, [loading, userId]);

  const dismiss = useCallback(() => {
    setShowForUserId(null);
    if (!userId) return;
    // Fire and forget: a failed write costs the user a repeated tour, and is not
    // worth holding the app closed behind a spinner for.
    AsyncStorage.setItem(onboardingSeenKey(userId), new Date().toISOString()).catch((error) =>
      logError('OnboardingProvider.writeSeenFlag', error)
    );
  }, [userId]);

  // Replaying leaves the stored flag alone — it has still been seen, and a user
  // who reopens it from Profile is not asking to be shown it again next launch.
  const replay = useCallback(() => setShowForUserId(userId), [userId]);

  const value = useMemo<OnboardingState>(
    () => ({
      visible,
      slides: role ? slidesFor(role) : [],
      dismiss,
      replay,
    }),
    [visible, role, dismiss, replay]
  );

  return <OnboardingContext.Provider value={value}>{children}</OnboardingContext.Provider>;
}

export function useOnboarding() {
  const ctx = useContext(OnboardingContext);
  if (!ctx) throw new Error('useOnboarding must be used within an OnboardingProvider');
  return ctx;
}
