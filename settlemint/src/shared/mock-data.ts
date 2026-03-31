import type { Badge, Cycle, Expense, Member, Settlement } from "./types";

export const membersSeed: Member[] = [
  {
    id: 1,
    name: "Romerico",
    wallet: "0xA12F...91DE",
    avatar: "RD",
    balance: 42.5,
  },
  {
    id: 2,
    name: "Mario",
    wallet: "0xB341...C821",
    avatar: "MS",
    balance: -18.25,
  },
  {
    id: 3,
    name: "Rayquan",
    wallet: "0x9C2D...7FA1",
    avatar: "RW",
    balance: -24.25,
  },
];

export const expensesSeed: Expense[] = [
  {
    id: 1,
    title: "Airbnb Weekend Stay",
    amount: 180,
    paidBy: "Romerico",
    splitType: "Equal",
    participants: ["Romerico", "Mario", "Rayquan"],
    date: "Feb 22, 2026",
  },
  {
    id: 2,
    title: "Dinner at The Local House",
    amount: 72,
    paidBy: "Mario",
    splitType: "Equal",
    participants: ["Romerico", "Mario", "Rayquan"],
    date: "Feb 23, 2026",
  },
  {
    id: 3,
    title: "Gas Refill",
    amount: 36,
    paidBy: "Romerico",
    splitType: "Custom",
    participants: ["Romerico", "Rayquan"],
    date: "Feb 23, 2026",
  },
];

export const settlementsSeed: Settlement[] = [
  {
    id: 1,
    from: "Mario",
    to: "Romerico",
    amount: 18.25,
    status: "Pending",
  },
  {
    id: 2,
    from: "Rayquan",
    to: "Romerico",
    amount: 24.25,
    status: "Verified",
    txHash:
      "0x4ea8d10b92f14fd2c7a53a1e5f31fbe77b98ab7123cf8afcb5da4420f0931abc",
  },
];

export const cyclesSeed: Cycle[] = [
  {
    id: 1,
    name: "Weekend Trip",
    status: "Active",
    createdAt: "Feb 22, 2026",
  },
  {
    id: 2,
    name: "January Rent Split",
    status: "Archived",
    createdAt: "Jan 31, 2026",
  },
  {
    id: 3,
    name: "Miami Food Crawl",
    status: "Archived",
    createdAt: "Jan 12, 2026",
  },
];

export const badgesSeed: Badge[] = [
  {
    id: 1,
    name: "Fast Payer",
    description: "Settled within 24 hours",
    icon: "⚡",
  },
  {
    id: 2,
    name: "Always Square",
    description: "Closed 5 cycles with no outstanding debt",
    icon: "✅",
  },
  {
    id: 3,
    name: "Proof Keeper",
    description: "Verified 10 on-chain settlements",
    icon: "🔗",
  },
];