import { ChainId } from 'src/types';

export const BLOCK_CONFIRMATIONS: Record<ChainId, number> = {
  // ~~~ Mainnet ~~~
  //1,324,42161,5000,169
  1: 64, // Ethereum
  10: 30, // Optimism
  324: 60, // zkSync Era
  8453: 30, // Base
  42161: 20, // Arbitrum One
  59144: 5, // Linea
  5000: 30, // Mantle
  169: 30, // Manta
  81457: 30, // Blast

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
