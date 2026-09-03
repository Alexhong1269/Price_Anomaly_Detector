function getRetailerFromURL(url) {
    const hostname = new URL(url).hostname;

    if (hostname.includes("amazon.com")) {
        return "amazon";
    }
    if (hostname.includes("target.com")) { 
        return "target";
    }
    if (hostname.includes("bestbuy.com")) {
        return "bestbuy";
    }
    return "unsupported";
}


async function getScrapedHistory(productInfo, retailer) {
    console.log(`[PriceAnomalyDetector] (stub) Would query our own ${retailer} price history for:`, productInfo.title);
    return [200, 195, 205, 210, 190, 198, 202];
}

async function getHistoricalPrices(productInfo) {
    const retailer = getRetailerFromURL(productInfo.url)

    switch (retailer) {
        case "amazon":
        case "target":
        case "bestbuy":
            return getScrapedHistory(productInfo, retailer);
        default:
            console.log("[PriceAnomalyDetector] Unsupported retailer for:", productInfo.url);
            return [];
    }
}

export { getHistoricalPrices };