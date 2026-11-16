import React, { useState } from 'react';
import { ERPDatabase, logAudit } from '../services/storage';
import { formatPKR, formatDateDMY } from '../utils/formatters';
import { ProductionOrder, ProductionStatus } from '../types/erp';
import { DataTable } from './common/DataTable';
import { Modal } from './common/Modal';
import { Plus, CheckCircle, Play, PackageCheck, AlertTriangle, Printer, Layers, FileSpreadsheet } from 'lucide-react';
import { calculateRequirementsFromFormula, issueMaterialsForOrder, completeProductionOrder } from '../services/production';

interface ProductionProps {
  db: ERPDatabase;
  setDb: React.Dispatch<React.SetStateAction<ERPDatabase>>;
  onPrintDocument: (data: any) => void;
}

export const Production: React.FC<ProductionProps> = ({
  db,
  setDb,
  onPrintDocument,
}) => {
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [completeModalOpen, setCompleteModalOpen] = useState(false);
  const [selectedOrderForComplete, setSelectedOrderForComplete] = useState<ProductionOrder | null>(null);

  // Form states for creating order
  const [selectedFormulaId, setSelectedFormulaId] = useState('');
  const [orderNumber, setOrderNumber] = useState('');
  const [batchNumber, setBatchNumber] = useState('');
  const [plannedQuantity, setPlannedQuantity] = useState<number>(1000);
  const [targetCompletionDate, setTargetCompletionDate] = useState(
    new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
  );
  const [supervisor, setSupervisor] = useState('Tariq Mahmood (Plant Manager)');
  const [remarks, setRemarks] = useState('');

  // Form states for completing order
  const [actualQty, setActualQty] = useState<number>(1000);
  const [wastageQty, setWastageQty] = useState<number>(20);
  const [directLabour, setDirectLabour] = useState<number>(12000);
  const [factoryOverhead, setFactoryOverhead] = useState<number>(15000);
  const [mfgDate, setMfgDate] = useState(new Date().toISOString().slice(0, 10));
  const [expDate, setExpDate] = useState(
    new Date(Date.now() + 730 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
  );

  const handleOpenCreate = () => {
    const f = db.formulas.find(item => item.status === 'approved') || db.formulas[0];
    setSelectedFormulaId(f?.id || '');
    setOrderNumber(`PRD-26-${String(db.productionOrders.length + 1).padStart(4, '0')}`);
    setBatchNumber(`LOT-${f ? f.formulaNumber.slice(4, 7) : 'BAT'}-${Date.now().toString().slice(-4)}`);
    setPlannedQuantity(f?.expectedOutputUnits || 1000);
    setTargetCompletionDate(new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10));
    setSupervisor('Tariq Mahmood (Plant Manager)');
    setRemarks('Execute compounding under strict cosmetic GMP environmental specs.');
    setCreateModalOpen(true);
  };

  const handleCreateOrder = (e: React.FormEvent) => {
    e.preventDefault();
    const formula = db.formulas.find(f => f.id === selectedFormulaId);
    if (!formula) {
      alert('Please select an approved manufacturing formula.');
      return;
    }

    const reqs = calculateRequirementsFromFormula(formula, plannedQuantity);

    const newOrder: ProductionOrder = {
      id: `ord-${Date.now()}`,
      orderNumber,
      date: new Date().toISOString().slice(0, 10),
      targetCompletionDate,
      productId: formula.productId,
      productName: formula.productName,
      formulaId: formula.id,
      formulaNumber: formula.formulaNumber,
      plannedBatchCount: Number(reqs.ratio.toFixed(2)),
      plannedQuantity,
      actualQuantity: 0,
      batchNumber,
      supervisor,
      status: 'pending',
      rawMaterialIssued: false,
      packagingIssued: false,
      rawMaterialsIssuedList: reqs.rawMaterials.map(rm => ({
        materialId: rm.materialId,
        materialName: rm.materialName,
        requiredQty: rm.requiredQty,
        issuedQty: 0,
        unit: rm.unit,
        unitCost: rm.unitCost,
      })),
      packagingIssuedList: reqs.packaging.map(p => ({
        packagingId: p.packagingId,
        packagingName: p.packagingName,
        requiredQty: p.requiredQty,
        issuedQty: 0,
        unit: p.unit,
        unitCost: p.unitCost,
      })),
      wastageQuantity: 0,
      wastagePercentage: 0,
      labourCost: reqs.labourCost,
      overheadCost: reqs.overheadCost,
      totalCost: 0,
      costPerUnit: 0,
      qcStatus: 'pending',
      remarks,
    };

    let updatedDb = { ...db, productionOrders: [newOrder, ...db.productionOrders] };
    updatedDb = logAudit(
      updatedDb,
      'Production',
      'create',
      `Created Production Order #${orderNumber} for ${newOrder.productName} (${plannedQuantity} units)`
    );
    setDb(updatedDb);
    setCreateModalOpen(false);
  };

  // Issue Materials (Deducts stock FEFO, updates order status to 'in_progress')
  const handleIssueMaterials = (order: ProductionOrder) => {
    if (confirm(`Confirm issue of raw materials and packaging from warehouse for Order #${order.orderNumber}? Stock will be reduced automatically.`)) {
      const res = issueMaterialsForOrder(db, order.id, new Date().toISOString().slice(0, 10));
      if (res.error) {
        alert(res.error);
        return;
      }
      setDb(res.updatedDb);
      alert('Materials successfully issued from warehouse! Order is now In Progress.');
    }
  };

  // Open Complete Modal
  const handleOpenComplete = (order: ProductionOrder) => {
    setSelectedOrderForComplete(order);
    setActualQty(order.plannedQuantity);
    setWastageQty(Math.round(order.plannedQuantity * 0.015));
    setDirectLabour(order.labourCost || 12000);
    setFactoryOverhead(order.overheadCost || 15000);
    setMfgDate(new Date().toISOString().slice(0, 10));
    setExpDate(new Date(Date.now() + 730 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10));
    setCompleteModalOpen(true);
  };

  // Execute Order Completion
  const handleCompleteOrder = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrderForComplete) return;

    const res = completeProductionOrder(
      db,
      selectedOrderForComplete.id,
      Number(actualQty),
      Number(wastageQty),
      Number(directLabour),
      Number(factoryOverhead),
      new Date().toISOString().slice(0, 10),
      mfgDate,
      expDate
    );

    if (res.error) {
      alert(res.error);
      return;
    }

    setDb(res.updatedDb);
    setCompleteModalOpen(false);
    setSelectedOrderForComplete(null);
    alert('Production batch completed! Finished goods added to inventory, QC certificate logged, and double-entry accounting journal voucher posted.');
  };

  // Print Batch Sheet
  const handlePrintBatchSheet = (o: ProductionOrder) => {
    onPrintDocument({
      type: 'production_sheet',
      docNumber: o.orderNumber,
      date: o.date,
      title: 'PRODUCTION BATCH RECORD & MATERIAL ISSUE NOTE',
      details: [
        { label: 'Product Name', value: o.productName },
        { label: 'Formula BOM', value: o.formulaNumber },
        { label: 'Assigned Batch No.', value: o.batchNumber },
        { label: 'Planned Output', value: `${o.plannedQuantity} Units` },
        { label: 'Actual Output', value: o.actualQuantity > 0 ? `${o.actualQuantity} Units` : 'In Production' },
        { label: 'Wastage Recorded', value: `${o.wastageQuantity} Units (${o.wastagePercentage}%)` },
        { label: 'Production Status', value: o.status.toUpperCase() },
        { label: 'Plant Supervisor', value: o.supervisor },
      ],
      tableHeaders: ['Component Type', 'Material Name', 'Required Qty', 'Issued Qty', 'Unit', 'Batch Used'],
      tableRows: [
        ...o.rawMaterialsIssuedList.map(rm => [
          'Raw Material (Chemical)',
          rm.materialName,
          rm.requiredQty,
          rm.issuedQty,
          rm.unit,
          rm.batchNumberUsed || 'Warehouse Stock',
        ]),
        ...o.packagingIssuedList.map(pkg => [
          'Packaging Component',
          pkg.packagingName,
          pkg.requiredQty,
          pkg.issuedQty,
          pkg.unit,
          'Warehouse Lot',
        ]),
      ],
      summaryRows: [
        { label: 'Raw Materials Cost', value: formatPKR(o.rawMaterialsIssuedList.reduce((s, r) => s + r.issuedQty * r.unitCost, 0)) },
        { label: 'Packaging Materials Cost', value: formatPKR(o.packagingIssuedList.reduce((s, p) => s + p.issuedQty * p.unitCost, 0)) },
        { label: 'Labour & Overhead Absorbed', value: formatPKR(o.labourCost + o.overheadCost) },
        { label: 'Total Manufacturing Cost', value: formatPKR(o.totalCost), isBold: true },
        { label: 'Actual Cost Per Unit', value: formatPKR(o.costPerUnit), isBold: true },
      ],
      narration: o.remarks || 'Standard cosmetic GMP batch manufacturing sheet with full ingredient traceability.',
      signatories: [
        'Dispensing Pharmacist',
        'Compounding Operator',
        'QC Release Chemist',
        'Plant Manager',
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
                Compounding & Packaging
              </span>
              <span className="text-xs text-stone-400">·</span>
              <span className="text-xs text-stone-500">Live Plant Floor Control</span>
            </div>
            <h1 className="text-lg font-bold text-stone-900 mt-0.5">
              Production Planning & Manufacturing
            </h1>
            <p className="text-xs text-stone-500">
              Create production batches, issue raw materials from store, monitor compounding, record wastage, and generate QC batches
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={handleOpenCreate}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-emerald-800 hover:bg-emerald-700 rounded-lg shadow-2xs transition-colors cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            <span>Create Production Order</span>
          </button>
        </div>
      </div>

      {/* Production Orders Table */}
      <DataTable<ProductionOrder>
        title="Production Orders & Batches"
        data={db.productionOrders}
        searchPlaceholder="Search orders by order #, batch #, product name, supervisor..."
        columns={[
          { header: 'Order #', accessorKey: 'orderNumber', className: 'font-mono font-bold text-emerald-800' },
          { header: 'Date', accessorKey: 'date', cell: r => formatDateDMY(r.date) },
          {
            header: 'Product & Formula',
            accessorKey: 'productName',
            cell: r => (
              <div>
                <div className="font-bold text-stone-900">{r.productName}</div>
                <div className="text-[11px] text-stone-500 font-mono">
                  BOM: {r.formulaNumber} · Lot: {r.batchNumber}
                </div>
              </div>
            ),
          },
          {
            header: 'Planned Units',
            accessorKey: 'plannedQuantity',
            align: 'right',
            cell: r => <span className="font-mono font-semibold">{r.plannedQuantity} pcs</span>,
          },
          {
            header: 'Good Output',
            accessorKey: 'actualQuantity',
            align: 'right',
            cell: r => (
              <span className="font-mono font-bold text-stone-900">
                {r.actualQuantity > 0 ? `${r.actualQuantity} pcs` : '-'}
              </span>
            ),
          },
          {
            header: 'Material Issued',
            align: 'center',
            cell: r => (
              <span
                className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                  r.rawMaterialIssued ? 'bg-emerald-100 text-emerald-800' : 'bg-stone-100 text-stone-600'
                }`}
              >
                {r.rawMaterialIssued ? 'Issued' : 'Pending'}
              </span>
            ),
          },
          {
            header: 'Status',
            accessorKey: 'status',
            align: 'center',
            cell: r => (
              <span
                className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                  r.status === 'completed'
                    ? 'bg-emerald-100 text-emerald-800'
                    : r.status === 'in_progress'
                    ? 'bg-amber-100 text-amber-800'
                    : 'bg-stone-100 text-stone-700'
                }`}
              >
                {r.status.replace('_', ' ')}
              </span>
            ),
          },
          {
            header: 'Unit Cost',
            accessorKey: 'costPerUnit',
            align: 'right',
            cell: r => (
              <span className="font-mono font-bold text-emerald-800">
                {r.costPerUnit > 0 ? formatPKR(r.costPerUnit) : '-'}
              </span>
            ),
          },
          {
            header: 'Actions',
            align: 'center',
            cell: r => (
              <div className="flex items-center justify-center gap-1.5">
                {!r.rawMaterialIssued && (
                  <button
                    onClick={() => handleIssueMaterials(r)}
                    className="px-2 py-1 text-[11px] font-semibold text-amber-900 bg-amber-100 hover:bg-amber-200 rounded border border-amber-300 cursor-pointer"
                    title="Issue Raw Materials & Packaging"
                  >
                    Issue Stock
                  </button>
                )}

                {r.rawMaterialIssued && r.status !== 'completed' && (
                  <button
                    onClick={() => handleOpenComplete(r)}
                    className="px-2 py-1 text-[11px] font-semibold text-emerald-900 bg-emerald-100 hover:bg-emerald-200 rounded border border-emerald-300 cursor-pointer flex items-center gap-1"
                    title="Complete Production & Send to QC"
                  >
                    <PackageCheck className="h-3 w-3" />
                    <span>Complete</span>
                  </button>
                )}

                <button
                  onClick={() => handlePrintBatchSheet(r)}
                  className="p-1 text-stone-600 hover:text-emerald-700 hover:bg-stone-100 rounded cursor-pointer"
                  title="Print Batch Sheet & Material Note"
                >
                  <Printer className="h-3.5 w-3.5" />
                </button>
              </div>
            ),
          },
        ]}
      />

      {/* MODAL: Create Production Order */}
      <Modal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        title="Create New Cosmetics Production Order"
        subtitle="Automatic ingredient scaling, availability check, and batch allocation"
        maxWidth="3xl"
      >
        <form onSubmit={handleCreateOrder} className="space-y-4 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-stone-700 mb-1">
                Select Approved Manufacturing Formula *
              </label>
              <select
                required
                value={selectedFormulaId}
                onChange={e => {
                  setSelectedFormulaId(e.target.value);
                  const f = db.formulas.find(item => item.id === e.target.value);
                  if (f) {
                    setPlannedQuantity(f.expectedOutputUnits || 1000);
                  }
                }}
                className="w-full p-2 border border-stone-300 rounded font-medium bg-white"
              >
                <option value="">-- Choose Formula --</option>
                {db.formulas.map(f => (
                  <option key={f.id} value={f.id}>
                    {f.productName} ({f.formulaNumber} - {f.version})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-semibold text-stone-700 mb-1">Production Order # *</label>
              <input
                type="text"
                required
                value={orderNumber}
                onChange={e => setOrderNumber(e.target.value)}
                className="w-full p-2 border border-stone-300 rounded font-mono bg-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block font-semibold text-stone-700 mb-1">Batch / Lot Number *</label>
              <input
                type="text"
                required
                value={batchNumber}
                onChange={e => setBatchNumber(e.target.value)}
                className="w-full p-2 border border-stone-300 rounded font-mono font-bold text-emerald-900 bg-white"
              />
            </div>
            <div>
              <label className="block font-semibold text-stone-700 mb-1">
                Planned Output (Units) *
              </label>
              <input
                type="number"
                required
                value={plannedQuantity}
                onChange={e => setPlannedQuantity(Math.max(1, Number(e.target.value)))}
                className="w-full p-2 border border-stone-300 rounded font-mono font-bold bg-white"
              />
            </div>
            <div>
              <label className="block font-semibold text-stone-700 mb-1">Target Completion Date</label>
              <input
                type="date"
                value={targetCompletionDate}
                onChange={e => setTargetCompletionDate(e.target.value)}
                className="w-full p-2 border border-stone-300 rounded font-mono bg-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-stone-700 mb-1">Production Supervisor</label>
              <input
                type="text"
                value={supervisor}
                onChange={e => setSupervisor(e.target.value)}
                className="w-full p-2 border border-stone-300 rounded bg-white"
              />
            </div>
            <div>
              <label className="block font-semibold text-stone-700 mb-1">Remarks / Quality Instructions</label>
              <input
                type="text"
                value={remarks}
                onChange={e => setRemarks(e.target.value)}
                className="w-full p-2 border border-stone-300 rounded bg-white"
              />
            </div>
          </div>

          {/* Dynamic Requirements Preview */}
          {selectedFormulaId && (
            <div className="bg-stone-50 p-3 rounded-lg border border-stone-200">
              <span className="font-bold text-stone-800 block mb-1">
                Material Requirements Preview:
              </span>
              {(() => {
                const f = db.formulas.find(item => item.id === selectedFormulaId);
                if (!f) return null;
                const reqs = calculateRequirementsFromFormula(f, plannedQuantity);
                return (
                  <div className="text-[11px] space-y-1">
                    <div className="text-stone-600">
                      Total Raw Materials: <span className="font-bold">{reqs.rawMaterials.length} items</span> ({formatPKR(reqs.estimatedRmCost)}) · Packaging: <span className="font-bold">{reqs.packaging.length} items</span> ({formatPKR(reqs.estimatedPkgCost)})
                    </div>
                    <div className="font-mono text-emerald-800 font-bold">
                      Est. Total Batch Cost: {formatPKR(reqs.totalCost)} (Est. {formatPKR(reqs.costPerUnit)} / unit)
                    </div>
                  </div>
                );
              })()}
            </div>
          )}

          <div className="pt-3 border-t border-stone-200 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setCreateModalOpen(false)}
              className="px-4 py-2 border border-stone-300 rounded text-stone-700 hover:bg-stone-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-emerald-800 text-white rounded font-medium hover:bg-emerald-700 shadow-xs"
            >
              Create Production Order
            </button>
          </div>
        </form>
      </Modal>

      {/* MODAL: Complete Production Order */}
      <Modal
        isOpen={completeModalOpen}
        onClose={() => setCompleteModalOpen(false)}
        title={`Complete Production Order · ${selectedOrderForComplete?.orderNumber}`}
        subtitle="Log actual production yield, wastage, labor cost, and transfer to QC"
        maxWidth="2xl"
      >
        <form onSubmit={handleCompleteOrder} className="space-y-4 text-xs">
          <div className="bg-stone-50 p-3 rounded-lg border border-stone-200">
            <div className="font-bold text-stone-900 text-sm">{selectedOrderForComplete?.productName}</div>
            <div className="text-stone-500 font-mono mt-0.5">
              Assigned Batch: {selectedOrderForComplete?.batchNumber} · Planned: {selectedOrderForComplete?.plannedQuantity} pcs
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-stone-700 mb-1">
                Actual Good Production Output (Units) *
              </label>
              <input
                type="number"
                required
                value={actualQty}
                onChange={e => setActualQty(Math.max(1, Number(e.target.value)))}
                className="w-full p-2 border border-stone-300 rounded font-mono font-bold text-base text-emerald-900 bg-white"
              />
            </div>
            <div>
              <label className="block font-semibold text-stone-700 mb-1">
                Production Wastage / Spoilage (Units)
              </label>
              <input
                type="number"
                value={wastageQty}
                onChange={e => setWastageQty(Math.max(0, Number(e.target.value)))}
                className="w-full p-2 border border-stone-300 rounded font-mono text-rose-700 bg-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-stone-700 mb-1">Actual Direct Labour (PKR)</label>
              <input
                type="number"
                value={directLabour}
                onChange={e => setDirectLabour(Number(e.target.value))}
                className="w-full p-2 border border-stone-300 rounded font-mono bg-white"
              />
            </div>
            <div>
              <label className="block font-semibold text-stone-700 mb-1">Factory Overhead & Utilities (PKR)</label>
              <input
                type="number"
                value={factoryOverhead}
                onChange={e => setFactoryOverhead(Number(e.target.value))}
                className="w-full p-2 border border-stone-300 rounded font-mono bg-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-stone-700 mb-1">Manufacturing Date</label>
              <input
                type="date"
                value={mfgDate}
                onChange={e => setMfgDate(e.target.value)}
                className="w-full p-2 border border-stone-300 rounded font-mono bg-white"
              />
            </div>
            <div>
              <label className="block font-semibold text-stone-700 mb-1">Expiry Date (FEFO)</label>
              <input
                type="date"
                value={expDate}
                onChange={e => setExpDate(e.target.value)}
                className="w-full p-2 border border-stone-300 rounded font-mono bg-white"
              />
            </div>
          </div>

          <div className="pt-3 border-t border-stone-200 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setCompleteModalOpen(false)}
              className="px-4 py-2 border border-stone-300 rounded text-stone-700 hover:bg-stone-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-emerald-800 text-white rounded font-medium hover:bg-emerald-700 shadow-xs"
            >
              Confirm Completion & Post to Accounts
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
