# SettleMint

SettleMint is a group expense tracking and settlement app. Users connect an EVM wallet, create or join groups, track shared expenses, compute minimal wallet-to-wallet repayment plans, and submit settlement payments with repayment being on-chain.

## Project Structure

- `settlemint-ui`: React frontend
- `settlemint-service`: Go backend API and MongoDB persistence
- `settlemint-contracts`: Hardhat contracts, local chain, deployment scripts, and wallet bootstrap. 
- `scripts`: local development helpers, including database seeding
- `settlemint-chain`: shared chain/network rollout notes and network profiles

## Prerequisites

- Docker Desktop
- Node.js and pnpm
- Python 3
- MongoDB Compass, optional but useful for inspecting local data
- MetaMask or another injected EVM browser wallet

## Environment Variables

Copy the example env files before running the app:

```bash
cp settlemint-service/.env.example settlemint-service/.env
cp settlemint-ui/.env.example settlemint-ui/.env
cp settlemint-contracts/.env.example settlemint-contracts/.env
```

For local contract payments, deploy `SettlementProof` and copy `contracts.settlementProof` from `settlemint-contracts/deployments/localhost.json` into:

- `settlemint-service/.env` as `SETTLEMENT_PROOF_ADDRESS`
- `settlemint-ui/.env` as `VITE_SETTLEMENT_PROOF_ADDRESS`

If the backend runs in Docker while Hardhat runs on your host machine, use:

```env
SETTLEMENT_RPC_URL=http://host.docker.internal:8545
```

If the backend runs directly on your machine, use:

```env
SETTLEMENT_RPC_URL=http://127.0.0.1:8545
```

## Development Environment

Install frontend dependencies:

```bash
cd settlemint-ui
npm install
```

Install contract dependencies:

```bash
cd settlemint-contracts
pnpm install
```

Prepare the Python helper environment:

```bash
cd scripts
python3 -m venv .venv
source .venv/bin/activate
python3 -m pip install -r requirements.txt
```

Run the local blockchain:

```bash
cd settlemint-contracts
pnpm run node
```

Deploy and bootstrap contracts in another terminal:

```bash
cd settlemint-contracts
pnpm run deploy:localhost
pnpm run bootstrap:localhost
```

Run MongoDB and the backend service:

```bash
cd settlemint-service
docker compose up --build -d
```

Seed the local database:

```bash
cd scripts/populate-dev-db
python3 populate_dev_db.py
```

Run the frontend:

```bash
cd settlemint-ui
npm run dev
```

The frontend runs at `http://localhost:5173` by default, and the backend API runs at `http://localhost:8080`.

## Seeded Groups

The development seed data includes two groups, each with memberships and an empty active settlement cycle so local users can join and experiment immediately.

- Towson Tigers: `inv_d71ba3645cbe9203`
- Guyanaese Tigers: `inv_guyanaese_tigers`

The seed script drops and recreates the local development database. Use it only against local data.
