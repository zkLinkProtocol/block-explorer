import { config } from "dotenv";
config();
export default () => {
  const {
    
  } = process.env;


  return {
    
  };
};

import { ChainId } from './types'
import { ChainInfo, chainsFromEnvironments } from './conf/chains'

export const CHAIN_IDS: ChainId[] = process.env
  .CHAIN_IDS!.split(',')
  .map((v) => Number(v))

export const CHAINS: Record<ChainId, ChainInfo> =
  chainsFromEnvironments(CHAIN_IDS)
