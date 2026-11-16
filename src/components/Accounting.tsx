import React, { useState } from 'react';
import { ERPDatabase, logAudit } from '../services/storage';
import { formatPKR, formatDateDMY } from '../utils/formatters';
import { FinancialVoucher, JournalEntry, AccountHead } from '../types/erp';
import { DataTable } from './common/DataTable';
import { Modal } from './common/Modal';
import {
  calculateTrialBalance,
  calculateIncomeStatement,
  calculateBalanceSheet,
  getAccountLedger,
  validateVoucherBalance,
  postFinancialVoucher,
} from '../services/accounting';
import { Plus, Printer, BookOpen, Layers, CheckCircle2, AlertTriangle, FileSpreadsheet, Scale, Receipt } from 'lucide-react';

interface AccountingProps {
  db: ERPDatabase;
  setDb: React.Dispatch<React.SetStateAction<ERPDatabase>>;
  onPrintDocument: (data: any) => void;
}

export const Accounting: React.FC<AccountingProps> = ({
  db,
  setDb,
  onPrintDocument,
}) => {
  const [activeTab, setActiveTab] = useState<
    'vouchers' | 'chart' | 'ledger' | 'cashbook' | 'bankbook' | 'trial_balance' | 'profit_loss' | 'balance_sheet'
  >('vouchers');

  // Ledger account picker
  const [selectedAccountId, setSelectedAccountId] = useState('acc-1010');

  // New Voucher Modal
  const [voucherModalOpen, setVoucherModalOpen] = useState(false);
  const [voucherType, setVoucherType] = useState<'payment' | 'receipt' | 'journal' | 'contra'>('payment');
  const [voucherDate, setVoucherDate] = useState(new Date().toISOString().slice(0, 10));
  const [voucherNumber, setVoucherNumber] = useState('');
  const [chequeNo, setChequeNo] = useState('');
  const [narration, setNarration] = useState('');

  // Voucher line items
  const [entries, setEntries] = useState<JournalEntry[]>([
    {
      accountId: 'acc-6020',
      accountCode: '6020',
      accountName: 'Vehari Factory Rent & Lease',
      debit: 50000,
      credit: 0,
      description: 'Factory rent payment',
    },
    {
      accountId: 'acc-1010',
      accountCode: '1010',
      accountName: 'Cash in Hand (Factory Vehari)',
      debit: 0,
      credit: 50000,
      description: 'Cash payment from safe',
    },
  ]);

  const handleOpenNewVoucher = (type: 'payment' | 'receipt' | 'journal' | 'contra') => {
    setVoucherType(type);
    const prefix = type === 'payment' ? 'PV' : type === 'receipt' ? 'RV' : type === 'contra' ? 'CV' : 'JV';
    setVoucherNumber(`${prefix}-26-${String(db.vouchers.length + 1).padStart(4, '0')}`);
    setVoucherDate(new Date().toISOString().slice(0, 10));
    setChequeNo('');
    setNarration('');

    // Pre-seed balanced template
    if (type === 'payment') {
      setEntries([
        { accountId: 'acc-6010', accountCode: '6010', accountName: 'Administrative Staff Salaries', debit: 25000, credit: 0, description: 'Office staff salary advance' },
        { accountId: 'acc-1010', accountCode: '1010', accountName: 'Cash in Hand (Factory Vehari)', debit: 0, credit: 25000, description: 'Cash disbursed' },
      ]);
    } else if (type === 'receipt') {
      setEntries([
        { accountId: 'acc-1020', accountCode: '1020', accountName: 'Habib Bank Limited (A/C: 1284-79012345)', debit: 100000, credit: 0, description: 'Bank transfer received' },
        { accountId: 'acc-1030', accountCode: '1030', accountName: 'Customer Receivables (Trade Debtors)', debit: 0, credit: 100000, description: 'Customer recovery' },
      ]);
    } else if (type === 'contra') {
      setEntries([
        { accountId: 'acc-1010', accountCode: '1010', accountName: 'Cash in Hand (Factory Vehari)', debit: 50000, credit: 0, description: 'Cash withdrawal for factory use' },
        { accountId: 'acc-1020', accountCode: '1020', accountName: 'Habib Bank Limited (A/C: 1284-79012345)', debit: 0, credit: 50000, description: 'Cheque drawn on HBL' },
      ]);
    } else {
      setEntries([
        { accountId: 'acc-5030', accountCode: '5030', accountName: 'Factory Electricity, Steam & Power', debit: 45000, credit: 0, description: 'MEPCO electricity bill provision' },
        { accountId: 'acc-2030', accountCode: '2030', accountName: 'Accrued Factory Expenses & Utility Bills', debit: 0, credit: 45000, description: 'Accrued liability recorded' },
      ]);
    }

    setVoucherModalOpen(true);
  };

  const handleAddEntryRow = () => {
    const acc = db.accounts[0];
    setEntries([
      ...entries,
      {
        accountId: acc.id,
        accountCode: acc.code,
        accountName: acc.name,
        debit: 0,
        credit: 0,
        description: '',
      },
    ]);
  };

  const validation = validateVoucherBalance(entries);

  // Save & Post Voucher
  const handlePostVoucher = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validation.isValid) {
      alert(`Voucher is unbalanced! Total Debit (${validation.totalDebit}) must equal Total Credit (${validation.totalCredit}). Difference: ${validation.diff}`);
      return;
    }

    const newVoucher: FinancialVoucher = {
      id: `vouch-${Date.now()}`,
      voucherNumber,
      voucherType,
      date: voucherDate,
      chequeNo,
      entries,
      totalDebit: validation.totalDebit,
      totalCredit: validation.totalCredit,
      narration: narration || `Manual ${voucherType.toUpperCase()} Voucher`,
      postedBy: 'Finance Department',
      isAutomatic: false,
      status: 'posted',
    };

    const res = postFinancialVoucher(db, newVoucher);
    if (res.error) {
      alert(res.error);
      return;
    }

    let updatedDb = logAudit(
      res.updatedDb,
      'Accounting',
      'create',
      `Posted ${voucherType.toUpperCase()} Voucher #${voucherNumber} for ${formatPKR(validation.totalDebit)}`
    );

    setDb(updatedDb);
    setVoucherModalOpen(false);
    alert('Financial voucher successfully posted and General Ledger updated!');
  };

  // Print Voucher
  const handlePrintVoucher = (v: FinancialVoucher) => {
    onPrintDocument({
      type: 'voucher',
      docNumber: v.voucherNumber,
      date: v.date,
      title: `${v.voucherType.toUpperCase()} FINANCIAL VOUCHER`,
      details: [
        { label: 'Voucher Type', value: v.voucherType.toUpperCase() },
        { label: 'Cheque / Ref #', value: v.chequeNo || '-' },
        { label: 'Posted By', value: v.postedBy },
        { label: 'Status', value: v.status.toUpperCase() },
      ],
      tableHeaders: ['Account Code', 'Account Head', 'Particulars / Narration', 'Debit (PKR)', 'Credit (PKR)'],
      tableRows: v.entries.map(e => [
        e.accountCode,
        e.accountName,
        e.description || v.narration,
        e.debit > 0 ? e.debit : '-',
        e.credit > 0 ? e.credit : '-',
      ]),
      summaryRows: [
        { label: 'Total Debit', value: formatPKR(v.totalDebit), isBold: true },
        { label: 'Total Credit', value: formatPKR(v.totalCredit), isBold: true },
      ],
      narration: v.narration || 'Verified & posted into general ledger under standard double-entry accounting.',
      signatories: [
        'Prepared By',
        'Verified By (Accountant)',
        'Internal Auditor',
        'Managing Director',
      ],
    });
  };

  // Compute Financial Statements
  const trialBalance = calculateTrialBalance(db);
  const incomeStatement = calculateIncomeStatement(db);
  const balanceSheet = calculateBalanceSheet(db);
  const activeLedger = getAccountLedger(db, selectedAccountId);

  return (
    <div className="space-y-4">
      {/* Top Header Card */}
      <div className="bg-white rounded-xl border border-stone-200 p-5 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="bg-stone-50 p-2 rounded-xl border border-stone-200 shadow-2xs shrink-0">
            <img
              src="./assets/aistudio/sativa_b7dc1d13.webp"
              alt="Sativa Cosmetics"
              className="h-10 w-auto object-contain"
            />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider">
                Financial Accounting
              </span>
              <span className="text-xs text-stone-400">·</span>
              <span className="text-xs text-stone-500">Double-Entry General Ledger</span>
            </div>
            <h1 className="text-lg font-bold text-stone-900 mt-0.5">
              Integrated General Ledger & Vouchers
            </h1>
            <p className="text-xs text-stone-500">
              Chart of Accounts, balanced vouchers, Cash Book, Bank Book, Trial Balance, Profit & Loss, and Balance Sheet
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            onClick={() => handleOpenNewVoucher('payment')}
            className="px-3 py-1.5 text-xs font-semibold text-white bg-rose-700 hover:bg-rose-800 rounded-lg shadow-2xs cursor-pointer"
          >
            + Payment Voucher
          </button>
          <button
            onClick={() => handleOpenNewVoucher('receipt')}
            className="px-3 py-1.5 text-xs font-semibold text-white bg-emerald-800 hover:bg-emerald-700 rounded-lg shadow-2xs cursor-pointer"
          >
            + Receipt Voucher
          </button>
          <button
            onClick={() => handleOpenNewVoucher('journal')}
            className="px-3 py-1.5 text-xs font-semibold text-stone-900 bg-amber-400 hover:bg-amber-300 rounded-lg shadow-2xs cursor-pointer"
          >
            + Journal Voucher
          </button>
          <button
            onClick={() => handleOpenNewVoucher('contra')}
            className="px-3 py-1.5 text-xs font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded-lg shadow-2xs cursor-pointer"
          >
            + Contra (Cash/Bank)
          </button>
        </div>
      </div>

      {/* Sub Tabs Navigation */}
      <div className="flex flex-wrap items-center gap-1.5 p-1 bg-stone-200/60 rounded-xl border border-stone-200">
        {[
          { id: 'vouchers', label: `Posted Vouchers (${db.vouchers.length})`, icon: Receipt },
          { id: 'chart', label: `Chart of Accounts (${db.accounts.length})`, icon: Layers },
          { id: 'ledger', label: 'Account Ledger', icon: BookOpen },
          { id: 'cashbook', label: 'Cash Book', icon: Receipt },
          { id: 'bankbook', label: 'Bank Book', icon: Receipt },
          { id: 'trial_balance', label: 'Trial Balance', icon: Scale },
          { id: 'profit_loss', label: 'Profit & Loss (P&L)', icon: FileSpreadsheet },
          { id: 'balance_sheet', label: 'Balance Sheet', icon: Scale },
        ].map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer whitespace-nowrap ${
                isActive
                  ? 'bg-white text-stone-900 shadow-2xs'
                  : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
              }`}
            >
              <Icon className="h-3.5 w-3.5 text-emerald-700" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* 1. Posted Vouchers Tab */}
      {activeTab === 'vouchers' && (
        <DataTable<FinancialVoucher>
          title="Financial Vouchers"
          data={db.vouchers}
          searchPlaceholder="Search vouchers by voucher #, narration, date..."
          columns={[
            { header: 'Voucher #', accessorKey: 'voucherNumber', className: 'font-mono font-bold text-emerald-800' },
            { header: 'Date', accessorKey: 'date', cell: r => formatDateDMY(r.date) },
            {
              header: 'Type',
              accessorKey: 'voucherType',
              align: 'center',
              cell: r => (
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                    r.voucherType === 'payment'
                      ? 'bg-rose-100 text-rose-800'
                      : r.voucherType === 'receipt'
                      ? 'bg-emerald-100 text-emerald-800'
                      : r.voucherType === 'contra'
                      ? 'bg-blue-100 text-blue-800'
                      : 'bg-amber-100 text-amber-800'
                  }`}
                >
                  {r.voucherType}
                </span>
              ),
            },
            {
              header: 'Narration / Description',
              accessorKey: 'narration',
              cell: r => <div className="max-w-sm truncate text-stone-700">{r.narration}</div>,
            },
            {
              header: 'Total Debit',
              accessorKey: 'totalDebit',
              align: 'right',
              cell: r => <span className="font-mono font-bold text-stone-900">{formatPKR(r.totalDebit)}</span>,
            },
            {
              header: 'Posted By',
              accessorKey: 'postedBy',
              cell: r => <span className="text-[11px] text-stone-500">{r.postedBy}</span>,
            },
            {
              header: 'Actions',
              align: 'center',
              cell: r => (
                <div className="flex items-center justify-center gap-1.5">
                  <button
                    onClick={() => handlePrintVoucher(r)}
                    className="p-1 text-stone-600 hover:text-emerald-700 hover:bg-stone-100 rounded cursor-pointer"
                    title="Print Voucher"
                  >
                    <Printer className="h-3.5 w-3.5" />
                  </button>
                </div>
              ),
            },
          ]}
        />
      )}

      {/* 2. Chart of Accounts Tab */}
      {activeTab === 'chart' && (
        <DataTable<AccountHead>
          title="Chart of Accounts"
          data={db.accounts}
          searchPlaceholder="Search accounts by code or head name..."
          columns={[
            { header: 'Code', accessorKey: 'code', className: 'font-mono font-bold text-emerald-800' },
            { header: 'Account Head Name', accessorKey: 'name', className: 'font-bold text-stone-900' },
            {
              header: 'Category',
              accessorKey: 'category',
              align: 'center',
              cell: r => (
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                    r.category === 'asset'
                      ? 'bg-blue-100 text-blue-800'
                      : r.category === 'liability'
                      ? 'bg-rose-100 text-rose-800'
                      : r.category === 'equity'
                      ? 'bg-purple-100 text-purple-800'
                      : r.category === 'revenue'
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-amber-100 text-amber-800'
                  }`}
                >
                  {r.category}
                </span>
              ),
            },
            {
              header: 'Current Balance',
              accessorKey: 'currentBalance',
              align: 'right',
              cell: r => (
                <span className="font-mono font-bold text-stone-900">
                  {formatPKR(r.currentBalance)}
                </span>
              ),
            },
            {
              header: 'Ledger',
              align: 'center',
              cell: r => (
                <button
                  onClick={() => {
                    setSelectedAccountId(r.id);
                    setActiveTab('ledger');
                  }}
                  className="px-2 py-1 text-[11px] font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 rounded border border-emerald-200 cursor-pointer"
                >
                  View Ledger &rarr;
                </button>
              ),
            },
          ]}
        />
      )}

      {/* 3. Account Ledger Tab */}
      {activeTab === 'ledger' && (
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-stone-200 p-4 shadow-2xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <label className="text-xs font-semibold text-stone-700 whitespace-nowrap">
                Select Account Head:
              </label>
              <select
                value={selectedAccountId}
                onChange={e => setSelectedAccountId(e.target.value)}
                className="p-1.5 text-xs border border-stone-300 rounded-lg font-medium text-stone-900 bg-white"
              >
                {db.accounts.map(acc => (
                  <option key={acc.id} value={acc.id}>
                    {acc.code} - {acc.name} ({formatPKR(acc.currentBalance)})
                  </option>
                ))}
              </select>
            </div>

            <div className="text-right">
              <span className="text-[11px] text-stone-500 block">Closing Balance:</span>
              <span className="font-mono font-bold text-base text-emerald-900">
                {formatPKR(activeLedger.closingBalance)}
              </span>
            </div>
          </div>

          <div className="border border-stone-200 rounded-xl bg-white overflow-hidden shadow-2xs">
            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr className="bg-stone-100 text-stone-700 font-semibold border-b border-stone-200">
                  <th className="py-2.5 px-3">Date</th>
                  <th className="py-2.5 px-3">Voucher #</th>
                  <th className="py-2.5 px-3">Type</th>
                  <th className="py-2.5 px-3">Narration / Particulars</th>
                  <th className="py-2.5 px-3 text-right">Debit (PKR)</th>
                  <th className="py-2.5 px-3 text-right">Credit (PKR)</th>
                  <th className="py-2.5 px-3 text-right">Running Balance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100 text-stone-800">
                {activeLedger.transactions.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-stone-400">
                      No posted transactions found for this account.
                    </td>
                  </tr>
                ) : (
                  activeLedger.transactions.map((t, idx) => (
                    <tr key={idx} className="hover:bg-stone-50">
                      <td className="py-2 px-3">{formatDateDMY(t.date)}</td>
                      <td className="py-2 px-3 font-mono font-bold text-emerald-800">{t.voucherNumber}</td>
                      <td className="py-2 px-3 uppercase text-[10px] font-bold text-stone-500">{t.voucherType}</td>
                      <td className="py-2 px-3 text-stone-700">{t.narration}</td>
                      <td className="py-2 px-3 text-right font-mono font-medium">{t.debit > 0 ? formatPKR(t.debit) : '-'}</td>
                      <td className="py-2 px-3 text-right font-mono font-medium">{t.credit > 0 ? formatPKR(t.credit) : '-'}</td>
                      <td className="py-2 px-3 text-right font-mono font-bold text-stone-900">{formatPKR(t.runningBalance)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 4. Cash Book Tab */}
      {activeTab === 'cashbook' && (() => {
        const cashBook = getAccountLedger(db, 'acc-1010');
        return (
          <div className="space-y-4">
            <div className="bg-white rounded-xl border border-stone-200 p-4 shadow-2xs flex justify-between items-center">
              <div>
                <h2 className="text-sm font-bold text-stone-900">Cash in Hand Book (A/C 1010)</h2>
                <p className="text-xs text-stone-500">Factory safe receipts, cash sales, and daily petty cash disbursements</p>
              </div>
              <div className="text-right">
                <span className="text-xs text-stone-500 block">Cash Balance in Safe:</span>
                <span className="text-lg font-mono font-bold text-emerald-900">{formatPKR(cashBook.closingBalance)}</span>
              </div>
            </div>

            <div className="border border-stone-200 rounded-xl bg-white overflow-hidden shadow-2xs">
              <table className="w-full text-xs text-left border-collapse">
                <thead>
                  <tr className="bg-stone-100 text-stone-700 font-semibold border-b border-stone-200">
                    <th className="py-2.5 px-3">Date</th>
                    <th className="py-2.5 px-3">Voucher #</th>
                    <th className="py-2.5 px-3">Narration / Particulars</th>
                    <th className="py-2.5 px-3 text-right">Cash In (Debit)</th>
                    <th className="py-2.5 px-3 text-right">Cash Out (Credit)</th>
                    <th className="py-2.5 px-3 text-right">Closing Balance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {cashBook.transactions.map((t, idx) => (
                    <tr key={idx} className="hover:bg-stone-50">
                      <td className="py-2 px-3">{formatDateDMY(t.date)}</td>
                      <td className="py-2 px-3 font-mono font-bold text-emerald-800">{t.voucherNumber}</td>
                      <td className="py-2 px-3">{t.narration}</td>
                      <td className="py-2 px-3 text-right font-mono font-bold text-emerald-800">
                        {t.debit > 0 ? formatPKR(t.debit) : '-'}
                      </td>
                      <td className="py-2 px-3 text-right font-mono font-bold text-rose-700">
                        {t.credit > 0 ? formatPKR(t.credit) : '-'}
                      </td>
                      <td className="py-2 px-3 text-right font-mono font-bold text-stone-900">
                        {formatPKR(t.runningBalance)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );
      })()}

      {/* 5. Bank Book Tab */}
      {activeTab === 'bankbook' && (() => {
        const bankBook = getAccountLedger(db, 'acc-1020');
        return (
          <div className="space-y-4">
            <div className="bg-white rounded-xl border border-stone-200 p-4 shadow-2xs flex justify-between items-center">
              <div>
                <h2 className="text-sm font-bold text-stone-900">Bank Book · Habib Bank Limited (A/C: 1284-79012345)</h2>
                <p className="text-xs text-stone-500">Customer online transfers, vendor RTGS cheques, and operational deposits</p>
              </div>
              <div className="text-right">
                <span className="text-xs text-stone-500 block">Current Ledger Bank Balance:</span>
                <span className="text-lg font-mono font-bold text-emerald-900">{formatPKR(bankBook.closingBalance)}</span>
              </div>
            </div>

            <div className="border border-stone-200 rounded-xl bg-white overflow-hidden shadow-2xs">
              <table className="w-full text-xs text-left border-collapse">
                <thead>
                  <tr className="bg-stone-100 text-stone-700 font-semibold border-b border-stone-200">
                    <th className="py-2.5 px-3">Date</th>
                    <th className="py-2.5 px-3">Voucher #</th>
                    <th className="py-2.5 px-3">Cheque / Particulars</th>
                    <th className="py-2.5 px-3 text-right">Deposit (Debit)</th>
                    <th className="py-2.5 px-3 text-right">Withdrawal (Credit)</th>
                    <th className="py-2.5 px-3 text-right">Bank Balance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {bankBook.transactions.map((t, idx) => (
                    <tr key={idx} className="hover:bg-stone-50">
                      <td className="py-2 px-3">{formatDateDMY(t.date)}</td>
                      <td className="py-2 px-3 font-mono font-bold text-emerald-800">{t.voucherNumber}</td>
                      <td className="py-2 px-3">{t.narration}</td>
                      <td className="py-2 px-3 text-right font-mono font-bold text-emerald-800">
                        {t.debit > 0 ? formatPKR(t.debit) : '-'}
                      </td>
                      <td className="py-2 px-3 text-right font-mono font-bold text-rose-700">
                        {t.credit > 0 ? formatPKR(t.credit) : '-'}
                      </td>
                      <td className="py-2 px-3 text-right font-mono font-bold text-stone-900">
                        {formatPKR(t.runningBalance)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );
      })()}

      {/* 6. Trial Balance Tab */}
      {activeTab === 'trial_balance' && (
        <div className="bg-white rounded-xl border border-stone-200 p-6 shadow-2xs space-y-4">
          <div className="flex items-center justify-between border-b border-stone-200 pb-3">
            <div>
              <h2 className="text-base font-bold text-stone-900">Trial Balance Statement</h2>
              <p className="text-xs text-stone-500">As on {formatDateDMY(new Date())} · Verification of double-entry ledger equilibrium</p>
            </div>
            <div className="flex items-center gap-2">
              <span
                className={`px-3 py-1 rounded-md text-xs font-mono font-bold flex items-center gap-1.5 ${
                  trialBalance.isBalanced
                    ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                    : 'bg-rose-100 text-rose-900 border border-rose-300'
                }`}
              >
                {trialBalance.isBalanced ? <CheckCircle2 className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
                <span>{trialBalance.isBalanced ? 'BALANCED' : 'UNBALANCED'}</span>
              </span>
            </div>
          </div>

          <div className="border border-stone-200 rounded-lg overflow-hidden">
            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr className="bg-stone-100 text-stone-700 font-semibold border-b border-stone-200">
                  <th className="py-2 px-3">Account Code</th>
                  <th className="py-2 px-3">Account Head Title</th>
                  <th className="py-2 px-3">Category</th>
                  <th className="py-2 px-3 text-right">Debit Balance (PKR)</th>
                  <th className="py-2 px-3 text-right">Credit Balance (PKR)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100 text-stone-800">
                {trialBalance.rows.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-stone-400">
                      No active balances yet. Post opening balances or transactions to view trial balance.
                    </td>
                  </tr>
                ) : (
                  trialBalance.rows.map((row, idx) => (
                    <tr key={idx} className="hover:bg-stone-50">
                      <td className="py-2 px-3 font-mono font-bold text-emerald-800">{row.code}</td>
                      <td className="py-2 px-3 font-medium text-stone-900">{row.name}</td>
                      <td className="py-2 px-3 uppercase text-[10px] text-stone-500">{row.category}</td>
                      <td className="py-2 px-3 text-right font-mono font-semibold">
                        {row.debit > 0 ? formatPKR(row.debit) : '-'}
                      </td>
                      <td className="py-2 px-3 text-right font-mono font-semibold">
                        {row.credit > 0 ? formatPKR(row.credit) : '-'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
              <tfoot>
                <tr className="bg-stone-100 font-bold border-t-2 border-stone-300 text-stone-900">
                  <td colSpan={3} className="py-3 px-3 text-right uppercase tracking-wider text-xs">
                    Total Equilibrium:
                  </td>
                  <td className="py-3 px-3 text-right font-mono text-sm text-emerald-900">
                    {formatPKR(trialBalance.totalDebit)}
                  </td>
                  <td className="py-3 px-3 text-right font-mono text-sm text-emerald-900">
                    {formatPKR(trialBalance.totalCredit)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* 7. Profit & Loss Statement Tab */}
      {activeTab === 'profit_loss' && (
        <div className="bg-white rounded-xl border border-stone-200 p-6 shadow-2xs space-y-5">
          <div className="border-b border-stone-200 pb-3 flex justify-between items-center">
            <div>
              <h2 className="text-base font-bold text-stone-900">Statement of Profit & Loss (Income Statement)</h2>
              <p className="text-xs text-stone-500">For the period ended 2026-27 · Pakistan Rupees (PKR)</p>
            </div>
            <span className="font-mono text-xs font-bold text-stone-600">Vehari Manufacturing Plant</span>
          </div>

          <div className="space-y-4 max-w-3xl text-xs">
            {/* 1. Revenues */}
            <div className="border border-stone-200 rounded-lg p-3 bg-stone-50 space-y-2">
              <div className="font-bold text-stone-900 uppercase tracking-wider text-xs border-b border-stone-200 pb-1">
                1. Revenue from Sales
              </div>
              {incomeStatement.revenueAccounts.map((a, i) => (
                <div key={i} className="flex justify-between py-1">
                  <span className="text-stone-700">{a.code} - {a.name}</span>
                  <span className="font-mono font-semibold">{formatPKR(a.amount)}</span>
                </div>
              ))}
              <div className="flex justify-between pt-1 border-t border-stone-200 font-bold text-stone-900">
                <span>Total Commercial Revenue:</span>
                <span className="font-mono text-emerald-900">{formatPKR(incomeStatement.totalRevenue)}</span>
              </div>
            </div>

            {/* 2. COGS */}
            <div className="border border-stone-200 rounded-lg p-3 bg-stone-50 space-y-2">
              <div className="font-bold text-stone-900 uppercase tracking-wider text-xs border-b border-stone-200 pb-1">
                2. Cost of Goods Sold & Production Expenses
              </div>
              {incomeStatement.cogsAccounts.map((a, i) => (
                <div key={i} className="flex justify-between py-1">
                  <span className="text-stone-700">{a.code} - {a.name}</span>
                  <span className="font-mono">{formatPKR(a.amount)}</span>
                </div>
              ))}
              <div className="flex justify-between pt-1 border-t border-stone-200 font-bold text-stone-900">
                <span>Total Cost of Goods Sold:</span>
                <span className="font-mono text-rose-800">{formatPKR(incomeStatement.totalCOGS)}</span>
              </div>
            </div>

            {/* Gross Profit Banner */}
            <div className="p-3 bg-stone-100 rounded-lg border border-stone-300 flex justify-between items-center font-bold text-sm">
              <span className="text-stone-800">Gross Manufacturing Profit:</span>
              <span className="font-mono text-emerald-950">{formatPKR(incomeStatement.grossProfit)}</span>
            </div>

            {/* 3. Operating Expenses */}
            <div className="border border-stone-200 rounded-lg p-3 bg-stone-50 space-y-2">
              <div className="font-bold text-stone-900 uppercase tracking-wider text-xs border-b border-stone-200 pb-1">
                3. Operating & Administrative Expenses
              </div>
              {incomeStatement.operatingExpenses.map((a, i) => (
                <div key={i} className="flex justify-between py-1">
                  <span className="text-stone-700">{a.code} - {a.name}</span>
                  <span className="font-mono">{formatPKR(a.amount)}</span>
                </div>
              ))}
              <div className="flex justify-between pt-1 border-t border-stone-200 font-bold text-stone-900">
                <span>Total Operating Expenses:</span>
                <span className="font-mono text-rose-800">{formatPKR(incomeStatement.totalOperatingExpenses)}</span>
              </div>
            </div>

            {/* Net Profit Banner */}
            <div
              className={`p-4 rounded-xl border flex justify-between items-center font-bold text-base ${
                incomeStatement.netProfit >= 0
                  ? 'bg-emerald-50 border-emerald-300 text-emerald-950'
                  : 'bg-rose-50 border-rose-300 text-rose-950'
              }`}
            >
              <span>Net Profit / (Loss) for the Year:</span>
              <span className="font-mono text-xl">{formatPKR(incomeStatement.netProfit)}</span>
            </div>
          </div>
        </div>
      )}

      {/* 8. Balance Sheet Tab */}
      {activeTab === 'balance_sheet' && (
        <div className="bg-white rounded-xl border border-stone-200 p-6 shadow-2xs space-y-5">
          <div className="border-b border-stone-200 pb-3 flex justify-between items-center">
            <div>
              <h2 className="text-base font-bold text-stone-900">Balance Sheet Statement</h2>
              <p className="text-xs text-stone-500">Statement of Financial Position · Sativa Cosmetics (2026-27)</p>
            </div>
            <span
              className={`px-3 py-1 rounded-md text-xs font-mono font-bold ${
                balanceSheet.isBalanced
                  ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                  : 'bg-rose-100 text-rose-900 border border-rose-300'
              }`}
            >
              {balanceSheet.isBalanced ? 'BALANCE SHEET EQUILIBRIUM VERIFIED' : 'UNBALANCED'}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
            {/* Left: Assets */}
            <div className="border border-stone-200 rounded-lg p-4 bg-stone-50 space-y-3">
              <div className="font-bold text-stone-900 uppercase tracking-wider text-xs border-b border-stone-200 pb-1">
                ASSETS (Current & Fixed)
              </div>
              <div className="space-y-1.5">
                {balanceSheet.assets.map((a, i) => (
                  <div key={i} className="flex justify-between py-1">
                    <span className="text-stone-700">{a.code} - {a.name}</span>
                    <span className="font-mono font-semibold">{formatPKR(a.amount)}</span>
                  </div>
                ))}
              </div>
              <div className="flex justify-between pt-2 border-t-2 border-stone-300 font-bold text-sm text-emerald-950">
                <span>TOTAL ASSETS:</span>
                <span className="font-mono">{formatPKR(balanceSheet.totalAssets)}</span>
              </div>
            </div>

            {/* Right: Liabilities & Equity */}
            <div className="space-y-4">
              {/* Liabilities */}
              <div className="border border-stone-200 rounded-lg p-4 bg-stone-50 space-y-2">
                <div className="font-bold text-stone-900 uppercase tracking-wider text-xs border-b border-stone-200 pb-1">
                  LIABILITIES (Current & Payables)
                </div>
                {balanceSheet.liabilities.map((a, i) => (
                  <div key={i} className="flex justify-between py-1">
                    <span className="text-stone-700">{a.code} - {a.name}</span>
                    <span className="font-mono font-semibold">{formatPKR(a.amount)}</span>
                  </div>
                ))}
                <div className="flex justify-between pt-1 border-t border-stone-200 font-bold text-stone-900">
                  <span>Total Liabilities:</span>
                  <span className="font-mono">{formatPKR(balanceSheet.totalLiabilities)}</span>
                </div>
              </div>

              {/* Equity */}
              <div className="border border-stone-200 rounded-lg p-4 bg-stone-50 space-y-2">
                <div className="font-bold text-stone-900 uppercase tracking-wider text-xs border-b border-stone-200 pb-1">
                  EQUITY & RESERVES
                </div>
                {balanceSheet.equity.map((a, i) => (
                  <div key={i} className="flex justify-between py-1">
                    <span className="text-stone-700">{a.code} - {a.name}</span>
                    <span className="font-mono">{formatPKR(a.amount)}</span>
                  </div>
                ))}
                <div className="flex justify-between py-1 text-emerald-800 font-semibold">
                  <span>Current Year Retained Earnings (Net Income):</span>
                  <span className="font-mono">{formatPKR(balanceSheet.netIncome)}</span>
                </div>
                <div className="flex justify-between pt-1 border-t border-stone-200 font-bold text-stone-900">
                  <span>Total Equity:</span>
                  <span className="font-mono">{formatPKR(balanceSheet.totalEquity)}</span>
                </div>
              </div>

              <div className="p-3 bg-stone-100 rounded-lg border-2 border-stone-300 flex justify-between font-bold text-sm text-stone-900">
                <span>TOTAL LIABILITIES & EQUITY:</span>
                <span className="font-mono">{formatPKR(balanceSheet.totalLiabilitiesAndEquity)}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Post Voucher */}
      <Modal
        isOpen={voucherModalOpen}
        onClose={() => setVoucherModalOpen(false)}
        title={`Create ${voucherType.toUpperCase()} Voucher`}
        subtitle="Double-entry journal posting with debit/credit balance verification"
        maxWidth="4xl"
      >
        <form onSubmit={handlePostVoucher} className="space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 bg-stone-50 p-3 rounded-lg border border-stone-200">
            <div>
              <label className="block font-semibold text-stone-700 mb-1">Voucher Type</label>
              <select
                value={voucherType}
                onChange={e => handleOpenNewVoucher(e.target.value as any)}
                className="w-full p-2 border border-stone-300 rounded font-bold uppercase bg-white"
              >
                <option value="payment">Payment Voucher (PV)</option>
                <option value="receipt">Receipt Voucher (RV)</option>
                <option value="journal">Journal Voucher (JV)</option>
                <option value="contra">Contra Voucher (CV)</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold text-stone-700 mb-1">Voucher # *</label>
              <input
                type="text"
                required
                value={voucherNumber}
                onChange={e => setVoucherNumber(e.target.value)}
                className="w-full p-2 border border-stone-300 rounded font-mono bg-white"
              />
            </div>

            <div>
              <label className="block font-semibold text-stone-700 mb-1">Posting Date</label>
              <input
                type="date"
                value={voucherDate}
                onChange={e => setVoucherDate(e.target.value)}
                className="w-full p-2 border border-stone-300 rounded font-mono bg-white"
              />
            </div>

            <div>
              <label className="block font-semibold text-stone-700 mb-1">Cheque / Slip Ref #</label>
              <input
                type="text"
                value={chequeNo}
                onChange={e => setChequeNo(e.target.value)}
                className="w-full p-2 border border-stone-300 rounded font-mono bg-white"
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-stone-700 mb-1">Narration / Particulars *</label>
            <input
              type="text"
              required
              value={narration}
              onChange={e => setNarration(e.target.value)}
              className="w-full p-2 border border-stone-300 rounded bg-white"
              placeholder="e.g. Factory monthly electricity bill payment via cheque #449012"
            />
          </div>

          {/* Line Entries */}
          <div className="border border-stone-200 rounded-lg p-3 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-bold text-stone-900 text-xs">Debit & Credit Journal Entries</span>
              <button
                type="button"
                onClick={handleAddEntryRow}
                className="px-2.5 py-1 text-[11px] font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 rounded border border-emerald-200 cursor-pointer"
              >
                + Add Account Line
              </button>
            </div>

            <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
              {entries.map((entry, idx) => (
                <div key={idx} className="grid grid-cols-12 gap-2 items-center bg-stone-50 p-2 rounded border border-stone-200">
                  <div className="col-span-5">
                    <select
                      value={entry.accountId}
                      onChange={e => {
                        const acc = db.accounts.find(a => a.id === e.target.value);
                        if (acc) {
                          const updated = [...entries];
                          updated[idx] = {
                            ...updated[idx],
                            accountId: acc.id,
                            accountCode: acc.code,
                            accountName: acc.name,
                          };
                          setEntries(updated);
                        }
                      }}
                      className="w-full p-1.5 border border-stone-300 rounded font-semibold bg-white"
                    >
                      {db.accounts.map(acc => (
                        <option key={acc.id} value={acc.id}>
                          {acc.code} - {acc.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="col-span-3">
                    <input
                      type="text"
                      placeholder="Line remark"
                      value={entry.description || ''}
                      onChange={e => {
                        const updated = [...entries];
                        updated[idx].description = e.target.value;
                        setEntries(updated);
                      }}
                      className="w-full p-1 border border-stone-300 rounded bg-white"
                    />
                  </div>

                  <div className="col-span-2">
                    <input
                      type="number"
                      step="0.01"
                      placeholder="Debit"
                      value={entry.debit}
                      onChange={e => {
                        const val = Number(e.target.value);
                        const updated = [...entries];
                        updated[idx].debit = val;
                        if (val > 0) updated[idx].credit = 0;
                        setEntries(updated);
                      }}
                      className="w-full p-1 border border-stone-300 rounded font-mono font-bold bg-white"
                    />
                  </div>

                  <div className="col-span-2">
                    <input
                      type="number"
                      step="0.01"
                      placeholder="Credit"
                      value={entry.credit}
                      onChange={e => {
                        const val = Number(e.target.value);
                        const updated = [...entries];
                        updated[idx].credit = val;
                        if (val > 0) updated[idx].debit = 0;
                        setEntries(updated);
                      }}
                      className="w-full p-1 border border-stone-300 rounded font-mono font-bold bg-white"
                    />
                  </div>
                </div>
              ))}
            </div>

            {/* Balance check bar */}
            <div className="flex justify-between items-center bg-stone-100 p-2.5 rounded border border-stone-300 text-xs">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-stone-700">Equilibrium Status:</span>
                <span
                  className={`font-mono font-bold px-2 py-0.5 rounded text-[11px] ${
                    validation.isValid ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                  }`}
                >
                  {validation.isValid ? 'BALANCED' : `DIFF: ${formatPKR(validation.diff)}`}
                </span>
              </div>
              <div className="flex items-center gap-4 font-mono font-bold">
                <span>Total Debit: {formatPKR(validation.totalDebit)}</span>
                <span>Total Credit: {formatPKR(validation.totalCredit)}</span>
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-stone-200 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setVoucherModalOpen(false)}
              className="px-4 py-2 border border-stone-300 rounded text-stone-700 hover:bg-stone-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!validation.isValid}
              className="px-5 py-2 bg-emerald-800 text-white rounded font-medium hover:bg-emerald-700 shadow-xs disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Post Voucher
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
