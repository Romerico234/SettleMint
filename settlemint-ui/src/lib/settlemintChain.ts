import {
  chainNetworkProfiles,
  defaultChainNetworkKey,
  type PaymentAsset,
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
  paymentAsset: PaymentAsset;
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
  paymentAsset: selectedProfile.paymentAsset,
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
  return (
    settlemintChain.status === "active" &&
    Boolean(settlemintChain.settlementProofAddress) &&
    (settlemintChain.paymentAsset.kind === "native" ||
      settlemintChain.paymentAsset.tokenAddress !== "0x0000000000000000000000000000000000000000")
  );
}

export function getSettlementRailLabel() {
  return `${settlemintChain.chainName} · ${settlemintChain.paymentAsset.label}`;
}

export function getSettlementPaymentSetupMessage() {
  if (settlemintChain.status !== "active") {
    return `The ${settlemintChain.chainName} profile is currently inactive in this branch. See settlemint-chain/NETWORK_ROLLOUT.md before using it.`;
  }
  if (!settlemintChain.settlementProofAddress) {
    return `Set VITE_SETTLEMENT_PROOF_ADDRESS to the deployed SettlementProof contract address before using wallet payments.`;
  }
  if (
    settlemintChain.paymentAsset.kind === "erc20" &&
    settlemintChain.paymentAsset.tokenAddress === "0x0000000000000000000000000000000000000000"
  ) {
    return `Set the ${settlemintChain.chainName} USDC token address in settlemint-chain/networks.ts before using wallet payments.`;
  }

  return `Wallet payments will use ${settlemintChain.paymentAsset.symbol} on ${settlemintChain.chainName}.`;
}
