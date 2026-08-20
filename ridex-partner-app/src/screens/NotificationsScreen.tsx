import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { StyleSheet, Text, View } from 'react-native';

import { Screen } from '../components/Screen';
import { NOTIFICATIONS } from '../data/mock';
import { RootStackParamList } from '../navigation/types';
import { colors, radius, spacing, type } from '../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'Notifications'>;

export function NotificationsScreen({ navigation }: Props) {
  return (
    <Screen
      onBack={() => navigation.goBack()}
      title="Notifications"
      headerRight={<Text style={styles.markAll}>Mark all read</Text>}
    >
      {NOTIFICATIONS.map((item) => (
        <View key={item.title} style={[styles.row, item.unread && styles.rowUnread]}>
          <View style={[styles.icon, { backgroundColor: `${item.tone}2E` }]}>
            <Ionicons name={item.icon} size={18} color={item.tone} />
          </View>

          <View style={styles.flex}>
            <Text style={styles.title}>{item.title}</Text>
            <Text style={styles.body}>{item.body}</Text>
            <Text style={styles.when}>{item.when}</Text>
          </View>

          {item.unread ? <View style={styles.unreadDot} /> : null}
        </View>
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
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
