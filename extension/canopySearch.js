// canopySearch.js
// Searches for Amazon listings matching a given product title. Calls OUR
// OWN Supabase Edge Function (a proxy) instead of Canopy API directly -
// the real Canopy API key lives only on the server side (as a Supabase
// secret) and is never present in this extension's code at all.
//
// Canopy is Amazon-only - this can tell us "is there a cheaper Amazon
// listing of this product?" but not Target/Best Buy. Cross-retailer
// coverage beyond Amazon is a future expansion.

// Our Edge Function's URL. No API key needed here anymore - the proxy
// handles authenticating to Canopy on its own, server-side.
const SEARCH_PROXY_URL = "https://riijtwwllykaxlubnnvh.supabase.co/functions/v1/hyper-service";

async function searchAmazonByTitle(title) {
  let response;
  try {
    response = await fetch(SEARCH_PROXY_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
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

  const results = data.data?.amazonProductSearchResults?.productResults?.results || [];
  console.log(`[PriceAnomalyDetector] Found ${results.length} results for "${title}"`);
  console.log(results);
  return results;
}

// --- Manual test run ---
// Swap in a real product title (or keyword phrase) to test against.
searchAmazonByTitle("clear phone case");