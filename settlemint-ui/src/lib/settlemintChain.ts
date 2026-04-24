import {
  chainNetworkProfiles,
  defaultChainNetworkKey,
  resolveChainNetworkKey,
} from "../../../settlemint-chain/networks";

type SettleMintChainConfig = {
  key: string;
  status: "active" | "inactive";
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
};

const selectedNetworkKey = resolveChainNetworkKey(
  import.meta.env.VITE_SETTLEMENT_NETWORK || defaultChainNetworkKey,
);
const selectedProfile = chainNetworkProfiles[selectedNetworkKey];

export const settlemintChain: SettleMintChainConfig = {
  key: selectedProfile.key,
  status: selectedProfile.status,
  chainId: selectedProfile.chainId,
  chainIdHex: `0x${selectedProfile.chainId.toString(16)}`,
  chainName: selectedProfile.chainName,
  nativeCurrency: selectedProfile.nativeCurrency,
  rpcUrls: selectedProfile.rpcUrl ? [selectedProfile.rpcUrl] : [],
  blockExplorerUrls: selectedProfile.explorerUrl ? [selectedProfile.explorerUrl] : [],
};

export function buildSettlementTransactionUrl(transactionHash: string) {
  const explorerBaseUrl = settlemintChain.blockExplorerUrls[0];
  if (!explorerBaseUrl) {
    return null;
  }

  return `${explorerBaseUrl.replace(/\/$/, "")}/tx/${transactionHash}`;
}

export function isSettlementPaymentConfigured() {
  return settlemintChain.status === "active";
}

export function getSettlementRailLabel() {
  return `${settlemintChain.chainName} · ${settlemintChain.nativeCurrency.symbol} native currency`;
}

export function getSettlementPaymentSetupMessage() {
  if (settlemintChain.status !== "active") {
    return `The ${settlemintChain.chainName} profile is currently inactive in this branch. See settlemint-chain/NETWORK_ROLLOUT.md before using it.`;
  }

  return `Wallet payments will use ${settlemintChain.nativeCurrency.symbol} on ${settlemintChain.chainName}.`;
}
