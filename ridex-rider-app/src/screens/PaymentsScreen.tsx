import { Ionicons } from '@expo/vector-icons';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { SectionLabel } from '../components/SectionLabel';
import { PAYMENT_METHODS } from '../data/mock';
import { colors, radius, spacing, type } from '../theme';

export function PaymentsScreen() {
  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.heading}>Payments</Text>
          <View style={styles.addButton}>
            <Text style={styles.addButtonText}>+ Add</Text>
          </View>
        </View>

        <View style={styles.wallet}>
          {/* Soft corner wash, standing in for the gradient in the mockup. */}
          <View style={styles.walletWash} />

          <View style={styles.walletTop}>
            <View style={styles.flex}>
              <Text style={styles.walletLabel}>RIDEX WALLET</Text>
              <Text style={styles.walletBalance}>$24.50</Text>
            </View>
            <View style={styles.walletIcon}>
              <Ionicons name="card" size={20} color={colors.primary} />
            </View>
          </View>

          <View style={styles.walletActions}>
            <View style={styles.walletPrimary}>
              <Text style={styles.walletPrimaryText}>+ Add Money</Text>
            </View>
            <View style={styles.walletSecondary}>
              <Text style={styles.walletSecondaryText}>History</Text>
            </View>
          </View>
        </View>

        <SectionLabel>PAYMENT METHODS</SectionLabel>

        {PAYMENT_METHODS.map((method) => (
          <View
            key={method.name}
            style={[styles.method, method.isDefault && styles.methodDefault]}
          >
            <View style={[styles.methodIcon, { backgroundColor: `${method.tone}2E` }]}>
              <Ionicons name={method.icon} size={18} color={method.tone} />
            </View>

            <View style={styles.flex}>
              <Text style={styles.methodName}>{method.name}</Text>
              <Text style={styles.methodDetail}>{method.detail}</Text>
            </View>

            {method.isDefault ? (
              <>
                <View style={styles.defaultPill}>
                  <Text style={styles.defaultPillText}>Default</Text>
                </View>
                <Ionicons name="checkmark-circle" size={22} color={colors.primary} />
              </>
            ) : null}
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  content: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xl,
  },
  flex: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: spacing.sm,
    marginBottom: spacing.lg,
  },
  heading: {
    ...type.title,
    color: colors.text,
  },
  addButton: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(46, 231, 199, 0.16)',
  },
  addButtonText: {
    ...type.label,
    color: colors.primary,
  },
  wallet: {
    padding: spacing.lg,
    borderRadius: radius.lg,
    backgroundColor: '#152233',
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  walletWash: {
    position: 'absolute',
    right: -50,
    top: -60,
    width: 160,
    height: 160,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(46, 231, 199, 0.06)',
  },
  walletTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  walletLabel: {
    ...type.eyebrow,
    color: colors.textMuted,
  },
  walletBalance: {
    ...type.hero,
    fontSize: 30,
    color: colors.primary,
    marginTop: spacing.xs,
  },
  walletIcon: {
    width: 44,
    height: 44,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(46, 231, 199, 0.14)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  walletActions: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.lg,
  },
  walletPrimary: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(46, 231, 199, 0.16)',
    alignItems: 'center',
  },
  walletPrimaryText: {
    ...type.button,
    fontSize: 14,
    color: colors.primary,
  },
  walletSecondary: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
  },
  walletSecondaryText: {
    ...type.button,
    fontSize: 14,
    color: colors.text,
  },
  method: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.md,
  },
  methodDefault: {
    borderColor: colors.primary,
  },
  methodIcon: {
    width: 42,
    height: 42,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  methodName: {
    ...type.button,
    fontSize: 15,
    color: colors.text,
  },
  methodDetail: {
    ...type.caption,
    color: colors.textMuted,
    marginTop: 1,
  },
  defaultPill: {
    paddingHorizontal: spacing.md,
    paddingVertical: 4,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(46, 231, 199, 0.16)',
    marginRight: spacing.sm,
  },
  defaultPillText: {
    ...type.caption,
    fontSize: 11,
    color: colors.primary,
  },
});
