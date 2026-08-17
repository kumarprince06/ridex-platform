# RideX B2C — Initial API Contract

## Authentication

POST /api/v1/auth/register
POST /api/v1/auth/login
POST /api/v1/auth/refresh
POST /api/v1/auth/logout
POST /api/v1/auth/verify
POST /api/v1/auth/forgot-password
POST /api/v1/auth/reset-password

## Rider

GET /api/v1/rider/profile
PUT /api/v1/rider/profile
POST /api/v1/rides/estimate
POST /api/v1/rides
GET /api/v1/rides/{rideId}
POST /api/v1/rides/{rideId}/cancel
GET /api/v1/rides
POST /api/v1/rides/{rideId}/rating

## Driver

GET /api/v1/driver/profile
PUT /api/v1/driver/profile
POST /api/v1/driver/documents
GET /api/v1/driver/onboarding
POST /api/v1/driver/availability
GET /api/v1/driver/offers
POST /api/v1/driver/offers/{offerId}/accept
POST /api/v1/driver/offers/{offerId}/reject
POST /api/v1/trips/{tripId}/arrive
POST /api/v1/trips/{tripId}/start
POST /api/v1/trips/{tripId}/complete

## Payments

POST /api/v1/payments/{tripId}/intent
POST /api/v1/payments/{tripId}/confirm
POST /api/v1/payments/webhooks/{provider}
GET /api/v1/payments/{paymentId}

## Admin

GET /api/v1/admin/dashboard
GET /api/v1/admin/riders
GET /api/v1/admin/drivers
GET /api/v1/admin/trips
GET /api/v1/admin/payments
POST /api/v1/admin/drivers/{driverId}/approve
POST /api/v1/admin/drivers/{driverId}/suspend

Never expose internal database IDs or provider secrets unnecessarily. Prefer opaque IDs.
