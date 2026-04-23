import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { ethers, network } from "hardhat";

function parseDecimals(value: string | undefined, fallback: number) {
  if (!value) {
    return fallback;
  }

  const parsedValue = Number.parseInt(value, 10);
  return Number.isInteger(parsedValue) && parsedValue >= 0 && parsedValue <= 18
    ? parsedValue
    : fallback;
}

function parseInitialSupply(value: string | undefined, fallback: string) {
  return value?.trim() || fallback;
}

async function main() {
  const [deployer] = await ethers.getSigners();
  const activeNetwork = await ethers.provider.getNetwork();

  const settlementProofFactory = await ethers.getContractFactory("SettlementProof");
  const settlementProof = await settlementProofFactory.deploy();
  await settlementProof.waitForDeployment();

  const tokenName = process.env.SETTLEMENT_TOKEN_NAME?.trim() || "SettleMint Test USD";
  const tokenSymbol = process.env.SETTLEMENT_TOKEN_SYMBOL?.trim() || "smUSD";
  const tokenDecimals = parseDecimals(process.env.SETTLEMENT_TOKEN_DECIMALS, 6);
  const initialHolder = process.env.SETTLEMENT_TOKEN_INITIAL_HOLDER?.trim() || deployer.address;
  const initialSupply = parseInitialSupply(process.env.SETTLEMENT_TOKEN_INITIAL_SUPPLY, "1000000");
  const initialSupplyBaseUnits = ethers.parseUnits(initialSupply, tokenDecimals);

  const settlementTokenFactory = await ethers.getContractFactory("MockSettlementToken");
  const settlementToken = await settlementTokenFactory.deploy(
    tokenName,
    tokenSymbol,
    tokenDecimals,
    initialHolder,
    initialSupplyBaseUnits,
  );
  await settlementToken.waitForDeployment();

  console.log(`Network: ${network.name}`);
  console.log(`SettlementProof: ${await settlementProof.getAddress()}`);
  console.log(`MockSettlementToken: ${await settlementToken.getAddress()}`);
  console.log(`Token symbol: ${tokenSymbol}`);
  console.log(`Initial holder: ${initialHolder}`);

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
          mockSettlementToken: {
            address: await settlementToken.getAddress(),
            name: tokenName,
            symbol: tokenSymbol,
            decimals: tokenDecimals,
            initialHolder,
            initialSupply,
          },
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
