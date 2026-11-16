import { ERPDatabase } from './storage';
import { FinancialVoucher, JournalEntry, AccountHead } from '../types/erp';

export interface TrialBalanceRow {
  code: string;
  name: string;
  category: AccountHead['category'];
  debit: number;
  credit: number;
}

export function validateVoucherBalance(entries: JournalEntry[]): { isValid: boolean; totalDebit: number; totalCredit: number; diff: number } {
  const totalDebit = entries.reduce((acc, e) => acc + (Number(e.debit) || 0), 0);
  const totalCredit = entries.reduce((acc, e) => acc + (Number(e.credit) || 0), 0);
  const diff = Math.abs(totalDebit - totalCredit);
  return {
    isValid: diff < 0.01 && totalDebit > 0,
    totalDebit: Number(totalDebit.toFixed(2)),
    totalCredit: Number(totalCredit.toFixed(2)),
    diff: Number(diff.toFixed(2)),
  };
}

export function postFinancialVoucher(
  db: ERPDatabase,
  voucher: FinancialVoucher
): { updatedDb: ERPDatabase; error?: string } {
  const validation = validateVoucherBalance(voucher.entries);
  if (!validation.isValid) {
    return {
      updatedDb: db,
      error: `Voucher is unbalanced! Total Debit (${validation.totalDebit}) must equal Total Credit (${validation.totalCredit}). Difference: ${validation.diff}`,
    };
  }

  // Clone accounts
  const updatedAccounts = [...db.accounts];

  // Update account balances based on accounting rules:
  // Asset & Expense: +Debit, -Credit
  // Liability, Equity & Revenue: -Debit, +Credit
  for (const entry of voucher.entries) {
    const accIndex = updatedAccounts.findIndex(a => a.id === entry.accountId || a.code === entry.accountCode);
    if (accIndex >= 0) {
      const acc = { ...updatedAccounts[accIndex] };
      const debit = Number(entry.debit) || 0;
      const credit = Number(entry.credit) || 0;

      if (acc.category === 'asset' || acc.category === 'expense') {
        acc.currentBalance += debit - credit;
      } else {
        acc.currentBalance += credit - debit;
      }
      updatedAccounts[accIndex] = acc;
    }
  }

  const updatedVouchers = [voucher, ...db.vouchers];

  return {
    updatedDb: {
      ...db,
      accounts: updatedAccounts,
      vouchers: updatedVouchers,
    },
  };
}

export function calculateTrialBalance(db: ERPDatabase): {
  rows: TrialBalanceRow[];
  totalDebit: number;
  totalCredit: number;
  isBalanced: boolean;
} {
  const rows: TrialBalanceRow[] = [];
  let totalDebit = 0;
  let totalCredit = 0;

  for (const acc of db.accounts) {
    const bal = Number(acc.currentBalance.toFixed(2));
    if (bal === 0) continue;

    let debit = 0;
    let credit = 0;

    if (acc.category === 'asset' || acc.category === 'expense') {
      if (bal > 0) debit = bal;
      else credit = Math.abs(bal);
    } else {
      if (bal > 0) credit = bal;
      else debit = Math.abs(bal);
    }

    rows.push({
      code: acc.code,
      name: acc.name,
      category: acc.category,
      debit,
      credit,
    });

    totalDebit += debit;
    totalCredit += credit;
  }

  return {
    rows,
    totalDebit: Number(totalDebit.toFixed(2)),
    totalCredit: Number(totalCredit.toFixed(2)),
    isBalanced: Math.abs(totalDebit - totalCredit) < 0.05,
  };
}

