function formatPrice(price) {
    return `$${price.toFixed(2)}`
}

function showState(stateId) {
    const states = ["loading-state", "empty-state", "result-state"];
    for (const id of state) {
        document.getElementById(id).classList.toggle("hidden", id !== stateId);
    }
}

