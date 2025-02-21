
import { Keypair, VersionedTransaction } from "@solana/web3.js";
import { logger } from "../utils/logger";
import { PublicKey } from '@solana/web3.js';
import { AddressLookupTableProgram } from '@solana/web3.js';
import { connection, owner } from '../config';
import { createAndSendV0Tx } from '../executor/legacy';
import { Logger } from 'pino';
import dotenv from 'dotenv';

dotenv.config();

interface Blockhash {
  blockhash: string;
  lastValidBlockHeight: number;
}

// Define the type for the JSON file content
export interface Data {
  privateKey: string;
  pubkey: string;
}

export const sleep = async (ms: number) => {
  await new Promise((resolve) => setTimeout(resolve, ms))
}

export const retrieveEnvVariable = (variableName: string, logger: Logger) => {
  const variable = process.env[variableName] || '';
  if (!variable) {
    console.log(`${variableName} is not set`);
    // sendMessage(`${variableName} is not set`)
    process.exit(1);
  }
  return variable;
};

export const randVal = (min: number, max: number, count: number, total: number, isEven: boolean): number[] => {
  const arr: number[] = Array(count).fill(total / count);
  if (isEven) return arr;

  if (max * count < total) throw new Error('Invalid input: max * count must be greater than or equal to total.');
  if (min * count > total) throw new Error('Invalid input: min * count must be less than or equal to total.');
  const average = total / count;
  // Randomize pairs of elements
  for (let i = 0; i < count; i += 2) {
    // Generate a random adjustment within the range
    const adjustment = Math.random() * Math.min(max - average, average - min);
    // Add adjustment to one element and subtract from the other
    arr[i] += adjustment;
    arr[i + 1] -= adjustment;
  }
  // if (count % 2) arr.pop()
  return arr;
};

export async function getBuyTxWithJupiter(wallet: Keypair, outPutMint: PublicKey, inputMint: PublicKey, amount: number) {
  try {
    const quoteResponse = await (
      await fetch(
        `https://quote-api.jup.ag/v6/quote?inputMint=${inputMint.toBase58()}&outputMint=${outPutMint.toBase58()}&amount=${amount}&slippageBps=${100}`
      )
    ).json();

    // get serialized transactions for the swap
    const { swapTransaction } = await (
      await fetch("https://quote-api.jup.ag/v6/swap", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          quoteResponse,
          userPublicKey: wallet.publicKey.toString(),
          wrapAndUnwrapSol: true,
          dynamicComputeUnitLimit: true,
          prioritizationFeeLamports: 25_000
        }),
      })
    ).json();

    // deserialize the transaction
    const swapTransactionBuf = Buffer.from(swapTransaction, "base64");
    var transaction = VersionedTransaction.deserialize(swapTransactionBuf);

    // sign the transaction
    transaction.sign([wallet]);
    return transaction
  } catch (error) {
    console.log("Failed to get buy transaction")
    return null
  }
};

export const createLUT = async () => {
  try {
    const [lookupTableInst, lookupTableAddress] =
      AddressLookupTableProgram.createLookupTable({
        authority: owner.publicKey,
        payer: owner.publicKey,
        recentSlot: await connection.getSlot(),
      });

    // Step 2 - Log Lookup Table Address
    console.log("Lookup Table Address:", lookupTableAddress.toBase58());

    // Step 3 - Generate a create transaction and send it to the network
    const result = await createAndSendV0Tx([lookupTableInst], owner, connection);

    if (!result)
      throw new Error("Lut creation error")

    console.log("Lookup Table Address created successfully!")
    console.log("Please wait for about 15 seconds...")
    await sleep(10000)

    return lookupTableAddress
  } catch (err) {
    console.log("Error in creating Lookuptable. Retrying.")
  }
}
