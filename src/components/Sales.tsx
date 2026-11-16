import React, { useState } from 'react';
import { ERPDatabase, logAudit, syncDatabaseToServer } from '../services/storage';
import { formatPKR, formatDateDMY } from '../utils/formatters';
import { SalesInvoice, SalesItem, FinancialVoucher, FinishedProduct } from '../types/erp';
import { DataTable } from './common/DataTable';
import { Modal } from './common/Modal';
import { Plus, Printer, Trash2, AlertCircle, CheckCircle2, X } from 'lucide-react';
import { deductFinishedGoodsStock } from '../services/inventory';
import { postFinancialVoucher } from '../services/accounting';

interface SalesProps {
  db: ERPDatabase;
  setDb: React.Dispatch<React.SetStateAction<ERPDatabase>>;
  onPrintDocument: (data: any) => void;
  mysqlConnected: boolean;
  onMySQLSyncError?: (error?: string) => void;
  onOpenMySQLConfig?: () => void;
}

function getApprovedBatchesFEFO(prod?: FinishedProduct) {
  if (!prod) return [];
  return [...prod.batches]
    .filter(b => b.quantity > 0 && b.qcStatus === 'approved')
    .sort((a, b) => new Date(a.expDate || '2099-12-31').getTime() - new Date(b.expDate || '2099-12-31').getTime());
}

function generateNextInvoiceNumber(existing: SalesInvoice[]): string {
  let maxNum = 0;
  for (const inv of existing) {
    const match = inv.invoiceNumber.match(/(\d+)$/);
    if (match) {
      const n = Number(match[1]);
      if (Number.isFinite(n) && n > maxNum) maxNum = n;
    }
  }
  const next = Math.max(maxNum + 1, existing.length + 1);
  return `INV-26-${String(next).padStart(4, '0')}`;
}

