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
  upc text,                            -- UPC/EAN if available (not all listings have one)
  title text not null,                 -- scraped product title, used for fuzzy matching fallback
  url text not null,
  created_at timestamptz not null default now(),

  unique (retailer, url)
);

-- Fast lookup for UPC-based matching: "find other listings with this UPC"
create index idx_product_listings_upc
  on product_listings (upc)
  where upc is not null;

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

-- Groups together product_listings that we've determined are "the same
-- product" across different retailers. This is what powers the cross-site
-- cheaper-link feature. Matching strategy is UPC-first: if both listings
-- have a UPC and it matches, that's used (match_method = 'upc',
-- confidence 1.000). If UPC isn't available on one or both sides, we fall
-- back to fuzzy title/brand matching (match_method = 'fuzzy'). Kept
-- separate from product_listings itself since a fuzzy match can be wrong
-- and may need correcting without touching the underlying listing data.
create table product_groups (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now()
);

create table product_group_members (
  group_id uuid not null references product_groups(id) on delete cascade,
  listing_id uuid not null references product_listings(id) on delete cascade,
  match_method text not null check (match_method in ('upc', 'fuzzy')),
  match_confidence numeric(4, 3),      -- 0.000-1.000. 1.000 for exact UPC matches;
                                        -- a real fuzzy score when match_method = 'fuzzy'
  primary key (group_id, listing_id)
);