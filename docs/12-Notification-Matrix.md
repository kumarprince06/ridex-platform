# RideX B2C — Notification Matrix

| Event | Rider | Driver | Admin/Ops | Channels |
|---|---|---|---|---|
| Registration | Yes | Yes | No | Email/SMS |
| Verification | Yes | Yes | No | Email/SMS |
| Ride requested | Yes | Eligible drivers | Optional | Push |
| Driver assigned | Yes | Yes | Optional | Push/SMS |
| Driver arriving | Yes | Yes | No | Push |
| Trip started | Yes | Yes | No | Push |
| Trip completed | Yes | Yes | Optional | Push/Email |
| Payment success | Yes | No | Optional | Push/Email |
| Payment failed | Yes | No | Optional | Push/Email |
| Driver approved | No | Yes | No | Push/Email |
| Driver rejected | No | Yes | No | Push/Email |
| Payout initiated | No | Yes | Yes | Push/Email |
| Payout failed | No | Yes | Yes | Push/Email |
| Support update | Yes/Driver | Yes/Driver | Yes | Push/Email |

## Architecture

Domain event → transactional/outbox record → worker → notification dispatcher → channel provider.

Do not publish a critical notification only through an in-memory event if losing the process could lose the business communication.
