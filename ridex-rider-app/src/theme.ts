import type { Ionicons } from '@expo/vector-icons';

/**
 * Design tokens read off the RideX rider mockups. Every colour, radius and type size in the app
 * comes from here - a screen that hardcodes a hex is a screen that drifts from the design.
 */

/**
 * Icons are Ionicons throughout, never emoji: emoji render in the OS emoji font, so they ignore
 * any colour you set and look different on every device. Typed against the glyph map so a
 * misspelled name fails the build rather than rendering a blank square.
 */
export type IconName = keyof typeof Ionicons.glyphMap;

export const colors = {
  /** Screen background - near-black with a blue cast, not pure #000. */
  bg: '#0B0F1A',
  /** Inputs and cards, one step up from the background. */
  surface: '#121A2B',
  /** Secondary buttons and chips, one step up again. */
  surfaceAlt: '#1A2238',
  border: '#1F2A42',
  /** Focused input border and the brand mint. */
  primary: '#2EE7C7',
  /** Text sitting on a primary-filled button. Dark, never white - the mint is too bright. */
  onPrimary: '#04241E',
  /** Primary at rest on a disabled/secondary action. */
  primaryMuted: '#158C77',
  text: '#FFFFFF',
  textMuted: '#8B95AC',
  textFaint: '#5A6478',
  danger: '#FF5C7A',
  /** Password-reset badges, which the mockups tint warm to set them apart from the mint flow. */
  amber: '#D9A05B',
  amberSurface: '#2B2118',
  /** Dark wash behind the verify badge and the map pin label. */
  primarySurface: '#0F3B33',
  overlay: 'rgba(7, 11, 20, 0.72)',
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

export const radius = {
  sm: 10,
  md: 14,
  /** Inputs and buttons - the mockups use a generously rounded rectangle throughout. */
  lg: 18,
  pill: 999,
} as const;

/**
 * Outfit matches the geometric, slightly rounded display face in the mockups. Loaded in App.tsx;
 * if loading fails the app falls back to the system font rather than blocking on it.
 */
export const fonts = {
  display: 'Outfit_700Bold',
  semibold: 'Outfit_600SemiBold',
  medium: 'Outfit_500Medium',
  regular: 'Outfit_400Regular',
} as const;

export const type = {
  hero: { fontFamily: fonts.display, fontSize: 38, lineHeight: 44 },
  title: { fontFamily: fonts.display, fontSize: 30, lineHeight: 36 },
  subtitle: { fontFamily: fonts.regular, fontSize: 15, lineHeight: 22 },
  label: { fontFamily: fonts.medium, fontSize: 13, lineHeight: 18 },
  body: { fontFamily: fonts.regular, fontSize: 15, lineHeight: 21 },
  button: { fontFamily: fonts.semibold, fontSize: 16, lineHeight: 20 },
  /** The teal eyebrow above the hero headline. */
  eyebrow: { fontFamily: fonts.semibold, fontSize: 12, lineHeight: 16, letterSpacing: 1.4 },
  caption: { fontFamily: fonts.regular, fontSize: 12, lineHeight: 16 },
} as const;
