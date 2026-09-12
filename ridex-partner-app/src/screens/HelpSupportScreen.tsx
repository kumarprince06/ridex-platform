import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useState } from 'react';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';

import { myTickets, statusLabel } from '../api/support';
import { useQuery } from '../api/useQuery';
import { Button } from '../components/Button';
import { Screen } from '../components/Screen';
import { FAQS } from '../data/mock';
import { when } from '../lib/format';
import { RootStackParamList } from '../navigation/types';
import { colors, IconName, radius, spacing, type } from '../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'HelpSupport'>;

const CHANNELS: { icon: IconName; tone: string; title: string; detail: string; url: string }[] = [
  { icon: 'mail', tone: '#E0B252', title: 'Email us', detail: 'Reply in 24h', url: 'mailto:partners@ridex.local' },
  { icon: 'call', tone: '#5FD68A', title: 'Call support', detail: '24/7 helpline', url: 'tel:+911800000000' },
];

export function HelpSupportScreen({ navigation }: Props) {
  const [openFaq, setOpenFaq] = useState<string | null>(null);
  const { data: tickets } = useQuery(myTickets);

  return (
    <Screen onBack={() => navigation.goBack()} title="Help & Support">
      <View style={styles.grid}>
        {CHANNELS.map((channel) => (
          <Pressable
            key={channel.title}
            accessibilityRole="button"
            // Handed to the OS: the phone's own dialler and mail app are better at this than a
            // screen pretending to be one.
            onPress={() => void Linking.openURL(channel.url)}
            style={({ pressed }) => [styles.channel, pressed && styles.pressed]}
          >
            <Ionicons name={channel.icon} size={22} color={channel.tone} />
            <Text style={styles.channelTitle}>{channel.title}</Text>
            <Text style={styles.channelDetail}>{channel.detail}</Text>
          </Pressable>
        ))}
      </View>
      <Button label="Report an issue" onPress={() => navigation.navigate('ReportIssue')} />

      <Text style={styles.sectionLabel}>YOUR TICKETS</Text>

      {tickets?.length === 0 ? (
        <Text style={styles.empty}>You have not raised anything yet.</Text>
      ) : null}

      {tickets?.map((ticket) => (
        <Pressable
          key={ticket.id}
          accessibilityRole="button"
          onPress={() => navigation.navigate('SupportTicket', { ticketId: ticket.id })}
          style={({ pressed }) => [styles.ticket, pressed && styles.pressed]}
        >
          <View style={styles.flex}>
            <Text style={styles.ticketSubject} numberOfLines={1}>
              {ticket.subject}
            </Text>
            <Text style={styles.ticketMeta}>
              {statusLabel(ticket.status)} · {when(ticket.createdAt)}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={17} color={colors.textFaint} />
        </Pressable>
      ))}


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
  flex: {
    flex: 1,
  },
  empty: {
    ...type.body,
    color: colors.textMuted,
  },
  ticket: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  ticketSubject: {
    ...type.body,
    color: colors.text,
  },
  ticketMeta: {
    ...type.caption,
    color: colors.textMuted,
    marginTop: 2,
  },
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
