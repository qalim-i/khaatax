import { onboardingSeenKey, slidesFor } from '@/lib/onboarding';

describe('slidesFor', () => {
  it('keeps payroll out of the manager tour', () => {
    // Not a security control — RLS is. But pitching a screen that returns the
    // manager zero rows teaches them the app is broken.
    const keys = slidesFor('manager').map((slide) => slide.key);

    expect(keys).not.toContain('payroll');
  });

  it('shows payroll to the owner', () => {
    const keys = slidesFor('owner').map((slide) => slide.key);

    expect(keys).toContain('payroll');
  });

  it('differs by exactly the payroll slide', () => {
    expect(slidesFor('owner')).toHaveLength(slidesFor('manager').length + 1);
  });

  it('gives every slide a unique key and something to read', () => {
    for (const role of ['owner', 'manager'] as const) {
      const slides = slidesFor(role);

      expect(slides.length).toBeGreaterThan(0);
      expect(new Set(slides.map((slide) => slide.key)).size).toBe(slides.length);

      for (const slide of slides) {
        expect(slide.title.trim()).not.toBe('');
        expect(slide.body.trim()).not.toBe('');
      }
    }
  });

  it('does not leak the ownerOnly flag into the rendered slide', () => {
    for (const slide of slidesFor('owner')) {
      expect(slide).not.toHaveProperty('ownerOnly');
    }
  });
});

describe('onboardingSeenKey', () => {
  it('scopes the flag to the user', () => {
    // A shared handset is the case this exists for: the second account to sign in
    // should still get the tour.
    expect(onboardingSeenKey('user-a')).not.toBe(onboardingSeenKey('user-b'));
    expect(onboardingSeenKey('user-a')).toContain('user-a');
  });

  it('is stable across calls', () => {
    expect(onboardingSeenKey('user-a')).toBe(onboardingSeenKey('user-a'));
  });

  it('carries a version segment so the tour can be replayed after a rewrite', () => {
    expect(onboardingSeenKey('user-a')).toMatch(/\.v\d+\./);
  });
});
