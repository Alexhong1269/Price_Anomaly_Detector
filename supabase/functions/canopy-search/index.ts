// supabase/functions/canopy-search/index.ts
//
// Server-side proxy for Canopy API's Amazon product search. The Chrome
// extension calls THIS function instead of Canopy directly - the real
// Canopy API key lives only here, as a Supabase secret, and is never
// present in the extension's shipped code.
//
// Deployed with: supabase functions deploy canopy-search
// Secret set with: supabase secrets set CANOPY_API_KEY=your-real-key

const CANOPY_ENDPOINT = "https://graphql.canopyapi.co/";

// CORS headers: required because this function is called from a Chrome
// extension (a "chrome-extension://" origin), not a normal website.
// Without these, the browser blocks the response before the extension
// ever sees it.
const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type"
};

const SEARCH_QUERY = `
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

Deno.serve(async (req) => {
  // Browsers send a CORS "preflight" OPTIONS request before the real
  // POST, to check whether the actual request is allowed. We just need
  // to respond with the CORS headers to approve it.
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: CORS_HEADERS });
  }

  let searchTerm;
  try {
    const body = await req.json();
    searchTerm = body.searchTerm;
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
      status: 400,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" }
    });
  }

  if (!searchTerm) {
    return new Response(JSON.stringify({ error: "searchTerm is required" }), {
      status: 400,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" }
    });
  }

  const canopyApiKey = Deno.env.get("CANOPY_API_KEY");
  if (!canopyApiKey) {
    // This means the secret was never set via `supabase secrets set` -
    // a deployment/config problem, not something the caller did wrong.
    console.error("CANOPY_API_KEY secret is not set");
    return new Response(JSON.stringify({ error: "Server misconfigured" }), {
      status: 500,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" }
    });
  }

  const canopyResponse = await fetch(CANOPY_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${canopyApiKey}`
    },
    body: JSON.stringify({
      query: SEARCH_QUERY,
      variables: { searchTerm }
    })
  });

  const data = await canopyResponse.json();

  if (!canopyResponse.ok) {
    console.error("Canopy request failed with status: ", canopyResponse.status);
  }

  return new Response(JSON.stringify(data), {
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" }
  });
});