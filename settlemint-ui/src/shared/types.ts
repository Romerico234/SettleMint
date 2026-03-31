export type Member = {
    id: number;
    name: string;
    wallet: string;
    avatar: string;
    balance: number;
  };
  
  export type Expense = {
    id: number;
    title: string;
    amount: number;
    paidBy: string;
    splitType: "Equal" | "Custom" | "Percentage" | "Shares";
    participants: string[];
    date: string;
  };
  
  export type Settlement = {
    id: number;
    from: string;
    to: string;
    amount: number;
    status: "Pending" | "Verified";
    txHash?: string;
  };
  
  export type Cycle = {
    id: number;
    name: string;
    status: "Active" | "Archived";
    createdAt: string;
  };
  
  export type Badge = {
    id: number;
    name: string;
    description: string;
    icon: string;
  };
  
  export type Tab = "Overview" | "Expenses" | "Settlement Plan" | "Archive";