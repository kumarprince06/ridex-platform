package com.ridex.pricing.domain;

import com.ridex.shared.money.Money;

public record FareLine(FareLineType type, String label, Money amount, int sortOrder) {
}
