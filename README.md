# SettleMint

SettleMint is a group expense and settlement platform that combines shared-expense tracking with blockchain-backed settlement support. The project is designed to help groups record expenses, calculate repayment obligations, and manage settlement activity across a connected wallet-based flow.

## Project Overview

SettleMint is organized into five main parts:

- `settlemint-ui`: the frontend experience
- `settlemint-service`: the backend API and persistence layer
- `settlemint-contracts`: the smart contracts and deployment tooling
- `settlemint-chain`: the shared network configuration layer
- `scripts`: development and maintenance helpers

## How It Works

At a high level, users connect an EVM wallet, participate in groups, track shared expenses, and move through settlement cycles. The platform calculates repayment outcomes and supports settlement flows that integrate with deployed blockchain infrastructure.

## Current Development Scope

The current branch is centered on local development. `localhost` is the active blockchain profile, while other supported network profiles remain present but inactive. The repository is structured so each package manages its own runtime details, while the root project ties the system together.

## Working In This Repository

<<<<<<< HEAD
Each package includes its own README for setup and usage details. The root repository serves as the top-level overview of the system and how the pieces relate to one another.
=======
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

Payment asset selection is centralized in `settlemint-chain/networks.ts`: `localhost` uses local Hardhat ETH, while production-like profiles use USDC. Switching profiles is the only payment-rail switch; the contract, frontend, and verifier read from that profile/default.

## Development Environment

Install frontend dependencies:

```bash
cd settlemint-ui
pnpm install
```

Install contract dependencies:

```bash
cd settlemint-contracts
pnpm install
```

Prepare the Python helper environment for scripts:

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

Run MongoDB and the backend service in another terminal:

```bash
cd settlemint-service
docker compose up --build -d
```

Seed the local database in another terminal:

```bash
cd scripts/populate-dev-db
python3 populate_dev_db.py
```

Run the frontend in another terminal:

```bash
cd settlemint-ui
pnpm run dev
```

## Mock Data

The development environment seed data includes two groups, each with memberships and an empty active settlement cycle so local users can join and experiment immediately.

- Towson Tigers: `inv_d71ba3645cbe9203`
- Guyanaese Tigers: `inv_guyanaese_tigers`

The seed script drops and recreates the local development database. Use it only against local data.
>>>>>>> cf461811fe935cdf395241aada0024b6d5a9a8b2
