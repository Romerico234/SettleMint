import { settlemintChain } from "./settlemintChain";

const QUOTE_CACHE_TTL_MS = 60_000;
const QUOTE_DECIMAL_SCALE = 8;

type CachedQuote = NativeUsdQuote & {
  cachedAtMs: number;
};

export type NativeUsdQuote = {
  assetID: string;
  nativeSymbol: string;
  usdPerNative: number;
  fetchedAtMs: number;
  sourceLabel: string;
};

let cachedQuote: CachedQuote | null = null;

export async function fetchNativeUsdQuote(forceRefresh = false) {
  if (!forceRefresh && cachedQuote && Date.now() - cachedQuote.cachedAtMs < QUOTE_CACHE_TTL_MS) {
    return cachedQuote;
  }

  const response = await fetch(
    `https://api.coingecko.com/api/v3/simple/price?ids=${encodeURIComponent(
      settlemintChain.priceAssetID,
    )}&vs_currencies=usd&include_last_updated_at=true&precision=full`,
  );

  if (!response.ok) {
    throw new Error(`Failed to load ${settlemintChain.nativeCurrency.symbol}/USD quote`);
  }

  const body = (await response.json()) as Record<
    string,
    { usd?: number; last_updated_at?: number }
  >;
  const quoteBody = body[settlemintChain.priceAssetID];
  const usdPerNative = quoteBody?.usd;

  if (!quoteBody || typeof usdPerNative !== "number" || !Number.isFinite(usdPerNative) || usdPerNative <= 0) {
    throw new Error(`Invalid ${settlemintChain.nativeCurrency.symbol}/USD quote response`);
  }

  const nextQuote: CachedQuote = {
    assetID: settlemintChain.priceAssetID,
    nativeSymbol: settlemintChain.nativeCurrency.symbol,
    usdPerNative,
    fetchedAtMs: (quoteBody.last_updated_at ?? Math.floor(Date.now() / 1000)) * 1000,
    cachedAtMs: Date.now(),
    sourceLabel: "CoinGecko",
  };

  cachedQuote = nextQuote;
  return nextQuote;
}

export function quoteUsdAmountToNativeBaseUnits(
  usdAmount: number,
  usdPerNative: number,
  nativeDecimals: number,
) {
  const usdCents = BigInt(Math.round(usdAmount * 100));
  const scaledPrice = decimalStringToScaledInteger(String(usdPerNative), QUOTE_DECIMAL_SCALE);

  if (usdCents <= 0n || scaledPrice <= 0n) {
    throw new Error("A positive USD amount and quote are required.");
  }

  const numerator = usdCents * 10n ** BigInt(nativeDecimals + QUOTE_DECIMAL_SCALE);
  const denominator = scaledPrice * 100n;

  return divideAndRoundUp(numerator, denominator);
}

export function formatNativeBaseUnits(
  baseUnits: bigint,
  decimals: number,
  fractionDigits = 6,
) {
  const base = 10n ** BigInt(decimals);
  const whole = baseUnits / base;
  const fraction = baseUnits % base;
  const paddedFraction = fraction.toString().padStart(decimals, "0");
  const trimmedFraction = paddedFraction.slice(0, fractionDigits).replace(/0+$/, "");

  return trimmedFraction ? `${whole}.${trimmedFraction}` : whole.toString();
}

export function usdAmountToFixedAssetBaseUnits(usdAmount: number, decimals: number) {
  const cents = BigInt(Math.round(usdAmount * 100));
  if (cents <= 0n) {
    throw new Error("A positive USD amount is required.");
  }

  return cents * 10n ** BigInt(decimals) / 100n;
}

function decimalStringToScaledInteger(value: string, scale: number) {
  const trimmedValue = value.trim();
  if (!trimmedValue) {
    throw new Error("Missing decimal value");
  }

  const [wholePart, fractionalPart = ""] = trimmedValue.split(".");
  const normalizedWhole = wholePart === "" ? "0" : wholePart;
  const normalizedFraction = fractionalPart.padEnd(scale, "0").slice(0, scale);

  return BigInt(normalizedWhole) * 10n ** BigInt(scale) + BigInt(normalizedFraction || "0");
}

function divideAndRoundUp(numerator: bigint, denominator: bigint) {
  return (numerator + denominator - 1n) / denominator;
}
