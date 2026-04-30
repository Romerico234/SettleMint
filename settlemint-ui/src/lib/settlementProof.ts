const recordSettlementPaymentSelector = "0xe4164dcd";
const approveSelector = "0x095ea7b3";

export async function buildRecordSettlementPaymentCallData(input: {
  cycleId: string;
  obligationId: string;
  payeeWallet: string;
  amountBaseUnits: bigint;
}) {
  return `${recordSettlementPaymentSelector}${stripHexPrefix(
    await hashStringToBytes32(input.cycleId),
  )}${stripHexPrefix(await hashStringToBytes32(input.obligationId))}${encodeAddress(
    input.payeeWallet,
  )}${encodeUint256(input.amountBaseUnits)}` as `0x${string}`;
}

export function buildApproveCallData(input: {
  spender: string;
  amountBaseUnits: bigint;
}) {
  return `${approveSelector}${encodeAddress(input.spender)}${encodeUint256(
    input.amountBaseUnits,
  )}` as `0x${string}`;
}

async function hashStringToBytes32(value: string) {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return `0x${Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("")}` as const;
}

function encodeAddress(address: string) {
  const normalizedAddress = stripHexPrefix(address).toLowerCase();
  if (normalizedAddress.length !== 40) {
    throw new Error("Settlement payee address is invalid.");
  }

  return normalizedAddress.padStart(64, "0");
}

function encodeUint256(value: bigint) {
  if (value < 0n) {
    throw new Error("Settlement amount is invalid.");
  }

  return value.toString(16).padStart(64, "0");
}

function stripHexPrefix(value: string) {
  return value.startsWith("0x") ? value.slice(2) : value;
}
