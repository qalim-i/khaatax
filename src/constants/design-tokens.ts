/**
 * Design tokens extracted from the KhaataX Figma file (IBM Carbon-derived palette,
 * IBM Plex Sans typography). The source frames are light-mode only, so these
 * business screens (Home/Cylinders) render in light mode regardless of system
 * theme, unlike the generic template screens which use `useTheme`/ThemedView.
 */

export const colors = {
  background: '#F4F4F4',
  surface: '#FFFFFF',
  border: '#E0E0E0',
  textPrimary: '#161616',
  textSecondary: '#525252',
  primary: '#0F62FE',
  /*
    The wordmark green, used for the app title in the top bar and on sign-in so the
    header ties back to the icon and the opening splash.

    It is NOT one of the logo's own greens: those top out at 2.86:1 against the white
    app bar, which fails WCAG AA. This is the same hue (152deg) walked down to 24%
    lightness — 5.44:1 on `surface`, 4.95:1 on `background`, so it clears AA on both,
    about where the blue `primary` already sat (5.00:1).
  */
  brand: '#007A41',
  /* The icon and splash backdrop. Not a text colour — see `brand` for that. */
  brandDeep: '#082722',
  success: '#198038',
  danger: '#DA1E28',
  warning: '#F1C21B',
  white: '#FFFFFF',
} as const;

export const spacing = {
  xxs: 4,
  xs: 8,
  sm: 12,
  md: 16,
  lg: 24,
  xl: 32,
} as const;

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
} as const;

export const typography = {
  caption: { fontSize: 12, lineHeight: 16, letterSpacing: 0.6 },
  body: { fontSize: 14, lineHeight: 20 },
  bodyLarge: { fontSize: 16, lineHeight: 24 },
  h3: { fontSize: 16, lineHeight: 24 },
  h2: { fontSize: 24, lineHeight: 32 },
  h1: { fontSize: 20, lineHeight: 28 },
  statValue: { fontSize: 24, lineHeight: 32 },
  statValueLarge: { fontSize: 30, lineHeight: 36 },
} as const;

export const cardShadow = {
  shadowColor: '#000000',
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.1,
  shadowRadius: 3,
  elevation: 2,
} as const;
