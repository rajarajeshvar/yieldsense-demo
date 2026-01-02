import { PublicKey, Transaction, VersionedTransaction } from "@solana/web3.js";
import { getConnection } from "../utils/connection.js";
import {
    WhirlpoolContext,
    buildWhirlpoolClient,
    ORCA_WHIRLPOOL_PROGRAM_ID,
    increaseLiquidityQuoteByInputToken,
    TickUtil,
    TokenExtensionUtil,
    IGNORE_CACHE,
    PriceMath,
} from "@orca-so/whirlpools-sdk";
import { Wallet } from "@coral-xyz/anchor";
import { Percentage } from "@orca-so/common-sdk";
import Decimal from "decimal.js";
import BN from "bn.js";

export interface CreateOrDepositRequest {
    wallet: string;
    whirlpool: string;
    tickLower?: number;
    tickUpper?: number;
    priceLower?: string;
    priceUpper?: string;
    amountA: string;
    amountB?: string;
}

export interface CreateOrDepositResponse {
    success: boolean;
    positionMint?: string;
    serializedTransaction?: string; // Base64 encoded unsigned transaction
    error?: string;
    isNewPosition: boolean;
}

/**
 * Build transaction for creating a new position or depositing into existing one.
 * Returns an unsigned transaction for client-side signing.
 */
export async function createOrDeposit(request: CreateOrDepositRequest): Promise<CreateOrDepositResponse> {
    const connection = getConnection();
    const walletPubkey = new PublicKey(request.wallet);
    const whirlpoolPubkey = new PublicKey(request.whirlpool);

    // Create context with the actual wallet address for building tx
    const dummyWallet = new Wallet({
        publicKey: walletPubkey,
        secretKey: new Uint8Array(64),
    } as any);

    const ctx = WhirlpoolContext.from(
        connection,
        dummyWallet
    );

    const client = buildWhirlpoolClient(ctx);

    try {
        // Fetch the whirlpool
        const whirlpool = await client.getPool(whirlpoolPubkey);
        const whirlpoolData = whirlpool.getData();

        let tickLower: number;
        let tickUpper: number;

        if (request.priceLower && request.priceUpper) {
            const tokenA = whirlpool.getTokenAInfo();
            const tokenB = whirlpool.getTokenBInfo();

            tickLower = TickUtil.getInitializableTickIndex(
                PriceMath.priceToTickIndex(new Decimal(request.priceLower), tokenA.decimals, tokenB.decimals),
                whirlpoolData.tickSpacing
            );
            tickUpper = TickUtil.getInitializableTickIndex(
                PriceMath.priceToTickIndex(new Decimal(request.priceUpper), tokenA.decimals, tokenB.decimals),
                whirlpoolData.tickSpacing
            );
        } else if (request.tickLower !== undefined && request.tickUpper !== undefined) {
            tickLower = TickUtil.getInitializableTickIndex(
                request.tickLower,
                whirlpoolData.tickSpacing
            );
            tickUpper = TickUtil.getInitializableTickIndex(
                request.tickUpper,
                whirlpoolData.tickSpacing
            );
        } else {
            throw new Error("Must provide either tick indices or prices");
        }

        // Check if position already exists by looking for positions in this range
        // getPositions returns a Record<string, Position | null> or similar map
        const positionsRecord = await client.getPositions([walletPubkey]);
        const positions = Object.values(positionsRecord);

        let existingPosition = null;

        for (const pos of positions) {
            if (!pos) continue;
            const posData = pos.getData();
            if (
                posData.whirlpool.equals(whirlpoolPubkey) &&
                posData.tickLowerIndex === tickLower &&
                posData.tickUpperIndex === tickUpper
            ) {
                existingPosition = pos;
                break;
            }
        }

        let positionMint: string | undefined;
        const isNewPosition = !existingPosition;

        // Build context for token extensions (required for quotes)
        const tokenExtensionCtx = await TokenExtensionUtil.buildTokenExtensionContext(
            ctx.fetcher,
            whirlpoolData,
            IGNORE_CACHE
        );

        // Get quote for liquidity
        const tokenA = whirlpool.getTokenAInfo();

        const quote = increaseLiquidityQuoteByInputToken(
            tokenA.mint,
            new Decimal(request.amountA),
            tickLower,
            tickUpper,
            Percentage.fromFraction(10, 1000), // 1% slippage
            whirlpool,
            tokenExtensionCtx
        );

        let builtTx;

        if (isNewPosition) {
            // OPEN NEW POSITION
            const { positionMint: newMint, tx } = await whirlpool.openPosition(
                tickLower,
                tickUpper,
                quote
            );

            positionMint = newMint.toBase58();
            builtTx = await tx.build();

        } else {
            // INCREASE LIQUIDITY ON EXISTING POSITION
            const txBuilder = await existingPosition!.increaseLiquidity(quote);

            positionMint = existingPosition!.getData().positionMint.toBase58();
            builtTx = await txBuilder.build();
        }

        // Get transaction object and signers (e.g. position mint)
        const { transaction, signers } = builtTx;

        // If it's a legacy Transaction, we can set feepayer/blockhash if needed, 
        // but the SDK methods usually handle it or we use the builder methods.
        // The builder uses ctx.provider.wallet (dummyWallet) as fee payer.
        // We should ensure the blockhash is fresh.
        const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();

        if (transaction instanceof Transaction) {
            transaction.recentBlockhash = blockhash;
            transaction.lastValidBlockHeight = lastValidBlockHeight;
            transaction.feePayer = walletPubkey;

            if (signers.length > 0) {
                transaction.partialSign(...signers);
            }
        } else {
            // VersionedTransaction
            // SDK build() usually fetches blockhash.
            // We must sign with any generated keypairs (like position mint)
            if (signers.length > 0) {
                transaction.sign(signers);
            }
        }

        // Serialize transaction (unsigned by wallet, but signed by mint) for frontend to sign
        const serializedTx = transaction.serialize();

        return {
            success: true,
            positionMint,
            serializedTransaction: Buffer.from(serializedTx).toString("base64"),
            isNewPosition,
        };
    } catch (error: any) {
        console.error("Error in createOrDeposit:", error);
        return {
            success: false,
            error: error.message || "Unknown error",
            isNewPosition: false,
        };
    }
}
