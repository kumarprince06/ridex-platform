import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { RECENT_PLACES, SAVED_PLACES } from '../data/mock';
import { RootStackParamList } from '../navigation/types';
import { colors, IconName, radius, spacing, type } from '../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'SearchDestination'>;

export function SearchDestinationScreen({ navigation }: Props) {
  const [destination, setDestination] = useState('');

  const choose = (name: string) => navigation.navigate('RoutePreview', { destination: name });

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Pressable
          onPress={() => navigation.goBack()}
          accessibilityRole="button"
          accessibilityLabel="Go back"
          style={styles.backChip}
        >
          <Ionicons name="arrow-back" size={20} color={colors.text} />
        </Pressable>

        <View style={styles.fields}>
          <View style={styles.field}>
            <View style={styles.dotMint} />
            <Text style={styles.fieldValue}>Midtown, New York</Text>
          </View>

          <View style={[styles.field, styles.fieldActive]}>
            <View style={styles.dotAmber} />
            <TextInput
              value={destination}
              onChangeText={setDestination}
              placeholder="Where to?"
              placeholderTextColor={colors.textFaint}
              autoFocus
              onSubmitEditing={() => choose(destination.trim() || 'Grand Central Terminal')}
              returnKeyType="search"
              style={styles.input}
            />
          </View>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.list}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <SectionHeader title="SAVED PLACES" action="Manage" />
        {SAVED_PLACES.map((place) => (
          <PlaceRow key={place.name} {...place} onPress={() => choose(place.name)} />
        ))}

        <SectionHeader title="RECENT" action="See all" />
        {RECENT_PLACES.map((place) => (
          <PlaceRow key={place.name} {...place} chevron onPress={() => choose(place.name)} />
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

function SectionHeader({ title, action }: { title: string; action: string }) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <Text style={styles.sectionAction}>{action}</Text>
    </View>
  );
}

function PlaceRow({
  icon,
  tone,
  name,
  address,
  chevron = false,
  onPress,
}: {
  icon: IconName;
  tone: string;
  name: string;
  address: string;
  chevron?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => [styles.placeRow, pressed && styles.pressed]}
    >
      <View style={[styles.placeIcon, { backgroundColor: `${tone}2E` }]}>
        <Ionicons name={icon} size={17} color={tone} />
      </View>
      <View style={styles.flex}>
        <Text style={styles.placeName}>{name}</Text>
        <Text style={styles.placeAddress} numberOfLines={1}>
          {address}
        </Text>
      </View>
      {chevron ? <Ionicons name="chevron-forward" size={16} color={colors.textFaint} /> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  flex: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
  },
  backChip: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fields: {
    flex: 1,
    gap: spacing.sm,
  },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    height: 48,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  fieldActive: {
    borderColor: colors.primary,
  },
  dotMint: {
    width: 9,
    height: 9,
    borderRadius: radius.pill,
    backgroundColor: colors.primary,
  },
  dotAmber: {
    width: 9,
    height: 9,
    borderRadius: radius.pill,
    backgroundColor: colors.amber,
  },
  fieldValue: {
    ...type.body,
    color: colors.text,
  },
  input: {
    flex: 1,
    ...type.body,
    color: colors.text,
    paddingVertical: 0,
  },
  list: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.xl,
    marginBottom: spacing.sm,
  },
  sectionTitle: {
    ...type.eyebrow,
    color: colors.text,
  },
  sectionAction: {
    ...type.label,
    color: colors.primary,
  },
  placeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
  },
  pressed: {
    opacity: 0.6,
  },
  placeIcon: {
    width: 38,
    height: 38,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeName: {
    ...type.button,
    fontSize: 15,
    color: colors.text,
  },
  placeAddress: {
    ...type.caption,
    color: colors.textMuted,
    marginTop: 1,
  },
});
