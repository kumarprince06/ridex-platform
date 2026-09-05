import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { StyleSheet, Text, View } from 'react-native';

import { Screen } from '../components/Screen';
import { RootStackParamList } from '../navigation/types';
import { colors, radius, spacing, type } from '../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'SavedPlaces'>;

/**
 * Empty until there is somewhere to save places to.
 *
 * The screen used to list three invented addresses behind an Add button that did nothing, which
 * reads as a feature that is broken rather than one that has not been built. Saving a place needs
 * an endpoint to save it to, and the backend has none yet.
 */
export function SavedPlacesScreen({ navigation }: Props) {
  return (
    <Screen onBack={() => navigation.goBack()} title="Saved Places">
      <View style={styles.empty}>
        <View style={styles.icon}>
          <Ionicons name="bookmark-outline" size={22} color={colors.textMuted} />
        </View>
        <Text style={styles.title}>No saved places yet</Text>
        <Text style={styles.note}>
          Home, work and favourites will live here. Until then, your recent destinations are on the
          search screen.
        </Text>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  empty: {
    alignItems: 'center',
    paddingTop: spacing.xxl,
    paddingHorizontal: spacing.lg,
  },
  icon: {
    width: 56,
    height: 56,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  title: {
    ...type.button,
    fontSize: 16,
    color: colors.text,
  },
  note: {
    ...type.caption,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
});
