import { Request, Response } from "express";

// Simple in-memory cache
const historyCache = new Map<string, { data: any; timestamp: number }>();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export async function getMarketHistory(req: Request, res: Response) {
    const { days = "1", coinId = "solana" } = req.query;
    const cacheKey = `${coinId}-${days}`;

    const now = Date.now();
    const cached = historyCache.get(cacheKey);

    if (cached && now - cached.timestamp < CACHE_DURATION) {
        return res.json(cached.data);
    }

    try {
        console.log(`[getMarketHistory] Fetching history for ${coinId} (${days} days)...`);
        const response = await fetch(
            `https://api.coingecko.com/api/v3/coins/${coinId}/market_chart?vs_currency=usd&days=${days}`
        );

        if (!response.ok) {
            throw new Error(`CoinGecko API error: ${response.statusText}`);
        }

        const data = await response.json();

        // Format: [timestamp, price]
        const prices = data.prices.map((item: [number, number]) => ({
            time: item[0],
            price: item[1]
        }));

        historyCache.set(cacheKey, { data: prices, timestamp: now });
        res.json(prices);
    } catch (error: any) {
        console.error("Error fetching market history:", error);
        res.status(500).json({ error: "Failed to fetch market history" });
    }
}
