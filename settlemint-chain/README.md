# SettleMint Chain Rollout

Only `localhost` is active in this branch.

## Overview

- Network definitions live in [`networks.ts`](./networks.ts).
- `amoy` and `polygon` are present but currently inactive.
- Re-enabling a network requires updating its status, configuring env vars, redeploying contracts, and pointing the frontend to that network.

## Re-Enable Amoy

```bash
pnpm exec hardhat run scripts/deploy.ts --network amoy
```

```env
VITE_SETTLEMENT_NETWORK=amoy
```

Also:
- Set `amoy` to `"active"` in `settlemint-chain/networks.ts`
- Add `DEPLOYER_PRIVATE_KEY` and `AMOY_RPC_URL` to `settlemint-contracts/.env`
- Validate native `POL` transfers and explorer links

## Re-Enable Polygon

```bash
pnpm exec hardhat run scripts/deploy.ts --network polygon
```

```env
VITE_SETTLEMENT_NETWORK=polygon
```

Also:
- Set `polygon` to `"active"` in `settlemint-chain/networks.ts`
- Add `DEPLOYER_PRIVATE_KEY` and `POLYGON_RPC_URL` to `settlemint-contracts/.env`
- Complete backend tx-hash persistence
- Complete backend on-chain verification
- Complete cycle closure after verified settlements
- Complete the production wallet and release process
