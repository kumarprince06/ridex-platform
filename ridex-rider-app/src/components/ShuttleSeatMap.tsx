import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { Seat } from '../api/shuttle';
import { colors, radius, spacing, type } from '../theme';

type Props = {
  seats: Seat[];
  seatsPerRow: number;
  aisleAfter: number;
  chosen: string | null;
  onChoose: (label: string) => void;
};

const SEAT = 48;
const GAP = 8;
const AISLE = 36;
const RAIL = 28;
const SLOT = SEAT + GAP;

/**
 * The cabin seen from above, front at the top. A sits by the right-hand window next to the driver
 * (right-hand drive), so each row is drawn mirrored: D C | B A.
 */
export function ShuttleSeatMap({ seats, seatsPerRow, aisleAfter, chosen, onChoose }: Props) {
  const rows: Seat[][] = [];
  for (let index = 0; index < seats.length; index += seatsPerRow) {
    rows.push(seats.slice(index, index + seatsPerRow));
  }
  const letters = rows[0]?.map((seat) => seat.label.replace(/^\d+/, '')) ?? [];

  return (
    <View style={styles.cabin}>
      <View style={styles.headerRow}>
        <View style={styles.header}>
          <Side items={letters} perRow={seatsPerRow} aisleAfter={aisleAfter} render={(letter) => <Text style={styles.letter}>{letter}</Text>} />
        </View>
        <View style={styles.railSpace} />
      </View>

      {/* The front: door on the left, the driver on the right. */}
      <View style={styles.front}>
        <View style={styles.door} />
        <View style={styles.driver}>
          <SeatShape>
            <MaterialCommunityIcons name="steering" size={22} color={colors.textMuted} />
          </SeatShape>
        </View>
        <View style={styles.railSpace} />
      </View>

      {rows.map((row, index) => (
        <View key={row[0].label} style={styles.row}>
          <Side
            items={row}
            perRow={seatsPerRow}
            aisleAfter={aisleAfter}
            render={(seat) => (
              <SeatButton seat={seat} chosen={seat.label === chosen} onPress={() => onChoose(seat.label)} />
            )}
          />
          {/* Row numbers run down the right wall as one strip. */}
          <View style={[styles.railCell, index === 0 && styles.railFirst, index === rows.length - 1 && styles.railLast]}>
            <Text style={styles.rowNumber}>{row[0].label.replace(/\D+$/, '')}</Text>
          </View>
        </View>
      ))}
    </View>
  );
}

/** One row, mirrored, with the gangway between the two sides. */
function Side<T>({ items, perRow, aisleAfter, render }: {
  items: T[];
  perRow: number;
  aisleAfter: number;
  render: (item: T) => React.ReactNode;
}) {
  const split = aisleAfter > 0 ? aisleAfter : perRow;
  const right = items.slice(0, split).reverse();
  const left = items.slice(split).reverse();
  // Fixed widths, so a short last row still lines up under the full ones.
  return (
    <>
      <View style={[styles.side, { width: (perRow - split) * SLOT }]}>{left.map((item, index) => <Slot key={index}>{render(item)}</Slot>)}</View>
      {aisleAfter > 0 ? <View style={styles.aisle} /> : null}
      <View style={[styles.side, styles.rightSide, { width: split * SLOT }]}>{right.map((item, index) => <Slot key={index}>{render(item)}</Slot>)}</View>
    </>
  );
}

function Slot({ children }: { children: React.ReactNode }) {
  return <View style={styles.slot}>{children}</View>;
}

function SeatButton({ seat, chosen, onPress }: { seat: Seat; chosen: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      disabled={!seat.available}
      accessibilityRole="button"
      accessibilityLabel={`Seat ${seat.label}, ${seat.available ? 'free' : 'taken'}`}
      accessibilityState={{ selected: chosen, disabled: !seat.available }}
      hitSlop={4}
    >
      <SeatShape state={chosen ? 'chosen' : seat.available ? 'free' : 'taken'}>
        {chosen ? (
          <Text style={styles.chosenLabel}>{seat.label}</Text>
        ) : !seat.available ? (
          <Ionicons name="close" size={28} color={colors.textFaint} />
        ) : null}
      </SeatShape>
    </Pressable>
  );
}

/** A chair from above: the backrest, and the cushion's front edge under it. */
export function SeatShape({ state = 'free', children }: { state?: 'free' | 'taken' | 'chosen'; children?: React.ReactNode }) {
  return (
    <View style={[styles.seat, state === 'taken' && styles.taken]}>
      <View style={[styles.back, state === 'chosen' && styles.backChosen]}>{children}</View>
      <View style={[styles.cushion, state === 'chosen' && styles.cushionChosen]} />
    </View>
  );
}

const styles = StyleSheet.create({
  cabin: {
    alignSelf: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.lg * 2,
    paddingVertical: spacing.md,
    paddingLeft: spacing.md,
    overflow: 'hidden',
  },
  headerRow: {
    flexDirection: 'row',
  },
  railSpace: {
    width: RAIL,
  },
  header: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.md,
    paddingVertical: 6,
  },
  letter: {
    ...type.caption,
    fontSize: 11,
    color: colors.textMuted,
    textAlign: 'center',
  },
  front: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    height: SEAT + spacing.lg,
    marginBottom: spacing.sm,
  },
  // A gap in the left wall where the door is.
  door: {
    width: 14,
    height: SEAT + spacing.md,
    marginLeft: -spacing.md,
    backgroundColor: colors.bg,
    borderTopRightRadius: radius.sm,
    borderBottomRightRadius: radius.sm,
  },
  driver: {
    flexGrow: 1,
    alignItems: 'flex-end',
    paddingRight: GAP / 2,
  },
  row: {
    flexDirection: 'row',
    height: SEAT + GAP,
    alignItems: 'center',
  },
  side: {
    flexDirection: 'row',
  },
  rightSide: {
    justifyContent: 'flex-end',
  },
  aisle: {
    width: AISLE,
  },
  slot: {
    width: SLOT,
    alignItems: 'center',
  },
  seat: {
    width: SEAT,
    alignItems: 'center',
  },
  taken: {
    opacity: 0.35,
  },
  back: {
    width: SEAT - 8,
    height: SEAT - 12,
    borderWidth: 2,
    borderColor: colors.textMuted,
    borderTopLeftRadius: 10,
    borderTopRightRadius: 10,
    borderBottomLeftRadius: 4,
    borderBottomRightRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backChosen: {
    borderColor: colors.amber,
    backgroundColor: colors.amberSurface,
  },
  cushion: {
    width: SEAT,
    height: 12,
    marginTop: -4,
    borderWidth: 2,
    borderColor: colors.textMuted,
    borderRadius: 6,
    backgroundColor: colors.surface,
  },
  cushionChosen: {
    borderColor: colors.amber,
    backgroundColor: colors.amber,
  },
  chosenLabel: {
    ...type.button,
    fontSize: 13,
    color: colors.text,
  },
  railCell: {
    width: RAIL,
    alignSelf: 'stretch',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceAlt,
  },
  railFirst: {
    borderTopLeftRadius: radius.md,
  },
  railLast: {
    borderBottomLeftRadius: radius.md,
  },
  rowNumber: {
    ...type.caption,
    fontSize: 11,
    color: colors.textMuted,
  },
});
