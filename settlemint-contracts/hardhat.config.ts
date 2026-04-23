import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import { loadContractsEnv } from "./utils/loadEnv";

loadContractsEnv();

const deployerPrivateKey = process.env.DEPLOYER_PRIVATE_KEY;

function buildNetworkConfig(rpcUrl: string | undefined) {
  if (!rpcUrl || !isValidPrivateKey(deployerPrivateKey)) {
    return undefined;
  }

  return {
    url: rpcUrl,
    accounts: [deployerPrivateKey],
  };
}

function isValidPrivateKey(value: string | undefined) {
  if (!value) {
    return false;
  }

  const normalizedValue = value.startsWith("0x") ? value.slice(2) : value;
  return /^[a-fA-F0-9]{64}$/.test(normalizedValue);
}

const networks = Object.fromEntries(
  Object.entries({
    amoy: buildNetworkConfig(process.env.AMOY_RPC_URL),
    polygon: buildNetworkConfig(process.env.POLYGON_RPC_URL),
  }).filter(([, config]) => Boolean(config)),
);

const config: HardhatUserConfig = {
  solidity: "0.8.24",
  networks,
  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts"
  }
};

export default config;
