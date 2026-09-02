import {getVerdict} from "./scoring.js";
import { getHistoricalPrices } from "./historyLookup.js";

//parse the price text
function parsePriceText(priceText) {
    const cleaned = priceText.replace(/[^0-9.]/g, "");
    const value = parseFloat(cleaned);
    return Number.isNaN(value) ? null : value;
}

async function handleProductScraped(productInfo, sendResponse) {
    const {title, priceText, url} = productInfo;

    const currentPrice = parsePriceText(priceText);
    if (currentPrice === null) {
        console.log("[PriceAnomalyDetector] Could not parse Price:", priceText);
        sendResponse({ status: "error", reason: "unparseable_price" });
        return;
    }

    const historicalPrices = await getHistoricalPrices(productInfo);
    const result = getVerdict(currentPrice, historicalPrices);
    console.log("[PriceAnomalyDetector] Verdict:", result)

    sendResponse({
        status: "ok",
        title,
        url,
        currentPrice,
        zScore: result.zScore,
        verdict: result.verdict
    });
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === "PRODUCT_SCRAPPED") {
        console.log("[PriceAnomalyDetector] Received from content script:", message.payload);
        handleProductScraped(message.payload, sendResponse)


        return true;
    }

});