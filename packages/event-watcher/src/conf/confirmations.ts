import { ChainId } from 'src/types';

export const BLOCK_CONFIRMATIONS: Record<ChainId, number> = {
  // ~~~ Mainnet ~~~
  1: 64, // Ethereum
  10: 30, // Optimism
  56: 20, // Bsc
  137: 300, // Polygon
  204: 60, // opBNB
  324: 60, // zkSync Era
  8453: 30, // Base
  42161: 20, // Arbitrum One
  43114: 30, // Avalanche C-Chain
  59144: 5, // Linea

  // ~~~ Testnet ~~~
  5: 64, // Goerli
  97: 20, // Bsc
  280: 60, // zkSync
  420: 30, // Optimism
  5001: 60, // Mantle
  5611: 60, // opBNB
  43113: 30, // Avalanche Fuji
  59140: 5, // Linea
  80001: 300, // Polygon Mumbai
  84531: 30, // Base
  167005: 12, // Taiko
  421613: 20, // Arbitrum
  3441005: 6, // Manta
};
