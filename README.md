# Price Anomaly Detector

A Chrome extension that uses machine learning to flag whether a product's current price is a genuine deal or an inflated-then-discounted price. Built as a follow-up to [Tab Auto-Grouper](https://github.com/Alexhong1269/ChromeExtension_Tab_Grouper), this project involves the full ML pipeline: data collection, feature engineering, model training, and in-browser inference.

## The problem

Retailers often inflate a product's "original" price before applying a discount, making a markdown look bigger than it actually is. This extension analyzes historical price data to detect whether the current price is a statistical anomaly (a real deal) or within normal range (not actually a deal).

## How it works

1. A content script extracts the current price and product identifier from a shopping page
2. Historical price data for that product is retrieved or estimated
3. An anomaly-detection model scores the current price against historical patterns
4. The extension displays a verdict badge: **Good deal**, **Average**, or **Inflated**
5. The extension also checks a fixed list of supported retailers for the same product (matched by title/brand similarity); if a cheaper listing exists elsewhere, a link to that listing is shown alongside the verdict

## Project structure

```
price-anomaly-detector/
├── data/
│   ├── scraper/              # collects historical price data
│   └── training/              # scripts/notebooks for model training
├── model/
│   └── model.json + weights   # exported model artifacts
├── extension/
│   ├── manifest.json
│   ├── content.js             # scrapes current price from page
│   ├── background.js 
|   ├── scoring.js         
│   ├── popup.html/js          # shows verdict + price history chart
│   └── model/                 # bundled model files
└── README.md
```

## Approach

**Data**
- Starting point: a public price-history dataset (e.g., a Kaggle e-commerce pricing dataset) to bootstrap a working baseline
- Future: a lightweight scraper to log price snapshots over time for products visited, improving coverage with use

**Features**
- Deviation from rolling 30/90-day average price
- Position relative to historical min/max
- Rate of change (sudden drop vs. gradual decline)
- Day-of-week / seasonality effects (e.g., Black Friday baseline shifts)

**Model**
- Baseline: statistical anomaly detection (Z-score / IQR on deviation features) — fast to ship, no training required
- Upgrade path: Isolation Forest trained in scikit-learn, with scoring logic ported to JavaScript for fully client-side inference (no backend required)

**Cross-site comparison**
- Separate from the historical-price anomaly check: this compares the same product's price *across* a fixed list of supported retailers (e.g., Amazon, Target, Best Buy) at the current point in time
- Product matching is done by title/brand text similarity (fuzzy match), not by a hard identifier like UPC
- If a cheaper listing is found on a supported site, the extension surfaces a link to that listing alongside the deal verdict, so the user can jump straight to the cheaper option

## SQL Schema
-- schema.sql
-- Storage schema for historical price data, shared by both data sources:
--   1. Keepa (or similar third-party API) - for well-covered retailers like Amazon
--   2. Our own scraper - for retailers not covered by an API
--
-- Designed for Supabase / Postgres.

-- One row per distinct product LISTING (a specific product on a specific
-- retailer's site). This is intentionally separate from "the same product
-- across sites" - that relationship is handled by product_groups below,
-- since matching is fuzzy and can be wrong/updated later.
create table product_listings (
  id uuid primary key default gen_random_uuid(),
  retailer text not null,              -- e.g. 'amazon', 'target', 'bestbuy'
  retailer_product_id text,            -- retailer's own SKU/ASIN if known, else null
  title text not null,                 -- scraped product title, used for fuzzy matching
  url text not null,
  created_at timestamptz not null default now(),

  unique (retailer, url)
);

-- The actual price history. Every price observation - whether it came from
-- Keepa's backfilled history or our own scraper's daily snapshot - lands
-- here as one row. `source` tells them apart; the scoring logic doesn't
-- need to care which source a given row came from.
create table price_history (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references product_listings(id) on delete cascade,
  price numeric(10, 2) not null,
  observed_at timestamptz not null,    -- when this price was true, not when we recorded it
  source text not null check (source in ('keepa', 'scraper')),
  created_at timestamptz not null default now()
);

-- Fast lookup: "give me the last N days of prices for this listing"
create index idx_price_history_listing_time
  on price_history (listing_id, observed_at desc);

-- Groups together product_listings that our fuzzy title/brand matcher has
-- determined are "the same product" across different retailers. This is
-- what powers the cross-site cheaper-link feature. Kept separate from
-- product_listings itself since a match can be wrong and may need
-- correcting without touching the underlying listing data.
create table product_groups (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now()
);

create table product_group_members (
  group_id uuid not null references product_groups(id) on delete cascade,
  listing_id uuid not null references product_listings(id) on delete cascade,
  match_confidence numeric(4, 3),      -- 0.000-1.000, from the fuzzy matcher
  primary key (group_id, listing_id)
);

## Roadmap

- [ ] MVP: statistical baseline detector on one shopping site (e.g., Amazon)
- [ ] Badge UI showing deal verdict
- [ ] Historical price chart in popup
- [ ] Upgrade to Isolation Forest model
- [ ] Expand to additional shopping sites
- [ ] Cross-site product matching (title/brand fuzzy match) across supported retailers
- [ ] Show link to cheaper listing on another supported site when found
- [ ] Optional: local price-logging to improve coverage over time

## Status

Early planning stage — architecture and approach defined, implementation not yet started.

## License

MIT