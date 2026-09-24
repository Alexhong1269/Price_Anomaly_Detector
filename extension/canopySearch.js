// canopySearch.js
// Searches for Amazon listings matching a given product title. Calls OUR
// OWN Supabase Edge Function (a proxy) instead of Canopy API directly -
// the real Canopy API key lives only on the server side (as a Supabase
// secret) and is never present in this extension's code at all.
//
// Canopy is Amazon-only - this can tell us "is there a cheaper Amazon
// listing of this product?" but not Target/Best Buy. Cross-retailer
// coverage beyond Amazon is a future expansion.

// Our Edge Function's URL. No CANOPY key needed here anymore - the proxy
// handles authenticating to Canopy on its own, server-side.
const SEARCH_PROXY_URL = "https://riijtwwllykaxlubnnvh.supabase.co/functions/v1/hyper-service";

// Supabase itself requires a valid Authorization header to invoke ANY
// Edge Function, separate from Canopy's key entirely - this is Supabase's
// own access control on who can call the function at all. This is the
// "publishable" key (safe to embed client-side, unlike a real secret).
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_LjW6Xoutz2Cs4VM6wQMuVA_Q1UlN1AF";

const CACHE_TTL_MS = 60 * 60 * 1000;

function cacheKeyFor(title) {
  return `canopy_cache:${title}`
}

async function getCachedResults(title) {
  const key = cacheKeyFor(title);
  const stored = await chrome.storage.local.get(key);
  const entry = stored[key];

  if (!entry) {
    return null;
  }

  const age = Date.now() - entry.cachedAt;
  if (age > CACHE_TTL_MS) {
    return null;
  }

  return entry.results;
}

async function setCachedResults(title, results) {
  const key = cacheKeyFor(title);
  await chrome.storage.local.set({
    [key] : { results, cachedAt: Date.now() }
  })
}

async function searchAmazonByTitle(title) {
  let response;
  try {
    response = await fetch(SEARCH_PROXY_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${SUPABASE_PUBLISHABLE_KEY}`
      },
      body: JSON.stringify({ searchTerm: title })
    });
  } catch (err) {
    console.log("[PriceAnomalyDetector] Search proxy request failed:", err.message);
    return [];
  }

  const data = await response.json();

  // Our own proxy's error format (e.g. missing secret, bad request) -
  // different from Canopy's own GraphQL "errors" (plural) format below.
  // Checking both matters: without this, a proxy-side problem would
  // silently fall through to "0 results" instead of surfacing clearly.
  if (data.error) {
    console.log("[PriceAnomalyDetector] Search proxy returned an error:", data.error);
    return [];
  }

  if (data.errors) {
    console.log("[PriceAnomalyDetector] Canopy returned errors:", data.errors);
    return [];
  }

  const results = data.data?.amazonProductSearchResults?.productResults?.results;

  if (!results) {
    // Neither a recognized error shape nor the expected data shape -
    // log everything so we can see exactly what came back.
    console.log("[PriceAnomalyDetector] Unrecognized response shape. Status:", response.status);
    console.log("[PriceAnomalyDetector] Raw response body:", data);
    return [];
  }

  console.log(`[PriceAnomalyDetector] Found ${results.length} results for "${title}"`);
  return results;
}

export { searchAmazonByTitle };