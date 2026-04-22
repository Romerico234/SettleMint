export type Tab = "Overview" | "Expenses" | "Settlement Plan" | "Archive";

export type CycleStatus = "Active" | "Archived";

export type Group = {
  id: string;
  name: string;
  ownerWallet: string;
  inviteCode: string;
  memberCount: number;
  currentUserRole?: "owner" | "member";
  createdAt: string;
  updatedAt: string;
};

export type GroupFilterMode = "all" | "owned" | "member";
export type GroupSortMode = "date" | "name";

export type GroupMember = {
  walletAddress: string;
  displayName: string;
  role: "owner" | "member";
};

export type Cycle = {
  id: string;
  groupId: string;
  name: string;
  status: CycleStatus;
  createdAt: string;
  updatedAt: string;
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
