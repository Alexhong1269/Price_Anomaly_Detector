// background.js
// Service worker (Manifest V3). Runs on-demand, not persistently.
// Receives scraped product info from content.js, computes a price-anomaly
// verdict (scoring.js + historyLookup.js), and checks whether a cheaper
// matching listing exists on Amazon via Canopy (canopySearch.js).

import { getVerdict } from "./scoring.js";
import { getHistoricalPrices } from "./historyLookup.js";
import { searchAmazonByTitle } from "./canopySearch.js";

function parsePriceText(priceText) {
  // "$149.99" -> 149.99
  const cleaned = priceText.replace(/[^0-9.]/g, "");
  const value = parseFloat(cleaned);
  return Number.isNaN(value) ? null : value;
}

// Searches Amazon (via Canopy) for the same product and returns the
// cheapest matching alternative, if one is actually cheaper than the
// current page's price. Returns null if nothing cheaper was found.
async function findCheaperAlternative(productInfo, currentPrice) {
  const results = await searchAmazonByTitle(productInfo.title);

  let cheapest = null;

  for (const result of results) {
    // Skip results with no price at all (Canopy sometimes returns
    // price: null for out-of-stock or unavailable listings).
    if (!result.price?.display) {
      continue;
    }

    // Skip the current listing itself - if we're already on this exact
    // Amazon product, it's not a meaningful "alternative".
    if (productInfo.asin && result.asin === productInfo.asin) {
      continue;
    }

    const resultPrice = parsePriceText(result.price.display);
    if (resultPrice === null) {
      continue;
    }

    if (cheapest === null || resultPrice < cheapest.price) {
      cheapest = { price: resultPrice, asin: result.asin, title: result.title };
    }
  }

  if (cheapest && cheapest.price < currentPrice) {
    return {
      price: cheapest.price,
      title: cheapest.title,
      url: `https://www.amazon.com/dp/${cheapest.asin}`
    };
  }

  return null;
}

async function handleProductScraped(productInfo, sendResponse) {
  const { title, priceText, url } = productInfo;

  const currentPrice = parsePriceText(priceText);
  if (currentPrice === null) {
    console.log("[PriceAnomalyDetector] Could not parse price:", priceText);
    sendResponse({ status: "error", reason: "unparseable_price" });
    return;
  }

  // These two checks are independent of each other - run them
  // concurrently rather than one after the other.
  const [historicalPrices, cheaperAlternative] = await Promise.all([
    getHistoricalPrices(productInfo),
    findCheaperAlternative(productInfo, currentPrice)
  ]);

  const result = getVerdict(currentPrice, historicalPrices);
  console.log("[PriceAnomalyDetector] Verdict:", result);
  console.log("[PriceAnomalyDetector] Cheaper alternative:", cheaperAlternative);

  sendResponse({
    status: "ok",
    title,
    url,
    currentPrice,
    zScore: result.zScore,
    verdict: result.verdict,
    cheaperAlternative
  });
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "PRODUCT_SCRAPED") {
    console.log("[PriceAnomalyDetector] Received from content script:", message.payload);
    handleProductScraped(message.payload, sendResponse);
    return true;
  }
});