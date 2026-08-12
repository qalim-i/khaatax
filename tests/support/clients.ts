/**
 * Signed-in Supabase clients for the RLS suites, plus the guard that keeps those
 * suites off the project the app is pointed at.
 *
 * Why the guard exists: these tests write. They insert probe rows into
 * `employees` — the payroll table — and delete them again in `finally`. Before
 * this, the suite reused `EXPO_PUBLIC_SUPABASE_URL`, the same variable the app
 * reads, so "point these at the DEVELOPMENT project, never Production" was an
 * instruction in a comment with nothing enforcing it. A `.env` pointed at
 * production for a release build, plus one `npm run test:rls`, was all it took to
 * write probe rows into live payroll data — and a crash between the insert and
 * the cleanup would leave them there.
 *
 * So the target is now named separately and checked. Sharing one project is still
 * possible for a solo developer who genuinely has only a dev project, but it has
 * to be stated out loud via KHAATAX_TEST_ALLOW_SHARED_PROJECT.
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js';

function requireEnv(name: string, value: string | undefined): string {
  if (!value) {
    throw new Error(
      `${name} is not set. The RLS tests cannot run without real credentials — ` +
        'see the KHAATAX_TEST_* keys in .env.example.'
    );
  }
  return value;
}

/**
 * Same Supabase project, written two ways. A guard that compares raw strings is
 * defeated by a trailing slash or a capitalised host — and it fails *open*,
 * silently allowing the write-heavy suite to run against the app's own project,
 * which is the one outcome it exists to prevent.
 */
function sameProject(a: string, b: string): boolean {
  const canonical = (raw: string): string => {
    try {
      const url = new URL(raw);
      // Host is case-insensitive per RFC 3986; path is not, but Supabase project
      // URLs carry no path, so an empty-vs-"/" difference is not a real one.
      return `${url.protocol}//${url.host.toLowerCase()}${url.pathname.replace(/\/+$/, '')}`;
    } catch {
      // Not parseable as a URL — fall back to a trimmed, case-folded compare
      // rather than declaring two unknown strings different.
      return raw.trim().toLowerCase().replace(/\/+$/, '');
    }
  };

  return canonical(a) === canonical(b);
}

/** The project the tests write to — deliberately not the one the app reads. */
export function testProjectUrl(): string {
  const testUrl = requireEnv(
    'KHAATAX_TEST_SUPABASE_URL',
    process.env.KHAATAX_TEST_SUPABASE_URL
  );
  const appUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;

  if (
    appUrl &&
    sameProject(testUrl, appUrl) &&
    process.env.KHAATAX_TEST_ALLOW_SHARED_PROJECT !== 'true'
  ) {
    throw new Error(
      'KHAATAX_TEST_SUPABASE_URL is the same project as EXPO_PUBLIC_SUPABASE_URL.\n' +
        'These tests INSERT and DELETE rows in `employees`, so running them here writes to\n' +
        'the project the app itself uses. Point them at a separate development project, or\n' +
        'set KHAATAX_TEST_ALLOW_SHARED_PROJECT=true in .env to accept that risk knowingly.'
    );
  }

  return testUrl;
}

function testAnonKey(): string {
  // Falls back to the app's anon key: the anon key is public by design and
  // carries no privilege of its own, so reusing it is not the risk. The project
  // URL is.
  return requireEnv(
    'KHAATAX_TEST_SUPABASE_ANON_KEY',
    process.env.KHAATAX_TEST_SUPABASE_ANON_KEY ?? process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY
  );
}

export async function signIn(email: string, password: string): Promise<SupabaseClient> {
  const client = createClient(testProjectUrl(), testAnonKey(), {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { error } = await client.auth.signInWithPassword({ email, password });
  if (error) throw new Error(`Could not sign in as ${email}: ${error.message}`);
  return client;
}

export function signInAsOwner(): Promise<SupabaseClient> {
  return signIn(
    requireEnv('KHAATAX_TEST_OWNER_EMAIL', process.env.KHAATAX_TEST_OWNER_EMAIL),
    requireEnv('KHAATAX_TEST_OWNER_PASSWORD', process.env.KHAATAX_TEST_OWNER_PASSWORD)
  );
}

export function signInAsManager(): Promise<SupabaseClient> {
  return signIn(
    requireEnv('KHAATAX_TEST_MANAGER_EMAIL', process.env.KHAATAX_TEST_MANAGER_EMAIL),
    requireEnv('KHAATAX_TEST_MANAGER_PASSWORD', process.env.KHAATAX_TEST_MANAGER_PASSWORD)
  );
}

/**
 * `scope: 'local'` matters. signOut() defaults to global scope, which revokes
 * every session for that user — including the developer's own session in the
 * running app, which then can't refresh and has to sign in again. Local scope
 * tears down only the session the test created.
 */
export async function signOutAll(...clients: (SupabaseClient | undefined)[]): Promise<void> {
  for (const client of clients) await client?.auth.signOut({ scope: 'local' });
}
