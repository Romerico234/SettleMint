type SettlementAssetKind = "native" | "erc20";

type SettlementChainConfig = {
  chainId: number;
  chainIdHex: `0x${string}`;
  chainName: string;
  nativeCurrency: {
    name: string;
    symbol: string;
    decimals: number;
  };
  rpcUrls: string[];
  blockExplorerUrls: string[];
  asset: {
    kind: SettlementAssetKind;
    name: string;
    symbol: string;
    decimals: number;
    tokenAddress: string | null;
  };
};

const fallbackChainId = 80002;
const fallbackChainName = "Polygon Amoy";
const fallbackCurrencyName = "POL";
const fallbackCurrencySymbol = "POL";
const fallbackRpcUrl = "https://polygon-amoy.drpc.org";
const fallbackExplorerUrl = "https://amoy.polygonscan.com";
const fallbackAssetName = "SettleMint Test USD";
const fallbackAssetSymbol = "smUSD";
const fallbackAssetDecimals = 6;

function parseChainId(value: string | undefined, fallback: number) {
  if (!value) {
    return fallback;
  }

  const parsedValue = Number.parseInt(value, 10);
  if (!Number.isInteger(parsedValue) || parsedValue <= 0) {
    return fallback;
  }

  return parsedValue;
}

function parseRpcUrls(primaryUrl: string | undefined) {
  const trimmedUrl = primaryUrl?.trim();
  return trimmedUrl ? [trimmedUrl] : [fallbackRpcUrl];
}

function parseExplorerUrls(primaryUrl: string | undefined) {
  const trimmedUrl = primaryUrl?.trim();
  return trimmedUrl ? [trimmedUrl] : [fallbackExplorerUrl];
}

function parseAssetKind(value: string | undefined): SettlementAssetKind {
  return value?.trim().toLowerCase() === "native" ? "native" : "erc20";
}

function parseDecimals(value: string | undefined, fallback: number) {
  if (!value) {
    return fallback;
  }

  const parsedValue = Number.parseInt(value, 10);
  if (!Number.isInteger(parsedValue) || parsedValue < 0 || parsedValue > 18) {
    return fallback;
  }

  return parsedValue;
}

function parseTokenAddress(value: string | undefined) {
  const trimmedValue = value?.trim();
  return trimmedValue ? trimmedValue : null;
}

const chainId = parseChainId(import.meta.env.VITE_SETTLEMENT_CHAIN_ID, fallbackChainId);

export const settlementChain: SettlementChainConfig = {
  chainId,
  chainIdHex: `0x${chainId.toString(16)}`,
  chainName: import.meta.env.VITE_SETTLEMENT_CHAIN_NAME?.trim() || fallbackChainName,
  nativeCurrency: {
    name: import.meta.env.VITE_SETTLEMENT_CHAIN_CURRENCY_NAME?.trim() || fallbackCurrencyName,
    symbol: import.meta.env.VITE_SETTLEMENT_CHAIN_CURRENCY_SYMBOL?.trim() || fallbackCurrencySymbol,
    decimals: 18,
  },
  rpcUrls: parseRpcUrls(import.meta.env.VITE_SETTLEMENT_CHAIN_RPC_URL),
  blockExplorerUrls: parseExplorerUrls(import.meta.env.VITE_SETTLEMENT_CHAIN_EXPLORER_URL),
  asset: {
    kind: parseAssetKind(import.meta.env.VITE_SETTLEMENT_ASSET_KIND),
    name: import.meta.env.VITE_SETTLEMENT_ASSET_NAME?.trim() || fallbackAssetName,
    symbol: import.meta.env.VITE_SETTLEMENT_ASSET_SYMBOL?.trim() || fallbackAssetSymbol,
    decimals: parseDecimals(
      import.meta.env.VITE_SETTLEMENT_ASSET_DECIMALS,
      fallbackAssetDecimals,
    ),
    tokenAddress: parseTokenAddress(import.meta.env.VITE_SETTLEMENT_TOKEN_ADDRESS),
  },
};

export function buildSettlementTransactionUrl(transactionHash: string) {
  const explorerBaseUrl = settlementChain.blockExplorerUrls[0];
  if (!explorerBaseUrl) {
    return null;
  }

  return `${explorerBaseUrl.replace(/\/$/, "")}/tx/${transactionHash}`;
}

export function isSettlementPaymentConfigured() {
  return settlementChain.asset.kind === "native" || Boolean(settlementChain.asset.tokenAddress);
}

export function getSettlementRailLabel() {
  const assetLabel =
    settlementChain.asset.kind === "native"
      ? `${settlementChain.nativeCurrency.symbol} native token`
      : `${settlementChain.asset.symbol} test token`;

  return `${settlementChain.chainName} · ${assetLabel}`;
}

export function getSettlementPaymentSetupMessage() {
  if (settlementChain.asset.kind === "native") {
    return `Wallet payments will use ${settlementChain.nativeCurrency.symbol} on ${settlementChain.chainName}.`;
  }

  if (!settlementChain.asset.tokenAddress) {
    return `Configure VITE_SETTLEMENT_TOKEN_ADDRESS to enable ${settlementChain.asset.symbol} test-token payments on ${settlementChain.chainName}.`;
  }

  return `Wallet payments will use the ${settlementChain.asset.symbol} settlement token on ${settlementChain.chainName}.`;
}
