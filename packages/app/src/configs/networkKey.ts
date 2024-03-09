import {
  mainnet,
  linea,
  manta,
  mantle,
  arbitrum,
  zkSync,
  optimism,
  metis,
  base,
  scroll,
  polygonZkEvm,
  type Chain,
} from "@wagmi/core/chains";
const networkKeysMapping: Record<string, Chain> = {
  primary: linea, // TODO only for production
  ethereum: mainnet,
  arbitrum: arbitrum,
  zksync: zkSync,
  manta: manta,
  mantle: mantle,
  optimism: optimism,
  metis: metis,
  base: base,
  scroll: scroll,
  polygonzkevm: polygonZkEvm,
};

export const getExplorerUrlPrefix = (networkKey: string): string => {
  if (!networkKey) {
    networkKey = "primary";
  }
  if (!networkKeysMapping[networkKey]) {
    return "";
  }
  const blockExplorers = networkKeysMapping[networkKey].blockExplorers;
  if (!blockExplorers || !blockExplorers["default"] || !blockExplorers["default"]["url"]) {
    return "";
  }
  return blockExplorers["default"]["url"];
};
