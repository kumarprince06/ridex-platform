import { Ionicons } from '@expo/vector-icons';
import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { RootScreenProps } from '../navigation/types';
import { colors, radius, spacing, type } from '../theme';

type Props = RootScreenProps<'OfferLost'>;

const DWELL_MS = 2000;

/**
 * Dispatch is concurrency-safe by rule, so two drivers will race for one ride and one will lose.
 * Losing has to read as normal traffic, not as a failure - hence a two-second card and an
 * automatic return to the map, with no action to take.
 */
export function OfferLostScreen({ navigation }: Props) {
  useEffect(() => {
    const timer = setTimeout(() => navigation.goBack(), DWELL_MS);
    return () => clearTimeout(timer);
  }, [navigation]);

  return (
    <View style={styles.root}>
      <View style={styles.badge}>
        <Ionicons name="flash-off" size={30} color={colors.textMuted} />
      </View>

      <Text style={styles.title}>Offer gone</Text>
      <Text style={styles.subtitle}>Another driver took this one. Staying online for the next.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xxl,
  },
  badge: {
    width: 80,
    height: 80,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xl,
  },
  title: {
    ...type.title,
    color: colors.text,
  },
  subtitle: {
    ...type.subtitle,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
});