export function calculateIncomeStatement(db: ERPDatabase): {
  revenueAccounts: { name: string; code: string; amount: number }[];
  totalRevenue: number;
  cogsAccounts: { name: string; code: string; amount: number }[];
  totalCOGS: number;
  grossProfit: number;
  operatingExpenses: { name: string; code: string; amount: number }[];
  totalOperatingExpenses: number;
  netProfit: number;
} {
  const revenueAccounts = db.accounts
    .filter(a => a.category === 'revenue')
    .map(a => ({ name: a.name, code: a.code, amount: Math.max(0, a.currentBalance) }));
  const totalRevenue = revenueAccounts.reduce((sum, a) => sum + a.amount, 0);

  // COGS accounts (code starting with 5)
  const cogsAccounts = db.accounts
    .filter(a => a.code.startsWith('5'))
    .map(a => ({ name: a.name, code: a.code, amount: Math.max(0, a.currentBalance) }));
  const totalCOGS = cogsAccounts.reduce((sum, a) => sum + a.amount, 0);

  const grossProfit = totalRevenue - totalCOGS;

  // Operating Expenses (code starting with 6)
  const operatingExpenses = db.accounts
    .filter(a => a.code.startsWith('6'))
    .map(a => ({ name: a.name, code: a.code, amount: Math.max(0, a.currentBalance) }));
  const totalOperatingExpenses = operatingExpenses.reduce((sum, a) => sum + a.amount, 0);

  const netProfit = grossProfit - totalOperatingExpenses;

  return {
    revenueAccounts,
    totalRevenue,
    cogsAccounts,
    totalCOGS,
    grossProfit,
    operatingExpenses,
    totalOperatingExpenses,
    netProfit,
  };
}

export function calculateBalanceSheet(db: ERPDatabase): {
  assets: { name: string; code: string; amount: number }[];
  totalAssets: number;
  liabilities: { name: string; code: string; amount: number }[];
  totalLiabilities: number;
  equity: { name: string; code: string; amount: number }[];
  totalEquity: number;
  netIncome: number;
  totalLiabilitiesAndEquity: number;
  isBalanced: boolean;
} {
  const assets = db.accounts
    .filter(a => a.category === 'asset')
    .map(a => ({ name: a.name, code: a.code, amount: a.currentBalance }));
  const totalAssets = assets.reduce((sum, a) => sum + a.amount, 0);

  const liabilities = db.accounts
    .filter(a => a.category === 'liability')
    .map(a => ({ name: a.name, code: a.code, amount: a.currentBalance }));
  const totalLiabilities = liabilities.reduce((sum, a) => sum + a.amount, 0);

  const { netProfit } = calculateIncomeStatement(db);

  const equity = db.accounts
    .filter(a => a.category === 'equity')
    .map(a => ({ name: a.name, code: a.code, amount: a.currentBalance }));
  const baseEquity = equity.reduce((sum, a) => sum + a.amount, 0);
  const totalEquity = baseEquity + netProfit;

  const totalLiabilitiesAndEquity = totalLiabilities + totalEquity;

  return {
    assets,
    totalAssets,
    liabilities,
    totalLiabilities,
    equity,
    totalEquity,
    netIncome: netProfit,
    totalLiabilitiesAndEquity,
    isBalanced: Math.abs(totalAssets - totalLiabilitiesAndEquity) < 0.05,
  };
}

export function getAccountLedger(
  db: ERPDatabase,
  accountIdOrCode: string
): {
  account: AccountHead | undefined;
  transactions: {
    voucherNumber: string;
    date: string;
    voucherType: string;
    narration: string;
    debit: number;
    credit: number;
    runningBalance: number;
  }[];
  openingBalance: number;
  closingBalance: number;
} {
  const account = db.accounts.find(a => a.id === accountIdOrCode || a.code === accountIdOrCode);
  if (!account) {
    return { account: undefined, transactions: [], openingBalance: 0, closingBalance: 0 };
  }

  // Sort vouchers oldest to newest
  const sortedVouchers = [...db.vouchers].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  
  let running = 0;
  const transactions: {
    voucherNumber: string;
    date: string;
    voucherType: string;
    narration: string;
    debit: number;
    credit: number;
    runningBalance: number;
  }[] = [];

  for (const v of sortedVouchers) {
    const match = v.entries.find(e => e.accountId === account.id || e.accountCode === account.code);
    if (match) {
      const debit = Number(match.debit) || 0;
      const credit = Number(match.credit) || 0;

      if (account.category === 'asset' || account.category === 'expense') {
        running += debit - credit;
      } else {
        running += credit - debit;
      }

      transactions.push({
        voucherNumber: v.voucherNumber,
        date: v.date,
        voucherType: v.voucherType,
        narration: match.description || v.narration,
        debit,
        credit,
        runningBalance: running,
      });
    }
  }

  return {
    account,
    transactions,
    openingBalance: 0,
    closingBalance: running,
  };
}
