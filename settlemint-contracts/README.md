# SettleMint Contracts

Smart contract sources, Hardhat configuration, and deployment scripts for SettleMint.

## Overview

<<<<<<< HEAD
- Network definitions are shared with [`settlemint-chain/networks.ts`](../settlemint-chain/networks.ts).
- Supported network keys are `localhost`, `amoy`, and `polygon`.
- Main configuration lives in `hardhat.config.ts`, `.env.example`, and `../settlemint-chain/networks.ts`.
- Public-network deployment requires `DEPLOYER_PRIVATE_KEY` and the matching RPC URL.

## Setup
=======
Contract network definitions are maintained in: [`settlemint-chain/networks.ts`](../settlemint-chain/networks.ts). Payment asset definitions live there too. `localhost` uses native Hardhat ETH, and `polygon` uses native USDC.

The contracts package uses three network keys:

- `localhost`
- `amoy`
- `polygon`

The network profile is the primary switch point: `settlemint-chain/networks.ts`.

## Environment Setup

1. Copy `.env.example` to `.env`.
2. Install dependencies:
>>>>>>> cf461811fe935cdf395241aada0024b6d5a9a8b2

```bash
pnpm install
```

Copy `.env.example` to `.env`, then configure:

- `SETTLEMENT_BOOTSTRAP_WALLETS`
- `SETTLEMENT_BOOTSTRAP_NATIVE_AMOUNT`
- `DEPLOYER_PRIVATE_KEY`
- `AMOY_RPC_URL`
- `POLYGON_RPC_URL`

## Localhost Workflow

```bash
pnpm run node
pnpm run deploy:localhost
pnpm run bootstrap:localhost
```

- Deployment output is written to `deployments/localhost.json`.
- Use `contracts.settlementProof` from that file as:
- `SETTLEMENT_PROOF_ADDRESS` in `settlemint-service/.env`
- `VITE_SETTLEMENT_PROOF_ADDRESS` in `settlemint-ui/.env`
- Treat the deployment output as the source of truth for contract addresses.

## Restart Notes

- The localhost Hardhat chain is in-memory, so restarting clears deployments and balances.
- After restarting, redeploy and re-bootstrap before using the app again.
- If contract addresses change, update the backend and frontend env files and restart those services.

Backend RPC:

- Use `http://host.docker.internal:8545` when the backend runs in Docker.
- Use `http://127.0.0.1:8545` when the backend runs directly on your machine.

## Public Deployment

```bash
pnpm run deploy:amoy
pnpm run deploy:polygon
```

Additional rollout notes are in [`../settlemint-chain/NETWORK_ROLLOUT.md`](../settlemint-chain/NETWORK_ROLLOUT.md).
