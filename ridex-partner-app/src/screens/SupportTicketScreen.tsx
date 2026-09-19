import { useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';

import { ApiError } from '../api/problem';
import { getTicket, isOpen, replyToTicket, statusLabel, type Ticket } from '../api/support';
import { useQuery } from '../api/useQuery';
import { Button } from '../components/Button';
import { Screen } from '../components/Screen';
import { when } from '../lib/format';
import { RootScreenProps } from '../navigation/types';
import { colors, radius, spacing, type } from '../theme';

type Props = RootScreenProps<'SupportTicket'>;

/**
 * One ticket, as a conversation.
 *
 * <p>The thread is the whole screen: a rider who reported something wants to know whether a person
 * has read it, and a status pill on its own does not answer that.
 */
export function SupportTicketScreen({ navigation, route }: Props) {
  const { ticketId } = route.params;
  const { data, loading, error, refetch } = useQuery(() => getTicket(ticketId), [ticketId]);

  // The reply returns the refreshed ticket, so the thread grows without a second round trip.
  const [replied, setReplied] = useState<Ticket | null>(null);
  const ticket = replied ?? data;

  return (
    <Screen onRefresh={() => refetch()} onBack={() => navigation.goBack()} title="Support">
      {loading ? <Text style={styles.muted}>Loading...</Text> : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}

      {ticket ? (
        <>
          <Text style={styles.subject}>{ticket.subject}</Text>
          <Text style={styles.meta}>
            {statusLabel(ticket.status)} · raised {when(ticket.createdAt)}
          </Text>

          {ticket.messages.map((message) => (
            <View
              key={message.id}
              style={[styles.bubble, message.fromSupport ? styles.fromSupport : styles.fromMe]}
            >
              <Text style={styles.author}>
                {message.fromSupport ? 'RideX support' : 'You'} · {when(message.createdAt)}
              </Text>
              <Text style={styles.body}>{message.body}</Text>
            </View>
          ))}

          {ticket.resolution ? (
            <View style={styles.resolution}>
              <Text style={styles.resolutionLabel}>RESOLVED</Text>
              <Text style={styles.body}>{ticket.resolution}</Text>
            </View>
          ) : null}

          {isOpen(ticket.status) ? (
            <Reply ticketId={ticketId} onReplied={setReplied} />
          ) : (
            <Text style={styles.muted}>
              This ticket is closed. Raise a new one if the problem comes back.
            </Text>
          )}
        </>
      ) : null}
    </Screen>
  );
}

function Reply({
  ticketId,
  onReplied,
}: {
  ticketId: string;
  onReplied: (ticket: Ticket) => void;
}) {
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function send() {
    setBusy(true);
    setError(null);
    try {
      onReplied(await replyToTicket(ticketId, draft.trim()));
      setDraft('');
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.userMessage : 'Could not send that reply.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={styles.reply}>
      <TextInput
        value={draft}
        onChangeText={setDraft}
        placeholder="Add to this ticket..."
        placeholderTextColor={colors.textFaint}
        multiline
        style={styles.input}
      />
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <Button
        label={busy ? 'Sending...' : 'Send reply'}
        disabled={busy || draft.trim().length === 0}
        onPress={() => void send()}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  muted: {
    ...type.body,
    color: colors.textMuted,
  },
  error: {
    ...type.body,
    color: colors.danger,
  },
  subject: {
    ...type.title,
    color: colors.text,
  },
  meta: {
    ...type.caption,
    color: colors.textMuted,
    marginBottom: spacing.lg,
  },
  bubble: {
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
  },
  fromMe: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
  },
  // Support's side is tinted, so a thread is scanned by who spoke rather than by reading it.
  fromSupport: {
    backgroundColor: colors.primarySurface,
    borderColor: colors.primaryMuted,
  },
  author: {
    ...type.caption,
    color: colors.textMuted,
    marginBottom: 4,
  },
  body: {
    ...type.body,
    color: colors.text,
  },
  resolution: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.md,
    padding: spacing.md,
    marginTop: spacing.sm,
  },
  resolutionLabel: {
    ...type.eyebrow,
    color: colors.primary,
    marginBottom: 4,
  },
  reply: {
    marginTop: spacing.lg,
    gap: spacing.sm,
  },
  input: {
    ...type.body,
    color: colors.text,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    minHeight: 90,
    padding: spacing.md,
    textAlignVertical: 'top',
  },
});
