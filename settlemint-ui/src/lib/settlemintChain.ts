import {
  chainNetworkProfiles,
  defaultChainNetworkKey,
  resolveChainNetworkKey,
} from "../../../settlemint-chain/networks";

type SettleMintChainConfig = {
  key: string;
  status: "active" | "inactive";
  priceAssetID: string;
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
  settlementProofAddress: string;
};

const selectedNetworkKey = resolveChainNetworkKey(
  import.meta.env.VITE_SETTLEMENT_NETWORK || defaultChainNetworkKey,
);
const selectedProfile = chainNetworkProfiles[selectedNetworkKey];
const defaultLocalhostSettlementProofAddress = "0x5FbDB2315678afecb367f032d93F642f64180aa3";

export const settlemintChain: SettleMintChainConfig = {
  key: selectedProfile.key,
  status: selectedProfile.status,
  priceAssetID: selectedProfile.priceAssetID,
  chainId: selectedProfile.chainId,
  chainIdHex: `0x${selectedProfile.chainId.toString(16)}`,
  chainName: selectedProfile.chainName,
  nativeCurrency: selectedProfile.nativeCurrency,
  rpcUrls: selectedProfile.rpcUrl ? [selectedProfile.rpcUrl] : [],
  blockExplorerUrls: selectedProfile.explorerUrl ? [selectedProfile.explorerUrl] : [],
  settlementProofAddress:
    import.meta.env.VITE_SETTLEMENT_PROOF_ADDRESS?.trim() ||
    (selectedNetworkKey === "localhost" ? defaultLocalhostSettlementProofAddress : ""),
};

export function buildSettlementTransactionUrl(transactionHash: string) {
  const explorerBaseUrl = settlemintChain.blockExplorerUrls[0];
  if (!explorerBaseUrl) {
    return null;
  }

  return `${explorerBaseUrl.replace(/\/$/, "")}/tx/${transactionHash}`;
}

export function isSettlementPaymentConfigured() {
  return settlemintChain.status === "active" && Boolean(settlemintChain.settlementProofAddress);
}

export function getSettlementRailLabel() {
  return `${settlemintChain.chainName} · ${settlemintChain.nativeCurrency.symbol} native currency`;
}

export function getSettlementPaymentSetupMessage() {
  if (settlemintChain.status !== "active") {
    return `The ${settlemintChain.chainName} profile is currently inactive in this branch. See settlemint-chain/NETWORK_ROLLOUT.md before using it.`;
  }
  if (!settlemintChain.settlementProofAddress) {
    return `Set VITE_SETTLEMENT_PROOF_ADDRESS to the deployed SettlementProof contract address before using wallet payments.`;
  }

  return `Wallet payments will use ${settlemintChain.nativeCurrency.symbol} on ${settlemintChain.chainName} through SettlementProof.`;
}
