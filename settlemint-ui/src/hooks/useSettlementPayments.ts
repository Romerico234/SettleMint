import { useEffect, useState } from "react";
import { submitSettlementPayment } from "../api/settlementPayments";
import { formatErrorMessage } from "../lib/appHelpers";
import {
  getSettlementPaymentSetupMessage,
  getSettlementRailLabel,
  isSettlementPaymentConfigured,
  settlemintChain,
} from "../lib/settlemintChain";
import {
  fetchNativeUsdQuote,
  formatNativeBaseUnits,
  quoteUsdAmountToNativeBaseUnits,
} from "../lib/nativeUsdQuote";
import { buildRecordSettlementPaymentCallData } from "../lib/settlementProof";
import {
  getNativeBalance,
  requestWalletAccess,
  sendTransaction,
  switchOrAddChain,
  waitForTransactionReceipt,
} from "../lib/wallet";
import type { Cycle, NativePaymentQuote, PaymentRecord, RepaymentBlock, Settlement } from "../shared/types";

type UseSettlementPaymentsInput = {
  walletAddress: string | null;
  selectedCycle: Cycle | null;
  settlements: Settlement[];
  payments: PaymentRecord[];
  onPaymentStateChanged?: () => Promise<void> | void;
};

export function useSettlementPayments({
  walletAddress,
  selectedCycle,
  settlements,
  payments,
  onPaymentStateChanged,
}: UseSettlementPaymentsInput) {
  const [pendingRepaymentBlockIDs, setPendingRepaymentBlockIDs] = useState<string[]>([]);
  const [repaymentBlocks, setRepaymentBlocks] = useState<RepaymentBlock[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!selectedCycle?.id) {
      setPendingRepaymentBlockIDs([]);
      setRepaymentBlocks([]);
      setErrorMessage(null);
      return;
    }

    setPendingRepaymentBlockIDs([]);
    setRepaymentBlocks([]);
    setErrorMessage(null);
  }, [selectedCycle?.id]);

  useEffect(() => {
    if (!selectedCycle?.id) {
      return;
    }

    const nextRepaymentBlocks = syncRepaymentBlocks(selectedCycle.id, settlements, payments);
    setRepaymentBlocks(nextRepaymentBlocks);
    setPendingRepaymentBlockIDs((currentIDs) =>
      currentIDs.filter((currentID) =>
        nextRepaymentBlocks.some((repaymentBlock) => repaymentBlock.blockId === currentID),
      ),
    );
  }, [selectedCycle?.id, settlements, payments]);

  async function paySettlement(repaymentBlock: RepaymentBlock) {
    if (!selectedCycle || selectedCycle.status !== "Active") {
      setErrorMessage("Select an active Settlement Cycle before opening a payment.");
      return;
    }

    if (!walletAddress) {
      setErrorMessage("Connect the payer wallet before opening a payment.");
      return;
    }

    if (walletAddress.toLowerCase() !== repaymentBlock.fromWalletAddress.toLowerCase()) {
      setErrorMessage("Only the payer for this obligation can open the transaction.");
      return;
    }

    if (!isSettlementPaymentConfigured()) {
      setErrorMessage(getSettlementPaymentSetupMessage());
      return;
    }

    if (repaymentBlock.transactionHash) {
      return;
    }

    setPendingRepaymentBlockIDs((currentIDs) =>
      currentIDs.includes(repaymentBlock.blockId)
        ? currentIDs
        : [...currentIDs, repaymentBlock.blockId],
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

      await switchOrAddChain(connectedWallet, settlemintChain);
      const quote = await fetchNativeUsdQuote();

      const settlementAmount = quoteUsdAmountToNativeBaseUnits(
        repaymentBlock.amount,
        quote.usdPerNative,
        settlemintChain.nativeCurrency.decimals,
      );
      const nativeAmountDisplay = formatNativeBaseUnits(
        settlementAmount,
        settlemintChain.nativeCurrency.decimals,
      );
      const payerBalanceBefore = await getNativeBalance(connectedWallet, connectedWallet.address);
      const payeeBalanceBefore = await getNativeBalance(
        connectedWallet,
        repaymentBlock.toWalletAddress,
      );

      const transactionHash = await sendTransaction(connectedWallet, {
        from: connectedWallet.address,
        to: settlemintChain.settlementProofAddress,
        value: settlementAmount,
        data: await buildRecordSettlementPaymentCallData({
          cycleId: selectedCycle.id,
          obligationId: repaymentBlock.settlementSignature,
          payeeWallet: repaymentBlock.toWalletAddress,
        }),
      });

      const paymentQuote: NativePaymentQuote = {
        nativeAmountDisplay,
        nativeAmountBaseUnits: settlementAmount.toString(),
        nativeSymbol: settlemintChain.nativeCurrency.symbol,
        usdPerNative: quote.usdPerNative,
        sourceLabel: quote.sourceLabel,
        fetchedAtMs: quote.fetchedAtMs,
        fetchedAt: new Date(quote.fetchedAtMs).toISOString(),
      };

      await submitSettlementPayment(selectedCycle.groupId, selectedCycle.id, {
        payerWallet: repaymentBlock.fromWalletAddress,
        payeeWallet: repaymentBlock.toWalletAddress,
        usdObligationAmount: repaymentBlock.amount,
        txHash: transactionHash,
        chainNetwork: settlemintChain.key,
        chainId: settlemintChain.chainId,
        nativeAmountBaseUnits: settlementAmount.toString(),
        quote: paymentQuote,
      });
      await onPaymentStateChanged?.();

      void logPaymentDebugAsync({
        repaymentBlock,
        transactionHash,
        paymentQuote,
        payerBalanceBefore,
        payeeBalanceBefore,
        connectedWallet,
      });
    } catch (error) {
      setErrorMessage(formatErrorMessage(error, "Failed to open wallet payment"));
    } finally {
      setPendingRepaymentBlockIDs((currentIDs) =>
        currentIDs.filter((currentID) => currentID !== repaymentBlock.blockId),
      );
    }
  }

  function resetUiState() {
    setPendingRepaymentBlockIDs([]);
    setRepaymentBlocks([]);
    setErrorMessage(null);
  }

  return {
    pendingRepaymentBlockIDs,
    repaymentBlocks,
    errorMessage,
    paymentConfigured: isSettlementPaymentConfigured(),
    paymentSetupMessage: getSettlementPaymentSetupMessage(),
    paymentRailLabel: getSettlementRailLabel(),
    paymentAssetSymbol: settlemintChain.nativeCurrency.symbol,
    paySettlement,
    resetUiState,
  };
}

