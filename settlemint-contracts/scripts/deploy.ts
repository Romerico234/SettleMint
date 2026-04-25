import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { ethers, network } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();
  const activeNetwork = await ethers.provider.getNetwork();

  const settlementProofFactory = await ethers.getContractFactory("SettlementProof");
  const settlementProof = await settlementProofFactory.deploy();
  await settlementProof.waitForDeployment();

  console.log(`Network: ${network.name}`);
  console.log(`SettlementProof: ${await settlementProof.getAddress()}`);

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
        },
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
