import { request } from './client';
import {
  Activity,
  BalancesResponse,
  Budget,
  Category,
  Expense,
  Item,
  Member,
  Settlement,
  Unit,
} from './types';

export const api = {
  // 5.1 System & auth
  health: () => request<{ ok: boolean }>('/health'),
  login: (username: string, password: string) =>
    request<{ token: string; member: Member }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    }),
  getMe: () => request<{ member: Member }>('/auth/me'),

  // 5.2 Members
  getMembers: () => request<Member[]>('/members'),

  // 5.3 Shopping
  getShopping: (status?: 'pending' | 'bought') =>
    request<Item[]>('/shopping', {
      params: { status },
    }),
  addShoppingItem: (data: { title: string; unit: Unit; requested_qty: number }) =>
    request<Item>('/shopping', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  deleteShoppingItem: (id: number) =>
    request<void>(`/shopping/${id}`, {
      method: 'DELETE',
    }),
  checkout: (
    data: {
      item_ids: number[];
      total_paid: number;
      payer_id: string;
      split_members: string[];
    },
    idempotencyKey?: string
  ) =>
    request<{ expense: Expense; items: Item[] }>('/shopping/checkout', {
      method: 'POST',
      body: JSON.stringify(data),
      idempotencyKey,
    }),

  // 5.4 Expenses
  getExpenses: (month?: string) =>
    request<Expense[]>('/expenses', {
      params: { month },
    }),
  getExpense: (id: number) => request<Expense>(`/expenses/${id}`),
  createExpense: (
    data: {
      title: string;
      category: Category;
      amount: number;
      payer_id: string;
      date?: string;
      split_type: 'equal' | 'custom';
      splits: Array<{ member_id: string; amount?: number }>;
      confirm_duplicate?: boolean;
    },
    idempotencyKey?: string
  ) =>
    request<Expense>('/expenses', {
      method: 'POST',
      body: JSON.stringify(data),
      idempotencyKey,
    }),
  deleteExpense: (id: number) =>
    request<void>(`/expenses/${id}`, {
      method: 'DELETE',
    }),

  // 5.5 Balances & settlements
  getBalances: () => request<BalancesResponse>('/balances'),
  settle: (
    data: { sender_id: string; recipient_id: string; amount: number },
    idempotencyKey?: string
  ) =>
    request<Settlement>('/settle', {
      method: 'POST',
      body: JSON.stringify(data),
      idempotencyKey,
    }),
  getSettlements: () => request<Settlement[]>('/settlements'),

  // 5.6 Budget
  getBudget: (month?: string) =>
    request<Budget>('/budget', {
      params: { month },
    }),
  updateBudget: (amount: number) =>
    request<Budget>('/budget', {
      method: 'PUT',
      body: JSON.stringify({ amount }),
    }),

  // 5.7 Activity
  getActivity: (limit = 50) =>
    request<Activity[]>('/activity', {
      params: { limit },
    }),

  // 5.8 Dev
  devReset: (seed?: string) =>
    request<{ ok: boolean; seeded: boolean }>('/dev/reset', {
      method: 'POST',
      params: { seed },
    }),
};

