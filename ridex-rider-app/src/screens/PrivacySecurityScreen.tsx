import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import {
  changePassword,
  listSessions,
  loginHistory,
  revokeSession,
  type Session,
} from '../api/auth';
import { ApiError } from '../api/problem';
import { useQuery } from '../api/useQuery';
import { Button } from '../components/Button';
import { ConfirmSheet } from '../components/ConfirmSheet';
import { Row } from '../components/Row';
import { Screen } from '../components/Screen';
import { SectionLabel } from '../components/SectionLabel';
import { TextField } from '../components/TextField';
import { when } from '../lib/format';
import { RootStackParamList } from '../navigation/types';
import { colors, radius, spacing, type } from '../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'PrivacySecurity'>;

const MIN_LENGTH = 8;

/**
 * Security, with nothing on it that is not real.
 *
 * <p>Two-factor and biometric login are gone rather than left as switches: neither exists, and a
 * switch that claims to protect an account and does not is worse than no switch at all.
 */
export function PrivacySecurityScreen({ navigation }: Props) {
  const sessions = useQuery(listSessions);
  const history = useQuery(loginHistory);
  const [changing, setChanging] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  // Signing a device out is asked first: a mis-tap otherwise logs out somebody's other phone.
  const [confirming, setConfirming] = useState<Session[] | null>(null);
  const [busy, setBusy] = useState(false);

  async function revoke(targets: Session[]) {
    setNotice(null);
    setBusy(true);
    try {
      await Promise.all(targets.map((session) => revokeSession(session.id)));
      sessions.refetch();
    } catch (caught) {
      setNotice(caught instanceof ApiError ? caught.userMessage : 'Could not sign that device out.');
    } finally {
      setBusy(false);
      setConfirming(null);
    }
  }

  // This phone first, then the rest by last use.
  const devices = [...(sessions.data ?? [])].sort((a, b) => Number(b.current) - Number(a.current));
  const others = devices.filter((session) => !session.current);
  const activity = (history.data ?? []).slice(0, 10);

  return (
    <Screen
      onBack={() => navigation.goBack()}
      title="Privacy & Security"
      onRefresh={() => Promise.all([sessions.refetch(), history.refetch()])}
    >
      <SectionLabel>PASSWORD</SectionLabel>

      {changing ? (
        <ChangePassword
          onCancel={() => setChanging(false)}
          onChanged={() => {
            setChanging(false);
            setNotice('Password changed. Every other device has been signed out.');
            sessions.refetch();
          }}
        />
      ) : (
        <View style={styles.group}>
          <Row
            icon="key"
            title="Change password"
            subtitle="Signs out every other device"
            tone="#E0B252"
            onPress={() => setChanging(true)}
          />
        </View>
      )}

      {notice ? <Text style={styles.notice}>{notice}</Text> : null}

      <SectionLabel>SIGNED IN ON</SectionLabel>

      {sessions.loading && !sessions.data ? (
        <Text style={styles.muted}>Loading devices…</Text>
      ) : sessions.error ? (
        <Text style={styles.muted}>{sessions.error}</Text>
      ) : devices.length === 0 ? (
        <Text style={styles.muted}>No other devices.</Text>
      ) : (
        <View style={styles.group}>
          {devices.map((session) => (
            <Row
              key={session.id}
              icon={isBrowser(session) ? 'globe-outline' : 'phone-portrait'}
              title={session.current ? 'This device' : deviceName(session)}
              subtitle={sessionDetail(session)}
              tone={session.current ? colors.primary : '#8FA0BF'}
              // The current device cannot revoke itself: that is what signing out is for, and a
              // row that logs you out while you read it is a trap.
              accessory={
                session.current ? (
                  <Text style={styles.here}>Active now</Text>
                ) : (
                  <Text style={styles.signOut}>Sign out</Text>
                )
              }
              onPress={session.current ? undefined : () => setConfirming([session])}
            />
          ))}
        </View>
      )}

      {others.length > 1 ? (
        <Button
          label="Sign out all other devices"
          variant="secondary"
          onPress={() => setConfirming(others)}
          style={styles.signOutAll}
        />
      ) : null}

      <SectionLabel>RECENT ACTIVITY</SectionLabel>

      {history.data?.length === 0 ? (
        <Text style={styles.muted}>Nothing recorded yet.</Text>
      ) : null}

      {activity.map((event, index) => (
        <View key={`${event.occurredAt}-${index}`} style={styles.event}>
          <Text style={styles.eventType}>{readable(event.eventType)}</Text>
          <Text style={styles.eventMeta}>
            {when(event.occurredAt)}
            {address(event.ipAddress) ? ` · ${address(event.ipAddress)}` : ''}
          </Text>
        </View>
      ))}

      <SectionLabel>YOUR ACCOUNT</SectionLabel>

      <View style={styles.group}>
        {/* Deleting an account touches rides, invoices and unpaid dues, so it goes through support
            rather than a button that would have to decide all three on its own. */}
        <Row
          icon="trash"
          title="Delete my account"
          subtitle="Raises a request with support"
          danger
          onPress={() => navigation.navigate('ReportIssue')}
        />
      </View>

      <ConfirmSheet
        visible={confirming != null}
        title={confirming && confirming.length > 1 ? 'Sign out all other devices?' : 'Sign out this device?'}
        body={
          confirming && confirming.length > 1
            ? `${confirming.length} devices will need to sign in again. This phone stays signed in.`
            : `${confirming ? deviceName(confirming[0]) : 'That device'} will need to sign in again.`
        }
        confirmLabel="Sign out"
        cancelLabel="Keep"
        destructive
        busy={busy}
        onConfirm={() => confirming && void revoke(confirming)}
        onDismiss={() => setConfirming(null)}
      />
    </Screen>
  );
}

