import { createSolanaRpc, address, getBase64Encoder } from "@solana/kit";
import { fetchPositionsForOwner } from "@orca-so/whirlpools";
import { getPool } from "./getPool.js";
import { getWhirlpoolsProgramId } from "../utils/connection.js";

// Mainnet RPC URL
const RPC_URL = process.env.RPC_URL || "https://api.mainnet-beta.solana.com";

export interface PositionInfoNew {
    positionMint: string;
    whirlpoolAddress: string;
    tickLowerIndex: number;
    tickUpperIndex: number;
    liquidity: string;
    isBundle: boolean;
    poolPair: string;
    tokenA: string;
    tokenB: string;
}

import { resolveTokenSymbol, getPoolPair } from "../utils/tokenMetadata.js";

/**
 * Fetch all Whirlpool positions for a wallet using the New SDK (@orca-so/whirlpools)
 * which uses @solana/kit (web3.js v2 style)
 */
export async function getPositionsNew(walletAddress: string): Promise<PositionInfoNew[]> {
    // Create RPC client compatible with @solana/kit
    const rpc = createSolanaRpc(RPC_URL);

    try {
        const owner = address(walletAddress);

        // Fetch positions
        const positions = await fetchPositionsForOwner(rpc, owner);

        // Transform to simple format
        const result: PositionInfoNew[] = [];

        // Collect all unique whirlpool addresses
        const whirlpoolAddresses = new Set<string>();
        for (const pos of positions) {
            if (pos.isPositionBundle) {
                for (const p of pos.positions) {
                    whirlpoolAddresses.add(p.data.whirlpool);
                }
            } else {
                whirlpoolAddresses.add(pos.data.whirlpool);
            }
        }

        // Create a map of whirlpool address -> pool data
        const poolMap = new Map<string, { tokenMintA: string, tokenMintB: string }>();

        // Fetch pools in parallel using legacy getPool handler
        await Promise.all(Array.from(whirlpoolAddresses).map(async (addr) => {
            try {
                const pool = await getPool(addr);
                if (pool) {
                    poolMap.set(addr, {
                        tokenMintA: pool.tokenA,
                        tokenMintB: pool.tokenB
                    });
                }
            } catch (err) {
                console.error(`Failed to fetch pool ${addr}:`, err);
            }
        }));

        for (const pos of positions) {
            if (pos.isPositionBundle) {
                // Handle bundled positions
                for (const p of pos.positions) {
                    const poolData = poolMap.get(p.data.whirlpool);
                    let poolPair = "Unknown/Unknown";
                    let tokenA = "Unknown";
                    let tokenB = "Unknown";

                    if (poolData) {
                        const meta = getPoolPair(
                            poolData.tokenMintA.toString(),
                            poolData.tokenMintB.toString()
                        );
                        poolPair = meta.poolPair;
                        tokenA = meta.tokenA;
                        tokenB = meta.tokenB;
                    }

                    result.push({
                        positionMint: p.address,
                        whirlpoolAddress: p.data.whirlpool,
                        tickLowerIndex: p.data.tickLowerIndex,
                        tickUpperIndex: p.data.tickUpperIndex,
                        liquidity: p.data.liquidity.toString(),
                        isBundle: true,
                        poolPair,
                        tokenA,
                        tokenB,
                    });
                }
            } else {
                // Handle standard position
                const poolData = poolMap.get(pos.data.whirlpool);
                let poolPair = "Unknown/Unknown";
                let tokenA = "Unknown";
                let tokenB = "Unknown";

                if (poolData) {
                    const meta = getPoolPair(
                        poolData.tokenMintA.toString(),
                        poolData.tokenMintB.toString()
                    );
                    poolPair = meta.poolPair;
                    tokenA = meta.tokenA;
                    tokenB = meta.tokenB;
                }

                result.push({
                    positionMint: pos.address,
                    whirlpoolAddress: pos.data.whirlpool,
                    tickLowerIndex: pos.data.tickLowerIndex,
                    tickUpperIndex: pos.data.tickUpperIndex,
                    liquidity: pos.data.liquidity.toString(),
                    isBundle: false,
                    poolPair,
                    tokenA,
                    tokenB,
                });
            }
        }

        return result;
    } catch (error) {
        console.error("Error fetching positions (New SDK):", error);
        throw error;
    }
}
