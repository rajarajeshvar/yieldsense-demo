
import { Connection, PublicKey } from "@solana/web3.js";
import { WhirlpoolContext, buildWhirlpoolClient, ORCA_WHIRLPOOL_PROGRAM_ID } from "@orca-so/whirlpools-sdk";
import { Wallet } from "@coral-xyz/anchor";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";

dotenv.config();

const RPC_URL = process.env.RPC_URL || "https://api.mainnet-beta.solana.com";
const connection = new Connection(RPC_URL, "confirmed");
const WALLET_ADDRESS = "9491e5uo7ZC9fUi4BngQVoEyrFQqzfUjSMNrhS8gwu1p";
const MINT_ADDRESS = "Ggzkx8XbfaKxs82H9t5pqDQp9PrM6o9FEViFzsg6ZD1B";

const OUTPUT_FILE = path.join(process.cwd(), "test_output.txt");

function log(msg: string) {
    console.log(msg);
    fs.appendFileSync(OUTPUT_FILE, msg + "\n");
}

async function main() {
    fs.writeFileSync(OUTPUT_FILE, "");

    log("----------------------------------------");
    log(`Debugging Position Mint: ${MINT_ADDRESS}`);
    log(`Whirlpool Program ID: ${ORCA_WHIRLPOOL_PROGRAM_ID.toBase58()}`);
    log("----------------------------------------");

    const wallet = new Wallet({
        publicKey: new PublicKey(WALLET_ADDRESS),
        secretKey: new Uint8Array(64)
    } as any);

    const ctx = WhirlpoolContext.from(
        connection,
        wallet
    );
    const client = buildWhirlpoolClient(ctx);

    log("Fetcher keys: " + Object.keys(ctx.fetcher).join(", "));
    // Check if getPosition exists on fetcher
    log(`Fetcher has getPosition: ${typeof (ctx.fetcher as any).getPosition}`);

    try {
        log("Fetching pool data (test)...");
        // Use a known pool to test fetcher
        const pool = await client.getPool(new PublicKey("HJPjoWUrhoZzkNfRpHuieeFk9WcZWjwy6PBjZ81ngndJ"));
        log("✅ Pool fetch successful");
    } catch (e: any) {
        log(`❌ Pool fetch failed: ${e.message}`);
    }

    try {
        log("Fetching position data...");
        // 1. Manually check PDA existence
        const pda = PublicKey.findProgramAddressSync(
            [Buffer.from("position"), new PublicKey(MINT_ADDRESS).toBuffer()],
            ORCA_WHIRLPOOL_PROGRAM_ID
        )[0];
        log(`Calculated Position PDA: ${pda.toBase58()}`);

        const info = await connection.getAccountInfo(pda);
        if (info) {
            log(`✅ PDA Account Exists! Owner: ${info.owner.toBase58()}, Size: ${info.data.length}`);
        } else {
            log("❌ PDA Account NOT found at this address.");
            // Check with other program IDs?
        }

        const position = await client.getPosition(pda);


        if (!position) {
            log("❌ FAIL: Position object is null. SDK returned null.");
        } else {
            const data = position.getData();
            log("✅ SUCCESS: Position found!");
            log(`  Whirlpool: ${data.whirlpool.toBase58()}`);
            log(`  Liquidity: ${data.liquidity.toString()}`);
            log(`  TickLower: ${data.tickLowerIndex}`);
            log(`  TickUpper: ${data.tickUpperIndex}`);
        }

    } catch (e: any) {
        log(`❌ ERROR: ${e.message}`);
        if (e.logs) {
            log("Logs:");
            e.logs.forEach((l: string) => log(l));
        }
    }
}

main();
