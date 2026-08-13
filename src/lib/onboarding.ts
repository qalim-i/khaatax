/**
 * Content and key logic for the first-run walkthrough.
 *
 * Kept free of React and of AsyncStorage so it stays unit-testable: the storage
 * read/write lives in `use-onboarding`, the rendering in `walkthrough-modal`.
 *
 * The slide list is deliberately short. Two of the slides exist because the
 * underlying concepts are genuinely easy to misread, not because the screen is
 * hard to find: a party carries a cylinder COUNT and a rupee figure that are not
 * the same number, and a negative amount due means the party has paid ahead.
 */

import type { IconName } from '@/components/ui/icon';
import type { UserRole } from '@/types/db';

export interface WalkthroughSlide {
  key: string;
  icon: IconName;
  title: string;
  body: string;
}

/**
 * Bumping the version segment replays the walkthrough for everyone, which is the
 * point: a stored `true` under an unversioned key would silently hide a rewritten
 * tour from every existing user.
 */
const KEY_VERSION = 'v1';

export function onboardingSeenKey(userId: string): string {
  return `khaatax.onboarding.${KEY_VERSION}.${userId}`;
}

/**
 * Every slide, in order. `ownerOnly` mirrors what the database already enforces —
 * showing a manager a Payroll slide would advertise a screen they cannot open and
 * a table that returns them zero rows.
 */
const SLIDES: (WalkthroughSlide & { ownerOnly?: boolean })[] = [
  {
    key: 'welcome',
    icon: 'home',
    title: 'Welcome to KhaataX',
    body: 'Cylinders, parties, payments and expenses in one place — everything the register used to hold, kept up to date as you work.',
  },
  {
    key: 'home',
    icon: 'bolt',
    title: 'Start from Home',
    body: "Home shows where the business stands today. The quick actions put a new transaction or an expense two taps away, from whichever tab you're on.",
  },
  {
    key: 'cylinders',
    icon: 'tank',
    title: 'Record every movement',
    body: 'Log filled cylinders going out and empties coming back. Invoice and DC numbers are issued for you — never type one in yourself.',
  },
  {
    key: 'parties',
    icon: 'people',
    title: 'Two figures per party',
    body: 'A party has cylinders held and rupees due, and they are separate numbers. A party can be square on money and still be holding twenty cylinders.',
  },
  {
    key: 'payments',
    icon: 'wallet',
    title: 'Money received',
    body: 'Record a payment against the party and the amount due drops straight away. A party shown as in credit has paid ahead — there is nothing to collect from them.',
  },
  {
    key: 'expenses',
    icon: 'card',
    title: 'Log expenses as they happen',
    body: 'Amount, category, a note if it helps. Expenses are saved directly — there is no approval step to wait on.',
  },
  {
    key: 'payroll',
    icon: 'people-group',
    title: 'Payroll',
    body: 'Keep the employee list and monthly pay up to date; the total wage cost follows from it. Only you can see this.',
    ownerOnly: true,
  },
  {
    key: 'share',
    icon: 'export',
    title: 'Share a document',
    body: 'Open a transaction to export its Invoice or Delivery Challan as a PDF and send it on WhatsApp.',
  },
];

export function slidesFor(role: UserRole): WalkthroughSlide[] {
  return SLIDES.filter((slide) => role === 'owner' || !slide.ownerOnly).map(
    ({ ownerOnly: _ownerOnly, ...slide }) => slide
  );
}
