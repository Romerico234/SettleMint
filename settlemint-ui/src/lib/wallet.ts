export type EthereumProvider = {
  request: (args: { method: string; params?: unknown }) => Promise<unknown>;
  on: (event: string, listener: (...args: unknown[]) => void) => void;
  removeListener: (event: string, listener: (...args: unknown[]) => void) => void;
};

export type ConnectedEthereumWallet = EthereumProvider & {
  address: string;
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
