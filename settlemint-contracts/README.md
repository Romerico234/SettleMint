# SettleMint Contracts

Smart contract sources, Hardhat configuration, and deployment scripts for SettleMint.

## Network Configuration

Contract network definitions are maintained in: [`settlemint-chain/networks.ts`](../settlemint-chain/networks.ts).

The contracts package uses three network keys:

- `localhost`
- `amoy`
- `polygon`

The primary switch points are:

- `settlemint-contracts/hardhat.config.ts`
- `settlemint-contracts/.env.example`
- `settlemint-chain/networks.ts`

## Environment Setup

1. Copy `.env.example` to `.env`.
2. Install dependencies:

```bash
pnpm install
```

Example `.env`:

```env
SETTLEMENT_BOOTSTRAP_WALLETS=0xYOUR_DEV_WALLET_1,0xYOUR_DEV_WALLET_2
SETTLEMENT_BOOTSTRAP_NATIVE_AMOUNT=25
DEPLOYER_PRIVATE_KEY=
AMOY_RPC_URL=
POLYGON_RPC_URL=
```

Variable summary:

- `SETTLEMENT_BOOTSTRAP_WALLETS`: comma-separated wallet addresses to fund on localhost
- `SETTLEMENT_BOOTSTRAP_NATIVE_AMOUNT`: native localhost ETH sent to each bootstrap wallet
- `DEPLOYER_PRIVATE_KEY`: deployer key for public-network deployments
- `AMOY_RPC_URL`: Polygon Amoy RPC endpoint
- `POLYGON_RPC_URL`: Polygon mainnet RPC endpoint

When `DEPLOYER_PRIVATE_KEY` and a matching RPC URL are not set, the corresponding public network remains unavailable in Hardhat. `localhost` remains available at all times.

## Localhost Workflow

Start the local chain in its own terminal:

```bash
pnpm run node
```

Deploy contracts:

```bash
pnpm run deploy:localhost
```

Bootstrap development wallets with native localhost ETH:

```bash
pnpm run bootstrap:localhost
```

Deployment output is written to: `settlemint-contracts/deployments/localhost.json`.

Copy the deployed `contracts.settlementProof` address from that file into:

- `settlemint-service/.env` as `SETTLEMENT_PROOF_ADDRESS`
- `settlemint-ui/.env` as `VITE_SETTLEMENT_PROOF_ADDRESS`

For a fresh default Hardhat localhost node, the first contract deployed by the default deployer is usually:

```env
SETTLEMENT_PROOF_ADDRESS=0x5FbDB2315678afecb367f032d93F642f64180aa3
VITE_SETTLEMENT_PROOF_ADDRESS=0x5FbDB2315678afecb367f032d93F642f64180aa3
```

Treat the deployment output as the source of truth. The address can differ if the node is not fresh, if deployments happen in a different order, or if the deployment script changes.

## Restarting Localhost

The Hardhat localhost chain is in-memory. Stopping the node clears deployed contracts, blocks, and funded dev-wallet balances.

To shut it down cleanly:

1. Go to the terminal running `pnpm run node`.
2. Press `Ctrl+C`.
3. Wait until the process exits.

If the terminal was closed and port `8545` is still busy, stop the process using that port:

```bash
lsof -ti :8545 | xargs kill
```

To restart from a clean local chain:

```bash
pnpm run node
```

Then, in a second terminal:

```bash
pnpm run deploy:localhost
pnpm run bootstrap:localhost
```

After redeploying, confirm `settlemint-contracts/deployments/localhost.json` and update the backend/frontend env addresses if they changed. Restart the backend and frontend after env changes so they pick up the new values.

If the backend runs in Docker and Hardhat runs on your host machine, use this backend RPC value:

```env
SETTLEMENT_RPC_URL=http://host.docker.internal:8545
```

If the backend runs directly on your machine, use:

```env
SETTLEMENT_RPC_URL=http://127.0.0.1:8545
```

## Public-Network Deployment

Polygon Amoy:

```bash
pnpm run deploy:amoy
```

Polygon mainnet:

```bash
pnpm run deploy:polygon
```

Additional rollout notes are maintained in: [`settlemint-chain/NETWORK_ROLLOUT.md`](../settlemint-chain/NETWORK_ROLLOUT.md).
