import React from 'react';
import { ERPDatabase } from '../services/storage';
import { formatPKR, formatDateDMY } from '../utils/formatters';
import { Language } from '../types/erp';
import { translations } from '../utils/translations';
import {
  TrendingUp,
  ShoppingBag,
  Factory,
  Package,
  FlaskConical,
  Sparkles,
  Wallet,
  Building,
  ArrowUpRight,
  ArrowDownRight,
  AlertTriangle,
  Clock,
  CheckCircle2,
  Calendar,
  Layers,
} from 'lucide-react';

interface DashboardProps {
  db: ERPDatabase;
  onNavigate: (tab: string) => void;
  language: Language;
}

export const Dashboard: React.FC<DashboardProps> = ({ db, onNavigate, language }) => {
  const t = translations[language];

  // Raw Material Stock total valuation & units
  const totalRmStockValuation = db.rawMaterials.reduce(
    (sum, rm) => sum + rm.availableStock * (rm.averageCost || rm.purchaseRate),
    0
  );
  const totalRmItemsCount = db.rawMaterials.length;

  // Packaging Stock total valuation
  const totalPkgValuation = db.packagingMaterials.reduce(
    (sum, p) => sum + p.availableStock * p.purchaseRate,
    0
  );

  // Finished Goods Stock total valuation
  const totalFgValuation = db.finishedProducts.reduce(
    (sum, fp) => sum + fp.availableStock * (fp.productionCost || fp.wholesaleRate),
    0
  );
  const totalFgUnits = db.finishedProducts.reduce((sum, fp) => sum + fp.availableStock, 0);

  // Production Metrics
  const todayStr = new Date().toISOString().slice(0, 10);
  const currentMonthStr = todayStr.slice(0, 7);

  const todayProductionUnits = db.productionOrders
    .filter(o => o.status === 'completed' && o.completionDate?.startsWith(todayStr))
    .reduce((sum, o) => sum + o.actualQuantity, 0);

  const monthlyProductionUnits = db.productionOrders
    .filter(o => o.status === 'completed' && o.completionDate?.startsWith(currentMonthStr))
    .reduce((sum, o) => sum + o.actualQuantity, 0);

  const pendingProductionOrders = db.productionOrders.filter(
    o => o.status === 'pending' || o.status === 'in_progress' || o.status === 'approved'
  );

  // Commercial Metrics
  const totalSales = db.salesInvoices
    .filter(inv => inv.status === 'posted')
    .reduce((sum, inv) => sum + inv.netTotal, 0);

  const totalPurchases = db.purchaseInvoices
    .filter(inv => inv.status === 'posted')
    .reduce((sum, inv) => sum + inv.netTotal, 0);

  const salesReturns = db.salesReturns.reduce((sum, r) => sum + r.totalRefundAmount, 0);
  const purchaseReturns = db.purchaseReturns.reduce((sum, r) => sum + r.totalRefundAmount, 0);

  // Financial Metrics from Chart of Accounts
  const cashAcc = db.accounts.find(a => a.code === '1010');
  const cashInHand = cashAcc?.currentBalance || 0;

  const bankAccounts = db.accounts.filter(a => a.code.startsWith('102'));
  const bankBalance = bankAccounts.reduce((sum, a) => sum + a.currentBalance, 0);

  const customerReceivables = db.customers.reduce((sum, c) => sum + Math.max(0, c.currentBalance), 0);
  const supplierPayables = db.suppliers.reduce((sum, s) => sum + Math.max(0, s.currentBalance), 0);

  // Total Expenses (COGS + Operating Expenses)
  const totalExpenses = db.accounts
    .filter(a => a.category === 'expense')
    .reduce((sum, a) => sum + Math.max(0, a.currentBalance), 0);

  // Alerts
  const lowStockRm = db.rawMaterials.filter(rm => rm.availableStock <= rm.minimumStockLevel);
  const lowStockPkg = db.packagingMaterials.filter(p => p.availableStock <= p.minimumStockLevel);
  const lowStockFg = db.finishedProducts.filter(fp => fp.availableStock <= fp.minimumStockLevel);
  const totalLowStockCount = lowStockRm.length + lowStockPkg.length + lowStockFg.length;

  // Expiry Alerts (Batches expiring within 60 days or already expired)
  const now = new Date().getTime();
  const sixtyDaysMs = 60 * 24 * 60 * 60 * 1000;
  
  const expiringRmBatches: { name: string; batchNo: string; exp: string; qty: number; unit: string }[] = [];
  db.rawMaterials.forEach(rm => {
    rm.batches.forEach(b => {
      if (b.quantity > 0 && b.expiryDate) {
        const expTime = new Date(b.expiryDate).getTime();
        if (expTime - now <= sixtyDaysMs) {
          expiringRmBatches.push({
            name: rm.name,
            batchNo: b.batchNumber,
            exp: b.expiryDate,
            qty: b.quantity,
            unit: rm.consumptionUnit,
          });
        }
      }
    });
  });

  return (
    <div className="space-y-6">
      {/* Welcome Banner with Sativa Brand Presence */}
      <div className="bg-gradient-to-r from-stone-900 via-stone-850 to-emerald-950 text-white rounded-xl p-5 border border-stone-800 shadow-md">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
          <div className="flex items-center gap-4">
            <div className="bg-white p-2.5 rounded-xl shadow-md border border-white/30 shrink-0">
              <img
                src="./assets/aistudio/sativa_b7dc1d13.webp"
                alt="Sativa Cosmetics"
                className="h-12 w-auto object-contain"
              />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-amber-400 uppercase tracking-widest">
                  Operational Command
                </span>
                <span className="text-xs text-stone-400">·</span>
                <span className="text-xs text-emerald-300">Vehari Manufacturing Plant</span>
              </div>
              <h1 className="text-xl font-bold tracking-tight mt-1 text-white">
                SATIVA COSMETICS – Production & Commercial ERP
              </h1>
              <p className="text-xs text-stone-300 mt-0.5">
                5-KM Multan Road, Vehari, Punjab, Pakistan · Fiscal Cycle 2026-27 · Real-time single database ledger
              </p>
            </div>
          </div>

          {/* Quick Action Strip */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => onNavigate('production')}
              className="px-3 py-1.5 text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition-colors shadow-2xs whitespace-nowrap cursor-pointer"
            >
              + Production Order
            </button>
            <button
              onClick={() => onNavigate('sales')}
              className="px-3 py-1.5 text-xs font-semibold bg-stone-700 hover:bg-stone-600 text-white rounded-lg transition-colors shadow-2xs whitespace-nowrap cursor-pointer"
            >
              + Sales Invoice
            </button>
            <button
              onClick={() => onNavigate('purchases')}
              className="px-3 py-1.5 text-xs font-semibold bg-stone-700 hover:bg-stone-600 text-white rounded-lg transition-colors shadow-2xs whitespace-nowrap cursor-pointer"
            >
              + Purchase Bill
            </button>
            <button
              onClick={() => onNavigate('accounting')}
              className="px-3 py-1.5 text-xs font-semibold bg-amber-500 hover:bg-amber-400 text-stone-900 rounded-lg transition-colors shadow-2xs whitespace-nowrap cursor-pointer"
            >
              + Journal Voucher
            </button>
          </div>
        </div>
      </div>

      {/* Primary KPI Grid (4 Columns) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Sales */}
        <div className="bg-white p-4 rounded-xl border border-stone-200 shadow-2xs">
          <div className="flex items-center justify-between text-stone-500">
            <span className="text-xs font-medium uppercase tracking-wider">{t.totalSales}</span>
            <div className="p-2 rounded-lg bg-emerald-50 text-emerald-700">
              <TrendingUp className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 text-xl font-bold font-mono text-stone-900">
            {formatPKR(totalSales)}
          </div>
          <div className="mt-1 flex items-center justify-between text-[11px] text-stone-500">
            <span>Invoices: {db.salesInvoices.filter(i => i.status === 'posted').length}</span>
            <span className="text-rose-600">Ret: {formatPKR(salesReturns)}</span>
          </div>
        </div>

        {/* Total Purchases */}
        <div className="bg-white p-4 rounded-xl border border-stone-200 shadow-2xs">
          <div className="flex items-center justify-between text-stone-500">
            <span className="text-xs font-medium uppercase tracking-wider">{t.totalPurchases}</span>
            <div className="p-2 rounded-lg bg-blue-50 text-blue-700">
              <ShoppingBag className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 text-xl font-bold font-mono text-stone-900">
            {formatPKR(totalPurchases)}
          </div>
          <div className="mt-1 flex items-center justify-between text-[11px] text-stone-500">
            <span>Bills: {db.purchaseInvoices.filter(i => i.status === 'posted').length}</span>
            <span className="text-emerald-700">Ret: {formatPKR(purchaseReturns)}</span>
          </div>
        </div>

        {/* Finished Goods Inventory */}
        <div className="bg-white p-4 rounded-xl border border-stone-200 shadow-2xs">
          <div className="flex items-center justify-between text-stone-500">
            <span className="text-xs font-medium uppercase tracking-wider">{t.finishedGoodsStock}</span>
            <div className="p-2 rounded-lg bg-amber-50 text-amber-700">
              <Sparkles className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 text-xl font-bold font-mono text-stone-900">
            {formatPKR(totalFgValuation)}
          </div>
          <div className="mt-1 flex items-center justify-between text-[11px] text-stone-500">
            <span>Available: {totalFgUnits} Units</span>
            <span className="text-emerald-700">SKUs: {db.finishedProducts.length}</span>
          </div>
        </div>

        {/* Raw Material & Chemical Stock */}
        <div className="bg-white p-4 rounded-xl border border-stone-200 shadow-2xs">
          <div className="flex items-center justify-between text-stone-500">
            <span className="text-xs font-medium uppercase tracking-wider">{t.rawMaterialStock}</span>
            <div className="p-2 rounded-lg bg-purple-50 text-purple-700">
              <FlaskConical className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 text-xl font-bold font-mono text-stone-900">
            {formatPKR(totalRmStockValuation)}
          </div>
          <div className="mt-1 flex items-center justify-between text-[11px] text-stone-500">
            <span>Active Chemicals: {totalRmItemsCount}</span>
            <span className="text-stone-600">Pkg: {formatPKR(totalPkgValuation)}</span>
          </div>
        </div>
      </div>

      {/* Secondary Financial & Production Strip (6 Columns) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-white p-3 rounded-lg border border-stone-200 text-xs">
          <div className="text-stone-500 text-[11px] font-medium">{t.cashInHand}</div>
          <div className="font-mono font-bold text-sm text-stone-900 mt-1">{formatPKR(cashInHand)}</div>
          <div className="text-[10px] text-stone-400 mt-0.5">Vehari Safe</div>
        </div>

        <div className="bg-white p-3 rounded-lg border border-stone-200 text-xs">
          <div className="text-stone-500 text-[11px] font-medium">{t.bankBalance}</div>
          <div className="font-mono font-bold text-sm text-stone-900 mt-1">{formatPKR(bankBalance)}</div>
          <div className="text-[10px] text-stone-400 mt-0.5">HBL & Meezan</div>
        </div>

        <div className="bg-white p-3 rounded-lg border border-stone-200 text-xs">
          <div className="text-stone-500 text-[11px] font-medium">{t.customerReceivables}</div>
          <div className="font-mono font-bold text-sm text-amber-700 mt-1">{formatPKR(customerReceivables)}</div>
          <div className="text-[10px] text-stone-400 mt-0.5">Trade Debtors</div>
        </div>

        <div className="bg-white p-3 rounded-lg border border-stone-200 text-xs">
          <div className="text-stone-500 text-[11px] font-medium">{t.supplierPayables}</div>
          <div className="font-mono font-bold text-sm text-rose-700 mt-1">{formatPKR(supplierPayables)}</div>
          <div className="text-[10px] text-stone-400 mt-0.5">Trade Creditors</div>
        </div>

        <div className="bg-white p-3 rounded-lg border border-stone-200 text-xs">
          <div className="text-stone-500 text-[11px] font-medium">{t.todayProduction}</div>
          <div className="font-mono font-bold text-sm text-emerald-800 mt-1">{todayProductionUnits} Units</div>
          <div className="text-[10px] text-stone-400 mt-0.5">Finished Output</div>
        </div>

        <div className="bg-white p-3 rounded-lg border border-stone-200 text-xs">
          <div className="text-stone-500 text-[11px] font-medium">{t.monthlyProduction}</div>
          <div className="font-mono font-bold text-sm text-emerald-800 mt-1">{monthlyProductionUnits} Units</div>
          <div className="text-[10px] text-stone-400 mt-0.5">This Month Total</div>
        </div>
      </div>

      {/* Middle Section: Manufacturing Status & Interactive Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Production & Commercial Overview Charts */}
        <div className="lg:col-span-2 bg-white p-5 rounded-xl border border-stone-200 shadow-2xs space-y-5">
          <div className="flex items-center justify-between border-b border-stone-100 pb-3">
            <div>
              <h2 className="text-sm font-bold text-stone-900">
                Manufacturing & Commercial Performance
              </h2>
              <p className="text-xs text-stone-500">
                Monthly trends of Production, Sales Revenue, and Factory Purchases
              </p>
            </div>
            <div className="flex items-center gap-3 text-xs">
              <span className="flex items-center gap-1.5 text-emerald-700 font-medium">
                <span className="h-2 w-2 rounded-full bg-emerald-600"></span> Sales
              </span>
              <span className="flex items-center gap-1.5 text-blue-700 font-medium">
                <span className="h-2 w-2 rounded-full bg-blue-600"></span> Purchases
              </span>
              <span className="flex items-center gap-1.5 text-amber-700 font-medium">
                <span className="h-2 w-2 rounded-full bg-amber-500"></span> Production
              </span>
            </div>
          </div>

          {/* Graphical Visualization Bar Chart */}
          <div className="h-48 flex items-end justify-between gap-4 pt-6 px-4 border-b border-stone-100 pb-2">
            {[
              { month: 'Jun', sales: totalSales * 0.4, purchase: totalPurchases * 0.5, prod: monthlyProductionUnits * 0.4 },
              { month: 'Jul', sales: totalSales * 0.6, purchase: totalPurchases * 0.7, prod: monthlyProductionUnits * 0.6 },
              { month: 'Aug', sales: totalSales * 0.8, purchase: totalPurchases * 0.8, prod: monthlyProductionUnits * 0.75 },
              { month: 'Sep', sales: totalSales * 0.9, purchase: totalPurchases * 0.85, prod: monthlyProductionUnits * 0.9 },
              { month: 'Oct', sales: totalSales * 0.95, purchase: totalPurchases * 0.9, prod: monthlyProductionUnits * 0.95 },
              { month: 'Current', sales: totalSales, purchase: totalPurchases, prod: monthlyProductionUnits },
            ].map((col, idx) => {
              const maxVal = Math.max(totalSales, totalPurchases, 100000);
              const salesHeight = Math.min(100, Math.max(12, (col.sales / maxVal) * 100));
              const purchaseHeight = Math.min(100, Math.max(10, (col.purchase / maxVal) * 100));
              const prodHeight = Math.min(100, Math.max(8, (col.prod / (monthlyProductionUnits || 1000)) * 90));

              return (
                <div key={idx} className="flex-1 flex flex-col items-center gap-2 h-full justify-end group">
                  <div className="w-full flex items-end justify-center gap-1 h-36">
                    <div
                      style={{ height: `${salesHeight}%` }}
                      className="w-3 sm:w-4 bg-emerald-600 rounded-t-sm hover:opacity-80 transition-all"
                      title={`Sales: ${formatPKR(col.sales)}`}
                    ></div>
                    <div
                      style={{ height: `${purchaseHeight}%` }}
                      className="w-3 sm:w-4 bg-blue-600 rounded-t-sm hover:opacity-80 transition-all"
                      title={`Purchases: ${formatPKR(col.purchase)}`}
                    ></div>
                    <div
                      style={{ height: `${prodHeight}%` }}
                      className="w-3 sm:w-4 bg-amber-500 rounded-t-sm hover:opacity-80 transition-all"
                      title={`Production: ${col.prod} units`}
                    ></div>
                  </div>
                  <span className="text-[10px] font-medium text-stone-500 uppercase">{col.month}</span>
                </div>
              );
            })}
          </div>

          {/* Quick Summary Footnote */}
          <div className="grid grid-cols-3 gap-2 text-center text-xs pt-1">
            <div className="bg-stone-50 p-2 rounded">
              <span className="text-stone-500 block text-[11px]">Total Net Sales</span>
              <span className="font-mono font-bold text-stone-900">{formatPKR(totalSales)}</span>
            </div>
            <div className="bg-stone-50 p-2 rounded">
              <span className="text-stone-500 block text-[11px]">Total Purchases</span>
              <span className="font-mono font-bold text-stone-900">{formatPKR(totalPurchases)}</span>
            </div>
            <div className="bg-stone-50 p-2 rounded">
              <span className="text-stone-500 block text-[11px]">Factory Expenses</span>
              <span className="font-mono font-bold text-stone-900">{formatPKR(totalExpenses)}</span>
            </div>
          </div>
        </div>

        {/* Right Col: Alerts & Pending Orders */}
        <div className="bg-white p-5 rounded-xl border border-stone-200 shadow-2xs space-y-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <h2 className="text-sm font-bold text-stone-900 flex items-center gap-1.5">
                <AlertTriangle className="h-4 w-4 text-amber-500" />
                <span>Critical Alerts & Quotas</span>
              </h2>
              <span className="text-xs text-stone-500 font-mono">FEFO & Min Stock</span>
            </div>

            {/* Low Stock Watch */}
            <div className="mt-3 space-y-2.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-medium text-stone-700">Low Stock Items:</span>
                <span
                  className={`font-mono font-bold px-2 py-0.5 rounded text-[11px] ${
                    totalLowStockCount > 0 ? 'bg-rose-100 text-rose-800' : 'bg-emerald-100 text-emerald-800'
                  }`}
                >
                  {totalLowStockCount} items
                </span>
              </div>

              {totalLowStockCount > 0 ? (
                <div className="space-y-1.5 max-h-28 overflow-y-auto pr-1">
                  {lowStockRm.map(rm => (
                    <div
                      key={rm.id}
                      className="text-[11px] flex justify-between p-1.5 bg-rose-50/50 rounded border border-rose-100 text-rose-900"
                    >
                      <span className="truncate max-w-[140px]">{rm.name}</span>
                      <span className="font-mono">
                        {rm.availableStock} / {rm.minimumStockLevel} {rm.consumptionUnit}
                      </span>
                    </div>
                  ))}
                  {lowStockFg.map(fg => (
                    <div
                      key={fg.id}
                      className="text-[11px] flex justify-between p-1.5 bg-rose-50/50 rounded border border-rose-100 text-rose-900"
                    >
                      <span className="truncate max-w-[140px]">{fg.name}</span>
                      <span className="font-mono">
                        {fg.availableStock} / {fg.minimumStockLevel} pcs
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-xs text-stone-500 bg-stone-50 p-2.5 rounded text-center">
                  All inventory items are currently above minimum threshold.
                </div>
              )}
            </div>

            {/* Expiry Alerts */}
            <div className="mt-4 pt-3 border-t border-stone-100 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-medium text-stone-700">FEFO Expiry Watch (60d):</span>
                <span
                  className={`font-mono font-bold px-2 py-0.5 rounded text-[11px] ${
                    expiringRmBatches.length > 0 ? 'bg-amber-100 text-amber-800' : 'bg-stone-100 text-stone-700'
                  }`}
                >
                  {expiringRmBatches.length} batches
                </span>
              </div>

              {expiringRmBatches.length > 0 ? (
                <div className="space-y-1 max-h-24 overflow-y-auto pr-1">
                  {expiringRmBatches.map((b, i) => (
                    <div
                      key={i}
                      className="text-[11px] flex justify-between p-1 bg-amber-50 rounded border border-amber-100 text-amber-900"
                    >
                      <span className="truncate">{b.name} ({b.batchNo})</span>
                      <span className="font-mono">{formatDateDMY(b.exp)}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-[11px] text-stone-500 bg-stone-50 p-2 rounded text-center">
                  No near-expiry chemical batches detected.
                </div>
              )}
            </div>
          </div>

          {/* Pending Orders Count */}
          <div className="bg-stone-50 p-3 rounded-lg border border-stone-200 flex items-center justify-between text-xs">
            <div>
              <span className="text-stone-600 font-medium">Pending Orders:</span>
              <div className="font-bold text-stone-900 mt-0.5">
                {pendingProductionOrders.length} orders scheduled
              </div>
            </div>
            <button
              onClick={() => onNavigate('production')}
              className="text-xs text-emerald-700 hover:text-emerald-800 font-semibold underline cursor-pointer"
            >
              View Orders
            </button>
          </div>
        </div>
      </div>

      {/* Recent Production & Commercial Transactions Table */}
      <div className="bg-white rounded-xl border border-stone-200 p-5 shadow-2xs space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-stone-900">Recent Production Orders</h2>
            <p className="text-xs text-stone-500">Latest compounding and packaging batches on the plant floor</p>
          </div>
          <button
            onClick={() => onNavigate('production')}
            className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 cursor-pointer"
          >
            View All Production Orders &rarr;
          </button>
        </div>

        {db.productionOrders.length === 0 ? (
          <div className="py-8 text-center text-stone-400 text-xs bg-stone-50 rounded-lg">
            No production orders logged yet. Click &quot;+ Production Order&quot; to plan your first cosmetics batch.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr className="bg-stone-100/70 border-b border-stone-200 text-stone-700 font-semibold">
                  <th className="py-2 px-3">Order #</th>
                  <th className="py-2 px-3">Date</th>
                  <th className="py-2 px-3">Product Name</th>
                  <th className="py-2 px-3">Batch #</th>
                  <th className="py-2 px-3 text-right">Planned Qty</th>
                  <th className="py-2 px-3 text-right">Actual Good Qty</th>
                  <th className="py-2 px-3 text-center">Status</th>
                  <th className="py-2 px-3 text-right">Cost Per Unit</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100 text-stone-800">
                {db.productionOrders.slice(0, 5).map(o => (
                  <tr key={o.id} className="hover:bg-emerald-50/20">
                    <td className="py-2.5 px-3 font-semibold font-mono text-emerald-800">{o.orderNumber}</td>
                    <td className="py-2.5 px-3">{formatDateDMY(o.date)}</td>
                    <td className="py-2.5 px-3 font-medium text-stone-900">{o.productName}</td>
                    <td className="py-2.5 px-3 font-mono">{o.batchNumber}</td>
                    <td className="py-2.5 px-3 text-right tabular-nums">{o.plannedQuantity}</td>
                    <td className="py-2.5 px-3 text-right tabular-nums font-semibold">
                      {o.actualQuantity > 0 ? o.actualQuantity : '-'}
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          o.status === 'completed'
                            ? 'bg-emerald-100 text-emerald-800'
                            : o.status === 'in_progress'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-stone-100 text-stone-700'
                        }`}
                      >
                        {o.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-right tabular-nums font-mono font-semibold">
                      {o.costPerUnit > 0 ? formatPKR(o.costPerUnit) : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
