# PricePulse architecture

This is a high-level overview of how PricePulse is built. It describes components and
design decisions without exposing implementation code, credentials or deployment details.

## System overview

```mermaid
flowchart TB
    subgraph Ingestion
      A[Scraper actors<br>Lazada, Shopee] --> B[Platform cleaners]
      B --> C[Canonical product matching]
      C --> D[Weekly aggregation]
      D --> E[Trend model]
    end
    E --> F[(MySQL)]
    subgraph Serving
      F --> G[Django web app<br>session auth]
      F --> H[Django REST API<br>JWT auth]
      H --> I[React Native app]
    end
    subgraph Background
      J[Celery beat] --> K[Celery workers]
      K --> A
      K --> L[Alert emails]
      M[(Redis)] --- K
      M --- G
    end
```

## Components

| Component | Responsibility |
|---|---|
| Web app | Server-rendered pages for search, product detail, bookmarks, calendar, analytics, profile and a staff panel. Page-specific JavaScript modules fetch JSON and render charts. |
| REST API | Products, price history, weekly stats, predictions, bookmarks, alerts, profile and on-demand scrape jobs. Used by the mobile app and by the web pages. |
| Mobile app | React Native (Expo) client with JWT login, token refresh, dashboard, search, bookmarks and profile. |
| Pipeline | Four phases: scrape and clean, weekly aggregation, prediction, database load. Every run is recorded as a batch with status and timings. |
| Task queue | Celery workers handle the weekly pipeline, single-product refreshes, model retraining, dashboard pre-computation and alert emails. Celery beat holds the schedule. |
| Cache | Redis serves as the Celery broker and the Django cache for expensive dashboard and search queries. |

## Key design decisions

| Decision | Why |
|---|---|
| Two auth modes (sessions for web, JWT for mobile) | The web app benefits from Django sessions and CSRF protection. The mobile app needs stateless tokens it can refresh. |
| Pipeline-owned tables are unmanaged by Django | The pipeline writes product, price and statistics tables in bulk. Keeping them outside Django migrations avoids schema conflicts between the two writers. User-facing tables such as profiles, bookmarks, alerts and notes are regular Django models. |
| Canonical product key | Each marketplace titles the same phone differently. Cleaners extract brand, model, RAM and storage into a canonical key so listings from all platforms land on one product. |
| Weekly granularity | Daily prices are noisy and scraping costs grow with frequency. Weekly aggregates keep the signal and match how people plan purchases around sale events. |
| Managed scraper actors | Hosted actors handle JavaScript rendering, proxies and anti-bot measures. API tokens are rotated across runs to spread quota usage. |
| Versioned models | Each training run is saved as a new version. Staff can switch the active version or roll back without retraining. |
| Alerts after load | Alerts are evaluated only after a successful database load, so a partial or failed scrape never triggers a false alert. |

## Data model (simplified)

```mermaid
erDiagram
    PRODUCT ||--o{ PRODUCT_PLATFORM : "listed on"
    PRODUCT ||--o{ PRICE_HISTORY : has
    PRODUCT ||--o{ WEEKLY_STATS : has
    PRODUCT ||--o{ PREDICTION : has
    USER ||--|| PROFILE : has
    USER ||--o{ BOOKMARK : saves
    USER ||--o{ PRICE_ALERT : sets
    USER ||--o{ CALENDAR_NOTE : writes
    PRODUCT ||--o{ BOOKMARK : ""
    PRODUCT ||--o{ PRICE_ALERT : ""
    SCRAPE_BATCH ||--o{ PRICE_HISTORY : produces
```

| Entity | Notes |
|---|---|
| Product | Canonical product with brand, category, RAM and storage |
| Product platform | A product's listing on one marketplace, with URL and latest price |
| Price history | One observed price per listing per scrape batch |
| Weekly stats | Per-product weekly aggregates and engineered features |
| Prediction | Next-week trend, confidence and model version |
| Scrape batch | One pipeline run with status, counts and timings |
| Profile, bookmark, alert, note | User-owned data managed by Django |

## Security measures

- Secrets come from environment variables and are never committed.
- Login attempts are rate-limited and locked out after repeated failures.
- API endpoints are throttled per user and per anonymous client.
- Staff-only views and endpoints are permission-checked on the server.
- The database is reachable only on a private network, never on a public port.
- Production runs behind a reverse proxy with TLS terminated at the edge.

## Deployment

Production runs as a Docker Compose stack (web, Celery worker, Celery beat, MySQL, Redis,
Nginx) on a self-hosted server, exposed through a tunnel. Configuration differs per
environment and is supplied through an environment file that is not part of the repository.
