import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { payForPass } from '../api/passCheckout';
import { getPoints, spendableNow } from '../api/points';
import { ApiError } from '../api/problem';
import {
  buyPass,
  listPassProducts,
  listPasses,
  type Pass,
  type PassProduct,
} from '../api/shuttle';
import { useQuery } from '../api/useQuery';
import { Button } from '../components/Button';
import { Screen } from '../components/Screen';
import { money, shortDate } from '../lib/format';
import { RootStackParamList } from '../navigation/types';
import { colors, radius, spacing, type } from '../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'ShuttlePasses'>;

/**
 * Commuter passes for one route: what is on sale, and what the rider already holds.
 *
 * <p>A pass is prepaid, so buying one opens the gateway immediately and the pass covers nothing
 * until that clears. An unpaid pass stays here with its checkout, rather than disappearing.
 */
export function ShuttlePassesScreen({ navigation, route }: Props) {
  const { routeId, routeName } = route.params;
  const { data: products, refetch: refetchProducts } = useQuery(() => listPassProducts(routeId), [routeId]);
  const { data: held, refetch } = useQuery(listPasses);
  const { data: points } = useQuery(getPoints);

  const [usePoints, setUsePoints] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function buy(product: PassProduct) {
    setBusy(product.id);
    setError(null);
    try {
      const bought = await buyPass({
        productId: product.id,
        redeemPoints: usePoints && points ? spendableNow(points).points : undefined,
      });
      await payForPass(bought);
      refetch();
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.userMessage : 'Could not buy that pass.');
    } finally {
      setBusy(null);
    }
  }

  async function payLater(pass: Pass) {
    setBusy(pass.id);
    setError(null);
    try {
      await payForPass(pass);
      refetch();
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.userMessage : 'Could not take that payment.');
    } finally {
      setBusy(null);
    }
  }

  const mine = (held ?? []).filter((pass) => pass.routeName === routeName);
  const [picked, setPicked] = useState<string | null>(null);
  const plans = products ?? [];
  const chosen = plans.find((product) => product.id === picked) ?? plans[0];
  const bestSaving = Math.max(0, ...plans.map((product) => product.savePercent));
  const soldOut = plans.some((product) => product.soldOut);

  return (
    <Screen
      onBack={() => navigation.goBack()}
      title="Passes"
      onRefresh={() => Promise.all([refetch(), refetchProducts()])}
      footer={
        chosen && !soldOut ? (
          <Button
            label={busy === chosen.id ? 'Opening...' : `Buy ${chosen.name} · ${money(chosen.priceMinor, chosen.currency)}`}
            disabled={busy !== null}
            onPress={() => void buy(chosen)}
          />
        ) : undefined
      }
    >
      <Text style={styles.routeName}>{routeName}</Text>
      <View style={styles.rule}>
        <Ionicons name="information-circle-outline" size={16} color={colors.textMuted} />
        <Text style={styles.ruleText}>
          A pass includes a set number of rides on this route - book those seats without paying. Cancel 30 minutes
          or more before departure and the ride comes back. Seats on other routes are paid as usual.
        </Text>
      </View>

      {mine.length ? <Text style={styles.sectionLabel}>YOUR PASSES</Text> : null}

      {mine.map((pass) => (
        <View key={pass.id} style={styles.held}>
          <View style={styles.flex}>
            <Text style={styles.heldName}>{pass.productName}</Text>
            <Text style={styles.heldMeta}>
              {pass.status === 'ACTIVE'
                ? `${ridesLeft(pass)} · valid till ${shortDate(pass.endsOn)} · ${daysLeft(pass.endsOn)}`
                : 'Waiting for payment'}
            </Text>
          </View>

          {pass.status === 'ACTIVE' ? (
            <Ionicons name="checkmark-circle" size={22} color={colors.primary} />
          ) : (
            <Button
              label={busy === pass.id ? 'Paying...' : 'Pay'}
              disabled={busy !== null}
              onPress={() => void payLater(pass)}
            />
          )}
        </View>
      ))}

      <Text style={styles.sectionLabel}>CHOOSE A PLAN</Text>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      {soldOut ? (
        <Text style={styles.error}>Passes on this route are sold out right now. You can still book seats one at a time.</Text>
      ) : null}

      {products?.length === 0 ? (
        <Text style={styles.muted}>No passes are on sale for this route yet.</Text>
      ) : null}

      {plans.map((product) => {
        const selected = product.id === chosen?.id;
        return (
          <Pressable
            key={product.id}
            onPress={() => setPicked(product.id)}
            accessibilityRole="radio"
            accessibilityState={{ selected }}
            style={[styles.plan, selected && styles.planSelected]}
          >
            <Ionicons
              name={selected ? 'radio-button-on' : 'radio-button-off'}
              size={22}
              color={selected ? colors.primary : colors.textMuted}
            />
            <View style={styles.flex}>
              <View style={styles.planTitleRow}>
                <Text style={styles.planName}>{product.name}</Text>
                {product.savePercent > 0 && product.savePercent === bestSaving ? (
                  <Text style={styles.best}>BEST VALUE</Text>
                ) : null}
              </View>
              <Text style={styles.planMeta}>
                {product.rideLimit} rides · {product.durationDays} days · {money(product.perMonthMinor, product.currency)} / month
              </Text>
            </View>
            <View style={styles.priceCol}>
              <Text style={styles.planPrice}>{money(product.priceMinor, product.currency)}</Text>
              {product.savePercent > 0 ? <Text style={styles.save}>Save {product.savePercent}%</Text> : null}
            </View>
          </Pressable>
        );
      })}

      {points && spendableNow(points).points > 0 && plans.length ? (
        <Pressable
          onPress={() => setUsePoints((on) => !on)}
          accessibilityRole="switch"
          accessibilityState={{ checked: usePoints }}
          style={[styles.pointsRow, usePoints && styles.pointsRowOn]}
        >
          <Ionicons
            name={usePoints ? 'checkmark-circle' : 'ellipse-outline'}
            size={22}
            color={usePoints ? colors.primary : colors.textMuted}
          />
          <Text style={styles.pointsText}>
            Use {spendableNow(points).points} points ·{' '}
            {money(spendableNow(points).valueMinor, points.currency)} off
          </Text>
        </Pressable>
      ) : null}
    </Screen>
  );
}

