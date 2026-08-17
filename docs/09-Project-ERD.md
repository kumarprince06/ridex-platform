# RideX B2C — ERD

The following is the logical MVP ERD. It is intentionally not a tenant-per-database model.

```mermaid
erDiagram
    USERS ||--o| RIDER_PROFILES : has
    USERS ||--o| DRIVER_PROFILES : has
    DRIVER_PROFILES ||--o{ DRIVER_DOCUMENTS : submits
    DRIVER_PROFILES ||--o| DRIVER_VEHICLES : operates
    RIDERS ||--o{ RIDE_REQUESTS : creates
    RIDER_PROFILES ||--o{ RIDE_REQUESTS : requests
    RIDE_REQUESTS ||--o| TRIPS : becomes
    DRIVER_PROFILES ||--o{ TRIPS : performs
    DRIVER_VEHICLES ||--o{ TRIPS : uses
    RIDE_REQUESTS ||--o{ RIDE_OFFERS : generates
    DRIVER_PROFILES ||--o{ RIDE_OFFERS : receives
    TRIPS ||--o{ TRIP_LOCATIONS : records
    TRIPS ||--o{ TRIP_STATUS_HISTORY : records
    TRIPS ||--o{ PAYMENTS : has
    PAYMENTS ||--o{ REFUNDS : may_have
    TRIPS ||--o| FARE_BREAKDOWNS : has
    DRIVER_PROFILES ||--o{ DRIVER_EARNINGS : earns
    DRIVER_EARNINGS ||--o{ DRIVER_PAYOUTS : settles
    TRIPS ||--o{ DRIVER_EARNINGS : contributes
    TRIPS ||--o{ RATINGS : receives
    USERS ||--o{ NOTIFICATIONS : receives
    USERS ||--o{ SUPPORT_TICKETS : creates
    SUPPORT_TICKETS ||--o{ SUPPORT_MESSAGES : contains
    USERS ||--o{ USER_SESSIONS : owns
    USERS ||--o{ AUDIT_LOGS : generates

    USERS {
      string id PK
      string email UK
      string phone UK
      string password_hash
      string status
      timestamp created_at
      timestamp updated_at
    }

    RIDER_PROFILES {
      string id PK
      string user_id FK
      string first_name
      string last_name
      string profile_image_id
    }

    DRIVER_PROFILES {
      string id PK
      string user_id FK
      string approval_status
      string onboarding_status
      decimal rating
    }

    DRIVER_VEHICLES {
      string id PK
      string driver_id FK
      string vehicle_type
      string registration_number UK
      string status
    }

    RIDE_REQUESTS {
      string id PK
      string rider_id FK
      string pickup_lat
      string pickup_lng
      string destination_lat
      string destination_lng
      string status
      decimal estimated_fare
      timestamp requested_at
    }

    TRIPS {
      string id PK
      string ride_request_id FK
      string rider_id FK
      string driver_id FK
      string vehicle_id FK
      string status
      timestamp started_at
      timestamp completed_at
    }

    PAYMENTS {
      string id PK
      string trip_id FK
      decimal amount
      string currency
      string status
      string provider
      string provider_transaction_id UK
    }

    DRIVER_EARNINGS {
      string id PK
      string driver_id FK
      string trip_id FK
      decimal gross
      decimal platform_fee
      decimal adjustments
      decimal net
    }

    DRIVER_PAYOUTS {
      string id PK
      string driver_id FK
      decimal amount
      string status
      string provider_reference
    }
```

## Later tables

- saved_places
- payment_methods
- promotions
- coupons
- scheduled_rides
- multi_stop_locations
- corporate_accounts
- wallets
- fraud_cases
- safety_incidents
- pricing_rules
- service_areas
- driver_incentives
