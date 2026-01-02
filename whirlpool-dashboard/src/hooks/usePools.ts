import { useState, useEffect } from 'react';
import { api } from '../api';

export interface PoolData {
    address: string;
    tokenA: string;
    tokenB: string;
    liquidity: string;
    price: string;
    feeTier: number;
    tickSpacing: number;
}

const POPULAR_POOLS = [
    {
        // SOL/USDC Whirlpool (64 tick spacing, 0.01% fee)
        address: "HJPjoWUrhoZzkNfRpHuieeFk9WcZWjwy6PBjZ81ngndJ",
        tokenA: "SOL",
        tokenB: "USDC",
        feeTier: 0.01,
        decimalsA: 9,
        decimalsB: 6
    },
    {
        // SOL/USDC Whirlpool (128 tick spacing, 0.04% fee) - more popular
        address: "Czfq3xZZDmsdGdUyrNLtRhGc47cXcZtLG4crryfu44zE",
        tokenA: "SOL",
        tokenB: "USDC",
        feeTier: 0.04,
        decimalsA: 9,
        decimalsB: 6
    },
    {
        // JupSOL/SOL Whirlpool
        address: "DtYKbQELgMZ3ihFUrCcCs9gy4djcUuhwgR7UpxVpP2Tg",
        tokenA: "JupSOL",
        tokenB: "SOL",
        feeTier: 0.01,
        decimalsA: 9,
        decimalsB: 9
    },
    {
        // PENGU/SOL Whirlpool (SOL is tokenA in this pool)
        address: "GF8T9bW7oJr5s4zL9Ai8yMwxx5MHm45G7BvArBkfjGJV",
        tokenA: "SOL",
        tokenB: "PENGU",
        feeTier: 0.30,
        decimalsA: 9,
        decimalsB: 6
    },
    {
        // JUP/SOL Whirlpool
        address: "C1MgLojNLWBKADvu9BHdtgzz1oZX4dZ5zGdGcgvvW8Wz",
        tokenA: "JUP",
        tokenB: "SOL",
        feeTier: 0.30,
        decimalsA: 6,
        decimalsB: 9
    }
];

export const usePools = () => {
    const [pools, setPools] = useState<PoolData[]>(POPULAR_POOLS.map(p => ({
        address: p.address,
        tokenA: p.tokenA,
        tokenB: p.tokenB,
        liquidity: "Loading...",
        price: "Loading...",
        feeTier: p.feeTier,
        tickSpacing: 64
    })));
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchPools = async () => {
            setLoading(true);

            try {
                // Fetch from backend
                const fetchedPools: PoolData[] = [];

                for (const poolInfo of POPULAR_POOLS) {
                    try {
                        // Use backend API
                        const data = await api.getPool(poolInfo.address);

                        // Parse price - backend returns string
                        const price = parseFloat(data.price);

                        fetchedPools.push({
                            address: poolInfo.address,
                            tokenA: poolInfo.tokenA,
                            tokenB: poolInfo.tokenB,
                            liquidity: formatLiquidity(data.liquidity),
                            price: `$${price.toFixed(4)}`,
                            feeTier: poolInfo.feeTier,
                            tickSpacing: data.tickSpacing
                        });
                    } catch (e) {
                        console.error(`Failed to fetch pool ${poolInfo.address}:`, e);
                    }
                }

                if (fetchedPools.length > 0) {
                    setPools(fetchedPools);
                } else {
                    // Fallback to error state if all failed
                    setPools(prev => prev.map(p => ({ ...p, price: "Unavailable" })));
                }

            } catch (error) {
                console.error("usePools: Error fetching pools:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchPools();

        // Refresh every 60 seconds (1 minute)
        const interval = setInterval(fetchPools, 60000);
        return () => clearInterval(interval);
    }, []);

    return { pools, loading };
};

/**
 * Format large liquidity numbers for display
 */
function formatLiquidity(liquidity: string): string {
    try {
        const num = BigInt(liquidity);
        if (num > BigInt(1_000_000_000_000)) {
            return `${(Number(num / BigInt(1_000_000_000_000))).toFixed(2)}T`;
        }
        if (num > BigInt(1_000_000_000)) {
            return `${(Number(num / BigInt(1_000_000_000))).toFixed(2)}B`;
        }
        if (num > BigInt(1_000_000)) {
            return `${(Number(num / BigInt(1_000_000))).toFixed(2)}M`;
        }
        return liquidity;
    } catch {
        return liquidity;
    }
}
