# Price Anomaly Detector

A Chrome extension that uses machine learning to flag whether a product's current price is a genuine deal or an inflated-then-discounted price. Built as a follow-up to [Tab Auto-Grouper](https://github.com/Alexhong1269/ChromeExtension_Tab_Grouper), this project involves the full ML pipeline: data collection, feature engineering, model training, and in-browser inference.

## The problem

Retailers often inflate a product's "original" price before applying a discount, making a markdown look bigger than it actually is. This extension analyzes historical price data to detect whether the current price is a statistical anomaly (a real deal) or within normal range (not actually a deal).

## How it works

1. A content script extracts the current price and product identifier from a shopping page
2. Historical price data for that product is retrieved or estimated
3. An anomaly-detection model scores the current price against historical patterns
4. The extension displays a verdict badge: **Good deal**, **Average**, or **Inflated**
5. The extension also checks a fixed list of supported retailers for the same product (matched by title/brand similarity); if a cheaper listing exists elsewhere, a link to that listing is shown alongside the verdict

## Project structure

```
price-anomaly-detector/
├── data/
│   ├── scraper/              # collects historical price data
│   └── training/              # scripts/notebooks for model training
├── model/
│   └── model.json + weights   # exported model artifacts
├── extension/
│   ├── manifest.json
│   ├── content.js             # scrapes current price from page
│   ├── background.js          # runs inference, coordinates
│   ├── popup.html/js          # shows verdict + price history chart
│   └── model/                 # bundled model files
└── README.md
```

## Approach

**Data**
- Starting point: a public price-history dataset (e.g., a Kaggle e-commerce pricing dataset) to bootstrap a working baseline
- Future: a lightweight scraper to log price snapshots over time for products visited, improving coverage with use

**Features**
- Deviation from rolling 30/90-day average price
- Position relative to historical min/max
- Rate of change (sudden drop vs. gradual decline)
- Day-of-week / seasonality effects (e.g., Black Friday baseline shifts)

**Model**
- Baseline: statistical anomaly detection (Z-score / IQR on deviation features) — fast to ship, no training required
- Upgrade path: Isolation Forest trained in scikit-learn, with scoring logic ported to JavaScript for fully client-side inference (no backend required)

**Cross-site comparison**
- Separate from the historical-price anomaly check: this compares the same product's price *across* a fixed list of supported retailers (e.g., Amazon, Target, Best Buy) at the current point in time
- Product matching is UPC-first: if a UPC/EAN is available for a listing, it's used to find exact matches on other retailers; if UPC isn't available (common for private-label items, bundles, or some marketplace listings), the extension falls back to title/brand text similarity (fuzzy match)
- If a cheaper listing is found on a supported site, the extension surfaces a link to that listing alongside the deal verdict, so the user can jump straight to the cheaper option

## Roadmap

- [ ] MVP: statistical baseline detector on one shopping site (e.g., Amazon)
- [ ] Badge UI showing deal verdict
- [ ] Historical price chart in popup
- [ ] Upgrade to Isolation Forest model
- [ ] Expand to additional shopping sites
- [ ] Cross-site product matching (UPC-first, title/brand fuzzy match fallback) across supported retailers
- [ ] Show link to cheaper listing on another supported site when found
- [ ] Optional: local price-logging to improve coverage over time

## Status

Early planning stage — architecture and approach defined, implementation not yet started.

## License

MIT