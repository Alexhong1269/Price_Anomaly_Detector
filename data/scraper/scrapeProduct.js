// scrapeProduct.js
// Standalone Node scraper. Fetches an Amazon product page, extracts
// title + price using Cheerio, and writes a price snapshot into Supabase
// (product_listings + price_history tables, per data/schema.sql).

require("dotenv").config();
const cheerio = require("cheerio");
const { createClient } = require("@supabase/supabase-js");

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

// Amazon blocks requests that don't look like a real browser, so we send
// a realistic User-Agent header. Even with this, Amazon may still block
// or CAPTCHA a script making frequent automated requests - a known
// limitation of scraping Amazon directly that we may need to revisit
// (e.g. rotating user agents, proxies, or slowing down request frequency).
const FETCH_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
};

function extractTitle($) {
  const title = $("#productTitle").text().trim();
  return title || null;
}

function extractPriceText($) {
  // Same selector fallback approach as content.js, since Amazon's price
  // markup varies by page/experiment.
  const priceSelectors = [
    "span.a-price span.a-offscreen",
    "#priceblock_ourprice",
    "#priceblock_dealprice"
  ];

  for (const selector of priceSelectors) {
    const text = $(selector).first().text().trim();
    if (text) {
      return text;
    }
  }
  return null;
}

function parsePriceText(priceText) {
  // "$149.99" -> 149.99. Same approach as background.js's parsePriceText.
  const cleaned = priceText.replace(/[^0-9.]/g, "");
  const value = parseFloat(cleaned);
  return Number.isNaN(value) ? null : value;
}

async function scrapeProductPage(url) {
  const response = await fetch(url, { headers: FETCH_HEADERS });

  if (!response.ok) {
    throw new Error(`Fetch failed for ${url}: ${response.status} ${response.statusText}`);
  }

  const html = await response.text();
  const $ = cheerio.load(html);

  const title = extractTitle($);
  const priceText = extractPriceText($);

  if (!title || !priceText) {
    console.log(`[scraper] Could not extract title/price from ${url}`);
    return null;
  }

  const result = { url, title, priceText, scrapedAt: new Date().toISOString() };
  console.log("[scraper] Scraped:", result);
  return result;
}

// Writes one price snapshot to Supabase. Two steps, matching schema.sql:
//   1. Upsert the listing (product_listings) - creates it on first sight,
//      reuses the same row on later visits (unique on retailer + url).
//   2. Insert a new price_history row pointing at that listing.
async function saveScrapeResult(scraped) {
  const price = parsePriceText(scraped.priceText);
  if (price === null) {
    console.log(`[scraper] Could not parse price "${scraped.priceText}", skipping save.`);
    return;
  }

  const { data: listing, error: listingError } = await supabase
    .from("product_listings")
    .upsert(
      { retailer: "amazon", url: scraped.url, title: scraped.title },
      { onConflict: "retailer,url" }
    )
    .select()
    .single();

  if (listingError) {
    console.error("[scraper] Failed to upsert listing:", listingError.message);
    return;
  }

  const { error: priceError } = await supabase.from("price_history").insert({
    listing_id: listing.id,
    price,
    observed_at: scraped.scrapedAt,
    source: "scraper"
  });

  if (priceError) {
    console.error("[scraper] Failed to insert price history:", priceError.message);
    return;
  }

  console.log(`[scraper] Saved price $${price} for listing ${listing.id}`);
}

// --- Manual test run ---
// Swap in a real Amazon product URL to test against.
const TEST_URL = "https://www.amazon.com/dp/B08N5WRWNW";

scrapeProductPage(TEST_URL)
  .then((scraped) => {
    if (scraped) {
      return saveScrapeResult(scraped);
    }
  })
  .catch((err) => {
    console.error("[scraper] Error:", err.message);
  });