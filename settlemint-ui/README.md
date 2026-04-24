# SettleMint UI

## Blockchain Configuration

Blockchain network definitions are maintained in: [`settlemint-chain/networks.ts`](../settlemint-chain/networks.ts).

## Environment Setup

1. Copy `.env.example` to `.env`.
2. Install dependencies:

```bash
pnpm install
```

Example `.env`:

```env
VITE_API_BASE_URL=http://localhost:8080
VITE_SETTLEMENT_NETWORK=localhost
```

Variable summary:

- `VITE_API_BASE_URL`: backend base URL
- `VITE_SETTLEMENT_NETWORK`: blockchain profile key from `settlemint-chain/networks.ts`

## Development

Start the frontend:

```bash
pnpm run dev
```
