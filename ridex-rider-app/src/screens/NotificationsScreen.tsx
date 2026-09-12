import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { listNotifications, markAllRead, type Notification } from '../api/notifications';
import { useQuery } from '../api/useQuery';
import { Screen } from '../components/Screen';
import { when } from '../lib/format';
import { colors, IconName, radius, spacing, type } from '../theme';
import { RootStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'Notifications'>;

/** Which glyph a row carries. The event type is the server's word for what happened. */
const ICONS: Record<string, { icon: IconName; tone: string }> = {
  SHUTTLE_BOOKED: { icon: 'bus', tone: '#5FB8D6' },
  SHUTTLE_BOARDED: { icon: 'checkmark-circle', tone: '#5FD68A' },
  RIDE_RECEIPT: { icon: 'receipt', tone: '#E0B252' },
  DRIVER_APPROVED: { icon: 'shield-checkmark', tone: '#5FD68A' },
  DRIVER_REJECTED: { icon: 'close-circle', tone: '#E05A6F' },
  DRIVER_SUSPENDED: { icon: 'warning', tone: '#E05A6F' },
  DRIVER_UNDER_REVIEW: { icon: 'hourglass', tone: '#E0B252' },
  DOCUMENT_APPROVED: { icon: 'document-text', tone: '#5FD68A' },
  DOCUMENT_REJECTED: { icon: 'document-text', tone: '#E05A6F' },
};

const FALLBACK = { icon: 'notifications' as IconName, tone: '#8B95AC' };

export function NotificationsScreen({ navigation }: Props) {
  const { data, loading, error } = useQuery(listNotifications);
  // Held locally so the dots clear as soon as the screen is read, without a second fetch.
  const [read, setRead] = useState(false);

  useEffect(() => {
    if (data?.some((row) => !row.read)) {
      void markAllRead().then(() => setRead(true)).catch(() => undefined);
    }
  }, [data]);

  return (
    <Screen onBack={() => navigation.goBack()} title="Notifications">
      {loading ? <Text style={styles.muted}>Loading...</Text> : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {data?.length === 0 ? (
        <Text style={styles.muted}>Nothing yet. Bookings and updates land here.</Text>
      ) : null}

      {data?.map((item) => (
        <Row key={item.id} item={item} unread={!item.read && !read} />
      ))}
    </Screen>
  );
}

function Row({ item, unread }: { item: Notification; unread: boolean }) {
  const glyph = ICONS[item.eventType] ?? FALLBACK;

  return (
    <Pressable style={[styles.row, unread && styles.rowUnread]} accessibilityRole="text">
      <View style={[styles.icon, { backgroundColor: `${glyph.tone}2E` }]}>
        <Ionicons name={glyph.icon} size={18} color={glyph.tone} />
      </View>

      <View style={styles.flex}>
        <Text style={styles.title}>{item.title}</Text>
        <Text style={styles.body} numberOfLines={3}>
          {item.body}
        </Text>
        <Text style={styles.when}>{when(item.createdAt)}</Text>
      </View>

      {unread ? <View style={styles.unreadDot} /> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  muted: {
    ...type.body,
    color: colors.textMuted,
  },
  error: {
    ...type.body,
    color: colors.danger,
  },
  markAll: {
    ...type.button,
    fontSize: 13,
    color: colors.primary,
    textAlign: 'right',
    width: 92,
  },
  row: {
    flexDirection: 'row',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.md,
    marginBottom: spacing.sm,
  },
  // Unread carries a tinted panel and a left rule, so the state survives without relying on the
  // dot alone.
  rowUnread: {
    backgroundColor: 'rgba(46, 231, 199, 0.05)',
    borderLeftWidth: 2,
    borderLeftColor: colors.primary,
  },
  icon: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    ...type.button,
    fontSize: 14,
    color: colors.text,
  },
  body: {
    ...type.caption,
    color: colors.textMuted,
    marginTop: 2,
  },
  when: {
    ...type.caption,
    fontSize: 11,
    color: colors.textFaint,
    marginTop: spacing.sm,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: radius.pill,
    backgroundColor: colors.primary,
    marginTop: spacing.xs,
  },
});
