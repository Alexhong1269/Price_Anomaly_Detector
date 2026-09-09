// canopySearch.js
// Searches Canopy API (Amazon product search) for listings matching a
// given product title. First pass: just fetch and log raw results, so we
// can confirm the query/response shape before building comparison logic.
//
// Canopy is Amazon-only - this can tell us "is there a cheaper Amazon
// listing of this product?" but not Target/Best Buy. Cross-retailer
// coverage beyond Amazon is a future expansion.

// Canopy API key - get one from https://canopyapi.co after signing up.
// Same caveat as any browser-extension-embedded key: this can't be truly
// hidden at runtime (anyone can read the extension's source), only kept
// out of git via .gitignore.
const CANOPY_API_KEY = "YOUR_CANOPY_API_KEY";
const CANOPY_ENDPOINT = "https://graphql.canopyapi.co/";

async function searchAmazonByTitle(title) {
  const query = `
    query amazonProductSearch($searchTerm: String!) {
      amazonProductSearchResults(input: { searchTerm: $searchTerm }) {
        productResults {
          results {
            title
            brand
            asin
            price {
              display
            }
          }
        }
      }
    }
  `;

  let response;
  try {
    response = await fetch(CANOPY_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${CANOPY_API_KEY}`
      },
      body: JSON.stringify({
        query,
        variables: { searchTerm: title }
      })
    });
  } catch (err) {
    console.log("[PriceAnomalyDetector] Canopy request failed:", err.message);
    return [];
  }

  const data = await response.json();

  if (data.errors) {
    console.log("[PriceAnomalyDetector] Canopy returned errors:", data.errors);
    return [];
  }

  const results = data.data?.amazonProductSearchResults?.productResults?.results || [];
  console.log(`[PriceAnomalyDetector] Canopy found ${results.length} results for "${title}"`);
  console.log(results);
  return results;
}

// --- Manual test run ---
// Swap in a real product title (or keyword phrase) to test against.
searchAmazonByTitle("clear phone case");