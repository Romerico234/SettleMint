# SettleMint Chain Rollout

`localhost` is the only active blockchain profile in this branch.

The full network registry lives in: [`settlemint-chain/networks.ts`](./networks.ts).

`amoy` and `polygon` are still represented there, but they are currently inactive.

## To Re-Enable Amoy Later

1. Change the `amoy` profile status from `"inactive"` to `"active"` in `settlemint-chain/networks.ts`.
2. Add `DEPLOYER_PRIVATE_KEY` and `AMOY_RPC_URL` to `settlemint-contracts/.env`.
3. Deploy contracts with:

```bash
pnpm exec hardhat run scripts/deploy.ts --network amoy
```

4. Set the frontend to:

```env
VITE_SETTLEMENT_NETWORK=amoy
```

5. Validate native `POL` wallet transfers and explorer links on Amoy.

## To Re-Enable Polygon Later

1. Change the `polygon` profile status from `"inactive"` to `"active"` in `settlemint-chain/networks.ts`.
2. Add `DEPLOYER_PRIVATE_KEY` and `POLYGON_RPC_URL` to `settlemint-contracts/.env`.
3. Deploy contracts with:

```bash
pnpm exec hardhat run scripts/deploy.ts --network polygon
```

4. Set the frontend to:

```env
VITE_SETTLEMENT_NETWORK=polygon
```

5. Finish the missing production pieces before using it:
- backend tx-hash persistence
- backend on-chain verification
- cycle closure after verified settlements
- production wallet/release process
