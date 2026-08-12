/**
 * Loads `.env` into `process.env` for the RLS suite.
 *
 * Expo loads `.env` itself when the dev server boots, but Jest does not, so the
 * Supabase URL/key would be undefined without this. Parsed by hand rather than
 * pulling in a dotenv dependency for six lines of work. Values already present
 * in the environment win, so CI secrets override the local file.
 */

import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const envPath = join(__dirname, '..', '.env');

if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    const separator = trimmed.indexOf('=');
    if (separator === -1) continue;

    const key = trimmed.slice(0, separator).trim();
    const value = trimmed.slice(separator + 1).trim().replace(/^["']|["']$/g, '');

    if (!(key in process.env)) process.env[key] = value;
  }
}
