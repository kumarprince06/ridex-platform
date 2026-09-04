import logoMark from '../assets/logo-mark.png';

/**
 * The RideX mark, the same asset the rider and partner apps ship.
 *
 * The R is white, so on any light surface it needs the dark plate the apps put behind it - without
 * one, half the logo vanishes into the card.
 */
export function LogoMark({ size = 32, plate = false }: { size?: number; plate?: boolean }) {
  const image = (
    <img
      src={logoMark}
      alt=""
      width={plate ? Math.round(size * 0.62) : size}
      height={plate ? Math.round(size * 0.62) : size}
      style={{ objectFit: 'contain', display: 'block' }}
    />
  );

  if (!plate) {
    return image;
  }

  return (
    <span className="logo-plate" style={{ width: size, height: size }}>
      {image}
    </span>
  );
}

/** Mark plus wordmark, for the sidebar and the sign-in card. */
export function Logo({
  size = 32,
  subtitle,
  plate = false,
}: {
  size?: number;
  subtitle?: string;
  plate?: boolean;
}) {
  return (
    <span className="logo">
      <LogoMark size={size} plate={plate} />
      <span className="logo-text">
        <span className="logo-name">RideX</span>
        {subtitle ? <span className="logo-sub">{subtitle}</span> : null}
      </span>
    </span>
  );
}
