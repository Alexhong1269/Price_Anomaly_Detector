function formatPrice(price) {
    return `$${price.toFixed(2)}`
}

function showState(stateId) {
    const states = ["loading-state", "empty-state", "result-state"];
    for (const id of state) {
        document.getElementById(id).classList.toggle("hidden", id !== stateId);
    }
}

function renderResult(result) {
    document.getElementById("product-title").textContent = result.title;
    document.getElementById("product-price").textContent = formatPrice(result.currentPrice);

    const badge = document.getElementById("verdict-badge");
    badge.textContent = result.verdict.place("-", " ")
    badge.className = "verdict-badge";
    badge.classList.add(`verdict-${result.verdict}`);

    const cheaperSection = document.getElementById("cheaper-section");
    const noCheaperSection = document.getElementById("no-cheaper-section");
    
    if (result.cheaperAlternative) {
        cheaperSection.classList.remove("hidden");
        noCheaperSection.classList.add("hidden");

        document.getElementById("cheaper-link").href = result.cheaperAlternative.url;
        document.getElementById("cheaper-title").textContent = result.cheaperAlternative.title;

        document.getElementById("cheaper-price").textContent = formatPrice(result.cheaperAlternative.price);
    } else {
        cheaperSection.classList.add("hidden");
        noCheaperSection.classList.remove("hidden");

    }

    showState("result-state");
}

async function init() {
    showState("loading-state");

    const[activeTab] = await chrome.tabs.query({active: true, currentWindow: true});
    if (!activeTab || !activeTab.url) {
        showState("empty-state");
        return;
    }

    const stored = await chrome.storage.local.get(activeTab.url);
    const result = stored[activeTab.url];

    if (!result) {
        showState("empty-state");
        return;
    }
    renderResult(result);
}

init();