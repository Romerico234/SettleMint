import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { ethers, network } from "hardhat";
import { chainNetworkProfiles } from "../../settlemint-chain/networks";

async function main() {
  const [deployer] = await ethers.getSigners();
  const activeNetwork = await ethers.provider.getNetwork();
  const activeNetworkProfile = chainNetworkProfiles[network.name as keyof typeof chainNetworkProfiles];
  const paymentTokenAddress =
    activeNetworkProfile?.paymentAsset.kind === "erc20"
      ? activeNetworkProfile.paymentAsset.tokenAddress
      : ethers.ZeroAddress;

  const settlementProofFactory = await ethers.getContractFactory("SettlementProof");
  const settlementProof = await settlementProofFactory.deploy(paymentTokenAddress);
  await settlementProof.waitForDeployment();

  console.log(`Network: ${network.name}`);
  console.log(`SettlementProof: ${await settlementProof.getAddress()}`);
  console.log(`Payment token: ${paymentTokenAddress}`);

  const deploymentsDirectory = path.resolve(__dirname, "..", "deployments");
  const deploymentOutputPath = path.join(deploymentsDirectory, `${network.name}.json`);

  await mkdir(deploymentsDirectory, { recursive: true });
  await writeFile(
    deploymentOutputPath,
    JSON.stringify(
      {
        network: network.name,
        chainId: Number(activeNetwork.chainId),
        deployedAt: new Date().toISOString(),
        deployer: deployer.address,
        contracts: {
          settlementProof: await settlementProof.getAddress(),
          paymentToken: paymentTokenAddress,
        },
        paymentAsset: activeNetworkProfile?.paymentAsset ?? null,
      },
      null,
      2,
    ) + "\n",
  );

  console.log(`Deployment output: ${deploymentOutputPath}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
