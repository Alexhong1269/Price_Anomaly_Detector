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
}