import { useEffect, useState } from "react";
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
import {
  getNativeBalance,
  requestWalletAccess,
  sendTransaction,
  switchOrAddChain,
  waitForTransactionReceipt,
} from "../lib/wallet";
import type { Cycle, NativePaymentQuote, RepaymentBlock, Settlement } from "../shared/types";

type UseSettlementPaymentsInput = {
  walletAddress: string | null;
  selectedCycle: Cycle | null;
  settlements: Settlement[];
};

const repaymentBlocksStorageKeyPrefix = "settlemint:repayment-blocks:";

export function useSettlementPayments({
  walletAddress,
  selectedCycle,
  settlements,
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
    setRepaymentBlocks(readStoredRepaymentBlocks(selectedCycle.id));
    setErrorMessage(null);
  }, [selectedCycle?.id]);

  useEffect(() => {
    if (!selectedCycle?.id) {
      return;
    }

    setRepaymentBlocks((currentBlocks) =>
      syncRepaymentBlocks(selectedCycle.id, currentBlocks, settlements),
    );
  }, [selectedCycle?.id, settlements]);

  useEffect(() => {
    if (!selectedCycle?.id) {
      return;
    }

    writeStoredRepaymentBlocks(selectedCycle.id, repaymentBlocks);
    setPendingRepaymentBlockIDs((currentIDs) =>
      currentIDs.filter((currentID) =>
        repaymentBlocks.some((repaymentBlock) => repaymentBlock.blockId === currentID),
      ),
    );
  }, [selectedCycle?.id, repaymentBlocks]);

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
        to: repaymentBlock.toWalletAddress,
        value: settlementAmount,
      });

      const paymentQuote: NativePaymentQuote = {
        nativeAmountDisplay,
        nativeAmountBaseUnits: settlementAmount.toString(),
        nativeSymbol: settlemintChain.nativeCurrency.symbol,
        usdPerNative: quote.usdPerNative,
        sourceLabel: quote.sourceLabel,
        fetchedAtMs: quote.fetchedAtMs,
      };

      setRepaymentBlocks((currentBlocks) =>
        currentBlocks.map((currentBlock) =>
          currentBlock.blockId === repaymentBlock.blockId
            ? {
                ...currentBlock,
                status: "Submitted",
                transactionHash,
                paymentQuote,
              }
            : currentBlock,
        ),
      );

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
  currentBlocks: RepaymentBlock[],
  settlements: Settlement[],
) {
  const latestBlockByPair = new Map<string, RepaymentBlock>();
  const closedAmountByPair = new Map<string, number>();

  for (const repaymentBlock of currentBlocks) {
    const currentLatestBlock = latestBlockByPair.get(repaymentBlock.pairKey);
    if (!currentLatestBlock || repaymentBlock.sequence > currentLatestBlock.sequence) {
      latestBlockByPair.set(repaymentBlock.pairKey, repaymentBlock);
    }

    if (repaymentBlock.status !== "Pending") {
      closedAmountByPair.set(
        repaymentBlock.pairKey,
        roundCurrency(
          (closedAmountByPair.get(repaymentBlock.pairKey) ?? 0) + repaymentBlock.amount,
        ),
      );
    }
  }

  const nextBlocksByID = new Map<string, RepaymentBlock>();

  for (const repaymentBlock of currentBlocks) {
    if (repaymentBlock.status !== "Pending") {
      nextBlocksByID.set(repaymentBlock.blockId, repaymentBlock);
    }
  }

  for (const settlement of settlements) {
    const pairKey = repaymentPairKey(settlement.fromWalletAddress, settlement.toWalletAddress);
    const signature = settlementSignature(settlement);
    const latestBlock = latestBlockByPair.get(pairKey);
    const closedAmount = closedAmountByPair.get(pairKey) ?? 0;
    const remainingAmount = roundCurrency(settlement.amount - closedAmount);

    if (!latestBlock) {
      if (remainingAmount <= 0) {
        continue;
      }

      const firstBlock = createRepaymentBlock(cycleID, settlement, pairKey, 1, remainingAmount);
      nextBlocksByID.set(firstBlock.blockId, firstBlock);
      continue;
    }

    if (latestBlock.status === "Pending") {
      if (remainingAmount <= 0) {
        continue;
      }

      nextBlocksByID.set(
        latestBlock.blockId,
        createRepaymentBlock(
          cycleID,
          settlement,
          pairKey,
          latestBlock.sequence,
          remainingAmount,
          latestBlock,
        ),
      );
      continue;
    }

    if (latestBlock.settlementSignature === signature) {
      nextBlocksByID.set(
        latestBlock.blockId,
        createRepaymentBlock(
          cycleID,
          settlement,
          pairKey,
          latestBlock.sequence,
          latestBlock.amount,
          latestBlock,
        ),
      );
      continue;
    }

    if (remainingAmount <= 0) {
      continue;
    }

    const nextBlock = createRepaymentBlock(
      cycleID,
      settlement,
      pairKey,
      latestBlock.sequence + 1,
      remainingAmount,
    );
    nextBlocksByID.set(nextBlock.blockId, nextBlock);
  }

  return Array.from(nextBlocksByID.values()).sort(compareRepaymentBlocks);
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
  return 2;
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

function readStoredRepaymentBlocks(cycleID: string) {
  if (typeof window === "undefined") {
    return [] as RepaymentBlock[];
  }

  try {
    const rawValue = window.localStorage.getItem(repaymentBlocksStorageKey(cycleID));
    if (!rawValue) {
      return [] as RepaymentBlock[];
    }

    const parsedValue = JSON.parse(rawValue) as unknown;
    if (!Array.isArray(parsedValue)) {
      return [] as RepaymentBlock[];
    }

    return parsedValue.filter(isRepaymentBlockLike) as RepaymentBlock[];
  } catch {
    return [] as RepaymentBlock[];
  }
}

function writeStoredRepaymentBlocks(cycleID: string, repaymentBlocks: RepaymentBlock[]) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(
    repaymentBlocksStorageKey(cycleID),
    JSON.stringify(repaymentBlocks),
  );
}

function repaymentBlocksStorageKey(cycleID: string) {
  return `${repaymentBlocksStorageKeyPrefix}${cycleID}`;
}

function isRepaymentBlockLike(value: unknown): value is RepaymentBlock {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.blockId === "string" &&
    typeof candidate.cycleId === "string" &&
    typeof candidate.pairKey === "string" &&
    typeof candidate.sequence === "number" &&
    typeof candidate.settlementSignature === "string" &&
    typeof candidate.fromWalletAddress === "string" &&
    typeof candidate.toWalletAddress === "string" &&
    typeof candidate.amount === "number" &&
    typeof candidate.status === "string"
  );
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
      fetchedAt: new Date(input.paymentQuote.fetchedAtMs).toISOString(),
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