export const Sales: React.FC<SalesProps> = ({
  db,
  setDb,
  onPrintDocument,
  mysqlConnected,
  onMySQLSyncError,
  onOpenMySQLConfig,
}) => {
  // New Invoice Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [customerId, setCustomerId] = useState('');
  const [salesRepId, setSalesRepId] = useState('');
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [paymentType, setPaymentType] = useState<'cash' | 'credit'>('credit');
  const [discountAmount, setDiscountAmount] = useState<number>(0);
  const [taxAmount, setTaxAmount] = useState<number>(0);
  const [notes, setNotes] = useState('Standard trade credit terms. Goods once sold will be replaced if QC defect reported within 7 days.');
  const [items, setItems] = useState<SalesItem[]>([]);

  // Inline UI Feedback (avoids blocked browser alert() inside iframes)
  const [formError, setFormError] = useState<string | null>(null);
  const [isPosting, setIsPosting] = useState(false);
  const [statusBanner, setStatusBanner] = useState<{
    type: 'success' | 'warning' | 'error';
    message: string;
    invoice?: SalesInvoice;
  } | null>(null);

  // Open Create Modal
  const handleOpenCreate = () => {
    setFormError(null);
    setCustomerId(db.customers[0]?.id || '');
    setSalesRepId(db.salesReps[0]?.id || '');
    setInvoiceNumber(generateNextInvoiceNumber(db.salesInvoices));
    setDate(new Date().toISOString().slice(0, 10));
    setPaymentType('credit');
    setDiscountAmount(0);
    setTaxAmount(0);
    setNotes('Delivery via factory logistics. Valid warranty on packaging seal.');
    setItems([]);
    setModalOpen(true);
  };

  // Add Item to Invoice
  const handleAddItem = () => {
    setFormError(null);
    if (db.finishedProducts.length === 0) {
      setFormError('No finished products exist in the catalog. Please add a finished product and batch in Finished Goods first.');
      return;
    }

    // Prefer a product that has QC-approved stock available
    const prod =
      db.finishedProducts.find(p => getApprovedBatchesFEFO(p).length > 0) ||
      db.finishedProducts.find(p => p.availableStock > 0) ||
      db.finishedProducts[0];

    const availableBatches = getApprovedBatchesFEFO(prod);
    const firstBatch = availableBatches[0];
    const batchNo = firstBatch?.batchNumber || (prod.batches.length === 0 && prod.availableStock > 0 ? 'OPENING' : '');
    const maxAvail = firstBatch ? firstBatch.quantity : prod.availableStock;
    const defaultQty = maxAvail > 0 ? Math.min(10, maxAvail) : 1;
    const rate = prod.wholesaleRate || 450;

    setItems(prev => [
      ...prev,
      {
        productId: prod.id,
        productName: prod.name,
        batchNumber: batchNo,
        quantity: defaultQty,
        unit: prod.packingUnit || 'Piece',
        unitPrice: rate,
        totalPrice: Number((defaultQty * rate).toFixed(2)),
        unitCost: firstBatch?.costPerUnit ?? prod.productionCost ?? 0,
      },
    ]);
  };

  // Calculations
  const subtotal = Number(items.reduce((sum, item) => sum + (Number(item.totalPrice) || 0), 0).toFixed(2));
  const safeTax = Number(taxAmount) || 0;
  const safeDiscount = Number(discountAmount) || 0;
  const netTotal = Number((subtotal + safeTax - safeDiscount).toFixed(2));
  const paidAmount = paymentType === 'cash' ? netTotal : 0;
  const balanceAmount = Number((netTotal - paidAmount).toFixed(2));

  // Save Sales Invoice (MySQL-only)
  const handleSaveInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isPosting) return;
    setFormError(null);

    if (!mysqlConnected) {
      setFormError('MySQL database is not connected. Sales invoices can only be posted when MySQL is connected.');
      return;
    }

    const trimmedInvNo = invoiceNumber.trim();
    if (!customerId) {
      setFormError('Please select a customer before posting the sales invoice.');
      return;
    }
    if (!trimmedInvNo) {
      setFormError('Please enter a valid invoice number.');
      return;
    }
    if (db.salesInvoices.some(inv => inv.invoiceNumber.trim().toLowerCase() === trimmedInvNo.toLowerCase())) {
      setFormError(`Invoice number "${trimmedInvNo}" already exists. Please use a unique invoice number.`);
      return;
    }
    if (!date) {
      setFormError('Please select an invoice date.');
      return;
    }
    if (items.length === 0) {
      setFormError('Please add at least one finished product line item.');
      return;
    }
    if (safeDiscount < 0 || safeTax < 0) {
      setFormError('Discount and tax amounts cannot be negative.');
      return;
    }
    if (netTotal < 0) {
      setFormError('Trade discount cannot exceed the gross invoice subtotal.');
      return;
    }

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (!item.productId) {
        setFormError(`Line ${i + 1}: Please select a finished product.`);
        return;
      }
      if (!Number.isFinite(item.quantity) || item.quantity <= 0) {
        setFormError(`Line ${i + 1} (${item.productName}): Quantity must be greater than zero.`);
        return;
      }
      if (!Number.isFinite(item.unitPrice) || item.unitPrice < 0) {
        setFormError(`Line ${i + 1} (${item.productName}): Unit rate cannot be negative.`);
        return;
      }
    }

    const customer = db.customers.find(c => c.id === customerId);
    if (!customer) {
      setFormError('Selected customer could not be found. Please re-select a customer.');
      return;
    }

    const rep = db.salesReps.find(r => r.id === salesRepId);
    let currentDb = db;

    // 1. Deduct Stock for each line item (Validates batch & availability)
    const normalizedItems: SalesItem[] = items.map(item => ({
      ...item,
      quantity: Number(item.quantity),
      unitPrice: Number(item.unitPrice),
      totalPrice: Number((Number(item.quantity) * Number(item.unitPrice)).toFixed(2)),
      unitCost: Number(item.unitCost || 0),
    }));

    for (const item of normalizedItems) {
      const res = deductFinishedGoodsStock(
        currentDb,
        item.productId,
        item.batchNumber,
        item.quantity,
        trimmedInvNo,
        item.unitPrice,
        date
      );
      if (res.error) {
        setFormError(res.error);
        return;
      }
      currentDb = res.updatedDb;
    }

    // 2. Update Customer Balance
    const custIndex = currentDb.customers.findIndex(c => c.id === customerId);
    if (custIndex >= 0) {
      const cust = { ...currentDb.customers[custIndex] };
      cust.currentBalance = Number((cust.currentBalance + balanceAmount).toFixed(2));
      const updatedCusts = [...currentDb.customers];
      updatedCusts[custIndex] = cust;
      currentDb = { ...currentDb, customers: updatedCusts };
    }

    // 3. Create Sales Invoice Record
    const nowStamp = Date.now();
    const newInvoice: SalesInvoice = {
      id: `sinv-${nowStamp}`,
      invoiceNumber: trimmedInvNo,
      date,
      customerId,
      customerName: customer.name,
      salesRepId: salesRepId || '',
      salesRepName: rep?.name || '',
      paymentType,
      items: normalizedItems,
      subtotal,
      discountAmount: safeDiscount,
      taxAmount: safeTax,
      netTotal,
      paidAmount,
      balanceAmount,
      status: 'posted',
      notes,
    };

    // 4. Double-Entry Accounting (with exact rounded debit/credit parity)
    const netSalesRounded = Number(netTotal.toFixed(2));
    const cogsRounded = Number(
      normalizedItems.reduce((s, i) => s + i.quantity * (i.unitCost || 0), 0).toFixed(2)
    );

    const voucherEntries = [
      ...(netSalesRounded > 0
        ? [
            {
              accountId: paymentType === 'cash' ? 'acc-1010' : 'acc-1030',
              accountCode: paymentType === 'cash' ? '1010' : '1030',
              accountName:
                paymentType === 'cash'
                  ? 'Cash in Hand (Factory Vehari)'
                  : 'Customer Receivables (Trade Debtors)',
              debit: netSalesRounded,
              credit: 0,
              description: `Invoice #${trimmedInvNo} - ${newInvoice.customerName}`,
            },
            {
              accountId: 'acc-4010',
              accountCode: '4010',
              accountName: 'Sales Revenue - Cosmetics Wholesale',
              debit: 0,
              credit: netSalesRounded,
              description: `Sales revenue from Inv #${trimmedInvNo}`,
            },
          ]
        : []),
      ...(cogsRounded > 0
        ? [
            {
              accountId: 'acc-5010',
              accountCode: '5010',
              accountName: 'Cost of Goods Sold (Raw Materials)',
              debit: cogsRounded,
              credit: 0,
              description: `COGS for Invoice #${trimmedInvNo}`,
            },
            {
              accountId: 'acc-1060',
              accountCode: '1060',
              accountName: 'Finished Goods Inventory',
              debit: 0,
              credit: cogsRounded,
              description: `Finished goods stock relieved for Inv #${trimmedInvNo}`,
            },
          ]
        : []),
    ];

    if (voucherEntries.length > 0) {
      const totalVoucherAmount = Number((netSalesRounded + cogsRounded).toFixed(2));
      const voucher: FinancialVoucher = {
        id: `vouch-sales-${nowStamp}`,
        voucherNumber: `JV-SALES-${String(nowStamp).slice(-6)}`,
        voucherType: paymentType === 'cash' ? 'receipt' : 'journal',
        date,
        referenceNo: trimmedInvNo,
        entries: voucherEntries,
        totalDebit: totalVoucherAmount,
        totalCredit: totalVoucherAmount,
        narration: `Automated Sales Voucher for Invoice #${trimmedInvNo} (${newInvoice.customerName})`,
        postedBy: 'System Sales Engine',
        isAutomatic: true,
        status: 'posted',
      };

      const postRes = postFinancialVoucher(currentDb, voucher);
      if (postRes.error) {
        setFormError(postRes.error);
        return;
      }
      currentDb = postRes.updatedDb;
    }

    currentDb = {
      ...currentDb,
      salesInvoices: [newInvoice, ...currentDb.salesInvoices],
    };

    currentDb = logAudit(
      currentDb,
      'Sales',
      'create',
      `Posted Sales Invoice #${trimmedInvNo} (${formatPKR(netTotal)}) to ${newInvoice.customerName}`
    );

    setIsPosting(true);
    try {
      const syncRes = await syncDatabaseToServer(currentDb);
      if (!syncRes.ok) {
        onMySQLSyncError?.(syncRes.error);
        setFormError(
          `Failed to save invoice to MySQL: ${syncRes.error || 'MySQL database is not connected.'}`
        );
        return;
      }

      setDb(currentDb);
      setModalOpen(false);
      setFormError(null);
      setStatusBanner({
        type: 'success',
        message: `Sales Invoice #${trimmedInvNo} (${formatPKR(netTotal)}) posted & saved to MySQL database. Stock deducted and customer ledger updated.`,
        invoice: newInvoice,
      });
    } finally {
      setIsPosting(false);
    }
  };

  // Print Sales Invoice
  const handlePrintInvoice = (inv: SalesInvoice) => {
    const cust = db.customers.find(c => c.id === inv.customerId);
    onPrintDocument({
      type: 'sales_invoice',
      docNumber: inv.invoiceNumber,
      date: inv.date,
      title: 'COMMERCIAL SALES INVOICE & DISPATCH MEMO',
      parties: {
        partyName: inv.customerName,
        partyType: 'Buyer / Consignee',
        address: cust?.address || 'Pakistan',
        phone: cust?.phone,
        ntn: cust?.ntn || 'CNIC / NTN on file',
      },
      details: [
        { label: 'Payment Terms', value: inv.paymentType.toUpperCase() },
        { label: 'Sales Officer', value: inv.salesRepName || 'Direct' },
        { label: 'Warehouse Bay', value: 'Vehari Central Depot' },
        { label: 'Invoice Status', value: inv.status.toUpperCase() },
      ],
      tableHeaders: ['Product Description', 'Batch / Lot #', 'Quantity', 'Unit', 'Rate (PKR)', 'Gross Amount'],
      tableRows: inv.items.map(i => [
        i.productName,
        i.batchNumber,
        i.quantity,
        i.unit,
        i.unitPrice,
        i.totalPrice,
      ]),
      summaryRows: [
        { label: 'Gross Subtotal', value: formatPKR(inv.subtotal) },
        ...(inv.discountAmount > 0
          ? [{ label: 'Trade Discount', value: `-${formatPKR(inv.discountAmount)}` }]
          : []),
        ...(inv.taxAmount > 0
          ? [{ label: 'Tax / GST', value: formatPKR(inv.taxAmount) }]
          : []),
        { label: 'Net Payable', value: formatPKR(inv.netTotal), isBold: true },
        { label: 'Amount Paid', value: formatPKR(inv.paidAmount) },
        { label: 'Balance Receivable', value: formatPKR(inv.balanceAmount), isBold: true },
      ],
      narration: inv.notes || 'Goods dispatched in genuine factory sealed condition. Produced by Sativa Cosmetics Vehari.',
      signatories: [
        'Dispatch Supervisor',
        'Sales Representative',
        'Customer Acceptance',
        'Managing Director',
      ],
    });
  };

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
                Sales, Billing & Distribution
              </span>
              <span className="text-xs text-stone-400">·</span>
              <span className="text-xs text-stone-500">Beauty Parlours, Wholesalers & Supermarkets</span>
            </div>
            <h1 className="text-lg font-bold text-stone-900 mt-0.5">
              Sales & Distribution Management
            </h1>
            <p className="text-xs text-stone-500">
              Generate GST/commercial invoices, FEFO batch allocation, customer credit limits, and automated double-entry postings
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={handleOpenCreate}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-emerald-800 hover:bg-emerald-700 rounded-lg shadow-2xs transition-colors cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            <span>Create Sales Invoice</span>
          </button>
        </div>
      </div>

      {/* Status Notification Banner */}
      {statusBanner && (
        <div
          className={`rounded-xl border p-3.5 flex items-center justify-between gap-3 text-xs ${
            statusBanner.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
              : statusBanner.type === 'warning'
              ? 'bg-amber-50 border-amber-200 text-amber-900'
              : 'bg-rose-50 border-rose-200 text-rose-900'
          }`}
        >
          <div className="flex items-center gap-2.5">
            {statusBanner.type === 'success' ? (
              <CheckCircle2 className="h-4 w-4 text-emerald-700 shrink-0" />
            ) : (
              <AlertCircle className="h-4 w-4 shrink-0" />
            )}
            <span className="font-medium">{statusBanner.message}</span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {statusBanner.invoice && (
              <button
                type="button"
                onClick={() => handlePrintInvoice(statusBanner.invoice!)}
                className="inline-flex items-center gap-1 px-2.5 py-1 bg-white border border-stone-300 rounded-md font-semibold text-stone-800 hover:bg-stone-50 cursor-pointer"
              >
                <Printer className="h-3.5 w-3.5" />
                <span>Print Invoice</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => setStatusBanner(null)}
              className="p-1 rounded hover:bg-black/5 cursor-pointer"
              aria-label="Dismiss message"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* Invoices Table */}
      <DataTable<SalesInvoice>
        title="Sales Invoices"
        data={db.salesInvoices}
        searchPlaceholder="Search invoices by invoice #, customer name, sales rep..."
        columns={[
          { header: 'Invoice #', accessorKey: 'invoiceNumber', className: 'font-mono font-bold text-emerald-800' },
          { header: 'Date', accessorKey: 'date', cell: r => formatDateDMY(r.date) },
          { header: 'Customer / Parlour', accessorKey: 'customerName', className: 'font-bold text-stone-900' },
          { header: 'Sales Rep', accessorKey: 'salesRepName' },
          {
            header: 'Items Count',
            cell: r => `${r.items.length} SKUs`,
          },
          {
            header: 'Mode',
            accessorKey: 'paymentType',
            align: 'center',
            cell: r => (
              <span
                className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                  r.paymentType === 'cash' ? 'bg-blue-100 text-blue-800' : 'bg-amber-100 text-amber-800'
                }`}
              >
                {r.paymentType}
              </span>
            ),
          },
          {
            header: 'Net Total',
            accessorKey: 'netTotal',
            align: 'right',
            cell: r => <span className="font-mono font-bold text-stone-900">{formatPKR(r.netTotal)}</span>,
          },
          {
            header: 'Receivable Balance',
            accessorKey: 'balanceAmount',
            align: 'right',
            cell: r => (
              <span className={`font-mono font-bold ${r.balanceAmount > 0 ? 'text-amber-700' : 'text-stone-500'}`}>
                {formatPKR(r.balanceAmount)}
              </span>
            ),
          },
          {
            header: 'Actions',
            align: 'center',
            cell: r => (
              <div className="flex items-center justify-center gap-1.5">
                <button
                  onClick={() => handlePrintInvoice(r)}
                  className="p-1 text-stone-600 hover:text-emerald-700 hover:bg-stone-100 rounded cursor-pointer"
                  title="Print Sales Invoice"
                >
                  <Printer className="h-3.5 w-3.5" />
                </button>
              </div>
            ),
          },
        ]}
      />

      {/* MODAL: New Sales Invoice */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Generate Commercial Sales Invoice"
        subtitle="Automatic batch stock deduction and customer account updating"
        maxWidth="5xl"
      >
        <form onSubmit={handleSaveInvoice} noValidate className="space-y-4 text-xs">
          {!mysqlConnected && (
            <div className="bg-rose-50 border border-rose-300 text-rose-900 rounded-lg p-3 flex items-center justify-between gap-2">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-4 w-4 text-rose-700 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold">MySQL Not Connected:</span> Posting invoices requires a live MySQL database connection.
                </div>
              </div>
              {onOpenMySQLConfig && (
                <button
                  type="button"
                  onClick={() => {
                    setModalOpen(false);
                    onOpenMySQLConfig();
                  }}
                  className="px-2.5 py-1 bg-rose-700 hover:bg-rose-800 text-white font-semibold rounded text-[11px] shrink-0 cursor-pointer"
                >
                  Connect MySQL
                </button>
              )}
            </div>
          )}

          {/* Prerequisite Warnings */}
          {db.customers.length === 0 && (
            <div className="bg-amber-50 border border-amber-200 text-amber-900 rounded-lg p-3 flex items-start gap-2">
              <AlertCircle className="h-4 w-4 text-amber-700 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold">No Customers Found:</span> Please add a customer in{' '}
                <span className="font-semibold">Company &amp; Master Profiles → Customers</span> (or load Starter Templates in Backup &amp; Restore) before posting a sales invoice.
              </div>
            </div>
          )}

          {db.finishedProducts.length === 0 && (
            <div className="bg-amber-50 border border-amber-200 text-amber-900 rounded-lg p-3 flex items-start gap-2">
              <AlertCircle className="h-4 w-4 text-amber-700 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold">No Finished Products Found:</span> Please add products and receive an approved batch in{' '}
                <span className="font-semibold">Finished Goods</span> first.
              </div>
            </div>
          )}

          {/* Validation Error Banner */}
          {formError && (
            <div className="bg-rose-50 border border-rose-300 text-rose-900 rounded-lg p-3 flex items-start justify-between gap-2">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-4 w-4 text-rose-700 shrink-0 mt-0.5" />
                <span className="font-semibold">{formError}</span>
              </div>
              <button
                type="button"
                onClick={() => setFormError(null)}
                className="text-rose-600 hover:text-rose-800 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-5 gap-3 bg-stone-50 p-3 rounded-lg border border-stone-200">
            <div className="sm:col-span-2">
              <label className="block font-semibold text-stone-700 mb-1">Customer / Parlour *</label>
              <select
                value={customerId}
                onChange={e => {
                  setCustomerId(e.target.value);
                  setFormError(null);
                }}
                className="w-full p-2 border border-stone-300 rounded font-medium bg-white"
              >
                <option value="">-- Choose Customer --</option>
                {db.customers.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.city} - Balance: {formatPKR(c.currentBalance)})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-semibold text-stone-700 mb-1">Invoice Number *</label>
              <input
                type="text"
                value={invoiceNumber}
                onChange={e => {
                  setInvoiceNumber(e.target.value);
                  setFormError(null);
                }}
                className="w-full p-2 border border-stone-300 rounded font-mono bg-white"
              />
            </div>

            <div>
              <label className="block font-semibold text-stone-700 mb-1">Invoice Date *</label>
              <input
                type="date"
                value={date}
                onChange={e => {
                  setDate(e.target.value);
                  setFormError(null);
                }}
                className="w-full p-2 border border-stone-300 rounded font-mono bg-white"
              />
            </div>

            <div>
              <label className="block font-semibold text-stone-700 mb-1">Payment Mode</label>
              <select
                value={paymentType}
                onChange={e => setPaymentType(e.target.value as 'cash' | 'credit')}
                className="w-full p-2 border border-stone-300 rounded font-bold bg-white"
              >
                <option value="credit">Credit (Debtor Receivable)</option>
                <option value="cash">Cash (Immediate Receipt)</option>
              </select>
            </div>

            <div className="sm:col-span-2">
              <label className="block font-semibold text-stone-700 mb-1">Assigned Sales Officer</label>
              <select
                value={salesRepId}
                onChange={e => setSalesRepId(e.target.value)}
                className="w-full p-2 border border-stone-300 rounded bg-white"
              >
                <option value="">-- Direct Sales --</option>
                {db.salesReps.map(r => (
                  <option key={r.id} value={r.id}>
                    {r.name} ({r.territory})
                  </option>
                ))}
              </select>
            </div>

            <div className="sm:col-span-3">
              <label className="block font-semibold text-stone-700 mb-1">Dispatch / Invoice Notes</label>
              <input
                type="text"
                value={notes}
                onChange={e => setNotes(e.target.value)}
                className="w-full p-2 border border-stone-300 rounded bg-white"
                placeholder="Delivery notes, trade terms, or vehicle details..."
              />
            </div>
          </div>

          {/* Line Items Container */}
          <div className="border border-stone-200 rounded-lg p-3 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-bold text-stone-900 text-xs">Cosmetic Products &amp; Batch Selection (FEFO)</span>
              <button
                type="button"
                onClick={handleAddItem}
                className="px-2.5 py-1 text-[11px] font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 rounded border border-emerald-200 cursor-pointer"
              >
                + Add Product Line
              </button>
            </div>

            {items.length === 0 ? (
              <div className="py-6 text-center text-stone-400 italic">
                No items selected. Click &quot;+ Add Product Line&quot; to pick products and batches.
              </div>
            ) : (
              <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                {items.map((item, idx) => {
                  const prod = db.finishedProducts.find(p => p.id === item.productId);
                  const availableBatches = getApprovedBatchesFEFO(prod);
                  const isUnbatchedOpening = !!prod && prod.batches.length === 0 && prod.availableStock > 0;

                  return (
                    <div key={idx} className="grid grid-cols-12 gap-2 items-center bg-stone-50 p-2 rounded border border-stone-200">
                      <div className="col-span-12 sm:col-span-3">
                        <span className="text-[10px] text-stone-400 block uppercase">Product SKU</span>
                        <select
                          value={item.productId}
                          onChange={e => {
                            const newProd = db.finishedProducts.find(p => p.id === e.target.value);
                            if (newProd) {
                              const bList = getApprovedBatchesFEFO(newProd);
                              const firstB = bList[0];
                              const nextBatch =
                                firstB?.batchNumber ||
                                (newProd.batches.length === 0 && newProd.availableStock > 0 ? 'OPENING' : '');
                              const rate = newProd.wholesaleRate || 450;
                              const updated = [...items];
                              updated[idx] = {
                                ...updated[idx],
                                productId: newProd.id,
                                productName: newProd.name,
                                unit: newProd.packingUnit || 'Piece',
                                unitPrice: rate,
                                unitCost: firstB?.costPerUnit ?? newProd.productionCost ?? 0,
                                batchNumber: nextBatch,
                                totalPrice: Number((updated[idx].quantity * rate).toFixed(2)),
                              };
                              setItems(updated);
                              setFormError(null);
                            }
                          }}
                          className="w-full p-1.5 border border-stone-300 rounded font-semibold bg-white"
                        >
                          {db.finishedProducts.map(p => (
                            <option key={p.id} value={p.id}>
                              {p.name} ({p.size}) - Avail: {p.availableStock}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="col-span-12 sm:col-span-3">
                        <span className="text-[10px] text-stone-400 block">Batch (FEFO Approved)</span>
                        <select
                          value={item.batchNumber}
                          onChange={e => {
                            const selectedBatchNo = e.target.value;
                            const selectedBatch = availableBatches.find(b => b.batchNumber === selectedBatchNo);
                            const updated = [...items];
                            updated[idx] = {
                              ...updated[idx],
                              batchNumber: selectedBatchNo,
                              unitCost: selectedBatch?.costPerUnit ?? prod?.productionCost ?? 0,
                            };
                            setItems(updated);
                            setFormError(null);
                          }}
                          className={`w-full p-1.5 border rounded font-mono font-semibold bg-white ${
                            availableBatches.length === 0 && !isUnbatchedOpening
                              ? 'border-rose-300 text-rose-700'
                              : 'border-stone-300'
                          }`}
                        >
                          {availableBatches.length > 0 ? (
                            availableBatches.map(b => (
                              <option key={b.batchNumber} value={b.batchNumber}>
                                {b.batchNumber} ({b.quantity} pcs left · Exp: {formatDateDMY(b.expDate)})
                              </option>
                            ))
                          ) : isUnbatchedOpening ? (
                            <option value="OPENING">OPENING ({prod?.availableStock} pcs left)</option>
                          ) : (
                            <option value="">No QC Approved Batch (0 stock)</option>
                          )}
                        </select>
                      </div>

                      <div className="col-span-4 sm:col-span-2">
                        <span className="text-[10px] text-stone-400 block">Quantity ({item.unit})</span>
                        <input
                          type="number"
                          min="0.01"
                          step="any"
                          value={item.quantity}
                          onChange={e => {
                            const qty = e.target.value === '' ? 0 : Number(e.target.value);
                            const updated = [...items];
                            updated[idx] = {
                              ...updated[idx],
                              quantity: qty,
                              totalPrice: Number((qty * updated[idx].unitPrice).toFixed(2)),
                            };
                            setItems(updated);
                            setFormError(null);
                          }}
                          className="w-full p-1.5 border border-stone-300 rounded font-mono font-bold bg-white"
                        />
                      </div>

                      <div className="col-span-4 sm:col-span-2">
                        <span className="text-[10px] text-stone-400 block">Rate (PKR)</span>
                        <input
                          type="number"
                          min="0"
                          step="any"
                          value={item.unitPrice}
                          onChange={e => {
                            const rate = e.target.value === '' ? 0 : Number(e.target.value);
                            const updated = [...items];
                            updated[idx] = {
                              ...updated[idx],
                              unitPrice: rate,
                              totalPrice: Number((updated[idx].quantity * rate).toFixed(2)),
                            };
                            setItems(updated);
                            setFormError(null);
                          }}
                          className="w-full p-1.5 border border-stone-300 rounded font-mono bg-white"
                        />
                      </div>

                      <div className="col-span-3 sm:col-span-1 text-right">
                        <span className="text-[10px] text-stone-400 block">Total</span>
                        <span className="font-mono font-bold text-stone-900">{formatPKR(item.totalPrice)}</span>
                      </div>

                      <div className="col-span-1 text-center">
                        <button
                          type="button"
                          onClick={() => setItems(items.filter((_, i) => i !== idx))}
                          className="p-1 text-stone-400 hover:text-rose-700 cursor-pointer"
                          title="Remove line"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Discount, Tax & Net Summary */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-center bg-stone-100 p-3 rounded-lg border border-stone-300">
            <div>
              <label className="block font-medium text-stone-700 mb-1">Trade Discount (PKR)</label>
              <input
                type="number"
                min="0"
                step="any"
                value={discountAmount}
                onChange={e => {
                  setDiscountAmount(e.target.value === '' ? 0 : Number(e.target.value));
                  setFormError(null);
                }}
                className="w-full p-1.5 border border-stone-300 rounded font-mono bg-white"
              />
            </div>
            <div>
              <label className="block font-medium text-stone-700 mb-1">Tax / GST (PKR)</label>
              <input
                type="number"
                min="0"
                step="any"
                value={taxAmount}
                onChange={e => {
                  setTaxAmount(e.target.value === '' ? 0 : Number(e.target.value));
                  setFormError(null);
                }}
                className="w-full p-1.5 border border-stone-300 rounded font-mono bg-white"
              />
            </div>
            <div>
              <span className="text-stone-500 block">Gross Subtotal:</span>
              <span className="font-mono font-bold text-stone-900 text-sm">{formatPKR(subtotal)}</span>
            </div>
            <div className="text-right">
              <span className="text-stone-600 block text-xs">Net Invoice Amount:</span>
              <span className="font-mono font-bold text-xl text-emerald-950">{formatPKR(netTotal)}</span>
            </div>
          </div>

          <div className="pt-3 border-t border-stone-200 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="px-4 py-2 border border-stone-300 rounded text-stone-700 hover:bg-stone-50 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPosting}
              className="px-5 py-2 bg-emerald-800 text-white rounded font-medium hover:bg-emerald-700 disabled:opacity-60 shadow-xs cursor-pointer"
            >
              {isPosting ? 'Posting Invoice...' : 'Post Sales Invoice & Deduct Stock'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
