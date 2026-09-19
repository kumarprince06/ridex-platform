import { bearing } from '../lib/routes';

// The driver's vehicle is rotated by this, so a sign or axis slip points every car backwards.
describe('bearing', () => {
  it('reads the four compass points', () => {
    expect(bearing([88.35, 22.5], [88.35, 22.6])).toBeCloseTo(0, 0);
    expect(bearing([88.35, 22.5], [88.45, 22.5])).toBeCloseTo(90, 0);
    expect(bearing([88.35, 22.6], [88.35, 22.5])).toBeCloseTo(180, 0);
    expect(bearing([88.45, 22.5], [88.35, 22.5])).toBeCloseTo(270, 0);
  });
});
