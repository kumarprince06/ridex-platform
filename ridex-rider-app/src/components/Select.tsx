import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { colors, radius, spacing, type } from '../theme';

export type Option = { id: string; label: string; note?: string };

type Props = {
  label: string;
  placeholder?: string;
  options: Option[];
  selectedId: string | null;
  onSelect: (id: string) => void;
};

/**
 * A one-line field that opens the list in a sheet.
 *
 * <p>Chips are right for a handful of choices. Sixteen stops as chips is a wall the rider has to
 * read end to end before finding theirs, and it pushed the departures off the screen entirely.
 */
export function Select({ label, placeholder = 'Choose', options, selectedId, onSelect }: Props) {
  const [open, setOpen] = useState(false);
  const selected = options.find((option) => option.id === selectedId);

  return (
    <>
      <Text style={styles.label}>{label}</Text>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${selected?.label ?? placeholder}`}
        onPress={() => setOpen(true)}
        style={({ pressed }) => [styles.field, pressed && styles.pressed]}
      >
        <Text style={[styles.value, !selected && styles.placeholder]} numberOfLines={1}>
          {selected?.label ?? placeholder}
        </Text>
        {selected?.note ? <Text style={styles.note}>{selected.note}</Text> : null}
        <Ionicons name="chevron-down" size={16} color={colors.textMuted} />
      </Pressable>

      <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}>
        {/* Tapping the dimmed area closes it - the gesture everyone tries first. */}
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)} />

        <View style={styles.sheet}>
          <View style={styles.grabber} />
          <Text style={styles.sheetTitle}>{label}</Text>

          <ScrollView showsVerticalScrollIndicator={false}>
            {options.map((option) => {
              const isSelected = option.id === selectedId;
              return (
                <Pressable
                  key={option.id}
                  accessibilityRole="button"
                  onPress={() => {
                    onSelect(option.id);
                    setOpen(false);
                  }}
                  style={({ pressed }) => [styles.option, pressed && styles.pressed]}
                >
                  <Text style={[styles.optionText, isSelected && styles.optionSelected]}>
                    {option.label}
                  </Text>
                  {option.note ? <Text style={styles.note}>{option.note}</Text> : null}
                  {isSelected ? (
                    <Ionicons name="checkmark" size={18} color={colors.primary} />
                  ) : null}
                </Pressable>
              );
            })}
          </ScrollView>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  label: {
    ...type.eyebrow,
    color: colors.textMuted,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  value: {
    ...type.button,
    flex: 1,
    fontSize: 15,
    color: colors.text,
  },
  placeholder: { color: colors.textMuted },
  note: {
    ...type.caption,
    color: colors.textMuted,
  },
  pressed: { opacity: 0.75 },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.overlay,
  },
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    // Never the full height: the sheet has to read as sitting over the screen behind it.
    maxHeight: '75%',
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xl,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderColor: colors.border,
  },
  grabber: {
    alignSelf: 'center',
    width: 44,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
    marginTop: spacing.md,
    marginBottom: spacing.md,
  },
  sheetTitle: {
    ...type.eyebrow,
    color: colors.textMuted,
    marginBottom: spacing.sm,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  optionText: {
    ...type.body,
    flex: 1,
    color: colors.text,
  },
  optionSelected: { color: colors.primary },
});
