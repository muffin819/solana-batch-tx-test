import { ApiV3PoolInfoConcentratedItem, ClmmKeys } from '@raydium-io/raydium-sdk-v2'
import { connection, init, txVersion } from '../config'
import { isValidClmm } from './utils'

export const closePosition = async (poolId: string) => {
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
  console.log('poolInfo :>> ', poolInfo);

  const allPosition = await raydium.clmm.getOwnerPositionInfo({ programId: poolInfo.programId })
  console.log('allPosition :>> ', allPosition);
  if (!allPosition.length) throw new Error('user do not have any positions')

  const position = allPosition.find((p) => p.poolId.toBase58() === poolInfo.id)
  if (!position) throw new Error(`user do not have position in pool: ${poolInfo.id}`)

    console.log('poolInfo :>> ', poolInfo);
  console.log('position :>> ', position);
  const { execute } = await raydium.clmm.closePosition({
    poolInfo,
    poolKeys,
    ownerPosition: position,
    txVersion,
  })

  const { txId, signedTx } = await execute({ sendAndConfirm: false })
  console.log(await connection.simulateTransaction(signedTx, {sigVerify: true}))
  console.log('clmm position closed:', { txId: `https://explorer.solana.com/tx/${txId}` })
  return txId;
}