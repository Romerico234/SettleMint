# SettleMint Contracts

This package reads its environment from `settlemint-contracts/.env`.

## Development Setup

1. Copy `.env.example` to `.env`.
2. Fill in the wallet values.
3. Install dependencies with `npm install` or `pnpm install`.

Recommended development `.env`:

```env
DEPLOYER_PRIVATE_KEY=0xYOUR_DEV_WALLET_PRIVATE_KEY
AMOY_RPC_URL=https://polygon-amoy.drpc.org
POLYGON_RPC_URL=
SETTLEMENT_TOKEN_NAME=SettleMint Test USD
SETTLEMENT_TOKEN_SYMBOL=smUSD
SETTLEMENT_TOKEN_DECIMALS=6
SETTLEMENT_TOKEN_INITIAL_SUPPLY=1000000
SETTLEMENT_TOKEN_INITIAL_HOLDER=0xYOUR_DEV_WALLET_ADDRESS
```

Replace these values:

- `DEPLOYER_PRIVATE_KEY`
- `SETTLEMENT_TOKEN_INITIAL_HOLDER`

You can usually keep these values as-is for development:

- `AMOY_RPC_URL=https://polygon-amoy.drpc.org`
- `SETTLEMENT_TOKEN_NAME=SettleMint Test USD`
- `SETTLEMENT_TOKEN_SYMBOL=smUSD`
- `SETTLEMENT_TOKEN_DECIMALS=6`
- `SETTLEMENT_TOKEN_INITIAL_SUPPLY=1000000`
- `POLYGON_RPC_URL=` blank

Use a dedicated dev wallet for `DEPLOYER_PRIVATE_KEY`, not your main wallet.

The Hardhat config auto-loads `.env`, so you do not need to re-export variables each time.

## Deploy In Development

1. Fund your deployer wallet with testnet POL on Polygon Amoy.
2. For this project, use the Alchemy Amoy faucet:
   - [https://www.alchemy.com/faucets/polygon-amoy](https://www.alchemy.com/faucets/polygon-amoy)
3. Alchemy requires the wallet to have at least `0.001 ETH` on Ethereum Mainnet and enough mainnet activity to qualify.
4. If your chosen deployer wallet does not meet that requirement, use a wallet that does qualify to claim the faucet funds, then send the Amoy POL to your deployer wallet.
5. Build the contracts:

```bash
pnpm run build
```

6. Deploy to Amoy:

```bash
pnpm run deploy:amoy
```

7. After deployment, open `deployments/amoy.json`.
8. Copy the `mockSettlementToken.address` value into `settlemint-ui/.env` as `VITE_SETTLEMENT_TOKEN_ADDRESS`.

If the contract code and deployed addresses do not change, you do not need to redeploy every time you run the app.

## Production Note

Production should use a separate `.env` with:

- a production deployer key
- `POLYGON_RPC_URL` filled in
- `AMOY_RPC_URL` left unused
- the token settings you actually plan to use on mainnet

Keep production secrets separate from your local development `.env`.
