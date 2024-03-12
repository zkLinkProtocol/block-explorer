import { checksumAddress } from "./formatters";

export const ETH_TOKEN_L2_ADDRESS = checksumAddress("0x000000000000000000000000000000000000800A");
export const ETH_TOKEN_L1_ADDRESS = "0x0000000000000000000000000000000000000000";

export const PROXY_CONTRACT_IMPLEMENTATION_ABI = [
  {
    inputs: [],
    name: "implementation",
    outputs: [
      {
        internalType: "address",
        type: "address",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
];
export const ETH_BLOCKEXPLORER_URL = "https://etherscan.io";
export const NOVA_NATIVE_TOKEN = "Nova Native Token";

export const NOVA_MERGED_TOKEN = "Merged Token";
