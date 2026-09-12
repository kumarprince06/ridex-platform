import { IconName } from '../theme';

/**
 * How a ride type looks.
 *
 * <p>Only the glyph and the tint: the name, the seats and the fare all come from the server, and
 * an app that also decided those would drift from the pricing it is quoting. Icons are app assets,
 * so they live with the app.
 */
type Look = { icon: IconName; tone: string };

const LOOKS: Record<string, Look> = {
  GO: { icon: 'car', tone: '#E0785A' },
  COMFORT: { icon: 'car-sport', tone: '#5FB8D6' },
  XL: { icon: 'bus', tone: '#8FA0BF' },
  PREMIUM: { icon: 'car-sport', tone: '#E05A6F' },
  ELECTRIC: { icon: 'flash', tone: '#E0B252' },
};

const FALLBACK: Look = { icon: 'car', tone: '#5FB8D6' };

/** An unknown code still gets a car: a new ride type must not render as a blank tile. */
export function lookFor(rideTypeCode: string): Look {
  return LOOKS[rideTypeCode.toUpperCase()] ?? FALLBACK;
}
