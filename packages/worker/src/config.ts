import {IMonitorAddress} from "./values/dailyMonitorZKLAmount.service";

export type NetworkKey = string;
import { config } from "dotenv";
config();
import * as fs from "fs";
import * as JSONStream from "JSONStream";
import * as path from "path";
import { IExtraTokenAttribute } from "./token/tokenOffChainData/providers/coingecko/coingeckoTokenOffChainDataProvider";
import { IExcludedToken } from "./values/externallyAndExcludedTokenUpdate.service";
const extraCoinsListPath = "../extraCoinsList.json";
const extraTokenAttributesPath = "../extraTokenAttributes.json";
const excludeCoinsListPath = "../excludeCoinsList.json";
const externallyCoinsListPath = "../externallyCoinsList.json";
const monitorAddressListPath = "../zklMonitorWallet.json";
import { ChainId } from './types'
import { ChainInfo, chainsFromEnvironments } from './conf/chains'
export default async () => {
  const {
    PORT,
    BLOCKCHAIN_RPC_URL,
    DATA_FETCHER_URL,
    DATA_FETCHER_REQUEST_TIMEOUT,
    RPC_CALLS_DEFAULT_RETRY_TIMEOUT,
    RPC_CALLS_QUICK_RETRY_TIMEOUT,
    RPC_CALLS_CONNECTION_TIMEOUT,
    RPC_CALLS_CONNECTION_QUICK_TIMEOUT,
    WAIT_FOR_BLOCKS_INTERVAL,
    BLOCKS_PROCESSING_BATCH_SIZE,
    NUMBER_OF_BLOCKS_PER_DB_TRANSACTION,
    BATCHES_PROCESSING_POLLING_INTERVAL,
    DELETE_BALANCES_INTERVAL,
    COUNTERS_PROCESSING_POLLING_INTERVAL,
    COUNTERS_PROCESSING_RECORDS_BATCH_SIZE,
    COLLECT_DB_CONNECTION_POOL_METRICS_INTERVAL,
    COLLECT_BLOCKS_TO_PROCESS_METRIC_INTERVAL,
    DISABLE_BATCHES_PROCESSING,
    DISABLE_COUNTERS_PROCESSING,
    DISABLE_OLD_BALANCES_CLEANER,
    DISABLE_BLOCKS_REVERT,
    ENABLE_TOKEN_OFFCHAIN_DATA_SAVER,
    UPDATE_TOKEN_OFFCHAIN_DATA_INTERVAL,
    SELECTED_TOKEN_OFFCHAIN_DATA_PROVIDER,
    FROM_BLOCK,
    TO_BLOCK,
    COINGECKO_IS_PRO_PLAN,
    COINGECKO_API_KEY,
    BRIDGE_NETWORK_KEYS,
    COINGECKO_PLATFORM_IDS,
    UPDATE_TOTAL_LOCKED_VALUE_INTERVAL,
    UPDATE_TOTAL_LOCKED_VALUE_DELAY,
    ENABLE_TOTAL_LOCKED_VALUE_UPDATER,
    UPDATE_TVL_HISTORY_INTERVAL,
    COINGECKO_PROXY_URL,
    COINGECKO_ENABLE_PROXY,
    PRIMARY_CHAIN_MAIN_CONTRACT,
    PRIMARY_CHAIN_RPC_URL,
  } = process.env;

  const networkKeys = BRIDGE_NETWORK_KEYS.split(",");
  const key2L1 = Object.fromEntries(
    networkKeys.map((key) => {
      return [key, process.env[`L1_ERC20_BRIDGE_${key.toUpperCase()}`]];
    })
  );
  const key2L2 = Object.fromEntries(
    networkKeys.map((key) => {
      return [key, process.env[`L2_ERC20_BRIDGE_${key.toUpperCase()}`]];
    })
  );
  const L12Key = Object.fromEntries(
    networkKeys.map((key) => {
      return [(process.env[`L1_ERC20_BRIDGE_${key.toUpperCase()}`] || "").toLowerCase(), key];
    })
  );
  const L22Key = Object.fromEntries(
    networkKeys.map((key) => {
      return [(process.env[`L2_ERC20_BRIDGE_${key.toUpperCase()}`] || "").toLowerCase(), key];
    })
  );

  const gateways = BRIDGE_NETWORK_KEYS.split(",");
  const gatewayValue = Object.fromEntries(
      gateways.map((key) => {
        return [key, process.env[`L1_GATEWAY_${key.toUpperCase()}`]];
      })
  );
  const gatewayKey = Object.fromEntries(
      gateways.map((key) => {
        return [(process.env[`L1_GATEWAY_${key.toUpperCase()}`] || "").toLowerCase(), key];
      })
  );

  return {
    port: parseInt(PORT, 10) || 3001,
    blockchain: {
      rpcUrl: BLOCKCHAIN_RPC_URL || "http://localhost:3050",
      rpcCallDefaultRetryTimeout: parseInt(RPC_CALLS_DEFAULT_RETRY_TIMEOUT, 10) || 30000,
      rpcCallQuickRetryTimeout: parseInt(RPC_CALLS_QUICK_RETRY_TIMEOUT, 10) || 500,
      rpcCallConnectionTimeout: parseInt(RPC_CALLS_CONNECTION_TIMEOUT, 10) || 20000,
      rpcCallConnectionQuickTimeout: parseInt(RPC_CALLS_CONNECTION_QUICK_TIMEOUT, 10) || 10000,
    },
    dataFetcher: {
      url: DATA_FETCHER_URL || "http://localhost:3040",
      requestTimeout: parseInt(DATA_FETCHER_REQUEST_TIMEOUT, 10) || 120_000,
    },
    blocks: {
      waitForBlocksInterval: parseInt(WAIT_FOR_BLOCKS_INTERVAL, 10) || 1000,
      blocksProcessingBatchSize: parseInt(BLOCKS_PROCESSING_BATCH_SIZE, 10) || 50,
      fromBlock: parseInt(FROM_BLOCK, 10) || 0,
      toBlock: parseInt(TO_BLOCK, 10) || null,
      disableBlocksRevert: DISABLE_BLOCKS_REVERT === "true",
      numberOfBlocksPerDbTransaction: parseInt(NUMBER_OF_BLOCKS_PER_DB_TRANSACTION, 10) || 50,
    },
    batches: {
      batchesProcessingPollingInterval: parseInt(BATCHES_PROCESSING_POLLING_INTERVAL, 10) || 60000,
      disableBatchesProcessing: DISABLE_BATCHES_PROCESSING === "true",
    },
    balances: {
      deleteBalancesInterval: parseInt(DELETE_BALANCES_INTERVAL, 10) || 300000,
      disableOldBalancesCleaner: DISABLE_OLD_BALANCES_CLEANER === "true",
    },
    counters: {
      recordsBatchSize: parseInt(COUNTERS_PROCESSING_RECORDS_BATCH_SIZE, 10) || 20000,
      updateInterval: parseInt(COUNTERS_PROCESSING_POLLING_INTERVAL, 10) || 30000,
      disableCountersProcessing: DISABLE_COUNTERS_PROCESSING === "true",
    },
    tokens: {
      enableTokenOffChainDataSaver: ENABLE_TOKEN_OFFCHAIN_DATA_SAVER === "true",
      updateTokenOffChainDataInterval: parseInt(UPDATE_TOKEN_OFFCHAIN_DATA_INTERVAL, 10) || 86_400_000,
      tokenOffChainDataProviders: ["coingecko", "portalsFi"],
      selectedTokenOffChainDataProvider: SELECTED_TOKEN_OFFCHAIN_DATA_PROVIDER || "coingecko",
      coingecko: {
        isProPlan: COINGECKO_IS_PRO_PLAN === "true",
        apiKey: COINGECKO_API_KEY,
        platformIds: COINGECKO_PLATFORM_IDS.split(","),
        extraCoinsList: await getExtraCoinsList(),
        extraTokenAttributes: await getExtraTokenAttributes(),
        proxyUrl: COINGECKO_PROXY_URL,
        enableProxy: COINGECKO_ENABLE_PROXY === "true",
      },
      externallyCoinsList: await getExternallyCoinsList(),
      excludeCoinsList: await getExcludeCoinsList(),
      updateTotalLockedValueInterval: parseInt(UPDATE_TOTAL_LOCKED_VALUE_INTERVAL, 10) || 30000,
      updateTotalLockedValueDelay: parseInt(UPDATE_TOTAL_LOCKED_VALUE_DELAY, 10) || 500,
      updateTvlHistoryInterval: parseInt(UPDATE_TVL_HISTORY_INTERVAL, 10) || 3600000,// 1 hour = 3600000
      enableTotalLockedValueUpdater: ENABLE_TOTAL_LOCKED_VALUE_UPDATER === "true",
    },
    monitor: {
      monitorAddressList: await getMonitorAddressList(),
    },
    metrics: {
      collectDbConnectionPoolMetricsInterval: parseInt(COLLECT_DB_CONNECTION_POOL_METRICS_INTERVAL, 10) || 10000,
      collectBlocksToProcessMetricInterval: parseInt(COLLECT_BLOCKS_TO_PROCESS_METRIC_INTERVAL, 10) || 10000,
    },
    bridge: {
      networkKeys,
      getL1Erc20Bridge: (networkKey: NetworkKey): string | undefined => key2L1[networkKey],
      getL2Erc20Bridge: (networkKey: NetworkKey): string | undefined => key2L2[networkKey],
      getNetworkKeyByL1Erc20Bridge: (bridgeAddress: string): NetworkKey | undefined =>
        L12Key[bridgeAddress.toLowerCase()],
      getNetworkKeyByL2Erc20Bridge: (bridgeAddress: string): NetworkKey | undefined =>
        L22Key[bridgeAddress.toLowerCase()],
    },
    gateway: {
      gateways,
      getGateWay: (gateway: NetworkKey):string | undefined => gatewayValue[gateway],
      getGateWayKey: (gateway: string): NetworkKey | undefined => gatewayKey[gateway.toLowerCase()],
    },
    primaryChainMainContract: PRIMARY_CHAIN_MAIN_CONTRACT,
    primaryChainRpcUrl: PRIMARY_CHAIN_RPC_URL,
  };
};
async function getExtraCoinsList() {
  const readStream = fs.createReadStream(path.join(__dirname, extraCoinsListPath));
  const jsonStream = JSONStream.parse("*");

  readStream.pipe(jsonStream);
  const res = [];
  await new Promise((resolve, reject) => {
    jsonStream.on("data", (item: any) => {
      res.push(item);
    });

    jsonStream.on("end", resolve);
    jsonStream.on("error", reject);
  });
  return (res as ITokenListItemProviderResponse[]).map((item) => ({
    ...item,
    platforms: Object.fromEntries(Object.entries(item.platforms).map(([key, value]) => [key, value.toLowerCase()])),
  }));
}
async function getExtraTokenAttributes(): Promise<IExtraTokenAttribute[]> {
  const readStream = fs.createReadStream(path.join(__dirname, extraTokenAttributesPath));
  const jsonStream = JSONStream.parse("*");

  readStream.pipe(jsonStream);
  const res = [];
  await new Promise((resolve, reject) => {
    jsonStream.on("data", (item: any) => {
      res.push(item);
    });

    jsonStream.on("end", resolve);
    jsonStream.on("error", reject);
  });
  return (res as IExtraTokenAttribute[]).map((item) => ({
    ...item,
    address: item.address.toLowerCase(),
  }));
}
async function getExcludeCoinsList(): Promise<IExcludedToken[]> {
  const readStream = fs.createReadStream(path.join(__dirname, excludeCoinsListPath));
  const jsonStream = JSONStream.parse("*");

  readStream.pipe(jsonStream);
  const res = [];
  await new Promise((resolve, reject) => {
    jsonStream.on("data", (item: any) => {
      res.push(item);
    });

    jsonStream.on("end", resolve);
    jsonStream.on("error", reject);
  });
  return (res as IExcludedToken[]).map((item) => ({
    ...item,
    address: item.address.toLowerCase(),
  }));
}
async function getExternallyCoinsList(): Promise<IExcludedToken[]> {
  const readStream = fs.createReadStream(path.join(__dirname, externallyCoinsListPath));
  const jsonStream = JSONStream.parse("*");

  readStream.pipe(jsonStream);
  const res = [];
  await new Promise((resolve, reject) => {
    jsonStream.on("data", (item: any) => {
      res.push(item);
    });

    jsonStream.on("end", resolve);
    jsonStream.on("error", reject);
  });
  return (res as IExcludedToken[]).map((item) => ({
    ...item,
    address: item.address.toLowerCase(),
  }));
}
async function getMonitorAddressList(): Promise<IMonitorAddress[]> {
  const readStream = fs.createReadStream(path.join(__dirname, monitorAddressListPath));
  const jsonStream = JSONStream.parse("*");

  readStream.pipe(jsonStream);
  const res = [];
  await new Promise((resolve, reject) => {
    jsonStream.on("data", (item: any) => {
      res.push(item);
    });

    jsonStream.on("end", resolve);
    jsonStream.on("error", reject);
  });
  return (res as IMonitorAddress[]).map((item) => ({
    ...item,
  }));
}
interface ITokenListItemProviderResponse {
  id: string;
  platforms: Record<string, string>;
}
export const CHAIN_IDS: ChainId[] = process.env['CHAIN_IDS'].split(',')
    .map((v) => Number(v))

export const CHAINS: Record<ChainId, ChainInfo> =
    chainsFromEnvironments(CHAIN_IDS)

export const networkChainIdMap = {
  ethereum: 1,
  zksync: 324,
  arbitrum: 42161,
  mantle: 5000,
  manta: 169,
  blast: 81457,
  optimism: 10,
  base: 8453,
  scroll: 534352,
  primary: 59144,
  sepolia: 11155111,
};
