package com.ridex.pricing.domain;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.math.BigDecimal;
import java.util.Currency;

import org.junit.jupiter.api.Test;

import com.ridex.shared.money.Money;

class FareCalculatorTest {

    private static final Currency INR = Currency.getInstance("INR");

    /** The seeded ECONOMY rates: base 30, 12/km, 1.50/min, minimum 50. */
    private static FareRates economy(String surge) {
        return new FareRates(
                INR,
                Money.of(3000, INR),
                Money.of(1200, INR),
                Money.of(150, INR),
                Money.of(5000, INR),
                300,
                Money.of(200, INR),
                new BigDecimal(surge));
    }

    @Test
    void addsBaseDistanceAndTime() {
        // 10km at 12/km = 120, 20min at 1.50/min = 30, plus 30 base = 180.
        Fare fare = FareCalculator.calculate(economy("1.00"), 10_000, 1200);

        assertThat(fare.total()).isEqualTo(Money.of(18000, INR));
        assertThat(fare.lines()).extracting(FareLine::type)
                .containsExactly(FareLineType.BASE, FareLineType.DISTANCE, FareLineType.TIME);
    }

    @Test
    void theLinesAlwaysSumToTheTotal() {
        // The property the whole design rests on: a receipt whose lines do not add up is worse
        // than no receipt, because it looks authoritative.
        for (int km = 1; km <= 40; km++) {
            for (int minutes : new int[] {3, 17, 46, 90}) {
                Fare fare = FareCalculator.calculate(economy("1.35"), km * 1000, minutes * 60);

                Money summed = fare.lines().stream()
                        .map(FareLine::amount)
                        .reduce(Money.zero(INR), Money::plus);

                assertThat(summed).as("%d km, %d min", km, minutes).isEqualTo(fare.total());
            }
        }
    }

    @Test
    void surgeIsItsOwnLineRatherThanBakedIntoTheRates() {
        Fare plain = FareCalculator.calculate(economy("1.00"), 10_000, 1200);
        Fare surged = FareCalculator.calculate(economy("1.50"), 10_000, 1200);

        // A rider who cannot see the multiplier cannot tell a surge from a permanent price rise.
        assertThat(plain.lines()).noneMatch(line -> line.type() == FareLineType.SURGE);
        assertThat(surged.lines()).anyMatch(line -> line.type() == FareLineType.SURGE);
        assertThat(surged.total()).isEqualTo(Money.of(27000, INR));
    }

    @Test
    void aShortTripIsLiftedToTheMinimumWithAVisibleLine() {
        // 1km, 2min: 30 + 12 + 3 = 45, under the 50 minimum.
        Fare fare = FareCalculator.calculate(economy("1.00"), 1000, 120);

        assertThat(fare.total()).isEqualTo(Money.of(5000, INR));
        assertThat(fare.lines()).anyMatch(line -> line.type() == FareLineType.MINIMUM_FARE_ADJUSTMENT);
    }

    @Test
    void aFareAtExactlyTheMinimumGetsNoAdjustmentLine() {
        // Boundary: the adjustment must be strictly-below, or every minimum-fare trip grows a
        // zero-value line the rider has to wonder about.
        FareRates rates = new FareRates(
                INR, Money.of(5000, INR), Money.of(0, INR), Money.of(0, INR),
                Money.of(5000, INR), 300, Money.of(200, INR), BigDecimal.ONE);

        Fare fare = FareCalculator.calculate(rates, 0, 0);

        assertThat(fare.total()).isEqualTo(Money.of(5000, INR));
        assertThat(fare.lines()).noneMatch(line -> line.type() == FareLineType.MINIMUM_FARE_ADJUSTMENT);
    }

    @Test
    void rejectsNegativeInputs() {
        assertThatThrownBy(() -> FareCalculator.calculate(economy("1.00"), -1, 60))
                .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void waitingInsideTheFreeAllowanceCostsNothing() {
        // 5 minutes free. A driver who arrives early must not start a meter on a rider who is
        // still on time.
        Fare fare = FareCalculator.calculate(economy("1.00"), 10_000, 1200, 300);

        assertThat(fare.lines()).noneMatch(line -> line.type() == FareLineType.WAITING);
        assertThat(fare.total()).isEqualTo(Money.of(18000, INR));
    }

    @Test
    void onlyWaitingBeyondTheAllowanceIsCharged() {
        // 8 minutes waited, 5 free, 3 chargeable at 2.00/min = 6.00.
        Fare fare = FareCalculator.calculate(economy("1.00"), 10_000, 1200, 480);

        assertThat(fare.lines())
                .filteredOn(line -> line.type() == FareLineType.WAITING)
                .singleElement()
                .extracting(FareLine::amount)
                .isEqualTo(Money.of(600, INR));
        assertThat(fare.total()).isEqualTo(Money.of(18600, INR));
    }

    @Test
    void surgeAppliesToWaitingToo() {
        // Waiting is part of the fare before the multiplier, not a flat charge bolted on after -
        // otherwise the lines stop summing to the total.
        Fare fare = FareCalculator.calculate(economy("1.50"), 10_000, 1200, 480);

        Money summed = fare.lines().stream()
                .map(FareLine::amount)
                .reduce(Money.zero(INR), Money::plus);

        assertThat(summed).isEqualTo(fare.total());
        assertThat(fare.total()).isEqualTo(Money.of(27900, INR));
    }

    @Test
    void theLinesStillSumWithWaitingAcrossManyCombinations() {
        for (int km = 1; km <= 25; km++) {
            for (int waitingMinutes : new int[] {0, 4, 5, 6, 30}) {
                Fare fare = FareCalculator.calculate(
                        economy("1.35"), km * 1000, 900, waitingMinutes * 60);

                Money summed = fare.lines().stream()
                        .map(FareLine::amount)
                        .reduce(Money.zero(INR), Money::plus);

                assertThat(summed).as("%d km, %d min waiting", km, waitingMinutes)
                        .isEqualTo(fare.total());
            }
        }
    }
}
