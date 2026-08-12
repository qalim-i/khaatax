import type { Session } from '@supabase/supabase-js';
import { createContext, useContext, useEffect, useMemo, useState, type PropsWithChildren } from 'react';

import { supabase } from '@/lib/supabase';
import type { AppUser } from '@/types/db';

interface AuthState {
  session: Session | null;
  appUser: AppUser | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

/**
 * True when a PostgREST error means "your token isn't valid", as opposed to a
 * policy denial or a missing row. RLS denials come back as empty result sets or
 * `42501`, never as 401/PGRST301 — so this must not fire on those, or a manager
 * hitting a table they can't read would get logged out.
 */
function isAuthError(error: { code?: string; message?: string }): boolean {
  return (
    error.code === 'PGRST301' ||
    error.code === '401' ||
    /jwt|token/i.test(error.message ?? '')
  );
}

export function AuthProvider({ children }: PropsWithChildren) {
  const [session, setSession] = useState<Session | null>(null);
  const [appUser, setAppUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
    });

    return () => subscription.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    let cancelled = false;

    if (!session) {
      setAppUser(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    supabase
      .from('users')
      .select('*')
      .eq('id', session.user.id)
      .single()
      .then(async ({ data, error }) => {
        if (cancelled) return;
        if (error) {
          console.error('Failed to load app user profile', error);
          setAppUser(null);

          // A stored session whose token the server no longer accepts (revoked,
          // or signed out elsewhere) still deserialises fine, so without this the
          // app renders the full dashboard against a dead token: every query 401s
          // and every figure shows 0, which reads as "no data yet" rather than
          // "signed out". Drop to the sign-in screen instead.
          if (isAuthError(error)) {
            await supabase.auth.signOut({ scope: 'local' });
            setSession(null);
          }
        } else {
          setAppUser(data as AppUser);
        }
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [session]);

  const value = useMemo<AuthState>(
    () => ({
      session,
      appUser,
      loading,
      signOut: async () => {
        await supabase.auth.signOut();
      },
    }),
    [session, appUser, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
