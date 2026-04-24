export type ChainNetworkKey = "localhost" | "amoy" | "polygon";
export type ChainNetworkStatus = "active" | "inactive";

export type ChainNetworkProfile = {
  key: ChainNetworkKey;
  label: string;
  status: ChainNetworkStatus;
  priceAssetID: string;
  chainId: number;
  chainName: string;
  nativeCurrency: {
    name: string;
    symbol: string;
    decimals: number;
  };
  rpcUrl: string;
  explorerUrl: string | null;
};

export const chainNetworkProfiles: Record<ChainNetworkKey, ChainNetworkProfile> = {
  localhost: {
    key: "localhost",
    label: "Hardhat Localhost",
    status: "active",
    priceAssetID: "ethereum",
    chainId: 31337,
    chainName: "Hardhat Localhost",
    nativeCurrency: {
      name: "Ethereum",
      symbol: "ETH",
      decimals: 18,
    },
    rpcUrl: "http://127.0.0.1:8545",
    explorerUrl: null,
  },
  amoy: {
    key: "amoy",
    label: "Polygon Amoy",
    status: "inactive",
    priceAssetID: "polygon-ecosystem-token",
    chainId: 80002,
    chainName: "Polygon Amoy",
    nativeCurrency: {
      name: "POL",
      symbol: "POL",
      decimals: 18,
    },
    rpcUrl: "https://polygon-amoy.drpc.org",
    explorerUrl: "https://amoy.polygonscan.com",
  },
  polygon: {
    key: "polygon",
    label: "Polygon PoS",
    status: "inactive",
    priceAssetID: "polygon-ecosystem-token",
    chainId: 137,
    chainName: "Polygon PoS",
    nativeCurrency: {
      name: "POL",
      symbol: "POL",
      decimals: 18,
    },
    rpcUrl: "https://polygon-rpc.com",
    explorerUrl: "https://polygonscan.com",
  },
};

export const defaultChainNetworkKey: ChainNetworkKey = "localhost";

export function resolveChainNetworkKey(
  value: string | undefined | null,
): ChainNetworkKey {
  if (value === "localhost" || value === "amoy" || value === "polygon") {
    return value;
  }

  return defaultChainNetworkKey;
}
