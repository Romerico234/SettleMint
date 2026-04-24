import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import { loadContractsEnv } from "./utils/loadEnv";
import {
  type ChainNetworkKey,
  chainNetworkProfiles,
} from "../settlemint-chain/networks";

loadContractsEnv();

function getOptionalNetworkConfig(
  networkKey: Exclude<ChainNetworkKey, "localhost">,
  rpcEnvKey: "AMOY_RPC_URL" | "POLYGON_RPC_URL",
) {
  const rpcUrl = process.env[rpcEnvKey]?.trim();
  const privateKey = process.env.DEPLOYER_PRIVATE_KEY?.trim();

  if (!rpcUrl || !privateKey) {
    return undefined;
  }

  return {
    url: rpcUrl,
    chainId: chainNetworkProfiles[networkKey].chainId,
    accounts: [privateKey],
  };
}

const amoyNetwork = getOptionalNetworkConfig("amoy", "AMOY_RPC_URL");
const polygonNetwork = getOptionalNetworkConfig("polygon", "POLYGON_RPC_URL");

const config: HardhatUserConfig = {
  solidity: "0.8.24",
  networks: {
    localhost: {
      url: chainNetworkProfiles.localhost.rpcUrl,
    },
    ...(amoyNetwork ? { amoy: amoyNetwork } : {}),
    ...(polygonNetwork ? { polygon: polygonNetwork } : {}),
  },
  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts",
  },
};

export default config;
