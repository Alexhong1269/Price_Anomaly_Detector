function mean(numbers) {
    const sum = numbers.reduce((acc, n) => acc + n, 0);
    return sum / numbers.length;
}

function standardDeviation(numbers, avg) {
    const variance = 
        numbers.reduce((acc, n) => acc + (n - avg) ** 2, 0) / numbers.length;
    return Math.sqrt(variance);
}

function computeZScore(currentPrice, historicalPrices) {
    if (!historicalPrices || historicalPrices.length < 2) {
        //not enough history to be meaningful
        return null
    }

    const avg = mean(historicalPrices);
    const stdDev = standardDeviation(historicalPrices, avg);

    if (stdDev === 0) {
        return currentPrice < avg ? Infinity : 0;
    }

    return (currentPrice - avg) / stdDev;
}

function scoreToVerdict(zScore) {
    if (zScore === null) {
        return "unknown";
    }
    if (zScore <= -1.5) {
        return "good_deal";
    }
    if (zScore >= 1.5) {
        return "inflated";
    }
    return "average";
}

function getVerdict(currentPrice, historicalPrices) {
    const zScore = computeZScore(currentPrice, historicalPrices);
    return {
        zScore,
        verdict: scoreToVerdict(zScore)
    };
}