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
  walletAddress: string;
  displayName: string;
  totalPaid: number;
  totalOwed: number;
  balance: number;
};

export type ExpenseSplit = {
  walletAddress: string;
  displayName: string;
  amount: number;
};

export type Expense = {
  id: string;
  groupId: string;
  cycleId: string;
  description: string;
  amount: number;
  paidByWallet: string;
  paidByDisplayName: string;
  createdByWallet: string;
  createdAt: string;
  updatedAt: string;
  splits: ExpenseSplit[];
  deleteApprovalCount: number;
  deleteRequiredApprovalCount: number;
  deleteApprovedByCurrentUser: boolean;
  deletePending: boolean;
};

export type SettlementStatus = "Pending" | "Verified";

export type Settlement = {
  id: string;
  fromWalletAddress: string;
  fromDisplayName: string;
  toWalletAddress: string;
  toDisplayName: string;
  amount: number;
  status: SettlementStatus;
};

export type SettlementSummary = {
  members: Member[];
  settlements: Settlement[];
  totalExpenses: number;
  expenseCount: number;
};
