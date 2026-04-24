import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { ethers, network } from "hardhat";

async function main() {
  if (network.name !== "localhost") {
    throw new Error("bootstrapLocalhost.ts can only be run against the localhost network.");
  }

  const deploymentOutputPath = path.resolve(__dirname, "..", "deployments", "localhost.json");
  const deploymentOutput = JSON.parse(await readFile(deploymentOutputPath, "utf8")) as {
    chainId: number;
  };

  const [deployer] = await ethers.getSigners();
  const walletsToBootstrap = parseWalletList(process.env.SETTLEMENT_BOOTSTRAP_WALLETS);
  const nativeAmount = process.env.SETTLEMENT_BOOTSTRAP_NATIVE_AMOUNT?.trim() || "25";

  const bootstrappedWallets: Array<{
    walletAddress: string;
    fundedEth: string;
  }> = [];

  for (const walletAddress of walletsToBootstrap) {
    if (walletAddress.toLowerCase() === deployer.address.toLowerCase()) {
      continue;
    }

    const fundTransaction = await deployer.sendTransaction({
      to: walletAddress,
      value: ethers.parseEther(nativeAmount),
    });
    await fundTransaction.wait();

    bootstrappedWallets.push({
      walletAddress,
      fundedEth: nativeAmount,
    });
  }

  await writeFile(
    deploymentOutputPath,
    JSON.stringify(
      {
        ...deploymentOutput,
        settlementBootstrap: {
          updatedAt: new Date().toISOString(),
          fundedNativeAmountPerWallet: nativeAmount,
          wallets: bootstrappedWallets,
        },
      },
      null,
      2,
    ) + "\n",
  );

  console.log("Bootstrapped localhost wallets:");
  for (const wallet of bootstrappedWallets) {
    console.log(`- ${wallet.walletAddress}: ${wallet.fundedEth} ETH`);
  }
  console.log(`Updated deployment output: ${deploymentOutputPath}`);
}

function parseWalletList(value: string | undefined) {
  const wallets = (value?.split(",") ?? [])
    .map((entry) => entry.trim())
    .filter(Boolean);

  const uniqueWallets = Array.from(new Set(wallets.map((wallet) => wallet.toLowerCase())));
  if (uniqueWallets.length === 0) {
    throw new Error(
      "No bootstrap wallets were provided. Set SETTLEMENT_BOOTSTRAP_WALLETS in settlemint-contracts/.env.",
    );
  }

  for (const wallet of uniqueWallets) {
    if (!ethers.isAddress(wallet)) {
      throw new Error(`Invalid wallet address in localhost bootstrap list: ${wallet}`);
    }
  }

  return uniqueWallets;
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
