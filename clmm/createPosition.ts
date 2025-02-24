import { ApiV3PoolInfoConcentratedItem, TickUtils, PoolUtils, ClmmKeys, confirmTransaction } from '@raydium-io/raydium-sdk-v2'
import BN from 'bn.js'
import { connection, init, owner, txVersion } from '../config'
import Decimal from 'decimal.js'
import { isValidClmm } from './utils'
import { AddressLookupTableAccount, ComputeBudgetProgram, sendAndConfirmTransaction, TransactionMessage, VersionedTransaction } from '@solana/web3.js'

export const createPosition = async (poolId: string, inputAmount: number) => {
  try {
    const raydium = await init()

    let poolInfo: ApiV3PoolInfoConcentratedItem
    let poolKeys: ClmmKeys | undefined

    if (raydium.cluster === 'mainnet') {
      const data = await raydium.api.fetchPoolById({ ids: poolId })
      poolInfo = data[0] as ApiV3PoolInfoConcentratedItem
      if (!isValidClmm(poolInfo.programId)) throw new Error('target pool is not CLMM pool')
    } else {
      const data = await raydium.clmm.getPoolInfoFromRpc(poolId)
      poolInfo = data.poolInfo
      poolKeys = data.poolKeys
    }

    const rpcData = await raydium.clmm.getRpcClmmPoolInfo({ poolId: poolInfo.id })
    poolInfo.price = rpcData.currentPrice

    const [startPrice, endPrice] = [0.000001, 100000]

    const { tick: lowerTick } = TickUtils.getPriceAndTick({
      poolInfo,
      price: new Decimal(startPrice),
      baseIn: true,
    })

    const { tick: upperTick } = TickUtils.getPriceAndTick({
      poolInfo,
      price: new Decimal(endPrice),
      baseIn: true,
    })

    const epochInfo = await raydium.fetchEpochInfo()
    const res = await PoolUtils.getLiquidityAmountOutFromAmountIn({
      poolInfo,
      slippage: 0,
      inputA: true,
      tickUpper: Math.max(lowerTick, upperTick),
      tickLower: Math.min(lowerTick, upperTick),
      amount: new BN(new Decimal(inputAmount || '0').mul(10 ** (poolInfo.mintA.decimals)).toFixed(0)),
      add: true,
      amountHasFee: true,
      epochInfo: epochInfo,
    })

    const { transaction, extInfo, execute } = await raydium.clmm.openPositionFromBase({
      poolInfo,
      poolKeys,
      tickUpper: Math.max(lowerTick, upperTick),
      tickLower: Math.min(lowerTick, upperTick),
      base: 'MintA',
      ownerInfo: {
        useSOLBalance: true,
      },
      baseAmount: new BN(new Decimal(inputAmount || '0').mul(10 ** (poolInfo.mintA.decimals)).toFixed(0)),
      otherAmountMax: res.amountSlippageB.amount,
      txVersion,
      computeBudgetConfig: {
        units: 600000,
        microLamports: 100000,
      },
    })

    // const { txId, signedTx } = await execute({ sendAndConfirm: false })
    // const swapALT = await Promise.all(
    //   signedTx.message.addressTableLookups.map(async (lookup) => {
    //     return new AddressLookupTableAccount({
    //       key: lookup.accountKey,
    //       state: AddressLookupTableAccount.deserialize(
    //         await connection
    //           .getAccountInfo(lookup.accountKey)
    //           .then((res) => res!.data)
    //       ),
    //     });
    //   })
    // );
    // const insts = TransactionMessage.decompile(signedTx.message, { addressLookupTableAccounts: swapALT }).instructions
    // const blockhash = await connection.getLatestBlockhash()
    // const vTx = new VersionedTransaction(
    //   new TransactionMessage({
    //     instructions: [
    //       ComputeBudgetProgram.setComputeUnitLimit({ units: 200_000 }),
    //       ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 100_000 }),
    //       ...insts
    //     ],
    //     payerKey: owner.publicKey,
    //     recentBlockhash: blockhash.blockhash
    //   }).compileToV0Message(swapALT)
    // )
    // vTx.sign([owner])
    // const { txId, signedTx } = await execute({ sendAndConfirm: false });
    // console.log(`Success transaction: https://solscan.io/tx/${txId}`)
    transaction.sign([owner])
    return transaction;
    // return vTx;

  } catch (error) {
    console.log(error);
    return;
  }
}