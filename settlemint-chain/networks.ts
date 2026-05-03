export type ChainNetworkKey = "localhost" | "amoy" | "polygon";
export type ChainNetworkStatus = "active" | "inactive";
export type PaymentAsset =
  | {
      kind: "native";
      symbol: string;
      decimals: number;
      label: string;
    }
  | {
      kind: "erc20";
      symbol: string;
      decimals: number;
      label: string;
      tokenAddress: `0x${string}`;
    };

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
  paymentAsset: PaymentAsset;
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
    paymentAsset: {
      kind: "native",
      symbol: "ETH",
      decimals: 18,
      label: "Local Hardhat ETH",
    },
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
    paymentAsset: {
      kind: "erc20",
      symbol: "USDC",
      decimals: 6,
      label: "USDC",
      tokenAddress: "0x0000000000000000000000000000000000000000",
    },
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
    paymentAsset: {
      kind: "erc20",
      symbol: "USDC",
      decimals: 6,
      label: "USDC",
      tokenAddress: "0x3c499c542cef5e3811e1192ce70d8cc03d5c3359",
    },
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
