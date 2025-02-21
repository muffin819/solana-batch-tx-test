import { ApiV3PoolInfoConcentratedItem, ClmmKeys } from '@raydium-io/raydium-sdk-v2'
import BN from 'bn.js'
import { connection, init, owner, txVersion } from '../config'
import { isValidClmm } from './utils'
import { PublicKey } from '@solana/web3.js'
import { VersionedTransaction } from '@solana/web3.js'
import { TransactionMessage } from '@solana/web3.js'
import { ComputeBudgetInstruction } from '@solana/web3.js'
import { Transaction } from '@solana/web3.js'
import { ComputeBudgetProgram } from '@solana/web3.js'
import { AddressLookupTableAccount } from '@solana/web3.js'

export const decreaseLiquidity = async (poolId: string) => {
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

  const allPosition = await raydium.clmm.getOwnerPositionInfo({ programId: poolInfo.programId })
  if (!allPosition.length) throw new Error('user do not have any positions')

  const position = allPosition.find((p) => p.poolId.toBase58() === poolInfo.id)
  console.log('position :>> ', position);
  if (!position) throw new Error(`user do not have position in pool: ${poolInfo.id}`)

  /** code below will get on chain realtime price to avoid slippage error, uncomment it if necessary */
  // const rpcData = await raydium.clmm.getRpcClmmPoolInfo({ poolId: poolInfo.id })
  // poolInfo.price = rpcData.currentPrice
  const { execute } = await raydium.clmm.decreaseLiquidity({
    poolInfo,
    poolKeys,
    ownerPosition: position,
    ownerInfo: {
      useSOLBalance: true,
      // if liquidity wants to decrease doesn't equal to position liquidity, set closePosition to false
      closePosition: true,
    },
    liquidity: position.liquidity,
    amountMinA: new BN(0),
    amountMinB: new BN(0),
    txVersion,
    txTipConfig: {
      feePayer: owner.publicKey,
      amount: new BN(1_000_000),
      address: new PublicKey('96gYZGLnJYVFmbjzopPSU6QiEV5fGqZNyN9nmNhvrZU5')
    }
    // optional: set up priority fee here
    // computeBudgetConfig: {
    //   units: 600000,
    //   microLamports: 46591500,
    // },
    // optional: add transfer sol to tip account instruction. e.g sent tip to jito
    // txTipConfig: {
    //   address: new PublicKey('96gYZGLnJYVFmbjzopPSU6QiEV5fGqZNyN9nmNhvrZU5'),
    //   amount: new BN(10000000), // 0.01 sol
    // },
  })

  const { txId, signedTx } = await execute({ sendAndConfirm: false })
  const swapALT = await Promise.all(
    signedTx.message.addressTableLookups.map(async (lookup) => {
      return new AddressLookupTableAccount({
        key: lookup.accountKey,
        state: AddressLookupTableAccount.deserialize(
          await connection
            .getAccountInfo(lookup.accountKey)
            .then((res) => res!.data)
        ),
      });
    })
  );
  const insts = TransactionMessage.decompile(signedTx.message, { addressLookupTableAccounts: swapALT }).instructions
  const blockhash = await connection.getLatestBlockhash()
  const vTx = new VersionedTransaction(
    new TransactionMessage({
      instructions: [
        ComputeBudgetProgram.setComputeUnitLimit({ units: 200_000 }),
        ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 100_000 }),
        ...insts
      ],
      payerKey: owner.publicKey,
      recentBlockhash: blockhash.blockhash
    }).compileToV0Message(swapALT)
  )
  vTx.sign([owner])

  // console.log(await connection.simulateTransaction(vTx, { sigVerify: true }))
  // const sig = await connection.sendRawTransaction(vTx.serialize(), { skipPreflight: true })
  // await connection.confirmTransaction({
  //   signature: sig,
  //   blockhash: blockhash.blockhash,
  //   lastValidBlockHeight: blockhash.lastValidBlockHeight
  // })
  // console.log('withdraw liquidity from clmm position:', { txId: `https://solscan.io/tx/${sig}` })
  return vTx;
}