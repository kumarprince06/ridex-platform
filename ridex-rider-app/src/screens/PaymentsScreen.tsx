import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { applyReferral, getPoints, reasonLabel } from '../api/points';
import { formatMoney } from '../api/rides';
import { useQuery } from '../api/useQuery';
import { ApiError } from '../api/problem';
import { BrandLoader } from '../components/BrandLoader';
import { Button } from '../components/Button';
import { SectionLabel } from '../components/SectionLabel';
import { TextField } from '../components/TextField';
import { colors, radius, spacing, type } from '../theme';

export function PaymentsScreen() {
  const { data: points, loading, error, refetch } = useQuery(getPoints, []);
  const [code, setCode] = useState('');
  const [codeError, setCodeError] = useState<string | null>(null);
  const [applied, setApplied] = useState(false);
  const [copied, setCopied] = useState(false);

  async function submitCode() {
    setCodeError(null);
    try {
      await applyReferral(code);
      setApplied(true);
      setCode('');
      refetch();
    } catch (caught) {
      setCodeError(caught instanceof ApiError ? caught.userMessage : 'That code could not be used.');
    }
  }

  async function copyCode(value: string) {
    await Clipboard.setStringAsync(value);
    setCopied(true);
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        // Pull to refresh, because a balance is the one screen people re-open expecting a change.
        refreshControl={
          <RefreshControl
            refreshing={loading && points != null}
            onRefresh={refetch}
            tintColor={colors.primary}
          />
        }
      >
        <View style={styles.header}>
          <Text style={styles.heading}>Rewards</Text>
        </View>

        {!points ? (
          loading ? (
            <BrandLoader size={72} label="Loading your points" style={styles.spinner} />
          ) : (
            <Text style={styles.empty}>{error ?? 'Points could not be loaded.'}</Text>
          )
        ) : (
          <>
            <View style={styles.wallet}>
              {/* Soft corner wash, standing in for the gradient in the mockup. */}
              <View style={styles.walletWash} />

              <View style={styles.walletTop}>
                <View style={styles.flex}>
                  <Text style={styles.walletLabel}>RIDEX POINTS</Text>
                  <Text style={styles.walletBalance}>{points.balance}</Text>
                  {/* Points are not money. Showing the rate stops the balance reading as one. */}
                  <Text style={styles.walletWorth}>
                    Worth {formatMoney(points.redeemableValueMinor, points.currency)} off a fare ·{' '}
                    {points.pointsPerCurrencyUnit} points = {formatMoney(100, points.currency)}
                  </Text>
                </View>
                <View style={styles.walletIcon}>
                  <Ionicons name="sparkles" size={20} color={colors.primary} />
                </View>
              </View>
            </View>

            <SectionLabel>INVITE FRIENDS</SectionLabel>

            <View style={styles.card}>
              <Text style={styles.cardHint}>
                Your friend gets a welcome bonus. You are paid when they finish their first ride.
              </Text>

              <Pressable
                onPress={() => copyCode(points.referralCode)}
                accessibilityRole="button"
                accessibilityLabel={`Copy referral code ${points.referralCode}`}
                style={styles.codeRow}
              >
                <Text style={styles.code}>{points.referralCode}</Text>
                <Ionicons
                  name={copied ? 'checkmark' : 'copy-outline'}
                  size={18}
                  color={colors.primary}
                />
              </Pressable>

              <View style={styles.counts}>
                <Count value={points.referralsPending} label="Invited" />
                <Count value={points.referralsRewarded} label="Rewarded" />
              </View>
            </View>

            {/* Only ever accepted once, and only before the first ride - so it disappears rather
                than sitting there failing for everyone who already used one. */}
            {points.referralsRewarded === 0 && !applied ? (
              <>
                <SectionLabel>HAVE A CODE?</SectionLabel>
                <View style={styles.card}>
                  <TextField
                    label="Referral code"
                    value={code}
                    onChangeText={(next) => setCode(next.toUpperCase())}
                    placeholder="RIDEX01"
                    autoCapitalize="characters"
                    error={codeError ?? undefined}
                  />
                  <Button label="Apply" onPress={submitCode} style={styles.apply} />
                </View>
              </>
            ) : null}

            <SectionLabel>ACTIVITY</SectionLabel>

            {(points.recent ?? []).length === 0 ? (
              <Text style={styles.empty}>No points yet. Finish a ride to earn some.</Text>
            ) : (
              (points.recent ?? []).map((entry) => (
                <View key={entry.id} style={styles.entry}>
                  <View style={styles.flex}>
                    <Text style={styles.entryLabel}>{reasonLabel(entry.reason)}</Text>
                    {entry.note ? <Text style={styles.entryNote}>{entry.note}</Text> : null}
                  </View>
                  <Text style={[styles.entryPoints, entry.points < 0 && styles.entrySpent]}>
                    {entry.points > 0 ? `+${entry.points}` : entry.points}
                  </Text>
                </View>
              ))
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function Count({ value, label }: { value: number; label: string }) {
  return (
    <View style={styles.count}>
      <Text style={styles.countValue}>{value}</Text>
      <Text style={styles.countLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  content: {
    flexGrow: 1,
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
  spinner: {
    flexGrow: 1,
    justifyContent: 'center',
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
  walletWorth: {
    ...type.caption,
    color: colors.textMuted,
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
  card: {
    padding: spacing.lg,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.md,
  },
  cardHint: {
    ...type.caption,
    color: colors.textMuted,
  },
  codeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceAlt,
  },
  code: {
    ...type.hero,
    fontSize: 20,
    letterSpacing: 3,
    color: colors.text,
  },
  counts: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.md,
  },
  count: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceAlt,
  },
  countValue: {
    ...type.button,
    fontSize: 18,
    color: colors.text,
  },
  countLabel: {
    ...type.caption,
    color: colors.textMuted,
  },
  apply: {
    marginTop: spacing.md,
  },
  entry: {
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
  entryLabel: {
    ...type.button,
    fontSize: 15,
    color: colors.text,
  },
  entryNote: {
    ...type.caption,
    color: colors.textMuted,
    marginTop: 1,
  },
  entryPoints: {
    ...type.button,
    fontSize: 15,
    color: colors.primary,
  },
  entrySpent: {
    color: colors.textMuted,
  },
  empty: {
    ...type.body,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: spacing.lg,
  },
});