function ridesLeft(pass: Pass) {
  if (pass.rideLimit === 0) return 'Unlimited rides';
  const left = Math.max(0, pass.rideLimit - pass.ridesUsed);
  return left === 1 ? '1 ride left' : `${left} rides left`;
}

function daysLeft(endsOn: string) {
  const end = new Date(`${endsOn}T23:59:59`).getTime();
  const days = Math.max(0, Math.ceil((end - Date.now()) / 86_400_000));
  return days === 1 ? '1 day left' : `${days} days left`;
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  routeName: {
    ...type.title,
    color: colors.text,
  },
  rule: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  ruleText: {
    ...type.caption,
    color: colors.textMuted,
    flex: 1,
  },
  plan: {
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
  planSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primarySurface,
  },
  planTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  planName: {
    ...type.button,
    fontSize: 15,
    color: colors.text,
  },
  best: {
    ...type.caption,
    fontSize: 10,
    color: colors.onPrimary,
    backgroundColor: colors.amber,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: radius.sm,
    overflow: 'hidden',
  },
  planMeta: {
    ...type.caption,
    color: colors.textMuted,
    marginTop: 2,
  },
  priceCol: {
    alignItems: 'flex-end',
  },
  planPrice: {
    ...type.button,
    fontSize: 16,
    color: colors.text,
  },
  save: {
    ...type.caption,
    color: colors.primary,
  },
  muted: {
    ...type.body,
    color: colors.textMuted,
  },
  error: {
    ...type.body,
    color: colors.danger,
    marginBottom: spacing.md,
  },
  sectionLabel: {
    ...type.eyebrow,
    color: colors.textFaint,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  held: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.primarySurface,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  heldName: {
    ...type.body,
    color: colors.text,
  },
  heldMeta: {
    ...type.caption,
    color: colors.textMuted,
    marginTop: 2,
  },
  product: {
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
  productName: {
    ...type.body,
    color: colors.text,
  },
  productMeta: {
    ...type.caption,
    color: colors.textMuted,
    marginTop: 2,
  },
  productNote: {
    ...type.caption,
    color: colors.textFaint,
    marginTop: 4,
  },
  pointsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  pointsRowOn: {
    borderColor: colors.primary,
    backgroundColor: colors.primarySurface,
  },
  pointsText: {
    ...type.body,
    color: colors.text,
    flex: 1,
  },
});
