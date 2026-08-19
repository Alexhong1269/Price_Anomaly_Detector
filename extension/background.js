chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type == "PRODUCT_SCRAPPED") {
        console.log("[PriceAnomalyDetector] Received from content script:", message.payload);
        console.log("[PriceAnomalyDetector] Sender tab:", sender.tab ? sender.tab.url : "unknown");

        sendResponse({status: "received", echo: message.payload})

        return true;
    }
});