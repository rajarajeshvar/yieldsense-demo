/**
 * Price Service - Fetches real-time token prices
 * Uses CoinGecko API (more reliable CORS support) with Jupiter as fallback
 */

export interface TokenPrice {
    id: string;
    symbol: string;
    price: number;
}

// Simple in-memory cache
let priceCache: { solPrice: number; timestamp: number } = {
    solPrice: 0,
    timestamp: 0,
};
const CACHE_DURATION = 30000; // 30 seconds

/**
 * Fetch SOL price from CoinGecko (primary) or Jupiter (fallback)
 */
export async function getSOLPrice(): Promise<number> {
    const now = Date.now();

    // Return cached data if valid
    if (priceCache.solPrice > 0 && now - priceCache.timestamp < CACHE_DURATION) {
        return priceCache.solPrice;
    }

    // Try CoinGecko first (simpler API, better CORS support)
    try {
        console.log('Price Service: Fetching from CoinGecko...');
        const response = await fetch(
            'https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd',
            {
                method: 'GET',
                headers: { 'Accept': 'application/json' }
            }
        );

        if (response.ok) {
            const data = await response.json();
            const price = data.solana?.usd || 0;
            if (price > 0) {
                console.log('Price Service: Got SOL price from CoinGecko:', price);
                priceCache = { solPrice: price, timestamp: now };
                return price;
            }
        }
    } catch (error) {
        console.warn('Price Service: CoinGecko failed:', error);
    }

    // Fallback to Jupiter
    try {
        console.log('Price Service: Trying Jupiter fallback...');
        const response = await fetch(
            'https://price.jup.ag/v6/price?ids=So11111111111111111111111111111111111111112'
        );

        if (response.ok) {
            const data = await response.json();
            const price = data.data?.['So11111111111111111111111111111111111111112']?.price || 0;
            if (price > 0) {
                console.log('Price Service: Got SOL price from Jupiter:', price);
                priceCache = { solPrice: price, timestamp: now };
                return price;
            }
        }
    } catch (error) {
        console.warn('Price Service: Jupiter failed:', error);
    }

    // Return cached value if available (even if stale), otherwise return 0
    console.log('Price Service: All APIs failed, returning cached/default value');
    return priceCache.solPrice || 0;
}

/**
 * Fetch price for a specific token symbol from Jupiter
 */
export async function getTokenPrice(symbol: string): Promise<number> {
    if (!symbol) return 0;

    // Normalize symbol for common tokens
    const querySymbol = symbol === 'SOL' ? 'SOL' :
        symbol === 'USDC' ? 'USDC' :
            symbol === 'USDT' ? 'USDT' :
                symbol;

    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 sec timeout

        const response = await fetch(
            `https://price.jup.ag/v6/price?ids=${querySymbol}`,
            { signal: controller.signal }
        );
        clearTimeout(timeoutId);

        if (response.ok) {
            const data = await response.json();
            const price = data.data?.[querySymbol]?.price || 0;
            if (price > 0) {
                return price;
            }
        }
    } catch (error) {
        console.warn(`Price Service: Failed to fetch price for ${symbol}:`, error);
    }

    return 0;
}

/**
 * Get multiple token prices
 */
export async function getTokenPrices(): Promise<{ solPrice: number; usdcPrice: number }> {
    const solPrice = await getSOLPrice();
    return {
        solPrice,
        usdcPrice: 1, // USDC is always ~$1
    };
}

/**
 * Format price for display
 */
export function formatPrice(price: number, decimals: number = 2): string {
    if (price >= 1000000) {
        return `$${(price / 1000000).toFixed(decimals)}M`;
    }
    if (price >= 1000) {
        return `$${(price / 1000).toFixed(decimals)}K`;
    }
    return `$${price.toFixed(decimals)}`;
}

/**
 * Format large numbers with commas
 */
export function formatNumber(num: number): string {
    return new Intl.NumberFormat('en-US').format(num);
}
