import {
  Keypair,
  PublicKey,
} from "@solana/web3.js";
import { getBuyTxWithJupiter, sleep } from "./utils";
import { createPosition } from "./clmm/createPosition";
import { connection, owner } from "./config";
import { decreaseLiquidity } from "./clmm/decreaseLiquidity";
import { executeJitoTx } from "./executor/jito";

const USDC_MINT = new PublicKey('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v');  // USDC mint address
const SOL_MINT = new PublicKey("So11111111111111111111111111111111111111112"); // SOL Mint Address
const RAY_MINT = new PublicKey("4k3Dyjzvzp8eMZWUXbBCjEvwSkkk59S5iCNLY3QrkX6R") // RAY Mint 
const RAY_SOL_POOL = "2AXXcN6oN9bBT5owwmTH53C7QHUXvhLeu718Kqt8rvY2"; // RAY-SOL POOL ADDRESS

const SOL_BUY_AMOUNT = 500000;
const RAY_BUY_AMOUNT = 500;
const DEPOSIT_AMOUNT = 0.0001;

const main = async () => {

  // check owner usdc balance
  // const usdcBal = await getUsdcBalance(owner.publicKey)
  // if (usdcBal === 0) throw new Error("Insufficient USDC Balance!");

  // deposit position1
  deposit(owner);

  // withdraw position
  // withdraw(owner);

}

async function deposit(owner: Keypair) {

  // // **Swap USDC → SOL*
  const Tx_UsdcToSol = await getBuyTxWithJupiter(owner, USDC_MINT, SOL_MINT, SOL_BUY_AMOUNT);
  if (!Tx_UsdcToSol) return

  // // **Swap USDC → RAY**
  const Tx_UsdcToRay = await getBuyTxWithJupiter(owner, USDC_MINT, RAY_MINT, RAY_BUY_AMOUNT);
  if (!Tx_UsdcToRay) return;

  // **Deposit Liquidity into Raydium CLMM**
  const Tx_Deposit = await createPosition(RAY_SOL_POOL, DEPOSIT_AMOUNT);
  if (!Tx_Deposit) return;
  
  console.log(await connection.simulateTransaction(Tx_UsdcToSol))
  console.log(await connection.simulateTransaction(Tx_UsdcToRay))
  console.log(await connection.simulateTransaction(Tx_Deposit))
  
  const jitoSigTx = await executeJitoTx([Tx_UsdcToSol, Tx_UsdcToRay, Tx_Deposit], owner, "confirmed");
  if(jitoSigTx != null) {
    console.log("Deposit Success!", `https://solscan.io/tx/${jitoSigTx}`);
  } else {
    console.log('Deposit Failed!');
  }

}

async function withdraw(owner: Keypair) {  

  // *Withdraw liquidity in all position**
  const Tx_Withdraw = await decreaseLiquidity(RAY_SOL_POOL);
  if (!Tx_Withdraw) return;

}

main()
