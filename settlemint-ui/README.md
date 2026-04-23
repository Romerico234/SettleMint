# SettleMint UI

This frontend reads its environment from `settlemint-ui/.env`.

## Development Setup

1. Copy `.env.example` to `.env`.
2. Fill in the API URL.
3. If you are using contract-based settlement payments in development, paste the deployed mock token address after deploying the contracts.

Recommended development `.env`:

```env
VITE_API_BASE_URL=http://localhost:8080

VITE_SETTLEMENT_CHAIN_ID=80002
VITE_SETTLEMENT_CHAIN_NAME=Polygon Amoy
VITE_SETTLEMENT_CHAIN_CURRENCY_NAME=POL
VITE_SETTLEMENT_CHAIN_CURRENCY_SYMBOL=POL
VITE_SETTLEMENT_CHAIN_RPC_URL=https://polygon-amoy.drpc.org
VITE_SETTLEMENT_CHAIN_EXPLORER_URL=https://amoy.polygonscan.com

VITE_SETTLEMENT_ASSET_KIND=erc20
VITE_SETTLEMENT_ASSET_NAME=SettleMint Test USD
VITE_SETTLEMENT_ASSET_SYMBOL=smUSD
VITE_SETTLEMENT_ASSET_DECIMALS=6
VITE_SETTLEMENT_TOKEN_ADDRESS=0xYOUR_DEPLOYED_MOCK_TOKEN_ADDRESS
```

Replace these values:

- `VITE_API_BASE_URL` if your backend is not running on `http://localhost:8080`
- `VITE_SETTLEMENT_TOKEN_ADDRESS` with the deployed `MockSettlementToken` address from `settlemint-contracts/deployments/amoy.json`

Everything else can stay as-is for normal development.

## Run The Frontend

```bash
pnpm install
pnpm run dev
```

If you update `.env`, restart the Vite dev server.

## Production Note

Production should use a separate `.env` with:

- your deployed backend URL
- `VITE_SETTLEMENT_CHAIN_ID=137`
- a Polygon mainnet RPC
- the payment asset configuration you actually plan to use on mainnet

Keep development and production env files separate.
