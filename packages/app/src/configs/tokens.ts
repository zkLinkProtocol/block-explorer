import daiIcon from "@/assets/images/tokens/dai.webp";
import usdcIcon from "@/assets/images/tokens/usdc.webp";
import usdtIcon from "@/assets/images/tokens/usdt.webp";
import wbtcIcon from "@/assets/images/tokens/wbtc.webp";

import arbitrumIcon from "@/assets/images/chains/arbitrum.svg";
import zksyncIcon from "@/assets/images/chains/zksync.svg";
import lineaIcon from "@/assets/images/chains/linea.svg";
import mantleIcon from "@/assets/images/chains/mantle.svg";
import mantaIcon from "@/assets/images/chains/manta.svg";
import optimismIcon from "@/assets/images/chains/optimism.svg";
import ethereumIcon from "@/assets/images/chains/ethereum.svg";
import baseIcon from "@/assets/images/chains/base.svg";

export interface SourceTokenStatic {
  symbol: string;
  chainName: string;
  chainId: number;
  tokenAddress: string;
  iconURL: string;
  chainIcon: string;
}

export interface MergeTokenStatic {
  name: string;
  symbol: string;
  tokenAddress: string;
  iconURL: string;
  createAt: string;
  lastUpgradedAt: string;
}
export interface SourceTokenBalanceItem {
  tokenAddress: string;
  symbol: string;
  chainName: string;
  chainId: number;
  balance: bigint;
}

export const mergeTokens: MergeTokenStatic[] = [
  {
    name: "Nova Tether USD",
    symbol: "USDT",
    tokenAddress: "0x2F8A25ac62179B31D62D7F80884AE57464699059",
    iconURL: usdtIcon,
    createAt: "2024-03-30 13:07",
    lastUpgradedAt: "2024-03-30 13:07",
  },
  {
    name: "Nova Wrapped BTC",
    symbol: "WBTC",
    iconURL: wbtcIcon,
    tokenAddress: "0xDa4AaEd3A53962c83B35697Cd138cc6df43aF71f",
    createAt: "2024-03-30 13:07",
    lastUpgradedAt: "2024-03-30 13:07",
  },
  {
    name: "Nova USD Coin",
    symbol: "USDC",
    iconURL: usdcIcon,
    tokenAddress: "0x1a1A3b2ff016332e866787B311fcB63928464509",
    createAt: "2024-03-30 13:07",
    lastUpgradedAt: "2024-03-30 13:07",
  },
  {
    name: "Nova Dai Stablecoin",
    symbol: "DAI",
    iconURL: daiIcon,
    tokenAddress: "0xF573fA04A73d5AC442F3DEa8741317fEaA3cDeab",
    createAt: "2024-03-30 13:07",
    lastUpgradedAt: "2024-03-30 13:07",
  },
];

