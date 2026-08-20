import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Screen } from '../components/Screen';
import { FAQS } from '../data/mock';
import { RootStackParamList } from '../navigation/types';
import { colors, IconName, radius, spacing, type } from '../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'HelpSupport'>;

const CHANNELS: { icon: IconName; tone: string; title: string; detail: string; ok?: boolean }[] = [
  { icon: 'chatbubbles', tone: '#5FB8D6', title: 'Live Chat', detail: 'Available now', ok: true },
  { icon: 'mail', tone: '#E0B252', title: 'Email Us', detail: 'Reply in 24h' },
  { icon: 'call', tone: '#5FD68A', title: 'Call Support', detail: '24/7 helpline', ok: true },
  { icon: 'logo-twitter', tone: '#5FB8D6', title: '@RideXSupport', detail: 'Twitter/X' },
];

export function HelpSupportScreen({ navigation }: Props) {
  const [openFaq, setOpenFaq] = useState<string | null>(null);

  return (
    <Screen onBack={() => navigation.goBack()} title="Help & Support">
      <View style={styles.grid}>
        {CHANNELS.map((channel) => (
          <Pressable
            key={channel.title}
            accessibilityRole="button"
            style={({ pressed }) => [styles.channel, pressed && styles.pressed]}
          >
            <Ionicons name={channel.icon} size={22} color={channel.tone} />
            <Text style={styles.channelTitle}>{channel.title}</Text>
            <Text style={[styles.channelDetail, channel.ok && styles.channelOk]}>
              {channel.detail}
            </Text>
          </Pressable>
        ))}
      </View>

      <Text style={styles.sectionLabel}>FREQUENTLY ASKED</Text>

      {FAQS.map((question) => {
        const open = openFaq === question;

        return (
          <Pressable
            key={question}
            onPress={() => setOpenFaq(open ? null : question)}
            accessibilityRole="button"
            accessibilityState={{ expanded: open }}
            style={styles.faq}
          >
            <View style={styles.faqRow}>
              <Text style={styles.faqQuestion}>{question}</Text>
              <Ionicons
                name={open ? 'chevron-up' : 'chevron-down'}
                size={17}
                color={colors.textMuted}
              />
            </View>

            {open ? (
              <Text style={styles.faqAnswer}>
                Answer copy lands here once support content is written. The accordion behaviour is
                real; only the text is a placeholder.
              </Text>
            ) : null}
          </Pressable>
        );
      })}
    </Screen>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  channel: {
    // Two per row: half the width, minus half of the single 12pt gutter between them.
    width: '48.4%',
    gap: spacing.sm,
    padding: spacing.lg,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  pressed: {
    opacity: 0.75,
  },
  channelTitle: {
    ...type.button,
    fontSize: 15,
    color: colors.text,
  },
  channelDetail: {
    ...type.caption,
    fontSize: 11,
    color: colors.amber,
  },
  channelOk: {
    color: colors.primary,
  },
  sectionLabel: {
    ...type.eyebrow,
    color: colors.textMuted,
    marginTop: spacing.xl,
    marginBottom: spacing.md,
  },
  faq: {
    padding: spacing.lg,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.md,
  },
  faqRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  faqQuestion: {
    ...type.button,
    flex: 1,
    fontSize: 14,
    color: colors.text,
  },
  faqAnswer: {
    ...type.caption,
    color: colors.textMuted,
    marginTop: spacing.md,
  },
});
