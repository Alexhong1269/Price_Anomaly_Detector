import {getVerdict} from "./scoring.js";

//parse the price text
function parsePriceText(priceText) {
    const cleaned = priceText.replace(/[^0-9.]/g, "");
    const value = parseFloat(cleaned);
    return Number.isNaN(value) ? null : value;
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type == "PRODUCT_SCRAPPED") {
        const {title, priceText, url} = message.payload;
        console.log("[PriceAnomalyDetector] Received from content script:", message.payload);

        const currentPrice = parsePriceText(priceText);
        if (currentPrice === null){
            console.log("[PriceAnomalyDetector] could not parse price:", priceText);
            sendResponse({status: "error", reason: "unparseable_price"});
            return true;
        } 

        const result = getVerdict(currentPrice);
        console.log("[PriceAnomalyDetector] Verdict:", result);

        sendResponse({
            status: "ok",
            title,
            url,
            currentPrice,
            zScore: result.zScore,
            verdict: result.verdict
        });

        return true;    
    }

});