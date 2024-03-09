const networkKeysMapping: Record<string, string> = {
  primary: "https://lineascan.build",
  ethereum: "https://etherscan.io",
  arbitrum: "https://arbiscan.io",
  zksync: "https://era.zksync.network",
  manta: "https://pacific-explorer.manta.network",
  mantle: "https://explorer.mantle.xyz",
  optimism: "https://optimistic.etherscan.io",
  metis: "https://andromeda-explorer.metis.io",
  base: "https://basescan.org",
  scroll: "https://scrollscan.com",
  polygonzkevm: "https://zkevm.polygonscan.com",
};

export const getExplorerUrlPrefix = (networkKey: string | undefined): string => {
  if (!networkKey) {
    networkKey = "primary";
  }

  const explorerUrl = networkKeysMapping[networkKey.toLowerCase()];

  return explorerUrl || ""; // Return the explorer URL or an empty string if not found
};
