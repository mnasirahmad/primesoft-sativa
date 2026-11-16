import React, { useState } from 'react';
import { ERPDatabase, logAudit, syncDatabaseToServer } from '../services/storage';
import { formatPKR, formatDateDMY } from '../utils/formatters';
import { PurchaseInvoice, PurchaseItem, FinancialVoucher } from '../types/erp';
import { DataTable } from './common/DataTable';
import { Modal } from './common/Modal';
import { Plus, Printer, Trash2, AlertCircle, CheckCircle2, X } from 'lucide-react';
import { addRawMaterialStock, addPackagingStock } from '../services/inventory';
import { postFinancialVoucher } from '../services/accounting';

interface PurchasesProps {
  db: ERPDatabase;
  setDb: React.Dispatch<React.SetStateAction<ERPDatabase>>;
  onPrintDocument: (data: any) => void;
  mysqlConnected: boolean;
  onMySQLSyncError?: (error?: string) => void;
  onOpenMySQLConfig?: () => void;
}

export const Purchases: React.FC<PurchasesProps> = ({
  db,
  setDb,
  onPrintDocument,
  mysqlConnected,
  onMySQLSyncError,
  onOpenMySQLConfig,
}) => {
  // New Invoice Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [supplierId, setSupplierId] = useState('');
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [supplierInvNo, setSupplierInvNo] = useState('');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [paymentType, setPaymentType] = useState<'cash' | 'credit'>('credit');
  const [warehouseId, setWarehouseId] = useState('wh-rm');
  const [notes, setNotes] = useState('');

  // Invoice Items & inline feedback
  const [items, setItems] = useState<PurchaseItem[]>([]);
  const [formError, setFormError] = useState<string | null>(null);
  const [isPosting, setIsPosting] = useState(false);
  const [statusBanner, setStatusBanner] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Open Create Modal
  const handleOpenCreate = () => {
    setFormError(null);
    setSupplierId(db.suppliers[0]?.id || '');
    setInvoiceNumber(`PINV-26-${String(db.purchaseInvoices.length + 1).padStart(4, '0')}`);
    setSupplierInvNo(`VEN-${Math.floor(Math.random() * 90000 + 10000)}`);
    setDate(new Date().toISOString().slice(0, 10));
    setPaymentType('credit');
    setWarehouseId('wh-rm');
    setNotes('Received and verified at Vehari factory store.');
    setItems([]);
    setModalOpen(true);
  };

  // Add Item to Bill
  const handleAddItem = (type: 'raw_material' | 'packaging') => {
    setFormError(null);
    if (type === 'raw_material') {
      if (db.rawMaterials.length === 0) {
        setFormError('Please define raw materials first in the Raw Materials module.');
        return;
      }
      const rm = db.rawMaterials[0];
      setItems([
        ...items,
        {
          itemType: 'raw_material',
          itemId: rm.id,
          itemName: rm.name,
          batchNumber: `LOT-${rm.code.slice(3, 7)}-${Date.now().toString().slice(-4)}`,
          mfgDate: new Date().toISOString().slice(0, 10),
          expiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
          quantity: 50,
          unit: rm.consumptionUnit,
          unitPrice: rm.purchaseRate || 500,
          totalPrice: 50 * (rm.purchaseRate || 500),
        },
      ]);
    } else {
      if (db.packagingMaterials.length === 0) {
        setFormError('Please define packaging materials first in the Packaging module.');
        return;
      }
      const pkg = db.packagingMaterials[0];
      setItems([
        ...items,
        {
          itemType: 'packaging',
          itemId: pkg.id,
          itemName: pkg.name,
          batchNumber: `PKG-${Date.now().toString().slice(-4)}`,
          quantity: 1000,
          unit: pkg.unit,
          unitPrice: pkg.purchaseRate || 25,
          totalPrice: 1000 * (pkg.purchaseRate || 25),
        },
      ]);
    }
  };

  // Calculations
  const subtotal = items.reduce((sum, item) => sum + (item.totalPrice || 0), 0);
  const taxAmount = 0; // standard tax or input tax
  const discountAmount = 0;
  const netTotal = subtotal + taxAmount - discountAmount;
  const paidAmount = paymentType === 'cash' ? netTotal : 0;
  const balanceAmount = netTotal - paidAmount;

  // Save Purchase Invoice & Update Stock + Accounts (MySQL-only)
  const handleSaveInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isPosting) return;
    setFormError(null);

    if (!mysqlConnected) {
      setFormError('MySQL database is not connected. Purchase bills can only be posted when MySQL is connected.');
      return;
    }

    if (!supplierId || items.length === 0) {
      setFormError('Please select a supplier and add at least one line item.');
      return;
    }

    const supplier = db.suppliers.find(s => s.id === supplierId);
    let currentDb = db;

    // 1. Update stock for each line item
    for (const item of items) {
      if (item.itemType === 'raw_material') {
        currentDb = addRawMaterialStock(
          currentDb,
          item.itemId,
          {
            batchNumber: item.batchNumber,
            quantity: item.quantity,
            costRate: item.unitPrice,
            manufacturingDate: item.mfgDate || date,
            expiryDate: item.expiryDate || date,
            qcStatus: 'approved',
          },
          invoiceNumber,
          date
        );
      } else {
        currentDb = addPackagingStock(
          currentDb,
          item.itemId,
          {
            batchNumber: item.batchNumber,
            quantity: item.quantity,
            costRate: item.unitPrice,
            receivedDate: date,
          },
          invoiceNumber,
          date
        );
      }
    }

    // 2. Update Supplier Balance
    const supIndex = currentDb.suppliers.findIndex(s => s.id === supplierId);
    if (supIndex >= 0) {
      const sup = { ...currentDb.suppliers[supIndex] };
      sup.currentBalance += balanceAmount;
      const updatedSups = [...currentDb.suppliers];
      updatedSups[supIndex] = sup;
      currentDb = { ...currentDb, suppliers: updatedSups };
    }

    // 3. Create Purchase Invoice record
    const newInvoice: PurchaseInvoice = {
      id: `pinv-${Date.now()}`,
      invoiceNumber,
      supplierInvoiceNumber: supplierInvNo,
      date,
      supplierId,
      supplierName: supplier?.name || 'Supplier',
      paymentType,
      items,
      subtotal,
      taxAmount,
      discountAmount,
      netTotal,
      paidAmount,
      balanceAmount,
      warehouseId,
      status: 'posted',
      notes,
    };

    // 4. Double-Entry Accounting Voucher
    // Debit 1040 (RM Inventory) or 1050 (Packaging Inventory)
    // Credit 2010 (Accounts Payable) if credit, or 1010 (Cash in Hand) if cash
    const totalRmAmount = items.filter(i => i.itemType === 'raw_material').reduce((s, i) => s + i.totalPrice, 0);
    const totalPkgAmount = items.filter(i => i.itemType === 'packaging').reduce((s, i) => s + i.totalPrice, 0);

    const voucherEntries = [
      ...(totalRmAmount > 0
        ? [
            {
              accountId: 'acc-1040',
              accountCode: '1040',
              accountName: 'Raw Material & Chemical Inventory',
              debit: Number(totalRmAmount.toFixed(2)),
              credit: 0,
              description: `Purchase Bill #${invoiceNumber} from ${newInvoice.supplierName}`,
            },
          ]
        : []),
      ...(totalPkgAmount > 0
        ? [
            {
              accountId: 'acc-1050',
              accountCode: '1050',
              accountName: 'Packaging Materials Inventory',
              debit: Number(totalPkgAmount.toFixed(2)),
              credit: 0,
              description: `Packaging Bill #${invoiceNumber} from ${newInvoice.supplierName}`,
            },
          ]
        : []),
      {
        accountId: paymentType === 'cash' ? 'acc-1010' : 'acc-2010',
        accountCode: paymentType === 'cash' ? '1010' : '2010',
        accountName:
          paymentType === 'cash'
            ? 'Cash in Hand (Factory Vehari)'
            : 'Supplier Payables (Trade Creditors)',
        debit: 0,
        credit: Number(netTotal.toFixed(2)),
        description: `Bill #${invoiceNumber} - ${newInvoice.supplierName}`,
      },
    ];

    const voucher: FinancialVoucher = {
      id: `vouch-pur-${Date.now()}`,
      voucherNumber: `JV-PUR-${Date.now().toString().slice(-4)}`,
      voucherType: paymentType === 'cash' ? 'payment' : 'journal',
      date,
      referenceNo: invoiceNumber,
      entries: voucherEntries,
      totalDebit: Number(netTotal.toFixed(2)),
      totalCredit: Number(netTotal.toFixed(2)),
      narration: `Automated Purchase Voucher for Bill #${invoiceNumber} from ${newInvoice.supplierName}`,
      postedBy: 'System Purchase Engine',
      isAutomatic: true,
      status: 'posted',
    };

    const postRes = postFinancialVoucher(currentDb, voucher);
    if (postRes.error) {
      setFormError(postRes.error);
      return;
    }
    currentDb = postRes.updatedDb;

    currentDb = {
      ...currentDb,
      purchaseInvoices: [newInvoice, ...currentDb.purchaseInvoices],
    };

    currentDb = logAudit(
      currentDb,
      'Purchases',
      'create',
      `Posted Purchase Bill #${invoiceNumber} (${formatPKR(netTotal)}) from ${newInvoice.supplierName}`
    );

    setIsPosting(true);
    try {
      const syncRes = await syncDatabaseToServer(currentDb);
      if (!syncRes.ok) {
        onMySQLSyncError?.(syncRes.error);
        setFormError(
          `Failed to save purchase bill to MySQL: ${syncRes.error || 'MySQL database is not connected.'}`
        );
        return;
      }

      setDb(currentDb);
      setModalOpen(false);
      setFormError(null);
      setStatusBanner({
        type: 'success',
        message: `Purchase Bill #${invoiceNumber} (${formatPKR(netTotal)}) posted & saved to MySQL database.`,
      });
    } finally {
      setIsPosting(false);
    }
  };

  // Print Purchase Invoice
  const handlePrintInvoice = (inv: PurchaseInvoice) => {
    onPrintDocument({
      type: 'purchase_invoice',
      docNumber: inv.invoiceNumber,
      date: inv.date,
      title: 'GOODS RECEIPT NOTE & PURCHASE BILL',
      parties: {
        partyName: inv.supplierName,
        partyType: 'Vendor / Supplier',
        ntn: 'NTN On File',
      },
      details: [
        { label: 'Vendor Ref', value: inv.supplierInvoiceNumber || '-' },
        { label: 'Payment Terms', value: inv.paymentType.toUpperCase() },
        { label: 'Warehouse Area', value: 'Vehari Plant Receiving Bay' },
        { label: 'Status', value: inv.status.toUpperCase() },
      ],
      tableHeaders: ['Item Type', 'Material Description', 'Batch / Lot #', 'Quantity', 'Unit', 'Rate (PKR)', 'Total (PKR)'],
      tableRows: inv.items.map(item => [
        item.itemType === 'raw_material' ? 'Raw Chemical' : 'Packaging',
        item.itemName,
        item.batchNumber,
        item.quantity,
        item.unit,
        item.unitPrice,
        item.totalPrice,
      ]),
      summaryRows: [
        { label: 'Subtotal Amount', value: formatPKR(inv.subtotal) },
        { label: 'Net Payable Bill', value: formatPKR(inv.netTotal), isBold: true },
        { label: 'Amount Paid', value: formatPKR(inv.paidAmount) },
        { label: 'Balance Payable', value: formatPKR(inv.balanceAmount), isBold: true },
      ],
      narration: inv.notes || 'Materials accepted after physical verification and quality gatepass inspection.',
      signatories: [
        'Store Receiving Officer',
        'Quality Analyst',
        'Accounts Officer',
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
                Procurement & Supply Chain
              </span>
              <span className="text-xs text-stone-400">·</span>
              <span className="text-xs text-stone-500">Chemicals, Fragrances & Packaging</span>
            </div>
            <h1 className="text-lg font-bold text-stone-900 mt-0.5">
              Purchase Management & Bills
            </h1>
            <p className="text-xs text-stone-500">
              Record supplier invoices, lot numbers, auto-update raw material/packaging stock, and update supplier payable ledgers
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={handleOpenCreate}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-emerald-800 hover:bg-emerald-700 rounded-lg shadow-2xs transition-colors cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            <span>Create Purchase Bill</span>
          </button>
        </div>
      </div>

      {/* Status Banner */}
      {statusBanner && (
        <div className="rounded-xl border p-3.5 bg-emerald-50 border-emerald-200 text-emerald-900 text-xs flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-700 shrink-0" />
            <span className="font-medium">{statusBanner.message}</span>
          </div>
          <button
            type="button"
            onClick={() => setStatusBanner(null)}
            className="p-1 rounded hover:bg-black/5 cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Invoices Table */}
      <DataTable<PurchaseInvoice>
        title="Purchase Invoices"
        data={db.purchaseInvoices}
        searchPlaceholder="Search purchase bills by invoice #, supplier name..."
        columns={[
          { header: 'Bill #', accessorKey: 'invoiceNumber', className: 'font-mono font-bold text-emerald-800' },
          { header: 'Date', accessorKey: 'date', cell: r => formatDateDMY(r.date) },
          { header: 'Supplier Name', accessorKey: 'supplierName', className: 'font-bold text-stone-900' },
          {
            header: 'Items Count',
            cell: r => `${r.items.length} materials`,
          },
          {
            header: 'Payment Mode',
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
            header: 'Payable Balance',
            accessorKey: 'balanceAmount',
            align: 'right',
            cell: r => (
              <span className={`font-mono font-bold ${r.balanceAmount > 0 ? 'text-rose-700' : 'text-stone-500'}`}>
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
                  title="Print Purchase Bill"
                >
                  <Printer className="h-3.5 w-3.5" />
                </button>
              </div>
            ),
          },
        ]}
      />

      {/* MODAL: New Purchase Invoice */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Enter Inward Purchase Invoice / GRN"
        subtitle="Receipt of raw materials or packaging from vendors into store"
        maxWidth="5xl"
      >
        <form onSubmit={handleSaveInvoice} noValidate className="space-y-4 text-xs">
          {!mysqlConnected && (
            <div className="bg-rose-50 border border-rose-300 text-rose-900 rounded-lg p-3 flex items-center justify-between gap-2">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-4 w-4 text-rose-700 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold">MySQL Not Connected:</span> Posting purchase bills requires a live MySQL database connection.
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

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 bg-stone-50 p-3 rounded-lg border border-stone-200">
            <div>
              <label className="block font-semibold text-stone-700 mb-1">Supplier *</label>
              <select
                required
                value={supplierId}
                onChange={e => setSupplierId(e.target.value)}
                className="w-full p-2 border border-stone-300 rounded font-medium bg-white"
              >
                <option value="">-- Choose Supplier --</option>
                {db.suppliers.map(s => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.city})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-semibold text-stone-700 mb-1">Our Bill # *</label>
              <input
                type="text"
                required
                value={invoiceNumber}
                onChange={e => setInvoiceNumber(e.target.value)}
                className="w-full p-2 border border-stone-300 rounded font-mono bg-white"
              />
            </div>

            <div>
              <label className="block font-semibold text-stone-700 mb-1">Supplier Ref Inv #</label>
              <input
                type="text"
                value={supplierInvNo}
                onChange={e => setSupplierInvNo(e.target.value)}
                className="w-full p-2 border border-stone-300 rounded font-mono bg-white"
              />
            </div>

            <div>
              <label className="block font-semibold text-stone-700 mb-1">Payment Mode</label>
              <select
                value={paymentType}
                onChange={e => setPaymentType(e.target.value as any)}
                className="w-full p-2 border border-stone-300 rounded font-bold bg-white"
              >
                <option value="credit">Credit (Payable to Supplier)</option>
                <option value="cash">Cash (Direct Safe Payment)</option>
              </select>
            </div>
          </div>

          {/* Line Items Container */}
          <div className="border border-stone-200 rounded-lg p-3 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-bold text-stone-900 text-xs">Inward Materials & Batches</span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleAddItem('raw_material')}
                  className="px-2.5 py-1 text-[11px] font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 rounded border border-emerald-200 cursor-pointer"
                >
                  + Add Raw Chemical
                </button>
                <button
                  type="button"
                  onClick={() => handleAddItem('packaging')}
                  className="px-2.5 py-1 text-[11px] font-semibold text-blue-800 bg-blue-50 hover:bg-blue-100 rounded border border-blue-200 cursor-pointer"
                >
                  + Add Packaging
                </button>
              </div>
            </div>

            {items.length === 0 ? (
              <div className="py-6 text-center text-stone-400 italic">
                No items added yet. Click &quot;+ Add Raw Chemical&quot; or &quot;+ Add Packaging&quot; to add bill lines.
              </div>
            ) : (
              <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                {items.map((item, idx) => (
                  <div key={idx} className="grid grid-cols-12 gap-2 items-center bg-stone-50 p-2 rounded border border-stone-200">
                    <div className="col-span-3">
                      <span className="text-[10px] text-stone-400 block uppercase">
                        {item.itemType === 'raw_material' ? 'Chemical' : 'Packaging'}
                      </span>
                      <select
                        value={item.itemId}
                        onChange={e => {
                          const updated = [...items];
                          if (item.itemType === 'raw_material') {
                            const rm = db.rawMaterials.find(m => m.id === e.target.value);
                            if (rm) {
                              updated[idx] = {
                                ...updated[idx],
                                itemId: rm.id,
                                itemName: rm.name,
                                unit: rm.consumptionUnit,
                                unitPrice: rm.purchaseRate || 500,
                                totalPrice: updated[idx].quantity * (rm.purchaseRate || 500),
                              };
                            }
                          } else {
                            const pkg = db.packagingMaterials.find(p => p.id === e.target.value);
                            if (pkg) {
                              updated[idx] = {
                                ...updated[idx],
                                itemId: pkg.id,
                                itemName: pkg.name,
                                unit: pkg.unit,
                                unitPrice: pkg.purchaseRate || 25,
                                totalPrice: updated[idx].quantity * (pkg.purchaseRate || 25),
                              };
                            }
                          }
                          setItems(updated);
                        }}
                        className="w-full p-1.5 border border-stone-300 rounded font-semibold bg-white"
                      >
                        {item.itemType === 'raw_material'
                          ? db.rawMaterials.map(rm => (
                              <option key={rm.id} value={rm.id}>
                                {rm.name}
                              </option>
                            ))
                          : db.packagingMaterials.map(pkg => (
                              <option key={pkg.id} value={pkg.id}>
                                {pkg.name}
                              </option>
                            ))}
                      </select>
                    </div>

                    <div className="col-span-2">
                      <span className="text-[10px] text-stone-400 block">Batch / Lot #</span>
                      <input
                        type="text"
                        value={item.batchNumber}
                        onChange={e => {
                          const updated = [...items];
                          updated[idx].batchNumber = e.target.value;
                          setItems(updated);
                        }}
                        className="w-full p-1 border border-stone-300 rounded font-mono bg-white"
                      />
                    </div>

                    <div className="col-span-2">
                      <span className="text-[10px] text-stone-400 block">Quantity ({item.unit})</span>
                      <input
                        type="number"
                        value={item.quantity}
                        onChange={e => {
                          const qty = Number(e.target.value);
                          const updated = [...items];
                          updated[idx].quantity = qty;
                          updated[idx].totalPrice = qty * updated[idx].unitPrice;
                          setItems(updated);
                        }}
                        className="w-full p-1 border border-stone-300 rounded font-mono font-bold bg-white"
                      />
                    </div>

                    <div className="col-span-2">
                      <span className="text-[10px] text-stone-400 block">Unit Rate (PKR)</span>
                      <input
                        type="number"
                        value={item.unitPrice}
                        onChange={e => {
                          const rate = Number(e.target.value);
                          const updated = [...items];
                          updated[idx].unitPrice = rate;
                          updated[idx].totalPrice = updated[idx].quantity * rate;
                          setItems(updated);
                        }}
                        className="w-full p-1 border border-stone-300 rounded font-mono bg-white"
                      />
                    </div>

                    <div className="col-span-2 text-right">
                      <span className="text-[10px] text-stone-400 block">Line Total</span>
                      <span className="font-mono font-bold text-stone-900">{formatPKR(item.totalPrice)}</span>
                    </div>

                    <div className="col-span-1 text-center">
                      <button
                        type="button"
                        onClick={() => setItems(items.filter((_, i) => i !== idx))}
                        className="p-1 text-stone-400 hover:text-rose-700"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Bill Summary */}
          <div className="flex justify-between items-center bg-stone-100 p-3 rounded-lg border border-stone-300">
            <div>
              <span className="text-stone-500">Items: </span>
              <span className="font-bold text-stone-900">{items.length} line items</span>
            </div>
            <div className="text-right">
              <span className="text-stone-600 block text-xs">Total Bill Amount:</span>
              <span className="font-mono font-bold text-xl text-emerald-950">{formatPKR(netTotal)}</span>
            </div>
          </div>

          <div className="pt-3 border-t border-stone-200 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="px-4 py-2 border border-stone-300 rounded text-stone-700 hover:bg-stone-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPosting}
              className="px-5 py-2 bg-emerald-800 text-white rounded font-medium hover:bg-emerald-700 disabled:opacity-60 shadow-xs cursor-pointer"
            >
              {isPosting ? 'Posting to MySQL...' : 'Post Purchase Bill & Update Stock'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
