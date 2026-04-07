export type Tab = "Overview" | "Expenses" | "Settlement Plan" | "Archive";

export type CycleStatus = "Active" | "Archived";

export type Cycle = {
  id: string;
  name: string;
  status: CycleStatus;
  createdAt: string;
};

export type Member = {
  id: string;
  name: string;
  balance: number;
};

export type Expense = {
  id: string;
  description: string;
  amount: number;
  paidBy: string;
  createdAt: string;
};

export type SettlementStatus = "Pending" | "Verified";

export type Settlement = {
  id: string;
  from: string;
  to: string;
  amount: number;
  status: SettlementStatus;
};

export type Badge = {
  id: string;
  name: string;
  description: string;
};
