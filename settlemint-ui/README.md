# SettleMint UI

Frontend for SettleMint.

## Overview

- Network definitions are shared with [`settlemint-chain/networks.ts`](../settlemint-chain/networks.ts).
- The UI connects to the backend through `VITE_API_BASE_URL`.
- The active blockchain profile is set with `VITE_SETTLEMENT_NETWORK`.

## Setup

```bash
pnpm install
```

Copy `.env.example` to `.env`, then configure:

- `VITE_API_BASE_URL`
- `VITE_SETTLEMENT_NETWORK`

## Development

```bash
pnpm run dev
```
