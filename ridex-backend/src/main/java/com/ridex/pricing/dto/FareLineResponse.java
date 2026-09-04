package com.ridex.pricing.dto;

import com.ridex.pricing.domain.FareLineType;

public record FareLineResponse(FareLineType type, String label, long amountMinor) {
}
