import React from 'react';
import { ERPDatabase } from '../services/storage';
import { formatPKR, formatDateDMY } from '../utils/formatters';
import { DataTable } from './common/DataTable';
import { Calculator, TrendingUp, AlertTriangle, CheckCircle2, Layers } from 'lucide-react';

interface ManufacturingCostingProps {
  db: ERPDatabase;
  onPrintDocument: (data: any) => void;
}

export const ManufacturingCosting: React.FC<ManufacturingCostingProps> = ({
  db,
  onPrintDocument,
}) => {
  // Compute batch costing analytics for completed and active orders
  const costedBatches = db.productionOrders.map(order => {
    const rmCost = order.rawMaterialsIssuedList.reduce((sum, r) => sum + r.issuedQty * r.unitCost, 0);
    const pkgCost = order.packagingIssuedList.reduce((sum, p) => sum + p.issuedQty * p.unitCost, 0);
    const labourCost = order.labourCost || 0;
    const overheadCost = order.overheadCost || 0;
    const totalCost = rmCost + pkgCost + labourCost + overheadCost;
    const actualUnits = order.actualQuantity > 0 ? order.actualQuantity : order.plannedQuantity;
    const unitCost = actualUnits > 0 ? totalCost / actualUnits : 0;

    // Standard formula cost comparison
    const formula = db.formulas.find(f => f.id === order.formulaId);
    const stdUnitCost = formula?.costPerUnit || unitCost;
    const costVariance = unitCost - stdUnitCost;
    const variancePercent = stdUnitCost > 0 ? (costVariance / stdUnitCost) * 100 : 0;

    return {
      orderNumber: order.orderNumber,
      date: order.date,
      batchNumber: order.batchNumber,
      productName: order.productName,
      status: order.status,
      plannedQuantity: order.plannedQuantity,
      actualQuantity: order.actualQuantity,
      wastageQuantity: order.wastageQuantity,
      rmCost,
      pkgCost,
      labourCost,
      overheadCost,
      totalCost,
      unitCost,
      stdUnitCost,
      costVariance,
      variancePercent,
    };
  });

  const totalRmSpent = costedBatches.reduce((s, b) => s + b.rmCost, 0);
  const totalPkgSpent = costedBatches.reduce((s, b) => s + b.pkgCost, 0);
  const totalLabourSpent = costedBatches.reduce((s, b) => s + b.labourCost, 0);
  const totalOverheadSpent = costedBatches.reduce((s, b) => s + b.overheadCost, 0);
  const grandManufacturingCost = totalRmSpent + totalPkgSpent + totalLabourSpent + totalOverheadSpent;

  return (
    <div className="space-y-5">
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
                Cost Accounting & Variance
              </span>
              <span className="text-xs text-stone-400">·</span>
              <span className="text-xs text-stone-500">Standard vs. Actual Batch Costing</span>
            </div>
            <h1 className="text-lg font-bold text-stone-900 mt-0.5">
              Manufacturing Costing & Absorption
            </h1>
            <p className="text-xs text-stone-500">
              Raw material absorption, packaging allocation, direct labor, factory overhead, and per-unit production cost derivation
            </p>
          </div>
        </div>
      </div>

      {/* Aggregate Cost Absorption KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        <div className="bg-white p-3.5 rounded-xl border border-stone-200 shadow-2xs text-xs">
          <span className="text-stone-500 font-medium text-[11px] block">Raw Materials Consumed</span>
          <span className="font-mono font-bold text-base text-stone-900 mt-1 block">
            {formatPKR(totalRmSpent)}
          </span>
          <span className="text-[10px] text-stone-400">
            {grandManufacturingCost > 0 ? `${((totalRmSpent / grandManufacturingCost) * 100).toFixed(1)}% of total` : '0%'}
          </span>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-stone-200 shadow-2xs text-xs">
          <span className="text-stone-500 font-medium text-[11px] block">Packaging Material Cost</span>
          <span className="font-mono font-bold text-base text-stone-900 mt-1 block">
            {formatPKR(totalPkgSpent)}
          </span>
          <span className="text-[10px] text-stone-400">
            {grandManufacturingCost > 0 ? `${((totalPkgSpent / grandManufacturingCost) * 100).toFixed(1)}% of total` : '0%'}
          </span>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-stone-200 shadow-2xs text-xs">
          <span className="text-stone-500 font-medium text-[11px] block">Direct Factory Labour</span>
          <span className="font-mono font-bold text-base text-stone-900 mt-1 block">
            {formatPKR(totalLabourSpent)}
          </span>
          <span className="text-[10px] text-stone-400">Operators & Chemists</span>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-stone-200 shadow-2xs text-xs">
          <span className="text-stone-500 font-medium text-[11px] block">Factory Overhead & Power</span>
          <span className="font-mono font-bold text-base text-stone-900 mt-1 block">
            {formatPKR(totalOverheadSpent)}
          </span>
          <span className="text-[10px] text-stone-400">MEPCO Electricity & Steam</span>
        </div>

        <div className="bg-emerald-900 text-white p-3.5 rounded-xl shadow-2xs text-xs">
          <span className="text-emerald-300 font-medium text-[11px] block">Total Manufacturing Cost</span>
          <span className="font-mono font-bold text-base text-white mt-1 block">
            {formatPKR(grandManufacturingCost)}
          </span>
          <span className="text-[10px] text-emerald-200">Absorbed in finished goods</span>
        </div>
      </div>

      {/* Cost Breakdown Table */}
      <DataTable
        title="Batch Costing Register & Variance"
        data={costedBatches}
        searchPlaceholder="Search batches by batch #, product name..."
        columns={[
          { header: 'Order #', accessorKey: 'orderNumber', className: 'font-mono font-bold text-emerald-800' },
          { header: 'Product Name', accessorKey: 'productName', className: 'font-bold text-stone-900' },
          { header: 'Batch #', accessorKey: 'batchNumber', className: 'font-mono font-semibold' },
          { header: 'Good Qty', accessorKey: 'actualQuantity', align: 'right', cell: (r: any) => `${r.actualQuantity || r.plannedQuantity} pcs` },
          { header: 'RM Cost', accessorKey: 'rmCost', align: 'right', cell: (r: any) => formatPKR(r.rmCost) },
          { header: 'Pkg Cost', accessorKey: 'pkgCost', align: 'right', cell: (r: any) => formatPKR(r.pkgCost) },
          { header: 'Labour & Utilities', align: 'right', cell: (r: any) => formatPKR(r.labourCost + r.overheadCost) },
          {
            header: 'Total Batch Cost',
            accessorKey: 'totalCost',
            align: 'right',
            cell: (r: any) => <span className="font-mono font-bold text-stone-900">{formatPKR(r.totalCost)}</span>,
          },
          {
            header: 'Actual Cost / Unit',
            accessorKey: 'unitCost',
            align: 'right',
            cell: (r: any) => <span className="font-mono font-bold text-emerald-900">{formatPKR(r.unitCost)}</span>,
          },
          {
            header: 'Variance',
            align: 'right',
            cell: (r: any) => {
              const isUnfavorable = r.costVariance > 0.05;
              return (
                <span
                  className={`font-mono text-[11px] font-bold ${
                    isUnfavorable ? 'text-rose-700' : 'text-emerald-700'
                  }`}
                >
                  {isUnfavorable ? `+${formatPKR(r.costVariance)}` : `-${formatPKR(Math.abs(r.costVariance))}`}
                </span>
              );
            },
          },
        ]}
      />
    </div>
  );
};
