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

Start the local chain:

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

Deployment output is written to:

- [`settlemint-contracts/deployments/localhost.json`](/Users/romericodavid/repos/SettleMint/settlemint-contracts/deployments/localhost.json)

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
