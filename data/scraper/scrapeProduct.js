const cheerio = require("cheerio");

const FETCH_HEADERS = {
    "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
};

function extractTitle($) {
    const title = $("#productTitle").text().trim();
    return title || null;
}

function extractPriceText($) {
    const priceSelectors = [
        "span.a-price span.a-offscreen",
        "#priceblock_ourprice",
        "#priceblock_dealprice"
    ];

    for (const selector of priceSelectors) {
        const text = $(selector).first().text().trim();
        if (text){
            return text;
        }
    }
    return null;
}

async function scrapeProductPage(url) {
    const response = await fetch(url, {headers: FETCH_HEADERS});

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

    const result = { url, title, priceText, scrapedAT: new Date().toISOString() };
    console.log("[scraper] Scraped:", result);
    return result;
}

