# RideX B2C — Technology Stack

## Backend
- Java 21
- Spring Boot 3.x
- Spring Security
- Spring Data JPA
- Flyway
- PostgreSQL
- Redis
- Maven

## Web
- React
- TypeScript
- Vite
- React Router
- TanStack Query
- React Hook Form
- Zod
- A component system such as MUI/Ant Design or a custom design system

## Mobile
- React Native
- TypeScript
- React Navigation
- TanStack Query
- secure token storage
- push notifications

## Real-time
Choose one primary mechanism:
- WebSocket/STOMP
or
- WebSocket with a dedicated event protocol

Use it for:
- ride status
- driver location
- offers
- operational monitoring

## Infrastructure
- Docker
- PostgreSQL
- Redis
- S3-compatible object storage
- CI/CD
- reverse proxy/load balancer

## Testing
Backend:
- JUnit 5
- Mockito
- Spring Boot Test
- Testcontainers
- integration tests

Frontend:
- Vitest/Jest
- React Testing Library
- Playwright for E2E

Mobile:
- unit/component tests
- device/emulator integration tests

## Documentation
- OpenAPI/Swagger
- Mermaid ERDs/state diagrams
- ADRs for major architectural decisions

## Important rule

Do not introduce Kafka, Kubernetes, microservices or a large event bus just because they sound enterprise-grade. Start modular monolith + queue/Redis infrastructure. Split services only when scale or team boundaries justify it.
