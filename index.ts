import {
  Keypair,
  PublicKey,
} from "@solana/web3.js";
import { getBuyTxWithJupiter, sleep } from "./utils";
import { createPosition } from "./clmm/createPosition";
import { owner } from "./config";
import { decreaseLiquidity } from "./clmm/decreaseLiquidity";

const USDC_MINT = new PublicKey('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v');  // USDC mint address
const SOL_MINT = new PublicKey("So11111111111111111111111111111111111111112"); // SOL Mint Address
const RAY_MINT = new PublicKey("4k3Dyjzvzp8eMZWUXbBCjEvwSkkk59S5iCNLY3QrkX6R") // RAY Mint 
const RAY_SOL_POOL = "2AXXcN6oN9bBT5owwmTH53C7QHUXvhLeu718Kqt8rvY2"; // RAY-SOL POOL ADDRESS

const SOL_BUY_AMOUNT = 5
const RAY_BUY_AMOUNT = 5
const DEPOSIT_AMOUNT = 0.00001;

const main = async () => {

  // check owner usdc balance
  // const usdcBal = await getUsdcBalance(owner.publicKey)
  // if (usdcBal === 0) throw new Error("Insufficient USDC Balance!");

  manageLiquidityInSingleTx(owner);

}

async function manageLiquidityInSingleTx(owner: Keypair) {

  // **Swap USDC → SOL*
  const Tx_UsdcToSol = await getBuyTxWithJupiter(owner, SOL_MINT, USDC_MINT, SOL_BUY_AMOUNT);
  if (!Tx_UsdcToSol) return

  // **Swap USDC → RAY**
  const Tx_UsdcToRay = await getBuyTxWithJupiter(owner, RAY_MINT, USDC_MINT, RAY_BUY_AMOUNT);
  if (!Tx_UsdcToRay) return;

  // **Deposit Liquidity into Raydium CLMM**
  const Tx_Deposit = await createPosition(RAY_SOL_POOL, DEPOSIT_AMOUNT);
  if (!Tx_Deposit) return;

  // sleep for 5s
  sleep(5000);

  // *Withdraw liquidity in all position**
  const Tx_Withdraw = await decreaseLiquidity(RAY_SOL_POOL);
  if (!Tx_Withdraw) return;

  console.log('Tx_UsdcToSol, Tx_UsdcToRay, Tx_Deposit, Tx_Withdraw :>> ', Tx_UsdcToSol, Tx_UsdcToRay, Tx_Deposit, Tx_Withdraw);
}

main()
