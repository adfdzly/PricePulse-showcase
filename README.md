<p align="center">
  <img src="site/assets/logo.svg" width="64" alt="PricePulse logo">
</p>

<h1 align="center">PricePulse</h1>

<p align="center">
  Price tracking and next-week trend prediction for phones and tablets across Malaysian e-commerce platforms.
  <br>
  <a href="https://adfdzly.github.io/PricePulse-showcase/"><strong>Open the live demo</strong></a>
  &middot;
  <a href="docs/ARCHITECTURE.md">Architecture</a>
  &middot;
  <a href="docs/ML.md">ML write-up</a>
</p>

<p align="center">
  <img src="docs/images/screenshots/dashboard.png" alt="PricePulse dashboard" width="900">
</p>

> **About this repository.** PricePulse is a private project. This repo is a public showcase
> with screenshots, design documentation and a clickable demo. It does not contain the
> application source, scrapers, trained models, credentials or any collected marketplace data.
> The demo runs entirely in the browser on synthetic data.

## What it does

Shoppers in Malaysia often see the same phone listed at very different prices on Lazada,
Shopee and TikTok Shop, and prices swing around sale events like 11.11 and 12.12.
PricePulse collects those listings every week, matches them to a single product, and answers
three questions:

1. **Where is it cheapest right now?** It compares platforms side by side and highlights the lowest listing.
2. **How has the price moved?** It shows weekly price history per platform, all-time lows and how far the current price sits from its average.
3. **Will it be cheaper next week?** A Random Forest model predicts UP, DOWN or STABLE with a confidence score.

Users can bookmark products, set a target price and get an email when the price falls to it.

## Features

| Area | Highlights |
|---|---|
| Search and discovery | Keyword search with autocomplete, filters for brand, category, price range and predicted trend, multiple sort orders |
| Product intelligence | Lowest price across platforms, per-platform price history chart, all-time low, spread between platforms, next-week prediction with confidence |
| Bookmarks and alerts | Save products, set target prices, email notification after each pipeline run |
| Dashboard | Platform price index, biggest weekly movers, trend distribution, brand-by-week movement heatmap |
| Promotion calendar | Sale events, triggered alerts and personal notes in one calendar |
| Staff panel | Pipeline job monitor, product and price management, model retrain, version switch and rollback |
| Mobile app | React Native (Expo) client using the same REST API with JWT auth |

## Screenshots

| Search | Product detail |
|---|---|
| ![Search](docs/images/screenshots/search.png) | ![Product detail](docs/images/screenshots/product.png) |
| **Bookmarks and alerts** | **Promotion calendar** |
| ![Bookmarks](docs/images/screenshots/bookmarks.png) | ![Calendar](docs/images/screenshots/calendar.png) |
| **Trend model** | **Data pipeline** |
| ![Trend model](docs/images/screenshots/model.png) | ![Pipeline](docs/images/screenshots/pipeline.png) |

<p align="center">
  <img src="docs/images/screenshots/mobile-dashboard.png" width="240" alt="Mobile dashboard">
  &nbsp;&nbsp;
  <img src="docs/images/screenshots/mobile-product.png" width="240" alt="Mobile product detail">
</p>

All screenshots come from the showcase demo, so the products, prices and predictions in them are synthetic.

## How it works

```mermaid
flowchart LR
    subgraph Sources
      L[Lazada]
      S[Shopee]
      T[TikTok Shop]
    end
    Sources -->|managed scraper actors| P1[Scrape and clean]
    P1 --> P2[Weekly aggregation]
    P2 --> P3[Trend prediction]
    P3 --> DB[(MySQL)]
    DB --> API[Django REST API]
    DB --> WEB[Django web app]
    API --> MOB[React Native app]
    DB --> AL[Price alert emails]
    Q[Celery beat + workers] -.schedules.-> P1
    R[(Redis)] -.broker and cache.-> Q
```

A Celery schedule runs the pipeline every week:

1. **Scrape and clean.** Lazada and Shopee are scraped in parallel. Platform-specific cleaners normalise titles, pull out brand, RAM and storage, and map each listing to a canonical product.
2. **Aggregate.** Listings become one row per product per week: min, max, median, volatility, momentum, listing counts and anomaly flags.
3. **Predict.** The active model version scores each product for next week.
4. **Load and alert.** Results are bulk-written to MySQL, caches are refreshed, and users whose target prices were hit get an email.

More detail is in [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

## Machine learning in brief

- **Task:** 3-class classification of next week's lowest-price move (UP, DOWN or STABLE).
- **Model:** Random Forest with `balanced_subsample` class weights, wrapped in a confidence threshold that sends uncertain UP and DOWN calls back to STABLE.
- **Features:** 28, covering price levels, lags, rolling statistics, momentum, volatility, listing activity and category z-scores.
- **Label band:** each training run picks the move threshold automatically, with a guard that keeps UP and DOWN meaningful.
- **Operations:** models are versioned. Staff can retrain, re-score, or roll back to an earlier version from the admin panel.

Weekly prices are mostly flat, which makes accuracy a misleading headline: a model that
always says STABLE scores about 76%. The write-up in [docs/ML.md](docs/ML.md) compares
SVM, Random Forest and XGBoost under a leakage-free walk-forward evaluation and explains why
macro F1 is the metric that matters here.

## Tech stack

| Layer | Technology |
|---|---|
| Backend | Python, Django, Django REST Framework, SimpleJWT |
| Data and jobs | MySQL, Redis, Celery (worker and beat), SQLAlchemy |
| Data processing and ML | pandas, NumPy, scikit-learn, matplotlib |
| Scraping | Apify actors via the Apify Python client, token rotation |
| Web frontend | Django templates, vanilla JavaScript modules, Chart.js |
| Mobile | React Native, Expo, TypeScript |
| Infrastructure | Docker Compose, Nginx, self-hosted server behind a tunnel |
| Security | django-axes login lockout, API throttling, CSRF protection, environment-based secrets |

## About the demo

The [live demo](https://adfdzly.github.io/PricePulse-showcase/) is a static re-creation of
the main user-facing pages. It shares the production visual theme, but:

- every product price, history point and prediction is generated in the browser from a fixed seed
- there is no server, no login and no network calls apart from fonts and Chart.js
- bookmarks and alert targets are saved only in your browser's local storage

To run it locally:

```bash
python -m http.server 8000 -d site
# open http://localhost:8000
```

## Repository contents

```text
site/               static demo (HTML, CSS, JS, synthetic data generator)
docs/ARCHITECTURE.md  system design and data model overview
docs/ML.md            model design and evaluation write-up
docs/images/          screenshots and evaluation chart
tools/screenshots.py  regenerates the README screenshots from the demo
```

## Author

Built by **Adrie Fadzly** as a final-year project on periodic price and trend analysis using
Random Forest classification across Malaysian online shopping platforms.

The source code is private. If you are a recruiter or reviewer and want a walkthrough,
please get in touch through my GitHub profile.

## License

The contents of this showcase are shared for viewing only. See [LICENSE](LICENSE).
Lazada, Shopee and TikTok Shop are trademarks of their respective owners; this project is
not affiliated with them.