export const sourceTokens: SourceTokenStatic[] = [
  {
    symbol: "USDT",
    iconURL: usdtIcon,
    chainName: "Ethereum",
    chainIcon: ethereumIcon,
    chainId: 1,
    tokenAddress: "0x0ace5E8e1Be0d3Df778f639d79fa8231b376b9F1",
  },
  {
    symbol: "USDT",
    iconURL: usdtIcon,
    chainName: "Arbitrum",
    chainIcon: arbitrumIcon,
    chainId: 42161,
    tokenAddress: "0x012726F9f458a63f86055b24E67BA0aa26505028",
  },
  {
    symbol: "USDT",
    iconURL: usdtIcon,
    chainName: "zkSync",
    chainIcon: zksyncIcon,
    chainId: 324,
    tokenAddress: "0x8Fed4307f02eCcbd9EC88C84081Ba5eDCAcD0964",
  },
  {
    symbol: "USDT",
    iconURL: usdtIcon,
    chainName: "Linea",
    chainIcon: lineaIcon,
    chainId: 59144,
    tokenAddress: "0xAF5852CA4Fc29264226Ed0c396dE30C945589D6D",
  },
  {
    symbol: "USDT",
    iconURL: usdtIcon,
    chainName: "Manta",
    chainIcon: mantaIcon,
    chainId: 169,
    tokenAddress: "0x8a87de262e7C0EfA4Cb59eC2a8e60494edD59e8f",
  },
  {
    symbol: "USDT",
    iconURL: usdtIcon,
    chainName: "Mantle",
    chainIcon: mantleIcon,
    chainId: 5000,
    tokenAddress: "0x7356804be101E88C260e074a5b34fC0E0D2d569b",
  },
  {
    symbol: "USDT",
    iconURL: usdtIcon,
    chainName: "Optimism",
    chainIcon: optimismIcon,
    chainId: 10,
    tokenAddress: "0x6aFb043b4955505fc9B2B965FCF6972Fa561291d",
  },
  {
    symbol: "WBTC",
    iconURL: wbtcIcon,
    chainName: "Ethereum",
    chainIcon: ethereumIcon,
    chainId: 1,
    tokenAddress: "0xEbc45Ef3B6D7E31573DAa9BE81825624725939f9",
  },
  {
    symbol: "WBTC",
    iconURL: wbtcIcon,
    chainName: "Arbitrum",
    chainIcon: arbitrumIcon,
    chainId: 42161,
    tokenAddress: "0x3DabBd8A31a411E85f628278d6601fCeD82f6844",
  },
  {
    symbol: "WBTC",
    iconURL: wbtcIcon,
    chainName: "zkSync",
    chainIcon: zksyncIcon,
    chainId: 324,
    tokenAddress: "0x60D49aAb4c150A172fefD4B5fFCc0BE41E655c18",
  },
  {
    symbol: "WBTC",
    iconURL: wbtcIcon,
    chainName: "Linea",
    chainIcon: lineaIcon,
    chainId: 59144,
    tokenAddress: "0xbECe765BdaDba05e3B639E6925657D265f94736C",
  },
  {
    symbol: "WBTC",
    iconURL: wbtcIcon,
    chainName: "Manta",
    chainIcon: mantaIcon,
    chainId: 169,
    tokenAddress: "0xA5FDC26E9Aff962c4C5645d43DdF27B8B630dB03",
  },
  {
    symbol: "WBTC",
    iconURL: wbtcIcon,
    chainName: "Mantle",
    chainIcon: mantleIcon,
    chainId: 5000,
    tokenAddress: "0x84e66eeB38C57A4C9548198F10f738bAe9f811ca",
  },
  {
    symbol: "WBTC",
    iconURL: wbtcIcon,
    chainName: "Optimism",
    chainIcon: optimismIcon,
    chainId: 10,
    tokenAddress: "0xA011145882C392e17C468CF0A85d2b385eAeDdd9",
  },
  {
    symbol: "USDC",
    iconURL: usdcIcon,
    chainName: "Ethereum",
    chainIcon: ethereumIcon,
    chainId: 1,
    tokenAddress: "0x220B1C622c8c169a9174f42CEA89a9E2f83B63F6",
  },
  {
    symbol: "USDC",
    iconURL: usdcIcon,
    chainName: "Arbitrum",
    chainIcon: arbitrumIcon,
    chainId: 42161,
    tokenAddress: "0x7581469cb53E786F39ff26E8aF6Fd750213dAcEd",
  },
  {
    symbol: "USDC",
    iconURL: usdcIcon,
    chainName: "zkSync",
    chainIcon: zksyncIcon,
    chainId: 324,
    tokenAddress: "0x60CF0D62329699A23E988d500A7E40Faae4a3E4D",
  },
  {
    symbol: "USDC",
    iconURL: usdcIcon,
    chainName: "Linea",
    chainIcon: lineaIcon,
    chainId: 59144,
    tokenAddress: "0xfFE944D301BB97b1271f78c7d0E8C930b75DC51B",
  },
  {
    symbol: "USDC",
    iconURL: usdcIcon,
    chainName: "Manta",
    chainIcon: mantaIcon,
    chainId: 169,
    tokenAddress: "0xA8A59Bb7fe9fE2364ae39a3B48E219fAB096c852",
  },
  {
    symbol: "USDC",
    iconURL: usdcIcon,
    chainName: "Mantle",
    chainIcon: mantleIcon,
    chainId: 5000,
    tokenAddress: "0x4E340B4Ea46ca1D1CE6e2dF7b21e649e2921521f",
  },
  {
    symbol: "USDC",
    iconURL: usdcIcon,
    chainName: "Optimism",
    chainIcon: optimismIcon,
    chainId: 10,
    tokenAddress: "0xd4A037d77AAFf6d7a396562fC5beaC76041A9EAf",
  },
  {
    symbol: "USDC",
    iconURL: usdcIcon,
    chainName: "Base",
    chainIcon: baseIcon,
    chainId: 8453,
    tokenAddress: "0x70064389730D2BDBcF85D8565A855716Cda0Bfca",
  },
  {
    symbol: "DAI",
    iconURL: daiIcon,
    chainName: "Ethereum",
    chainIcon: ethereumIcon,
    chainId: 1,
    tokenAddress: "0x075893f535b9DDE1D28492EA13085f27ecEf6320",
  },
  {
    symbol: "DAI",
    iconURL: daiIcon,
    chainName: "Arbitrum",
    chainIcon: arbitrumIcon,
    chainId: 42161,
    tokenAddress: "0x087e4D2D60da117835F681965Ea1CCC189e51599",
  },
  {
    symbol: "DAI",
    iconURL: daiIcon,
    chainName: "zkSync",
    chainIcon: zksyncIcon,
    chainId: 324,
    tokenAddress: "0x84618DE9861f1C9473A6502Dd8C7F9eA6A1a3bbA",
  },
  {
    symbol: "DAI",
    iconURL: daiIcon,
    chainName: "Linea",
    chainIcon: lineaIcon,
    chainId: 59144,
    tokenAddress: "0x852490a8dc093b4146A9FDABCA5B2B9c3ddbCC6C",
  },
  {
    symbol: "DAI",
    iconURL: daiIcon,
    chainName: "Optimism",
    chainIcon: optimismIcon,
    chainId: 10,
    tokenAddress: "0xCA68d516E9EE73093e14c048f18cb12e81C58a93",
  },
  {
    symbol: "DAI",
    iconURL: daiIcon,
    chainName: "Base",
    chainIcon: baseIcon,
    chainId: 8453,
    tokenAddress: "0x845D40825baE9bBE13819E639615b0152d84C4fE",
  },
];
