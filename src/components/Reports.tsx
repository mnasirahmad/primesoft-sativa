import React, { useState } from 'react';
import { ERPDatabase, MySQLStatus } from '../services/storage';
import { formatPKR, formatDateDMY } from '../utils/formatters';
import { DataTable } from './common/DataTable';
import {
  Layers,
  TrendingUp,
  Scale,
  Package,
  Database,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';

interface ReportsProps {
  db: ERPDatabase;
  onPrintDocument: (data: any) => void;
  mysqlStatus: MySQLStatus;
  onRefreshFromMySQL: () => Promise<boolean>;
  onOpenMySQLConfig: () => void;
}

export const Reports: React.FC<ReportsProps> = ({
  db,
  mysqlStatus,
  onRefreshFromMySQL,
  onOpenMySQLConfig,
}) => {
  const [reportCategory, setReportCategory] = useState<'inventory' | 'manufacturing' | 'commercial' | 'financial'>('inventory');
  const [selectedReport, setSelectedReport] = useState<string>('rm_stock');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [refreshMessage, setRefreshMessage] = useState<string | null>(null);

  const handleRefreshReports = async () => {
    setIsRefreshing(true);
    setRefreshMessage(null);
    const ok = await onRefreshFromMySQL();
    setIsRefreshing(false);
    if (ok) {
      setRefreshMessage('Reports refreshed with live data from MySQL.');
      setTimeout(() => setRefreshMessage(null), 3000);
    }
  };

  // Reports Definitions
  const reportList = {
    inventory: [
      { id: 'rm_stock', label: 'Raw Material Stock Report' },
      { id: 'pkg_stock', label: 'Packaging Materials Stock' },
      { id: 'fg_stock', label: 'Finished Goods Stock Valuation' },
      { id: 'stock_ledger', label: 'Complete Stock Ledger Movement' },
      { id: 'low_stock', label: 'Low Stock Threshold Report' },
      { id: 'expiry_report', label: 'FEFO Expiry Schedule' },
    ],
    manufacturing: [
      { id: 'mfg_register', label: 'Production Register & Batches' },
      { id: 'rm_consumption', label: 'Chemical Consumption Report' },
      { id: 'pkg_consumption', label: 'Packaging Consumption' },
      { id: 'wastage_report', label: 'Production Wastage Analysis' },
      { id: 'qc_report', label: 'QC Lab Release Register' },
    ],
    commercial: [
      { id: 'sales_register', label: 'Sales Register (Product & Customer)' },
      { id: 'purchase_register', label: 'Purchase Inward Register' },
      { id: 'receivables', label: 'Customer Receivables & Aging' },
      { id: 'payables', label: 'Supplier Payables Ledger' },
      { id: 'rep_performance', label: 'Sales Representative Performance' },
    ],
    financial: [
      { id: 'trial_balance', label: 'Trial Balance Report' },
      { id: 'income_statement', label: 'Income Statement (P&L)' },
      { id: 'balance_sheet', label: 'Balance Sheet Statement' },
      { id: 'cash_book', label: 'Daily Cash Book' },
      { id: 'expense_summary', label: 'Factory & Operating Expenses' },
    ],
  };

  // Render Table content based on selectedReport
  const renderReportContent = () => {
    switch (selectedReport) {
      case 'rm_stock':
        return (
          <DataTable
            title="Raw Material Stock Report"
            data={db.rawMaterials}
            columns={[
              { header: 'Code', accessorKey: 'code', className: 'font-mono font-bold' },
              { header: 'Chemical Name', accessorKey: 'name', className: 'font-semibold' },
              { header: 'Category', accessorKey: 'category' },
              { header: 'Available Stock', accessorKey: 'availableStock', align: 'right', cell: (r: any) => `${r.availableStock} ${r.consumptionUnit}` },
              { header: 'Avg Cost Rate', accessorKey: 'averageCost', align: 'right', cell: (r: any) => formatPKR(r.averageCost || r.purchaseRate) },
              {
                header: 'Total Valuation',
                align: 'right',
                cell: (r: any) => <span className="font-mono font-bold">{formatPKR(r.availableStock * (r.averageCost || r.purchaseRate))}</span>,
              },
            ]}
          />
        );

      case 'pkg_stock':
        return (
          <DataTable
            title="Packaging Stock Report"
            data={db.packagingMaterials}
            columns={[
              { header: 'Code', accessorKey: 'code', className: 'font-mono font-bold' },
              { header: 'Packaging Item', accessorKey: 'name', className: 'font-semibold' },
              { header: 'Category', accessorKey: 'category', className: 'capitalize' },
              { header: 'Available Stock', accessorKey: 'availableStock', align: 'right', cell: (r: any) => `${r.availableStock} ${r.unit}` },
              { header: 'Purchase Rate', accessorKey: 'purchaseRate', align: 'right', cell: (r: any) => formatPKR(r.purchaseRate) },
              {
                header: 'Valuation',
                align: 'right',
                cell: (r: any) => <span className="font-mono font-bold">{formatPKR(r.availableStock * r.purchaseRate)}</span>,
              },
            ]}
          />
        );

      case 'fg_stock':
        return (
          <DataTable
            title="Finished Goods Valuation"
            data={db.finishedProducts}
            columns={[
              { header: 'SKU Code', accessorKey: 'code', className: 'font-mono font-bold' },
              { header: 'Product Name', accessorKey: 'name', className: 'font-semibold' },
              { header: 'Brand', accessorKey: 'brand' },
              { header: 'Pack Size', accessorKey: 'size' },
              { header: 'Stock Units', accessorKey: 'availableStock', align: 'right', cell: (r: any) => `${r.availableStock} pcs` },
              { header: 'Unit Cost', accessorKey: 'productionCost', align: 'right', cell: (r: any) => formatPKR(r.productionCost) },
              { header: 'Wholesale Rate', accessorKey: 'wholesaleRate', align: 'right', cell: (r: any) => formatPKR(r.wholesaleRate) },
              {
                header: 'Cost Valuation',
                align: 'right',
                cell: (r: any) => <span className="font-mono font-bold">{formatPKR(r.availableStock * r.productionCost)}</span>,
              },
            ]}
          />
        );

      case 'stock_ledger':
        return (
          <DataTable
            title="Comprehensive Stock Ledger Movement"
            data={db.stockLedger}
            columns={[
              { header: 'Date', accessorKey: 'date', cell: (r: any) => formatDateDMY(r.date) },
              { header: 'Ref No', accessorKey: 'referenceNo', className: 'font-mono font-bold text-emerald-800' },
              { header: 'Item Name', accessorKey: 'itemName', className: 'font-medium' },
              { header: 'Transaction Type', accessorKey: 'transactionType', className: 'capitalize font-mono text-[11px]' },
              { header: 'In (+)', accessorKey: 'quantityIn', align: 'right', cell: (r: any) => (r.quantityIn > 0 ? r.quantityIn : '-') },
              { header: 'Out (-)', accessorKey: 'quantityOut', align: 'right', cell: (r: any) => (r.quantityOut > 0 ? r.quantityOut : '-') },
              { header: 'Balance', accessorKey: 'balanceQuantity', align: 'right', cell: (r: any) => <span className="font-bold">{r.balanceQuantity}</span> },
              { header: 'Valuation', accessorKey: 'totalAmount', align: 'right', cell: (r: any) => formatPKR(r.totalAmount) },
            ]}
          />
        );

      case 'mfg_register':
        return (
          <DataTable
            title="Production Register"
            data={db.productionOrders}
            columns={[
              { header: 'Order #', accessorKey: 'orderNumber', className: 'font-mono font-bold text-emerald-800' },
              { header: 'Date', accessorKey: 'date', cell: (r: any) => formatDateDMY(r.date) },
              { header: 'Product Name', accessorKey: 'productName', className: 'font-bold' },
              { header: 'Batch #', accessorKey: 'batchNumber', className: 'font-mono' },
              { header: 'Planned Qty', accessorKey: 'plannedQuantity', align: 'right' },
              { header: 'Actual Good Qty', accessorKey: 'actualQuantity', align: 'right', cell: (r: any) => (r.actualQuantity > 0 ? r.actualQuantity : '-') },
              { header: 'Wastage Qty', accessorKey: 'wastageQuantity', align: 'right', cell: (r: any) => (r.wastageQuantity > 0 ? r.wastageQuantity : '-') },
              { header: 'Unit Cost', accessorKey: 'costPerUnit', align: 'right', cell: (r: any) => formatPKR(r.costPerUnit) },
            ]}
          />
        );

      case 'sales_register':
        return (
          <DataTable
            title="Sales Invoices Register"
            data={db.salesInvoices}
            columns={[
              { header: 'Invoice #', accessorKey: 'invoiceNumber', className: 'font-mono font-bold text-emerald-800' },
              { header: 'Date', accessorKey: 'date', cell: (r: any) => formatDateDMY(r.date) },
              { header: 'Customer', accessorKey: 'customerName', className: 'font-bold' },
              { header: 'Sales Rep', accessorKey: 'salesRepName' },
              { header: 'Payment', accessorKey: 'paymentType', align: 'center', className: 'uppercase font-bold text-[10px]' },
              { header: 'Net Amount', accessorKey: 'netTotal', align: 'right', cell: (r: any) => <span className="font-mono font-bold">{formatPKR(r.netTotal)}</span> },
              { header: 'Receivable Balance', accessorKey: 'balanceAmount', align: 'right', cell: (r: any) => formatPKR(r.balanceAmount) },
            ]}
          />
        );

      case 'purchase_register':
        return (
          <DataTable
            title="Purchase Register"
            data={db.purchaseInvoices}
            columns={[
              { header: 'Bill #', accessorKey: 'invoiceNumber', className: 'font-mono font-bold text-emerald-800' },
              { header: 'Date', accessorKey: 'date', cell: (r: any) => formatDateDMY(r.date) },
              { header: 'Supplier Name', accessorKey: 'supplierName', className: 'font-bold' },
              { header: 'Payment', accessorKey: 'paymentType', align: 'center', className: 'uppercase font-bold text-[10px]' },
              { header: 'Net Amount', accessorKey: 'netTotal', align: 'right', cell: (r: any) => <span className="font-mono font-bold">{formatPKR(r.netTotal)}</span> },
              { header: 'Payable Balance', accessorKey: 'balanceAmount', align: 'right', cell: (r: any) => formatPKR(r.balanceAmount) },
            ]}
          />
        );

      case 'receivables':
        return (
          <DataTable
            title="Customer Receivables Ledger"
            data={db.customers}
            columns={[
              { header: 'Customer Code', accessorKey: 'code', className: 'font-mono font-bold' },
              { header: 'Customer Name', accessorKey: 'name', className: 'font-bold' },
              { header: 'City', accessorKey: 'city' },
              { header: 'Telephone', accessorKey: 'phone', className: 'font-mono' },
              { header: 'Credit Limit', accessorKey: 'creditLimit', align: 'right', cell: (r: any) => formatPKR(r.creditLimit) },
              {
                header: 'Receivable Balance',
                accessorKey: 'currentBalance',
                align: 'right',
                cell: (r: any) => (
                  <span className={`font-mono font-bold ${r.currentBalance > 0 ? 'text-amber-700' : 'text-stone-700'}`}>
                    {formatPKR(r.currentBalance)}
                  </span>
                ),
              },
            ]}
          />
        );

      case 'payables':
        return (
          <DataTable
            title="Supplier Payables Ledger"
            data={db.suppliers}
            columns={[
              { header: 'Supplier Code', accessorKey: 'code', className: 'font-mono font-bold' },
              { header: 'Supplier Name', accessorKey: 'name', className: 'font-bold' },
              { header: 'Category', accessorKey: 'supplierType', className: 'capitalize' },
              { header: 'City', accessorKey: 'city' },
              { header: 'Terms', accessorKey: 'paymentTermsDays', cell: (r: any) => `${r.paymentTermsDays} Days` },
              {
                header: 'Payable Balance',
                accessorKey: 'currentBalance',
                align: 'right',
                cell: (r: any) => (
                  <span className={`font-mono font-bold ${r.currentBalance > 0 ? 'text-rose-700' : 'text-stone-700'}`}>
                    {formatPKR(r.currentBalance)}
                  </span>
                ),
              },
            ]}
          />
        );

      default:
        return (
          <div className="py-12 text-center text-stone-400 text-xs bg-stone-50 rounded-xl">
            Select a report from the menu to preview real-time database records.
          </div>
        );
    }
  };

  return (
    <div className="space-y-4">
      {/* Top Header Card */}
      <div className="bg-white rounded-xl border border-stone-200 p-5 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="bg-stone-50 p-2 rounded-xl border border-stone-200 shrink-0">
            <img
              src="./assets/aistudio/sativa_b7dc1d13.webp"
              alt="Sativa Cosmetics"
              className="h-10 w-auto object-contain"
            />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider">
                Management Intelligence & Auditing
              </span>
              <span className="text-xs text-stone-400">·</span>
              <span className="text-xs text-stone-500">Live MySQL Database Reports</span>
            </div>
            <h1 className="text-lg font-bold text-stone-900 mt-0.5">
              Reports & Analytics Hub
            </h1>
            <p className="text-xs text-stone-500">
              Real-time operational, commercial, and financial reports queried directly from MySQL
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <div
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold ${
              mysqlStatus.connected
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                : 'bg-rose-50 border-rose-200 text-rose-800'
            }`}
          >
            <Database className="h-3.5 w-3.5" />
            <span>
              {mysqlStatus.connected
                ? `MySQL Connected${mysqlStatus.database ? ` · ${mysqlStatus.database}` : ''}`
                : 'MySQL Not Connected'}
            </span>
          </div>

          {mysqlStatus.connected ? (
            <button
              type="button"
              disabled={isRefreshing}
              onClick={handleRefreshReports}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-emerald-800 hover:bg-emerald-700 rounded-lg shadow-2xs transition-colors cursor-pointer disabled:opacity-60"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
              <span>{isRefreshing ? 'Refreshing...' : 'Refresh from MySQL'}</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={onOpenMySQLConfig}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-rose-700 hover:bg-rose-600 rounded-lg shadow-2xs transition-colors cursor-pointer"
            >
              <Database className="h-3.5 w-3.5" />
              <span>Connect MySQL Database</span>
            </button>
          )}
        </div>
      </div>

      {refreshMessage && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-lg text-xs font-medium flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-emerald-700 shrink-0" />
          <span>{refreshMessage}</span>
        </div>
      )}

      {!mysqlStatus.connected ? (
        <div className="bg-white rounded-xl border border-rose-200 p-8 text-center space-y-3 shadow-2xs">
          <div className="mx-auto h-11 w-11 rounded-full bg-rose-100 text-rose-700 flex items-center justify-center">
            <AlertCircle className="h-5 w-5" />
          </div>
          <h2 className="text-sm font-bold text-stone-900">
            MySQL Connection Required for Live Reports
          </h2>
          <p className="text-xs text-stone-600 max-w-md mx-auto">
            Local/offline caching is disabled. Connect to your MySQL server to load and view inventory, production, sales, and financial reports.
            {mysqlStatus.error ? ` (${mysqlStatus.error})` : ''}
          </p>
          <div className="pt-1">
            <button
              type="button"
              onClick={onOpenMySQLConfig}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-emerald-800 hover:bg-emerald-700 rounded-lg shadow-2xs transition-colors cursor-pointer"
            >
              <Database className="h-4 w-4" />
              <span>Open MySQL Database Configuration</span>
            </button>
          </div>
        </div>
      ) : (
        /* Category Pills & Reports Selector */
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Left Side: Category and Report Selector */}
        <div className="bg-white rounded-xl border border-stone-200 p-4 shadow-2xs space-y-4 text-xs">
          <div>
            <label className="font-bold text-stone-700 block uppercase text-[11px] mb-2">
              Report Section:
            </label>
            <div className="space-y-1">
              {[
                { id: 'inventory', label: 'Inventory Reports', icon: Package },
                { id: 'manufacturing', label: 'Manufacturing Reports', icon: Layers },
                { id: 'commercial', label: 'Commercial & Sales', icon: TrendingUp },
                { id: 'financial', label: 'Financial Ledgers', icon: Scale },
              ].map(cat => {
                const Icon = cat.icon;
                const isActive = reportCategory === cat.id;
                return (
                  <button
                    key={cat.id}
                    onClick={() => {
                      setReportCategory(cat.id as any);
                      setSelectedReport(reportList[cat.id as keyof typeof reportList][0]?.id || '');
                    }}
                    className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg font-medium transition-colors cursor-pointer ${
                      isActive
                        ? 'bg-emerald-800 text-white font-semibold'
                        : 'text-stone-600 hover:bg-stone-100 hover:text-stone-900'
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    <span>{cat.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="pt-3 border-t border-stone-200">
            <label className="font-bold text-stone-700 block uppercase text-[11px] mb-2">
              Available Reports:
            </label>
            <div className="space-y-1">
              {reportList[reportCategory].map(rep => {
                const isSelected = selectedReport === rep.id;
                return (
                  <button
                    key={rep.id}
                    onClick={() => setSelectedReport(rep.id)}
                    className={`w-full text-left px-2.5 py-1.5 rounded text-xs transition-colors cursor-pointer ${
                      isSelected
                        ? 'bg-emerald-50 text-emerald-950 font-bold border-l-2 border-emerald-800'
                        : 'text-stone-600 hover:bg-stone-50 hover:text-stone-900'
                    }`}
                  >
                    {rep.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

          {/* Right Side: Report Output Table */}
          <div className="md:col-span-3">
            {renderReportContent()}
          </div>
        </div>
      )}
    </div>
  );
};
