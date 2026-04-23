export type EthereumProvider = {
  request: (args: { method: string; params?: unknown }) => Promise<unknown>;
  on: (event: string, listener: (...args: unknown[]) => void) => void;
  removeListener: (event: string, listener: (...args: unknown[]) => void) => void;
};

export type ConnectedEthereumWallet = EthereumProvider & {
  address: string;
};

export type WalletAddEthereumChainParameter = {
  chainIdHex: `0x${string}`;
  chainName: string;
  nativeCurrency: {
    name: string;
    symbol: string;
    decimals: number;
  };
  rpcUrls: string[];
  blockExplorerUrls?: string[];
};

export function getEthereumProvider(): EthereumProvider | null {
  if (typeof window === "undefined") {
    return null;
  }

  const windowWithEthereum = window as typeof window & {
    ethereum?: EthereumProvider;
  };

  return windowWithEthereum.ethereum ?? null;
}

export function shortWallet(address: string | null | undefined) {
  if (!address) {
    return "Not connected";
  }

  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export async function getConnectedEthereumWallet() {
  const provider = getEthereumProvider();
  if (!provider) {
    return null;
  }

  const accounts = (await provider.request({
    method: "eth_requestAccounts",
  })) as string[];

  const address = accounts[0];
  if (!address) {
    return null;
  }

  return {
    ...provider,
    address,
  } satisfies ConnectedEthereumWallet;
}

export async function getAuthorizedWalletAddress() {
  const provider = getEthereumProvider();
  if (!provider) {
    return null;
  }

  const accounts = (await provider.request({
    method: "eth_accounts",
  })) as string[];

  return accounts[0] ?? null;
}

export async function getExistingConnectedEthereumWallet() {
  const provider = getEthereumProvider();
  if (!provider) {
    return null;
  }

  const accounts = (await provider.request({
    method: "eth_accounts",
  })) as string[];

  const address = accounts[0];
  if (!address) {
    return null;
  }

  return {
    ...provider,
    address,
  } satisfies ConnectedEthereumWallet;
}

export async function requestWalletAccess() {
  return getConnectedEthereumWallet();
}

export async function getWalletChainId(provider: EthereumProvider) {
  const chainIdHex = (await provider.request({
    method: "eth_chainId",
  })) as `0x${string}`;

  return Number.parseInt(chainIdHex, 16);
}

export function createSiweMessage(input: {
  domain: string;
  address: string;
  uri: string;
  chainId: number;
  statement: string;
  issuedAt?: string;
}) {
  const issuedAt = input.issuedAt ?? new Date().toISOString();

  return `${input.domain} wants you to sign in with your Ethereum account:
${input.address}

${input.statement}

URI: ${input.uri}
Version: 1
Chain ID: ${input.chainId}
Issued At: ${issuedAt}`;
}

export function toHex(value: string) {
  const bytes = new TextEncoder().encode(value);
  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
  return `0x${hex}` as const;
}

export async function signMessage(provider: EthereumProvider, address: string, message: string) {
  return (await provider.request({
    method: "personal_sign",
    params: [toHex(message), address],
  })) as `0x${string}`;
}

export async function switchOrAddChain(
  provider: EthereumProvider,
  chainConfig: WalletAddEthereumChainParameter,
) {
  try {
    await provider.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: chainConfig.chainIdHex }],
    });
  } catch (error) {
    if (!isProviderErrorCode(error, 4902)) {
      throw error;
    }

    await provider.request({
      method: "wallet_addEthereumChain",
      params: [
        {
          chainId: chainConfig.chainIdHex,
          chainName: chainConfig.chainName,
          nativeCurrency: chainConfig.nativeCurrency,
          rpcUrls: chainConfig.rpcUrls,
          blockExplorerUrls: chainConfig.blockExplorerUrls,
        },
      ],
    });
  }
}

export async function sendTransaction(
  provider: EthereumProvider,
  input: {
    from: string;
    to: string;
    value?: bigint;
    data?: `0x${string}`;
  },
) {
  const transactionRequest: {
    from: string;
    to: string;
    value?: `0x${string}`;
    data?: `0x${string}`;
  } = {
    from: input.from,
    to: input.to,
  };

  if (input.value !== undefined) {
    transactionRequest.value = `0x${input.value.toString(16)}`;
  }

  if (input.data) {
    transactionRequest.data = input.data;
  }

  return (await provider.request({
    method: "eth_sendTransaction",
    params: [transactionRequest],
  })) as `0x${string}`;
}

export function encodeErc20Transfer(recipientWalletAddress: string, amount: bigint) {
  if (!isWalletAddress(recipientWalletAddress)) {
    throw new Error("Recipient wallet address is invalid.");
  }

  const normalizedWallet = recipientWalletAddress.toLowerCase().replace(/^0x/, "");
  const paddedWallet = normalizedWallet.padStart(64, "0");
  const paddedAmount = amount.toString(16).padStart(64, "0");

  return `0xa9059cbb${paddedWallet}${paddedAmount}` as const;
}

export function appAmountToBaseUnits(amount: number, decimals: number) {
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error("Amount must be greater than zero.");
  }

  if (!Number.isInteger(decimals) || decimals < 0) {
    throw new Error("Currency decimals must be zero or greater.");
  }

  const normalizedAmount = amount.toFixed(2);
  const [wholePart, fractionalPart = ""] = normalizedAmount.split(".");
  const decimalsBigInt = BigInt(decimals);
  const baseUnitScale = 10n ** decimalsBigInt;
  const paddedFraction = fractionalPart.padEnd(decimals, "0").slice(0, decimals);

  return BigInt(wholePart) * baseUnitScale + BigInt(paddedFraction || "0");
}

function isProviderErrorCode(error: unknown, expectedCode: number) {
  if (!error || typeof error !== "object" || !("code" in error)) {
    return false;
  }

  return Number((error as { code: unknown }).code) === expectedCode;
}

function isWalletAddress(value: string) {
  return /^0x[a-fA-F0-9]{40}$/.test(value);
}
