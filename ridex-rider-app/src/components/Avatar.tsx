import { StyleSheet, Text, View, ViewStyle } from 'react-native';

import { colors, radius, type } from '../theme';

type Props = {
  name: string;
  size?: number;
  /** Mint fill instead of slate, used for the signed-in user on Profile. */
  brand?: boolean;
  style?: ViewStyle;
};

/**
 * Initials rather than a photograph. The mockups show real faces, but shipping stock portraits of
 * people in a repo is a licensing problem, and there is no upload flow to produce real ones yet.
 */
export function Avatar({ name, size = 48, brand = false, style }: Props) {
  return (
    <View
      style={[
        styles.avatar,
        { width: size, height: size },
        brand ? styles.brand : styles.neutral,
        style,
      ]}
    >
      <Text style={[styles.initials, { fontSize: size * 0.36 }]}>{initialsOf(name)}</Text>
    </View>
  );
}

/** "Marcus Rivera" -> "MR". Falls back to a single glyph so the circle is never empty. */
export function initialsOf(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) {
    return '?';
  }
  return parts
    .slice(0, 2)
    .map((part) => part[0]!.toUpperCase())
    .join('');
}

const styles = StyleSheet.create({
  avatar: {
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  neutral: {
    backgroundColor: '#2A3350',
  },
  brand: {
    backgroundColor: '#25406B',
  },
  initials: {
    fontFamily: type.button.fontFamily,
    color: colors.text,
  },
});
