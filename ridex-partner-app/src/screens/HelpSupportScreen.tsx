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

const CHANNELS: { icon: IconName; tone: string; title: string; detail: string; url: string }[] = [
  { icon: 'mail', tone: '#E0B252', title: 'Email us', detail: 'Reply in 24h', url: 'mailto:partners@ridex.app' },
];

// Figures mirror the backend defaults (platform_settings, cancellation_policies); update both together.
const FAQS: { question: string; answer: string }[] = [
  {
    question: 'Why am I not getting ride offers?',
    answer:
      'Offers only reach you while you are on duty with an approved account, valid documents and an approved vehicle, and with your wallet above -₹50. If going on duty is refused, the message says which one is missing.',
  },
  {
    question: 'What is my wallet and why is it negative?',
    answer:
      'On a cash ride you keep the fare, so the 20% platform fee is taken from your wallet. Once it falls below -₹50 you cannot go on duty until you pay it off - tap Pay on the wallet card and settle by UPI or card through Razorpay.',
  },
  {
    question: 'When do I get paid?',
    answer:
      'Your share of online-paid fares, plus cancellation fees owed to you, is batched into a payout and sent to the bank or UPI account you set under Payout. Payouts shows each one as pending, processing, paid or failed; a failed transfer rolls into the next batch.',
  },
  {
    question: 'What does it cost me to cancel a trip?',
    answer:
      'Cancelling within 60 seconds of accepting is free. After that it costs ₹20 from your wallet. Cancelling because you feel unsafe is always free and reviewed by our team. The Cancel screen shows the exact charge before you confirm.',
  },
  {
    question: 'What if the rider does not show up?',
    answer:
      'Swipe when you arrive at the pickup, then wait 5 minutes. After that a no-show cancel is free for you, the rider pays a ₹50 no-show fee, and 80% of it (₹40) goes to you.',
  },
  {
    question: 'What if the rider cancels after I accept?',
    answer:
      'Riders cancel free for 2 minutes after you are assigned; after that they pay ₹30, or ₹50 once you are at the pickup. You get 80% of that fee.',
  },
  {
    question: 'How do shuttle runs work?',
    answer:
      'Every seat is paid online before boarding - never take cash. Check each passenger in by scanning their QR or typing their 6-digit code. Stops mark themselves arrived when you are within 100 m; use the Arrived button if GPS is off.',
  },
  {
    question: 'How do I update my documents or vehicle?',
    answer:
      'Upload them under Documents. Our team reviews each one; you can drive once they are approved. A document that expires or is rejected stops offers until you upload a valid one.',
  },
  {
    question: 'How do I report a safety incident?',
    answer:
      'If anyone is in danger, call 112 first. Then tap Report an issue and pick Safety so our team picks it up.',
  },
];

export function HelpSupportScreen({ navigation }: Props) {
  const [openFaq, setOpenFaq] = useState<string | null>(null);
  const { data: tickets, refetch: refetchTickets } = useQuery(myTickets);

  return (
    <Screen onRefresh={() => refetchTickets()} onBack={() => navigation.goBack()} title="Help & Support">
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
    marginBottom: spacing.lg,
  },
  channel: {
    flex: 1,
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