function ChangePassword({
  onCancel,
  onChanged,
}: {
  onCancel: () => void;
  onChanged: () => void;
}) {
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mismatch = confirm.length > 0 && next !== confirm;
  const ready = current.length > 0 && next.length >= MIN_LENGTH && next === confirm;

  async function submit() {
    setBusy(true);
    setError(null);
    try {
      await changePassword(current, next);
      onChanged();
    } catch (caught) {
      // "That is not your current password" arrives here, which is the one that matters.
      setError(caught instanceof ApiError ? caught.userMessage : 'Could not change your password.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={styles.form}>
      <TextField
        label="Current password"
        value={current}
        onChangeText={setCurrent}
        secureTextEntry
        icon="lock-closed"
      />
      <TextField
        label="New password"
        value={next}
        onChangeText={setNext}
        placeholder={`Min ${MIN_LENGTH} characters`}
        secureTextEntry
        icon="lock-closed"
        style={styles.spaced}
      />
      <TextField
        label="Confirm new password"
        value={confirm}
        onChangeText={setConfirm}
        secureTextEntry
        icon="lock-closed"
        error={mismatch ? "Passwords don't match" : undefined}
        style={styles.spaced}
      />

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <Button
        label={busy ? 'Changing...' : 'Change password'}
        disabled={!ready || busy}
        onPress={() => void submit()}
        style={styles.spaced}
      />
      <Button label="Cancel" variant="secondary" onPress={onCancel} style={styles.spaced} />
    </View>
  );
}

/** A user agent is a paragraph; a device list needs a word. */
function deviceName(session: Session) {
  const agent = session.userAgent ?? '';
  if (/okhttp|expo|ridex/i.test(agent)) return 'RideX app';
  if (/iphone|ios/i.test(agent)) return 'iPhone';
  if (/android/i.test(agent)) return 'Android device';
  if (/mozilla|chrome|safari/i.test(agent)) return 'Browser';
  return 'Other device';
}

function isBrowser(session: Session) {
  return deviceName(session) === 'Browser';
}

/** Loopback and private addresses say nothing to a rider, so only a public one is shown. */
function address(ip: string | null | undefined) {
  if (!ip || /^(127\.|10\.|192\.168\.|::1$|0:0:0:0:0:0:0:1$)/.test(ip)) return null;
  return ip;
}

function sessionDetail(session: Session) {
  const used = `Last used ${when(session.lastUsedAt ?? session.createdAt)}`;
  const ip = address(session.ipAddress);
  return ip ? `${used} · ${ip}` : used;
}

/** LOGIN_SUCCEEDED reads as shouting. This is the same thing in words. */
function readable(eventType: string) {
  return eventType.charAt(0) + eventType.slice(1).toLowerCase().replace(/_/g, ' ');
}

const styles = StyleSheet.create({
  here: {
    ...type.caption,
    color: colors.primary,
  },
  signOut: {
    ...type.caption,
    color: colors.danger,
  },
  signOutAll: {
    marginTop: spacing.md,
  },
  group: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.md,
    overflow: 'hidden',
  },
  form: {
    marginBottom: spacing.md,
  },
  spaced: {
    marginTop: spacing.md,
  },
  muted: {
    ...type.body,
    color: colors.textMuted,
    marginBottom: spacing.md,
  },
  notice: {
    ...type.body,
    color: colors.primary,
    marginBottom: spacing.md,
  },
  error: {
    ...type.body,
    color: colors.danger,
    marginTop: spacing.md,
  },
  event: {
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  eventType: {
    ...type.body,
    color: colors.text,
  },
  eventMeta: {
    ...type.caption,
    color: colors.textMuted,
    marginTop: 2,
  },
});
