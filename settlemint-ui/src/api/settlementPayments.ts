import { apiFetch } from "./client";
import type { NativePaymentQuote, PaymentRecord } from "../shared/types";

type SubmitSettlementPaymentInput = {
  payerWallet: string;
  payeeWallet: string;
  usdObligationAmount: number;
  txHash: string;
  chainNetwork: string;
  chainId: number;
  nativeAmountBaseUnits: string;
  quote: NativePaymentQuote;
};

export async function submitSettlementPayment(
  groupID: string,
  cycleID: string,
  input: SubmitSettlementPaymentInput,
) {
  const { fetchedAtMs: _fetchedAtMs, ...quote } = input.quote;
  const response = await apiFetch(
    `/groups/${groupID}/cycles/${cycleID}/settlement-payments/`,
    {
      method: "POST",
      body: JSON.stringify({
        ...input,
        quote,
      }),
    },
  );

  if (!response.ok) {
    const errorBody = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new Error(errorBody?.error || "Failed to submit settlement payment");
  }

  return (await response.json()) as { payment: PaymentRecord };
}