function syncRepaymentBlocks(
  cycleID: string,
  settlements: Settlement[],
  payments: PaymentRecord[],
) {
  const closedAmountByPair = new Map<string, number>();
  const sequenceByPair = new Map<string, number>();
  const nextBlocksByID = new Map<string, RepaymentBlock>();
  const settlementByPair = new Map<string, Settlement>();

  for (const settlement of settlements) {
    settlementByPair.set(
      repaymentPairKey(settlement.fromWalletAddress, settlement.toWalletAddress),
      settlement,
    );
  }

  for (const payment of payments) {
    const pairKey = repaymentPairKey(payment.payerWallet, payment.payeeWallet);
    const sequence = (sequenceByPair.get(pairKey) ?? 0) + 1;
    sequenceByPair.set(pairKey, sequence);

    if (payment.status !== "Rejected") {
      closedAmountByPair.set(
        pairKey,
        roundCurrency((closedAmountByPair.get(pairKey) ?? 0) + payment.usdObligationAmount),
      );
    }

    nextBlocksByID.set(
      payment.id,
      createRepaymentBlockFromPayment(
        cycleID,
        payment,
        pairKey,
        sequence,
        settlementByPair.get(pairKey),
      ),
    );
  }

  for (const settlement of settlements) {
    const pairKey = repaymentPairKey(settlement.fromWalletAddress, settlement.toWalletAddress);
    const closedAmount = closedAmountByPair.get(pairKey) ?? 0;
    const remainingAmount = roundCurrency(settlement.amount - closedAmount);

    if (remainingAmount <= 0) {
      continue;
    }

    const sequence = (sequenceByPair.get(pairKey) ?? 0) + 1;
    sequenceByPair.set(pairKey, sequence);
    const nextBlock = createRepaymentBlock(
      cycleID,
      settlement,
      pairKey,
      sequence,
      remainingAmount,
    );
    nextBlocksByID.set(nextBlock.blockId, nextBlock);
  }

  return Array.from(nextBlocksByID.values()).sort(compareRepaymentBlocks);
}

function createRepaymentBlockFromPayment(
  cycleID: string,
  payment: PaymentRecord,
  pairKey: string,
  sequence: number,
  settlement?: Settlement,
): RepaymentBlock {
  return {
    blockId: payment.id,
    cycleId: cycleID,
    pairKey,
    sequence,
    settlementSignature: [
      payment.payerWallet.toLowerCase(),
      payment.payeeWallet.toLowerCase(),
      payment.usdObligationAmount.toFixed(2),
      payment.status,
    ].join("|"),
    fromWalletAddress: payment.payerWallet,
    fromDisplayName: payment.payerDisplayName || settlement?.fromDisplayName || "",
    toWalletAddress: payment.payeeWallet,
    toDisplayName: payment.payeeDisplayName || settlement?.toDisplayName || "",
    amount: payment.usdObligationAmount,
    status: payment.status === "Pending" ? "Submitted" : payment.status,
    transactionHash: payment.txHash,
    paymentQuote: payment.quote ?? null,
    verificationMessage: payment.verificationMessage,
  };
}

function createRepaymentBlock(
  cycleID: string,
  settlement: Settlement,
  pairKey: string,
  sequence: number,
  amount: number,
  previousBlock?: RepaymentBlock,
): RepaymentBlock {
  return {
    blockId: `${cycleID}:${pairKey}:${sequence}`,
    cycleId: cycleID,
    pairKey,
    sequence,
    settlementSignature: settlementSignature(settlement),
    fromWalletAddress: settlement.fromWalletAddress,
    fromDisplayName: settlement.fromDisplayName,
    toWalletAddress: settlement.toWalletAddress,
    toDisplayName: settlement.toDisplayName,
    amount,
    status: previousBlock?.status === "Verified" ? "Verified" : previousBlock?.status ?? "Pending",
    transactionHash: previousBlock?.transactionHash ?? null,
    paymentQuote: previousBlock?.paymentQuote ?? null,
  };
}

