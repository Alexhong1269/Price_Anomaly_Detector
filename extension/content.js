// content.js
// Runs on Amazon product pages. First pass: extract price + product title,
// log them so we can confirm the selectors work before wiring up messaging.

function getProductTitle() {
    const titleEl = document.querySelector("#productTitle");
    return titleEl ? titleEl.textContent.trim() : null;
}
  
function getCurrentPrice() {
  // Amazon renders price across a few possible selectors depending on
  // page layout/experiment. Try the common ones in order.
  const priceSelectors = [
    "span.a-price span.a-offscreen",
    "#priceblock_ourprice",
    "#priceblock_dealprice"
  ];
  
  for (const selector of priceSelectors) {
    const el = document.querySelector(selector);
    if (el && el.textContent.trim()) {
      return el.textContent.trim();
    }
  }
  return null;
}

function getAsinFromUrl(url) {
  const match = url.match(/\/(?:dp|gp\/product)\/([A-Z0-9]{10})/);
  return match ? match[1] : null;
}

function scrapeProductInfo() {
  const title = getProductTitle();
  const priceText = getCurrentPrice();
  const url = window.location.href;
  const asin = getAsinFromUrl(url)
  
  if (!title || !priceText) {
    console.log("[PriceAnomalyDetector] Could not find title/price on this page.");
    return null;
  }

  if (!asin) {
    console.log("[PriceAnomanlyDetector] Could not extract ASIN from URL:", url);
  }
  
  const productInfo = {
    title,
    priceText,
    url,
    asin
  };
  
  console.log("[PriceAnomalyDetector] Scraped:", productInfo);
  return productInfo;
}
  
function sendToBackground(productInfo) {
  chrome.runtime.sendMessage(
      { type: "PRODUCT_SCRAPED", payload: productInfo},
      (response) => {
          if (crhome.runtime.lastError) {
              //Common during dev: background script not listening yet,
              // or the extension was reloaded and this content script is orphaned
              console.log("[PriceAnomalyDetector] Message Failed:", chrome.runtime.lastError.message);
              return;
          }
          console.log("[PriceAnomalyDetector] Background responded:", response);
      }
  );
}

const scraped = scrapeProductInfo();
  if (scraped) {
    sendToBackground(scraped)
  }