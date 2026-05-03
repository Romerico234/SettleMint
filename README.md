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

Each package includes its own README for setup and usage details. The root repository serves as the top-level overview of the system and how the pieces relate to one another.
