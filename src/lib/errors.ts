/**
 * Turns a Supabase/PostgREST failure into something safe to put on screen.
 *
 * Raw PostgREST messages carry constraint names, column names, policy names and
 * `hint` text. Rendering them verbatim (which every hook used to do) hands anyone
 * looking at the screen a free map of the schema, and tells a user who typed a
 * duplicate party name that they violated `parties_pkey` — which is neither
 * actionable nor meaningful to them.
 *
 * Two deliberate exceptions pass through unchanged:
 *
 *   * `KX001` — a message one of our own RPCs explicitly marked as user-facing.
 *     Those ("Only 3 filled cylinder(s) in stock, cannot send 5") are written for
 *     the user, and rewriting them here would throw away the only thing that says
 *     what actually went wrong.
 *   * Anything we constructed ourselves and passed in as a plain string.
 *
 * Everything else collapses to a category message. The original is still
 * available to the developer through `logError`.
 */

export interface SupabaseLikeError {
  code?: string | null;
  message?: string | null;
  details?: string | null;
  hint?: string | null;
}

/** PostgreSQL error codes we can say something specific and honest about. */
const CODE_MESSAGES: Record<string, string> = {
  // Raised by our own RPCs via `raise exception ... using errcode = '42501'`,
  // and by RLS on a blocked write.
  '42501': "You don't have permission to do that.",
  '23505': 'That record already exists.',
  '23503': 'That refers to something that no longer exists. Refresh and try again.',
  '23514': 'One of those values is out of the allowed range.',
  '23502': 'Something required is missing.',
  '22P02': "That value isn't in a format the app understands.",
  // PostgREST: no rows returned where exactly one was expected.
  PGRST116: 'That record could not be found.',
};

/**
 * SQLSTATE our own RPCs stamp on messages that were written for the end user.
 *
 * Deliberately NOT `P0001`: that is merely the default for any bare
 * `raise exception` anywhere in the database — a trigger, an extension, a
 * function added later — so keying on it would pass arbitrary internal text
 * straight to the screen, which is the leak this module exists to stop. Only
 * `raise ... using errcode = 'KX001'` opts a message in. See migration 0008.
 */
const RPC_USER_MESSAGE_CODE = 'KX001';

const SESSION_CODES = new Set(['PGRST301', '401']);

/**
 * True when a failure means "your token isn't valid", as opposed to a policy
 * denial or a missing row.
 *
 * Exported because `AuthProvider` acts on this, not just reports it: a true
 * here drops the user to the sign-in screen. That makes the negative case
 * load-bearing — RLS denials come back as empty result sets or `42501`, never
 * as 401/PGRST301, and this must not fire on them, or a manager touching a
 * table they cannot read would be signed out.
 *
 * The word boundaries are deliberate: an unanchored /token/ matches
 * "tokenizer", which is not a session problem.
 */
export function looksLikeSessionFailure(error: SupabaseLikeError): boolean {
  return (
    SESSION_CODES.has(error.code ?? '') ||
    /\bjwt\b|\btoken\b/i.test(error.message ?? '')
  );
}

function looksLikeNetworkFailure(error: SupabaseLikeError): boolean {
  return /network request failed|fetch failed|timeout|ECONNREFUSED/i.test(
    error.message ?? ''
  );
}

/**
 * `fallback` should describe the action that failed ("Could not save the
 * transaction."), not the cause — the cause is exactly what we are declining to
 * disclose.
 */
export function toUserMessage(
  error: unknown,
  fallback = 'Something went wrong. Please try again.'
): string {
  if (!error) return fallback;
  if (typeof error === 'string') return error;

  // `catch` binds `unknown`, and `throw 42` is legal. Reading properties off a
  // primitive with `in` throws, which would turn a stray rejection into a crash
  // inside the very handler meant to contain it.
  if (typeof error !== 'object') return fallback;

  const { code: rawCode, message: rawMessage } = error as SupabaseLikeError;
  const code = typeof rawCode === 'string' ? rawCode : '';
  const message = typeof rawMessage === 'string' ? rawMessage : '';

  // Deliberate, human-readable messages raised by our own RPCs.
  if (code === RPC_USER_MESSAGE_CODE && message) return message;

  if (looksLikeSessionFailure({ code, message })) {
    return 'Your session has expired. Sign in again.';
  }

  if (looksLikeNetworkFailure({ code, message })) {
    return "Can't reach the server. Check your connection and try again.";
  }

  return CODE_MESSAGES[code] ?? fallback;
}

/**
 * Developer-facing detail, dev builds only. Shipping this to the device log (and
 * from there to any attached crash reporter) is how schema detail leaks off the
 * device, so it is compiled out of release builds.
 */
export function logError(context: string, error: unknown): void {
  if (__DEV__) console.error(`[${context}]`, error);
}
