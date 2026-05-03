# SettleMint

SettleMint is a wallet-based group expense and settlement application. Users create or join groups, track shared expenses inside settlement cycles, review who owes whom, and submit settlement payments that are verified against a blockchain-backed settlement contract.

## Table of Contents

- [Project Overview](#project-overview)
- [Frontend](#frontend)
- [Backend](#backend)
- [Blockchain](#blockchain)
- [Smart Contracts](#smart-contracts)
- [Scripts](#scripts)
- [End-to-End Flow](#end-to-end-flow)

## Project Overview

The repository is organized into five main parts:

- `settlemint-ui`: React frontend
- `settlemint-service`: Go backend API and MongoDB application layer
- `settlemint-chain`: shared blockchain network definitions
- `settlemint-contracts`: Solidity contract and Hardhat deployment tooling
- `scripts`: development helper scripts

The application flow moves through the system in this order:

1. the frontend handles wallet interaction and user actions
2. the backend applies business rules and stores application state
3. the blockchain layer defines the active network and payment rail
4. the smart contract records settlement payment proof
5. scripts support local development workflows around the main system

## Frontend

The frontend lives in `settlemint-ui` and is the primary user-facing application.

### Entry And Layout

The main entrypoint is `settlemint-ui/src/App.tsx`.

The app has two main states:

- signed-out users land in `src/components/home/Home.tsx`
- signed-in users enter the dashboard shell built from `src/components/layout/Sidebar.tsx` and `src/components/layout/Header.tsx`

The signed-in dashboard is organized around four tabs:

- `Overview`
- `Expenses`
- `Settlement Plan`
- `Archive`

Those views are rendered through:

- `src/components/main/OverviewTab.tsx`
- `src/components/expenses/ExpensesTab.tsx`
- `src/components/settlement/SettlementPlanTab.tsx`
- `src/components/archive/ArchiveTab.tsx`

### Responsibilities

The frontend is responsible for:

- connecting the user wallet
- signing the user into the backend
- loading groups, cycles, expenses, settlements, and payment records
- letting users create groups, join groups, and manage cycles
- creating expenses and approving expense deletion
- opening settlement payments in the user wallet
- presenting live and archived settlement state

### State And Orchestration

Most page-level behavior is coordinated through four central hooks:

- `src/hooks/useAccountSession.ts`
- `src/hooks/useGroupDirectory.ts`
- `src/hooks/useSettlementLedger.ts`
- `src/hooks/useSettlementPayments.ts`

`useAccountSession` manages wallet sign-in, token persistence, authenticated profile loading, profile updates, and sign-out cleanup.

`useGroupDirectory` manages the current group and cycle context. It loads the signed-in user's groups, group members, active cycles, and archived cycles, and it owns the dialog flows for creating groups, joining groups, performing group actions, and creating cycles.

`useSettlementLedger` loads the financial state for the selected cycle. It combines cycle expenses with the computed settlement summary, and it owns the expense creation and deletion-approval flows used by the `Overview` and `Expenses` views.

`useSettlementPayments` transforms settlement obligations and payment history into repayment blocks that the UI can render. It also owns the wallet payment flow, including chain switching, settlement transaction submission, and posting the resulting transaction metadata back to the backend.

### API Layer

Frontend API wrappers live in `settlemint-ui/src/api`.

The current API clients are:

- `auth.ts`
- `users.ts`
- `groups.ts`
- `cycles.ts`
- `expenses.ts`
- `settlementPlan.ts`
- `settlementPayments.ts`

Shared request configuration lives in:

- `src/api/client.ts`
- `src/api/config.ts`

The frontend defaults to `http://localhost:8080` when `VITE_API_BASE_URL` is not set.

### Wallet Authentication

SettleMint uses wallet-based authentication instead of username and password credentials.

The frontend sign-in flow is:

1. request access to an injected EVM wallet
2. ask the backend for a wallet challenge
3. sign that challenge with `personal_sign`
4. send the signature back to the backend
5. store the returned auth token
6. load the authenticated user profile

Wallet interaction helpers live in `settlemint-ui/src/lib/wallet.ts`. They handle provider discovery, account access, chain switching, message signing, transaction submission, and transaction receipt polling.

### Chain-Aware Settlement Payments

The frontend reads shared chain configuration through `settlemint-ui/src/lib/settlemintChain.ts`, which imports network definitions from `settlemint-chain/networks.ts`.

When a user opens a settlement payment, the frontend:

1. resolves the active settlement network
2. checks whether the payment rail is usable
3. switches or adds the required chain in the user's wallet
4. builds the `SettlementProof` contract call
5. submits the transaction
6. sends the resulting transaction hash and quote data to the backend for verification

For native-asset payments, the frontend calculates the chain-native amount from the USD obligation using `src/lib/nativeUsdQuote.ts`.

For ERC-20 payment rails, the frontend first submits an approval transaction, then calls the settlement contract.

## Backend

The backend lives in `settlemint-service` and is the source of truth for application state and business rules.

### Entry And Composition

The service entrypoint is `settlemint-service/cmd/api/main.go`.

At startup it:

1. loads runtime config
2. validates the config
3. bootstraps the application through `internal/app`
4. builds the HTTP router
5. starts the API server

Application composition happens in:

- `internal/app/app.go`
- `internal/app/factory.go`

The module factory currently wires these feature modules:

- `auth`
- `cycles`
- `expenses`
- `groups`
- `settlement-payments`
- `settlement-plan`
- `user`

### HTTP Layer

The HTTP router lives in `internal/core/server/http_router.go`.

It currently:

- applies CORS middleware
- exposes `GET /health`
- mounts each feature module through a shared `RegisterRoutes` contract

### Service Structure

The backend is organized into:

- `cmd`: executable entrypoints
- `internal/app`: composition and lifecycle
- `internal/core`: shared infrastructure
- `internal/modules`: feature modules

Shared infrastructure under `internal/core` includes:

- `config`: runtime configuration loading and validation
- `db`: MongoDB connection setup
- `server`: HTTP router, helpers, and middleware
- `ipfs`: archive storage client

### Feature Module Pattern

Each feature module follows the same file pattern:

- `<feature>_types.go`
- `<feature>_datastore.go`
- `<feature>_service.go`
- `<feature>_routehandler.go`

This creates a consistent request flow:

`routehandler -> service -> datastore`

That pattern is used across:

- `internal/modules/auth`
- `internal/modules/user`
- `internal/modules/groups`
- `internal/modules/expenses`
- `internal/modules/cycles`
- `internal/modules/settlement-plan`
- `internal/modules/settlement-payments`

### Core Application Domains

#### Auth

The auth module implements wallet-based sign-in.

The service in `internal/modules/auth/auth_service.go`:

- generates nonce-backed sign-in challenges
- stores auth nonces in MongoDB
- verifies signed wallet messages
- issues signed backend auth tokens

The challenge format includes the wallet address, domain, URI, chain ID, nonce, issued-at timestamp, and expiration time.

#### User

The user module owns the authenticated user profile, including fetching the current profile and updating user-facing profile fields such as the display name.

#### Groups

The groups module owns the shared-expense group structure. It is responsible for group creation, invite-based joining, membership-aware group listing, and group-level actions.

#### Expenses

The expenses module owns expense records within a settlement cycle. These expense records are one of the primary inputs into the settlement summary.

#### Settlement Plan

The settlement-plan module computes the financial summary for a cycle. It produces the member balance view, settlement obligations, and payment-aware summary data consumed by the frontend.

#### Settlement Payments

The settlement-payments module accepts submitted wallet payments after the frontend opens a settlement transaction.

The service in `internal/modules/settlement-payments/settlement_payments_service.go` validates:

- payer and payee wallet structure
- payer ownership of the submission
- transaction hash format
- submitted chain network and chain ID
- submitted native amount format
- whether the payment matches an unpaid settlement obligation

After saving the payment record, the backend attempts on-chain verification. It checks:

- that the configured RPC is reachable
- that the RPC chain ID matches the configured settlement chain
- that the transaction exists
- that the receipt succeeded
- that the sender matches the payer wallet
- that the transaction target matches the `SettlementProof` contract
- that the amount matches the expected obligation
- that the contract call data matches the intended payee and amount
- that the expected settlement event was emitted
- that the expected ERC-20 transfer log exists when the payment rail is token-based

This means the backend does more than store a transaction hash. It verifies whether the submitted blockchain payment actually matches the application's settlement rules.

#### Cycles And Archives

The cycles module manages the lifecycle of settlement cycles, including creation, listing, closure, and archive retrieval.

The service in `internal/modules/cycles/cycles_service.go` only allows cycle closure when:

- every settlement obligation is `Verified`
- every payment record is either `Verified` or `Rejected`

When a cycle closes, the backend builds an archive snapshot, uploads it through the IPFS client, stores archive metadata, and removes the active cycle from the live workflow.

### Persistence

MongoDB is the primary persistence layer.

Based on the current modules and seed script, the application persists data such as:

- user profiles
- auth nonces
- groups
- group memberships
- cycles
- expenses
- settlement payments
- archive metadata

The development seed script in `scripts/populate-dev-db/populate_dev_db.py` explicitly seeds:

- `user_profiles`
- `groups`
- `group_memberships`
- `cycles`

### Archive Storage

Archive storage is implemented in `internal/core/ipfs/ipfs.go`.

The IPFS client supports:

- uploading JSON archive snapshots
- fetching archived snapshots by CID
- generating gateway URLs for archived payloads

Each archived cycle stores both application metadata and a content-addressed archive snapshot, which gives the archive flow an immutable storage target outside the main database.

## Blockchain

The shared blockchain configuration layer lives in `settlemint-chain/networks.ts`.

### Purpose

This file defines the network profiles consumed across the repository so the frontend and contract tooling use the same chain model.

Each profile includes:

- network key
- active or inactive status
- chain ID and chain name
- RPC URL
- explorer URL
- native currency metadata
- settlement payment asset metadata

### Current Network Profiles

The repository currently defines three network keys:

- `localhost`
- `amoy`
- `polygon`

Based on the current file:

- `localhost` is `active`
- `amoy` is `inactive`
- `polygon` is `inactive`

### Active Development Target

The current branch is centered on the `localhost` profile:

- chain name: `Hardhat Localhost`
- chain ID: `31337`
- native currency: `ETH`
- payment asset kind: `native`

This means the present development flow assumes a local Hardhat chain and native-asset settlement payments.

### Why This Layer Matters

The chain layer keeps the frontend and contract tooling aligned on:

- which networks exist
- which networks are active
- which asset is used for settlement payments
- which RPC and explorer metadata belong to each network

Without this shared layer, those assumptions would drift across packages.

## Smart Contracts

The smart contract package lives in `settlemint-contracts`.

### Contract Surface

The main contract file is `settlemint-contracts/contracts/SettlementProofContract.sol`.

It defines the `SettlementProof` contract, which exists to record settlement payments and emit proof that the payment was executed.

### Contract Behavior

The contract exposes `recordSettlementPayment`, which receives:

- `cycleId`
- `obligationId`
- `payee`
- `amount`

It then:

- validates the payee and amount
- transfers value to the payee
- emits `SettlementRecorded`

### Payment Modes

The contract supports two payment modes depending on `paymentToken`:

- native-asset settlement when `paymentToken == address(0)`
- ERC-20 settlement when `paymentToken` is a token address

In native mode, the transaction value must match the payment amount and the contract forwards native currency to the payee.

In ERC-20 mode, the caller must approve the token first and the contract pulls funds with `transferFrom`.

This matches the branching behavior already present in both the frontend payment flow and backend verification logic.

### Deployment Tooling

The contract package includes:

- `scripts/deploy.ts`
- `scripts/bootstrapLocalhost.ts`

`deploy.ts` deploys `SettlementProof`, resolves the configured payment asset from `settlemint-chain/networks.ts`, and writes deployment output to `settlemint-contracts/deployments/<network>.json`.

That deployment output includes:

- network name
- chain ID
- deployment timestamp
- deployer address
- deployed contract addresses
- payment asset metadata

`bootstrapLocalhost.ts` is only for the `localhost` network. It reads the localhost deployment output, funds configured development wallets with native ETH, and appends bootstrap metadata back into `deployments/localhost.json`.

### Role In The Full System

The contract is not the application's source of truth for groups, expenses, cycles, or balances.

Instead:

- the frontend handles wallet interaction
- the backend owns the expense and settlement domain model
- the contract provides verifiable payment execution and proof

SettleMint is therefore a full-stack application with blockchain-backed settlement support, not a contract-only system.

## Scripts

Utility scripts live in `scripts`.

### Purpose

Scripts support development workflows that sit outside the main request-response path of the product.

The current repository includes:

- `scripts/requirements.txt`
- `scripts/populate-dev-db/populate_dev_db.py`

### Populate Dev DB

The main script currently in use is `populate-dev-db/populate_dev_db.py`.

It:

- connects to MongoDB
- drops the target database
- recreates a baseline development dataset

The current seed data includes:

- three user profiles
- two groups
- group memberships
- active settlement cycles

The script seeds the example groups:

- `Towson Tigers`
- `Guyanaese Tigers`

This script exists to give the UI and backend a repeatable local starting state for development and testing.

## End-to-End Flow

A typical SettleMint flow works like this:

1. a user connects an EVM wallet in the frontend
2. the frontend requests a wallet challenge from the backend
3. the user signs the challenge
4. the backend verifies the signature and returns an auth token
5. the user creates or joins a group
6. the user opens a settlement cycle and records expenses
7. the frontend requests the current settlement summary
8. the backend computes who owes whom and returns the current obligations
9. a payer opens a settlement payment in their wallet
10. the frontend switches to the configured chain and calls `SettlementProof`
11. the frontend sends the transaction hash and payment metadata to the backend
12. the backend verifies the payment against the configured chain and updates payment status
13. once all obligations are resolved and payments are verified or rejected, the cycle can be archived
14. the backend writes the archive snapshot to IPFS and stores the archive metadata for later retrieval

This flow is the core shape of the current project: web application state managed in the backend, wallet interaction managed in the frontend, and settlement payment proof anchored to a blockchain contract.
