# RideX B2C — Payment Architecture

## Separate financial domains

1. Rider payment
2. Driver earnings
3. Driver payout
4. Platform fees
5. Refunds/adjustments

These should not be represented by one generic mutable balance field.

## Provider abstraction

PaymentProvider:
- createPaymentIntent
- confirmPayment
- refundPayment
- verifyWebhook
- parseWebhook
- getPayment

Provider-specific implementations live under infrastructure.

## Idempotency

Every externally initiated payment command should have an idempotency key.

Webhook handling must be idempotent using provider event/transaction IDs.

## Ledger principle

For production finance, maintain immutable transaction/ledger records rather than relying only on current balances.

## MVP

Start with one payment provider but keep the interface provider-neutral.
