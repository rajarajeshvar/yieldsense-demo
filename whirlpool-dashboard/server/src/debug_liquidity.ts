
import { PublicKey } from "@solana/web3.js";
import { getConnection } from "./utils/connection.js";
import {
    WhirlpoolContext,
    buildWhirlpoolClient,
    TickArrayUtil,
    PDAUtil,
    ORCA_WHIRLPOOL_PROGRAM_ID,
    PriceMath,
    TICK_ARRAY_SIZE
} from "@orca-so/whirlpools-sdk";
import { Wallet } from "@coral-xyz/anchor";
import dotenv from "dotenv";

dotenv.config();

const SOL_USDC_POOL = "Czfq3xZZDmsdGdUyrNLtRhGc47cXcZtLG4crryfu44zE";

async function main() {
    console.log("Starting debug script...");
    try {
        const connection = getConnection();
        console.log("Connected to RPC:", connection.rpcEndpoint);

        const dummyWallet = new Wallet({
            publicKey: PublicKey.default,
            secretKey: new Uint8Array(64),
        } as any);
        const ctx = WhirlpoolContext.from(connection, dummyWallet);
        const client = buildWhirlpoolClient(ctx);

        const poolPubkey = new PublicKey(SOL_USDC_POOL);
        console.log("Fetching pool...", SOL_USDC_POOL);
        const pool = await client.getPool(poolPubkey);
        const data = pool.getData();
        console.log("Pool Fetched. Current Tick:", data.tickCurrentIndex);
        console.log("Tick Spacing:", data.tickSpacing);

        // Get current tick
        const currentTick = data.tickCurrentIndex;
        const tickSpacing = data.tickSpacing;

        // Calculate start tick index
        const ticksInArray = tickSpacing * TICK_ARRAY_SIZE;
        const tickArrayStartTick = Math.floor(currentTick / ticksInArray) * ticksInArray;
        console.log("Start Tick:", tickArrayStartTick);

        const pdas = [
            PDAUtil.getTickArray(ctx.program.programId, poolPubkey, tickArrayStartTick).publicKey,
            PDAUtil.getTickArray(ctx.program.programId, poolPubkey, tickArrayStartTick - ticksInArray).publicKey,
            PDAUtil.getTickArray(ctx.program.programId, poolPubkey, tickArrayStartTick + ticksInArray).publicKey,
        ];
        console.log("PDAs generated:", pdas.map(p => p.toString()));

        console.log("Fetching tick arrays...");
        // Use getTickArrays
        const tickArrays = await ctx.fetcher.getTickArrays(pdas);
        console.log("Tick arrays fetched:", tickArrays.length);

        tickArrays.forEach((ta, i) => {
            console.log(`TickArray ${i}:`, ta ? "Found" : "Null");
            if (ta && ta.ticks && ta.ticks.length > 0) {
                // Log first initialized tick
                ta.ticks.forEach((t, idx) => {
                    if (t.initialized && idx < 5) { // just logs a few
                        const tickIndex = ta.startTickIndex + (idx * tickSpacing);
                        console.log(`Tick at ${tickIndex} (idx ${idx}):`, t.liquidityGross.toString());
                    }
                });
            }
        });

    } catch (error) {
        console.error("CRASHED:", error);
    }
}

main();
