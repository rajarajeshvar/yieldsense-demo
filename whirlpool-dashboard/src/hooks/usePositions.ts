import { useState, useEffect, useCallback } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { api } from '../api';

export interface PositionData {
    address: string;
    positionMint: string;
    whirlpoolAddress: string;
    poolPair: string;
    tickLowerIndex: number;
    tickUpperIndex: number;
    minPrice: string;
    maxPrice: string;
    currentPrice: string;
    liquidity: string;
    tokenAAmount: string;
    tokenBAmount: string;
    inRange: boolean;
    unclaimedFeesA: string;
    unclaimedFeesB: string;
    tokenA: string;
    tokenB: string;
}

export const usePositions = () => {
    const { publicKey } = useWallet();
    // Removed direct whirlpool client usage
    // const { client } = useWhirlpoolClient(); 
    const [positions, setPositions] = useState<PositionData[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchPositions = useCallback(async () => {
        if (!publicKey) {
            setPositions([]);
            return;
        }

        setLoading(true);
        setError(null);

        try {
            console.log("usePositions: Fetching positions from backend for wallet:", publicKey.toString());
            const data = await api.getPositions(publicKey.toString());

            // Map backend data to frontend interface
            // Backend now returns pre-calculated prices and ranges
            // Check if data is array
            if (!Array.isArray(data)) {
                console.error("usePositions: API returned non-array data:", data);
                setError("Invalid data from server");
                setPositions([]);
                return;
            }

            const fetchedPositions: PositionData[] = data.map(pos => ({
                address: pos.positionAddress,
                positionMint: pos.positionMint,
                whirlpoolAddress: pos.whirlpoolAddress,
                poolPair: pos.poolPair || 'Unknown',
                tickLowerIndex: pos.tickLowerIndex,
                tickUpperIndex: pos.tickUpperIndex,
                minPrice: pos.minPrice,
                maxPrice: pos.maxPrice,
                currentPrice: pos.currentPrice,
                liquidity: formatLiquidity(pos.liquidity),
                tokenAAmount: pos.tokenAAmount,
                tokenBAmount: pos.tokenBAmount,
                inRange: pos.inRange,
                unclaimedFeesA: pos.feeOwedA,
                unclaimedFeesB: pos.feeOwedB,
                tokenA: pos.tokenA,
                tokenB: pos.tokenB,
            }));

            console.log(`usePositions: Found ${fetchedPositions.length} Whirlpool position(s)`);
            setPositions(fetchedPositions);
        } catch (err) {
            console.error("usePositions: Error fetching positions:", err);
            setError((err as Error).message);
        } finally {
            setLoading(false);
        }
    }, [publicKey]);

    useEffect(() => {
        fetchPositions();

        // Refresh every 60 seconds
        const interval = setInterval(fetchPositions, 60000);
        return () => clearInterval(interval);
    }, [fetchPositions]);

    const refresh = useCallback(() => {
        fetchPositions();
    }, [fetchPositions]);

    return { positions, loading, error, refresh };
};

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
        if (num > BigInt(1_000)) {
            return `${(Number(num / BigInt(1_000))).toFixed(2)}K`;
        }
        return liquidity;
    } catch {
        return liquidity;
    }
}
