import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useState } from 'react';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';

import { myTickets, statusLabel } from '../api/support';
import { useQuery } from '../api/useQuery';
import { Button } from '../components/Button';
import { Screen } from '../components/Screen';
import { when } from '../lib/format';
import { RootStackParamList } from '../navigation/types';
import { colors, IconName, radius, spacing, type } from '../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'HelpSupport'>;

// Email only: the backend configures a support address but no helpline number.
const CHANNELS: { icon: IconName; tone: string; title: string; detail: string; url: string }[] = [
  { icon: 'mail', tone: '#E0B252', title: 'Email us', detail: 'support@ridex.app', url: 'mailto:support@ridex.app' },
];

// Written against how the backend actually behaves; amounts are left out because ops can change them.
const FAQS: { question: string; answer: string }[] = [
  {
    question: 'How do I cancel a ride?',
    answer:
      'Tap Cancel on the ride screen and pick a reason. Cancelling is free while we are still finding a driver and for the first 2 minutes after one is assigned. After that a cancellation fee may apply - you will see the exact amount before you confirm, and it is added to your next fare.',
  },
  {
    question: 'What if my driver does not show up?',
    answer:
      'You can cancel with "Waiting too long" or "Driver is not moving". If you were charged a fee for a driver who never arrived, open the trip and tap Report Issue with the Fare dispute category and we will review it.',
  },
  {
    question: 'How do I pay for a ride?',
    answer:
      'Choose Cash or Online (UPI or card) when you book. The final fare is priced from the actual trip once the driver ends it. Cash goes to the driver; online payments open a secure checkout after the trip.',
  },
  {
    question: 'How do points work?',
    answer:
      'You earn points on completed rides and through referrals, and can spend them on a ride or shuttle seat at checkout. If a ride is cancelled, the points it used come back to you.',
  },
  {
    question: 'Can I cancel a shuttle seat?',
    answer:
      'Yes, up to 30 minutes before departure. A seat you paid for online returns 80% of what you paid as points. Within 30 minutes of departure a seat can no longer be cancelled.',
  },
  {
    question: 'How do I report a lost item?',
    answer:
      'Open the trip from My Rides, tap Report Issue and choose Lost item. Describe what you left behind and our team will contact the driver.',
  },
  {
    question: 'Is RideX available 24/7?',
    answer:
      'You can book at any time. Whether a car is available depends on drivers online near you. Shuttles run on their published timetable.',
  },
];

export function HelpSupportScreen({ navigation }: Props) {
  const [openFaq, setOpenFaq] = useState<string | null>(null);
  const { data: tickets, refetch } = useQuery(myTickets);

  return (
    <Screen onBack={() => navigation.goBack()} title="Help & Support" onRefresh={refetch}>
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

      {FAQS.map(({ question, answer }) => {
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
              <Text style={styles.faqAnswer}>{answer}</Text>
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
