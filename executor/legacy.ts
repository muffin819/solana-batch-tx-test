import { Connection, Keypair, TransactionInstruction, TransactionMessage, VersionedTransaction } from "@solana/web3.js";
import { logger } from "../utils";
import { connection } from "../config";


interface Blockhash {
    blockhash: string;
    lastValidBlockHeight: number;
}

export const execute = async (transaction: VersionedTransaction ) => {
    const signature = await connection.sendRawTransaction(transaction.serialize(), { skipPreflight: false })
    if (signature) {
        console.log(`Success versioned transaction: https://solscan.io/tx/${signature}`)
        return signature
    } else {
        console.log('Failed versioned transaction!');
        return null;
    }
}

export const createAndSendV0Tx = async (txInstructions: TransactionInstruction[], kp: Keypair, connection: Connection) => {
    try {
        // Step 1 - Fetch Latest Blockhash
        let latestBlockhash = await connection.getLatestBlockhash();
        // console.log("   ✅ - Fetched latest blockhash. Last valid height:", latestBlockhash.lastValidBlockHeight);

        // Step 2 - Generate Transaction Message
        const messageV0 = new TransactionMessage({
            payerKey: kp.publicKey,
            recentBlockhash: latestBlockhash.blockhash,
            instructions: txInstructions
        }).compileToV0Message();
        // console.log("   ✅ - Compiled transaction message");
        const transaction = new VersionedTransaction(messageV0);

        // Step 3 - Sign your transaction with the required `Signers`
        transaction.sign([kp]);
        // console.log(`   ✅ - Transaction Signed by the wallet ${(kp.publicKey).toBase58()}`);

        // Step 4 - Send our v0 transaction to the cluster
        const txid = await connection.sendTransaction(transaction, { maxRetries: 5 });
        if(txid) {
            console.log("   ✅ - Transaction sent to network");
            console.log('LUT transaction successfully confirmed!', '\n', `https://explorer.solana.com/tx/${txid}`);
            return txid;
        } else {
            return null;
        }
    } catch (error) {
        console.log("Error in transaction")
        return false
    }
}
