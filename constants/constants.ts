import { retrieveEnvVariable, logger } from "../utils";

export const PRIVATE_KEY = retrieveEnvVariable('PRIVATE_KEY', logger);
export const RPC_ENDPOINT = retrieveEnvVariable('RPC_ENDPOINT', logger);
export const RPC_WEBSOCKET_ENDPOINT = retrieveEnvVariable('RPC_WEBSOCKET_ENDPOINT', logger);

// export const SLIPPAGE = Number(retrieveEnvVariable('SLIPPAGE', logger));
// export const TOKEN_MINT = retrieveEnvVariable('TOKEN_MINT', logger);
// export const POOL_ID = retrieveEnvVariable('POOL_ID', logger);
// export const TOKEN_NAME = retrieveEnvVariable('TOKEN_NAME', logger);
