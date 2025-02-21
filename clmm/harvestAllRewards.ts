import {
    ApiV3PoolInfoConcentratedItem,
    CLMM_PROGRAM_ID,
    DEVNET_PROGRAM_ID,
    ClmmPositionLayout,
  } from '@raydium-io/raydium-sdk-v2'
  import { connection, init, txVersion } from '../config'
  
  export const harvestAllRewards = async () => {
    const raydium = await init()
  
    const allPosition = await raydium.clmm.getOwnerPositionInfo({ programId: CLMM_PROGRAM_ID })
    const nonZeroPosition = allPosition.filter((p) => !p.liquidity.isZero())
    if (!nonZeroPosition.length)
      throw new Error(`use do not have any non zero positions, total positions: ${allPosition.length}`)
  
    // RAY-USDC pool
    const positionPoolInfoList = (await raydium.api.fetchPoolById({
      ids: nonZeroPosition.map((p) => p.poolId.toBase58()).join(','),
    })) as ApiV3PoolInfoConcentratedItem[]
  
    const allPositions = nonZeroPosition.reduce(
      (acc, cur) => ({
        ...acc,
        [cur.poolId.toBase58()]: acc[cur.poolId.toBase58()] ? acc[cur.poolId.toBase58()].concat(cur) : [cur],
      }),
      {} as Record<string, ClmmPositionLayout[]>
    )
  
    const { execute } = await raydium.clmm.harvestAllRewards({
      allPoolInfo: positionPoolInfoList.reduce(
        (acc, cur) => ({
          ...acc,
          [cur.id]: cur,
        }),
        {}
      ),
      allPositions,
      ownerInfo: {
        useSOLBalance: true,
      },
      programId: CLMM_PROGRAM_ID, // devnet: DEVNET_PROGRAM_ID.CLMM
      txVersion,
      // optional: set up priority fee here
      // computeBudgetConfig: {
      //   units: 600000,
      //   microLamports: 46591500,
      // },
    })
    const { txIds, signedTxs } = await execute({ sequentially: false })

    // console.log(await connection.simulateTransaction(signedTxs, {sigVerify: true}))
    console.log('harvested all clmm rewards:', { txIds })
    process.exit() // if you don't want to end up node execution, comment this line
  }