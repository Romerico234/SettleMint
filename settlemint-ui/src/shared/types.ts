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

export type SettlementStatus = "Pending" | "Submitted" | "Verified";

export type Settlement = {
  id: string;
  fromWalletAddress: string;
  fromDisplayName: string;
  toWalletAddress: string;
  toDisplayName: string;
  amount: number;
  status: SettlementStatus;
};

export type NativePaymentQuote = {
  nativeAmountDisplay: string;
  nativeAmountBaseUnits: string;
  nativeSymbol: string;
  usdPerNative: number;
  sourceLabel: string;
  fetchedAtMs?: number;
  fetchedAt?: string;
};

export type PaymentRecordStatus = "Pending" | "Submitted" | "Verified" | "Rejected";

export type PaymentRecord = {
  id: string;
  cycleId: string;
  payerWallet: string;
  payerDisplayName: string;
  payeeWallet: string;
  payeeDisplayName: string;
  usdObligationAmount: number;
  txHash: string;
  chainNetwork: string;
  chainId: number;
  nativeAmountBaseUnits: string;
  quote?: NativePaymentQuote | null;
  status: PaymentRecordStatus;
  verificationMessage?: string;
  submittedAt: string;
  verifiedAt?: string;
};

export type RepaymentBlockStatus = "Pending" | "Submitted" | "Verified" | "Rejected";

export type RepaymentBlock = {
  blockId: string;
  cycleId: string;
  pairKey: string;
  sequence: number;
  settlementSignature: string;
  fromWalletAddress: string;
  fromDisplayName: string;
  toWalletAddress: string;
  toDisplayName: string;
  amount: number;
  status: RepaymentBlockStatus;
  transactionHash: string | null;
  paymentQuote: NativePaymentQuote | null;
  verificationMessage?: string;
};

export type SettlementSummary = {
  members: Member[];
  settlements: Settlement[];
  payments: PaymentRecord[];
  totalExpenses: number;
  expenseCount: number;
};
