import { useEffect, useState } from "react";
import { formatErrorMessage } from "../lib/appHelpers";
import {
  getSettlementPaymentSetupMessage,
  getSettlementRailLabel,
  isSettlementPaymentConfigured,
  settlementChain,
} from "../lib/settlementChain";
import {
  appAmountToBaseUnits,
  encodeErc20Transfer,
  requestWalletAccess,
  sendTransaction,
  switchOrAddChain,
} from "../lib/wallet";
import type { Cycle, Settlement } from "../shared/types";

type UseSettlementPaymentsInput = {
  walletAddress: string | null;
  selectedCycle: Cycle | null;
};

export function useSettlementPayments({
  walletAddress,
  selectedCycle,
}: UseSettlementPaymentsInput) {
  const [pendingSettlementIDs, setPendingSettlementIDs] = useState<string[]>([]);
  const [transactionHashesBySettlementID, setTransactionHashesBySettlementID] = useState<
    Record<string, string>
  >({});
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    resetUiState();
  }, [selectedCycle?.id]);

  async function paySettlement(settlement: Settlement) {
    if (!selectedCycle || selectedCycle.status !== "Active") {
      setErrorMessage("Select an active Settlement Cycle before opening a payment.");
      return;
    }

    if (!walletAddress) {
      setErrorMessage("Connect the payer wallet before opening a payment.");
      return;
    }

    if (walletAddress.toLowerCase() !== settlement.fromWalletAddress.toLowerCase()) {
      setErrorMessage("Only the payer for this obligation can open the transaction.");
      return;
    }

    if (!isSettlementPaymentConfigured()) {
      setErrorMessage(getSettlementPaymentSetupMessage());
      return;
    }

    if (transactionHashesBySettlementID[settlement.id]) {
      return;
    }

    setPendingSettlementIDs((currentIDs) =>
      currentIDs.includes(settlement.id) ? currentIDs : [...currentIDs, settlement.id],
    );
    setErrorMessage(null);

    try {
      const connectedWallet = await requestWalletAccess();

      if (!connectedWallet) {
        throw new Error("No wallet connection was found.");
      }

      if (connectedWallet.address.toLowerCase() !== walletAddress.toLowerCase()) {
        throw new Error("The connected wallet does not match the signed-in SettleMint wallet.");
      }

      await switchOrAddChain(connectedWallet, settlementChain);

      const settlementAmount = appAmountToBaseUnits(
        settlement.amount,
        settlementChain.asset.kind === "native"
          ? settlementChain.nativeCurrency.decimals
          : settlementChain.asset.decimals,
      );

      const transactionHash =
        settlementChain.asset.kind === "native"
          ? await sendTransaction(connectedWallet, {
              from: connectedWallet.address,
              to: settlement.toWalletAddress,
              value: settlementAmount,
            })
          : await sendTransaction(connectedWallet, {
              from: connectedWallet.address,
              to: settlementChain.asset.tokenAddress!,
              value: 0n,
              data: encodeErc20Transfer(settlement.toWalletAddress, settlementAmount),
            });

      setTransactionHashesBySettlementID((currentHashes) => ({
        ...currentHashes,
        [settlement.id]: transactionHash,
      }));
    } catch (error) {
      setErrorMessage(formatErrorMessage(error, "Failed to open wallet payment"));
    } finally {
      setPendingSettlementIDs((currentIDs) =>
        currentIDs.filter((currentID) => currentID !== settlement.id),
      );
    }
  }

  function resetUiState() {
    setPendingSettlementIDs([]);
    setTransactionHashesBySettlementID({});
    setErrorMessage(null);
  }

  return {
    pendingSettlementIDs,
    transactionHashesBySettlementID,
    errorMessage,
    paymentConfigured: isSettlementPaymentConfigured(),
    paymentSetupMessage: getSettlementPaymentSetupMessage(),
    paymentRailLabel: getSettlementRailLabel(),
    paymentAssetSymbol:
      settlementChain.asset.kind === "native"
        ? settlementChain.nativeCurrency.symbol
        : settlementChain.asset.symbol,
    paySettlement,
    resetUiState,
  };
}
