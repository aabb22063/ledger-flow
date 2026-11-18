export const WEEKDAYS = [
  'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'
];

export const SHORT_WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export const CURRENCY_SYMBOLS = {
  INR: '₹',
  USD: '$',
  EUR: '€',
  GBP: '£'
};

export const ACCOUNT_TYPES = [
  'Bank Account',
  'Cash Wallet',
  'UPI / Digital',
  'Credit Card',
  'Savings'
];

export const ACCOUNT_COLORS = [
  { label: 'Charcoal', value: '#111110' },
  { label: 'Forest', value: '#0D6E4E' },
  { label: 'Slate Blue', value: '#2563EB' },
  { label: 'Ochre', value: '#B45309' },
  { label: 'Terracotta', value: '#C23B2B' },
  { label: 'Plum', value: '#7C3AED' }
];

export function buildStarterSeed(userId) {
  const uid = () => (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`);
  return {
    accounts: [
      { id: uid(), user_id: userId, name: 'Primary Bank', type: 'Bank Account', opening_balance: 0, color: '#111110' },
      { id: uid(), user_id: userId, name: 'UPI / Wallet', type: 'UPI / Digital', opening_balance: 0, color: '#0D6E4E' },
      { id: uid(), user_id: userId, name: 'Cash', type: 'Cash Wallet', opening_balance: 0, color: '#B45309' }
    ],
    tasks: [
      { id: uid(), user_id: userId, name: 'Groceries & Food', kind: 'expense', budget: 10000, color: '#0D6E4E' },
      { id: uid(), user_id: userId, name: 'Rent & Utilities', kind: 'expense', budget: 20000, color: '#111110' },
      { id: uid(), user_id: userId, name: 'Transport & Fuel', kind: 'expense', budget: 4000, color: '#B45309' },
      { id: uid(), user_id: userId, name: 'Dining & Coffee', kind: 'expense', budget: 3500, color: '#C23B2B' },
      { id: uid(), user_id: userId, name: 'Bills & Subscriptions', kind: 'expense', budget: 3000, color: '#2563EB' },
      { id: uid(), user_id: userId, name: 'Salary / Income', kind: 'income', budget: 0, color: '#0D6E4E' },
      { id: uid(), user_id: userId, name: 'Freelance / Other', kind: 'income', budget: 0, color: '#2563EB' }
    ]
  };
}