function roundCurrency(amount: number) {
  return Number(amount.toFixed(2));
}

function compareRepaymentBlocks(left: RepaymentBlock, right: RepaymentBlock) {
  const leftPriority = repaymentBlockStatusPriority(left.status);
  const rightPriority = repaymentBlockStatusPriority(right.status);

  if (leftPriority !== rightPriority) {
    return leftPriority - rightPriority;
  }

  if (left.sequence !== right.sequence) {
    return right.sequence - left.sequence;
  }

  return left.blockId.localeCompare(right.blockId);
}

function repaymentBlockStatusPriority(status: RepaymentBlock["status"]) {
  if (status === "Pending") {
    return 0;
  }
  if (status === "Submitted") {
    return 1;
  }
  if (status === "Rejected") {
    return 2;
  }
  return 3;
}

function repaymentPairKey(fromWalletAddress: string, toWalletAddress: string) {
  return `${fromWalletAddress.toLowerCase()}->${toWalletAddress.toLowerCase()}`;
}

function settlementSignature(settlement: Settlement) {
  return [
    settlement.fromWalletAddress.toLowerCase(),
    settlement.toWalletAddress.toLowerCase(),
    settlement.amount.toFixed(2),
    settlement.status,
  ].join("|");
}

async function logPaymentDebugAsync(input: {
  repaymentBlock: RepaymentBlock;
  transactionHash: string;
  paymentQuote: NativePaymentQuote;
  payerBalanceBefore: bigint;
  payeeBalanceBefore: bigint;
  connectedWallet: NonNullable<Awaited<ReturnType<typeof requestWalletAccess>>>;
}) {
  const logHeader = `[SettleMint Payment] ${input.repaymentBlock.fromDisplayName || input.repaymentBlock.fromWalletAddress} -> ${input.repaymentBlock.toDisplayName || input.repaymentBlock.toWalletAddress}`;

  console.groupCollapsed(logHeader);
  console.log({
    phase: "submitted",
    repaymentBlockID: input.repaymentBlock.blockId,
    settlementAmountUSD: input.repaymentBlock.amount,
    transactionHash: input.transactionHash,
    quote: {
      source: input.paymentQuote.sourceLabel,
      usdPerNative: input.paymentQuote.usdPerNative,
      fetchedAt: input.paymentQuote.fetchedAt ?? new Date(input.paymentQuote.fetchedAtMs ?? Date.now()).toISOString(),
    },
    transfer: {
      nativeAmountDisplay: `${input.paymentQuote.nativeAmountDisplay} ${input.paymentQuote.nativeSymbol}`,
      nativeAmountBaseUnits: input.paymentQuote.nativeAmountBaseUnits,
    },
    balances: {
      payerBefore: `${formatNativeBaseUnits(input.payerBalanceBefore, settlemintChain.nativeCurrency.decimals)} ${input.paymentQuote.nativeSymbol}`,
      payeeBefore: `${formatNativeBaseUnits(input.payeeBalanceBefore, settlemintChain.nativeCurrency.decimals)} ${input.paymentQuote.nativeSymbol}`,
    },
  });
  console.groupEnd();

  try {
    const transactionReceipt = await waitForTransactionReceipt(
      input.connectedWallet,
      input.transactionHash as `0x${string}`,
    );
    const payerBalanceAfter = await getNativeBalance(
      input.connectedWallet,
      input.connectedWallet.address,
    );
    const payeeBalanceAfter = await getNativeBalance(
      input.connectedWallet,
      input.repaymentBlock.toWalletAddress,
    );

    console.groupCollapsed(logHeader);
    console.log({
      phase: "post-confirmation-check",
      repaymentBlockID: input.repaymentBlock.blockId,
      transactionHash: input.transactionHash,
      receiptFound: Boolean(transactionReceipt),
      balances: {
        payerBefore: `${formatNativeBaseUnits(input.payerBalanceBefore, settlemintChain.nativeCurrency.decimals)} ${input.paymentQuote.nativeSymbol}`,
        payerAfter: `${formatNativeBaseUnits(payerBalanceAfter, settlemintChain.nativeCurrency.decimals)} ${input.paymentQuote.nativeSymbol}`,
        payeeBefore: `${formatNativeBaseUnits(input.payeeBalanceBefore, settlemintChain.nativeCurrency.decimals)} ${input.paymentQuote.nativeSymbol}`,
        payeeAfter: `${formatNativeBaseUnits(payeeBalanceAfter, settlemintChain.nativeCurrency.decimals)} ${input.paymentQuote.nativeSymbol}`,
      },
    });
    console.groupEnd();
  } catch (error) {
    console.warn("[SettleMint Payment] Debug follow-up failed", error);
  }
}
