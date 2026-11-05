export type Unit = 'pack' | 'dozen' | 'bottle' | 'bag';

export type Category = 'Groceries' | 'Utilities' | 'Cleaning' | 'Entertainment' | 'Other';

export interface Member {
  id: string;
  name: string;
  username: string;
}

export interface Item {
  id: number;
  title: string;
  unit: Unit;
  requested_qty: number;
  status: 'pending' | 'bought';
  expense_id: number | null;
  created_by: string;
  created_by_name: string;
  created_at: string;
}

export interface ExpenseSplit {
  member_id: string;
  name: string;
  amount: number;
}

export interface Expense {
  id: number;
  title: string;
  category: Category;
  amount: number;
  payer_id: string;
  payer_name: string;
  split_type: 'equal' | 'custom';
  source: 'manual' | 'checkout';
  date: string;
  created_by: string;
  created_by_name: string;
  created_at: string;
  splits: ExpenseSplit[];
  items?: Item[];
}

export interface BalanceItem {
  member_id: string;
  name: string;
  paid: number;
  share: number;
  settlements_received: number;
  settlements_sent: number;
  net: number;
}

export interface BalancesResponse {
  balances: BalanceItem[];
  total: number;
}

export interface Settlement {
  id: number;
  sender_id: string;
  sender_name: string;
  recipient_id: string;
  recipient_name: string;
  amount: number;
  created_at: string;
}

export interface Budget {
  month: string;
  budget: number;
  spent: number;
  remaining: number;
  percent_used: number;
  status: 'On Track' | 'Near Limit' | 'Over Budget';
}

export interface Activity {
  id: string;
  type: 'expense' | 'checkout' | 'settlement';
  title: string;
  amount: number;
  actor_id: string;
  actor_name: string;
  payer_name: string | null;
  counterparty_name: string | null;
  category: string | null;
  split_type: string | null;
  split_count: number | null;
  created_at: string;
}

export interface ApiErrorResponse {
  error: {
    code: string;
    message: string;
    details?: any;
  };
}

