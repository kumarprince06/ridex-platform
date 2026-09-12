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
  const { data: products } = useQuery(() => listPassProducts(routeId), [routeId]);
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

  return (
    <Screen onBack={() => navigation.goBack()} title="Passes">
      {mine.length ? <Text style={styles.sectionLabel}>YOUR PASSES</Text> : null}

      {mine.map((pass) => (
        <View key={pass.id} style={styles.held}>
          <View style={styles.flex}>
            <Text style={styles.heldName}>{pass.productName}</Text>
            <Text style={styles.heldMeta}>
              {pass.rideLimit === 0
                ? 'Unlimited rides'
                : `${pass.rideLimit - pass.ridesUsed} of ${pass.rideLimit} rides left`}
              {' · until '}
              {shortDate(pass.endsOn)}
            </Text>
          </View>

          {pass.status === 'ACTIVE' ? (
            <Ionicons name="checkmark-circle" size={20} color={colors.primary} />
          ) : (
            <Button
              label={busy === pass.id ? 'Paying...' : 'Pay'}
              disabled={busy !== null}
              onPress={() => void payLater(pass)}
            />
          )}
        </View>
      ))}

      <Text style={styles.sectionLabel}>ON SALE FOR {routeName.toUpperCase()}</Text>

      {points && spendableNow(points).points > 0 ? (
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

      {error ? <Text style={styles.error}>{error}</Text> : null}

      {products?.length === 0 ? (
        <Text style={styles.muted}>No passes are on sale for this route yet.</Text>
      ) : null}

      {products?.map((product) => (
        <View key={product.id} style={styles.product}>
          <View style={styles.flex}>
            <Text style={styles.productName}>{product.name}</Text>
            <Text style={styles.productMeta}>
              {product.rideLimit === 0 ? 'Unlimited rides' : `${product.rideLimit} rides`} ·{' '}
              {product.durationDays} days
            </Text>
            {product.description ? (
              <Text style={styles.productNote}>{product.description}</Text>
            ) : null}
          </View>

          <Button
            label={busy === product.id ? 'Opening...' : money(product.priceMinor, product.currency)}
            disabled={busy !== null}
            onPress={() => void buy(product)}
          />
        </View>
      ))}
    </Screen>
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
