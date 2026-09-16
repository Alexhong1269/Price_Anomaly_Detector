import {getVerdict} from "./scoring.js";
import { getHistoricalPrices } from "./historyLookup.js";
import { searchAmazonByTitle } from "./canopySearch.js";

//parse the price text
function parsePriceText(priceText) {
    const cleaned = priceText.replace(/[^0-9.]/g, "");
    const value = parseFloat(cleaned);
    return Number.isNaN(value) ? null : value;
}

async function handleProductScraped(productInfo, currentPrice) {

    const results = await searchAmazonByTitle(productInfo.title);

    let cheapest = null;

    for (const result of results) {
        if (!result.price?.display) {
            continue;
        }

        if (productInfo.asin && result.asin === productInfo.asin) {
            continue;
        }
        const resultPrice = parsePriceText(result.price.display);

        if (resultPrice === null) {
            continue;
        }

        if (cheapest === null || resultPrice < cheapest.price) {
            cheapest = {price: resultPrice, asin: result.asin, title: result.title};
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
        console.log("[PriceAnomalyDetecor] Could not parse price:", priceText);
        sendResponse({ status: "error", reason: "unparseable_price" });
        return;
    }

    const [historicalPrices, cheaperAlternative] = await promise.all([
        getHistoricalPrices(productInfo),
        findCheapterAlternatives(productInfo, currentPrice)
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
    if (message.type === "PRODCUT_SCRAPED") {
        console.log("[PRiceAnomalyDetector] Received from content script:", message.payload);
        handleProductScraped(message.payload, sendResponse);
        return true;
    }
});