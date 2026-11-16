import React, { useState } from 'react';
import { ERPDatabase, logAudit } from '../services/storage';
import { formatPKR, formatDateDMY } from '../utils/formatters';
import { ManufacturingFormula, FormulaIngredient, FormulaPackagingItem } from '../types/erp';
import { DataTable } from './common/DataTable';
import { Modal } from './common/Modal';
import { Plus, Edit, Trash2, ScrollText, CheckCircle2, Calculator, Layers, Printer } from 'lucide-react';
import { calculateRequirementsFromFormula } from '../services/production';

interface FormulaBOMProps {
  db: ERPDatabase;
  setDb: React.Dispatch<React.SetStateAction<ERPDatabase>>;
  onPrintDocument: (data: any) => void;
  onPlanProductionOrder?: (formulaId: string) => void;
}

export const FormulaBOM: React.FC<FormulaBOMProps> = ({
  db,
  setDb,
  onPrintDocument,
  onPlanProductionOrder,
}) => {
  const [modalOpen, setModalOpen] = useState(false);
  const [editingFormula, setEditingFormula] = useState<ManufacturingFormula | null>(null);

  // Scaling Calculator Modal
  const [calcModalOpen, setCalcModalOpen] = useState(false);
  const [calcFormula, setCalcFormula] = useState<ManufacturingFormula | null>(null);
  const [targetBatchUnits, setTargetBatchUnits] = useState<number>(2000);

  // Form states
  const [productId, setProductId] = useState('');
  const [formulaNumber, setFormulaNumber] = useState('');
  const [version, setVersion] = useState('v1.0 (Standard Approved)');
  const [batchSize, setBatchSize] = useState(100);
  const [batchUnit, setBatchUnit] = useState('KG');
  const [expectedOutputUnits, setExpectedOutputUnits] = useState(2000);
  const [standardWastagePercentage, setStandardWastagePercentage] = useState(2);
  const [status, setStatus] = useState<'draft' | 'approved' | 'archived'>('approved');
  const [labourCost, setLabourCost] = useState(12000);
  const [overheadCost, setOverheadCost] = useState(15000);
  const [otherExpenses, setOtherExpenses] = useState(5000);
  const [notes, setNotes] = useState('');

  // Formula Ingredients line items
  const [ingredients, setIngredients] = useState<FormulaIngredient[]>([]);
  // Formula Packaging line items
  const [packagingItems, setPackagingItems] = useState<FormulaPackagingItem[]>([]);

  // Open Add Modal
  const handleOpenAdd = () => {
    setEditingFormula(null);
    const prod = db.finishedProducts[0];
    setProductId(prod?.id || '');
    setFormulaNumber(`BOM-SAT-${String(db.formulas.length + 1).padStart(3, '0')}`);
    setVersion('v1.0 (Approved)');
    setBatchSize(100);
    setBatchUnit('KG');
    setExpectedOutputUnits(2000);
    setStandardWastagePercentage(2);
    setStatus('approved');
    setLabourCost(12000);
    setOverheadCost(15000);
    setOtherExpenses(5000);
    setNotes('Standard GMP certified cosmetics emulsification & compounding batch.');
    setIngredients([]);
    setPackagingItems([]);
    setModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEdit = (f: ManufacturingFormula) => {
    setEditingFormula(f);
    setProductId(f.productId);
    setFormulaNumber(f.formulaNumber);
    setVersion(f.version);
    setBatchSize(f.batchSize);
    setBatchUnit(f.batchUnit);
    setExpectedOutputUnits(f.expectedOutputUnits);
    setStandardWastagePercentage(f.standardWastagePercentage);
    setStatus(f.status);
    setLabourCost(f.labourCost);
    setOverheadCost(f.overheadCost);
    setOtherExpenses(f.otherExpenses);
    setNotes(f.notes || '');
    setIngredients([...f.ingredients]);
    setPackagingItems([...f.packagingItems]);
    setModalOpen(true);
  };

  // Add Ingredient Row
  const handleAddIngredientRow = () => {
    if (db.rawMaterials.length === 0) {
      alert('Please add raw materials first in the Raw Materials module.');
      return;
    }
    const rm = db.rawMaterials[0];
    setIngredients([
      ...ingredients,
      {
        rawMaterialId: rm.id,
        rawMaterialName: rm.name,
        quantity: 10,
        unit: rm.consumptionUnit,
        percentage: 10,
        unitCost: rm.averageCost || rm.purchaseRate || 500,
        totalCost: 10 * (rm.averageCost || rm.purchaseRate || 500),
      },
    ]);
  };

  // Add Packaging Row
  const handleAddPackagingRow = () => {
    if (db.packagingMaterials.length === 0) {
      alert('Please add packaging materials first in the Packaging module.');
      return;
    }
    const pkg = db.packagingMaterials[0];
    setPackagingItems([
      ...packagingItems,
      {
        packagingMaterialId: pkg.id,
        packagingMaterialName: pkg.name,
        quantity: expectedOutputUnits || 1000,
        unit: pkg.unit,
        unitCost: pkg.purchaseRate || 25,
        totalCost: (expectedOutputUnits || 1000) * (pkg.purchaseRate || 25),
      },
    ]);
  };

  // Calculations for current form
  const currentTotalRmCost = ingredients.reduce((sum, ing) => sum + (ing.totalCost || 0), 0);
  const currentTotalPkgCost = packagingItems.reduce((sum, pkg) => sum + (pkg.totalCost || 0), 0);
  const currentTotalCost =
    currentTotalRmCost + currentTotalPkgCost + Number(labourCost) + Number(overheadCost) + Number(otherExpenses);
  const currentCostPerUnit =
    expectedOutputUnits > 0 ? Number((currentTotalCost / expectedOutputUnits).toFixed(2)) : 0;

  // Save Formula
  const handleSaveFormula = (e: React.FormEvent) => {
    e.preventDefault();
    if (!productId || !formulaNumber) {
      alert('Please select a product and formula number.');
      return;
    }
    const prod = db.finishedProducts.find(p => p.id === productId);

    const newFormula: ManufacturingFormula = {
      id: editingFormula ? editingFormula.id : `form-${Date.now()}`,
      formulaNumber,
      version,
      productId,
      productName: prod?.name || 'Cosmetic Product',
      batchSize: Number(batchSize),
      batchUnit,
      expectedOutputUnits: Number(expectedOutputUnits),
      standardWastagePercentage: Number(standardWastagePercentage),
      status,
      approvedBy: status === 'approved' ? 'Chief Chemist / Production Manager' : undefined,
      approvedDate: status === 'approved' ? new Date().toISOString().slice(0, 10) : undefined,
      ingredients,
      packagingItems,
      labourCost: Number(labourCost),
      overheadCost: Number(overheadCost),
      otherExpenses: Number(otherExpenses),
      totalEstimatedCost: currentTotalCost,
      costPerUnit: currentCostPerUnit,
      notes,
    };

    if (editingFormula) {
      const updated = db.formulas.map(f => (f.id === editingFormula.id ? newFormula : f));
      let updatedDb = { ...db, formulas: updated };
      updatedDb = logAudit(updatedDb, 'Formula/BOM', 'update', `Updated formula ${formulaNumber}`);
      setDb(updatedDb);
    } else {
      let updatedDb = { ...db, formulas: [...db.formulas, newFormula] };
      updatedDb = logAudit(updatedDb, 'Formula/BOM', 'create', `Created formula ${formulaNumber} for ${newFormula.productName}`);
      setDb(updatedDb);
    }

    setModalOpen(false);
  };

  const handleDelete = (f: ManufacturingFormula) => {
    if (confirm(`Delete formula ${f.formulaNumber}?`)) {
      const updated = db.formulas.filter(item => item.id !== f.id);
      let updatedDb = { ...db, formulas: updated };
      updatedDb = logAudit(updatedDb, 'Formula/BOM', 'delete', `Deleted formula ${f.formulaNumber}`);
      setDb(updatedDb);
    }
  };

  // Print Formula Sheet
  const handlePrintFormula = (f: ManufacturingFormula) => {
    onPrintDocument({
      type: 'production_sheet',
      docNumber: f.formulaNumber,
      date: f.approvedDate || new Date().toISOString(),
      title: 'MANUFACTURING FORMULA & BILL OF MATERIALS (BOM)',
      details: [
        { label: 'Finished Product', value: f.productName },
        { label: 'Version', value: f.version },
        { label: 'Standard Batch Size', value: `${f.batchSize} ${f.batchUnit}` },
        { label: 'Expected Finished Units', value: `${f.expectedOutputUnits} Pcs` },
        { label: 'Approval Status', value: f.status.toUpperCase() },
        { label: 'Approved By', value: f.approvedBy || 'Pending' },
        { label: 'Standard Wastage', value: `${f.standardWastagePercentage}%` },
        { label: 'Unit Production Cost', value: formatPKR(f.costPerUnit) },
      ],
      tableHeaders: ['Component Type', 'Material Name', 'Batch Qty', 'Unit', '% Comp', 'Unit Cost', 'Total Cost'],
      tableRows: [
        ...f.ingredients.map(ing => [
          'Raw Material / Active',
          ing.rawMaterialName,
          ing.quantity,
          ing.unit,
          `${ing.percentage}%`,
          ing.unitCost,
          ing.totalCost,
        ]),
        ...f.packagingItems.map(pkg => [
          'Packaging Component',
          pkg.packagingMaterialName,
          pkg.quantity,
          pkg.unit,
          '-',
          pkg.unitCost,
          pkg.totalCost,
        ]),
      ],
      summaryRows: [
        { label: 'Raw Materials Cost', value: formatPKR(f.ingredients.reduce((s, i) => s + i.totalCost, 0)) },
        { label: 'Packaging Materials Cost', value: formatPKR(f.packagingItems.reduce((s, p) => s + p.totalCost, 0)) },
        { label: 'Direct Labour & Utilities', value: formatPKR(f.labourCost + f.overheadCost + f.otherExpenses) },
        { label: 'Total Estimated Batch Cost', value: formatPKR(f.totalEstimatedCost), isBold: true },
        { label: 'Cost Per Finished Unit', value: formatPKR(f.costPerUnit), isBold: true },
      ],
      narration: f.notes || 'Strict adherence to compounding temperatures and mixing order required.',
      signatories: [
        'Formulation Chemist',
        'QC Manager',
        'Plant Operations Head',
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
                R&D & Compounding Recipes
              </span>
              <span className="text-xs text-stone-400">·</span>
              <span className="text-xs text-stone-500">Bill of Materials (BOM)</span>
            </div>
            <h1 className="text-lg font-bold text-stone-900 mt-0.5">
              Manufacturing Formula / BOM Management
            </h1>
            <p className="text-xs text-stone-500">
              Precision recipe management, ingredient percentage, automated ingredient requirement scaling, and cost derivation
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={handleOpenAdd}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-emerald-800 hover:bg-emerald-700 rounded-lg shadow-2xs transition-colors cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            <span>Create New Formula</span>
          </button>
        </div>
      </div>

      {/* Formulas Table */}
      <DataTable<ManufacturingFormula>
        title="Manufacturing Formulas"
        data={db.formulas}
        searchPlaceholder="Search formulas by formula number, product name, version..."
        columns={[
          { header: 'Formula #', accessorKey: 'formulaNumber', className: 'font-mono font-bold text-emerald-800' },
          {
            header: 'Product Name',
            accessorKey: 'productName',
            cell: r => (
              <div>
                <div className="font-bold text-stone-900">{r.productName}</div>
                <div className="text-[11px] text-stone-500 font-mono">{r.version}</div>
              </div>
            ),
          },
          {
            header: 'Batch Size',
            cell: r => (
              <span className="font-mono font-semibold">
                {r.batchSize} {r.batchUnit} &rarr; {r.expectedOutputUnits} units
              </span>
            ),
          },
          {
            header: 'Ingredients Count',
            cell: r => (
              <span className="text-stone-600">
                {r.ingredients.length} Chemicals · {r.packagingItems.length} Pkg
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
                  r.status === 'approved'
                    ? 'bg-emerald-100 text-emerald-800'
                    : r.status === 'draft'
                    ? 'bg-stone-100 text-stone-700'
                    : 'bg-rose-100 text-rose-800'
                }`}
              >
                {r.status}
              </span>
            ),
          },
          {
            header: 'Total Batch Cost',
            accessorKey: 'totalEstimatedCost',
            align: 'right',
            cell: r => formatPKR(r.totalEstimatedCost),
          },
          {
            header: 'Cost / Unit',
            accessorKey: 'costPerUnit',
            align: 'right',
            cell: r => <span className="font-mono font-bold text-emerald-800">{formatPKR(r.costPerUnit)}</span>,
          },
          {
            header: 'Actions',
            align: 'center',
            cell: r => (
              <div className="flex items-center justify-center gap-1">
                <button
                  onClick={() => {
                    setCalcFormula(r);
                    setTargetBatchUnits(r.expectedOutputUnits || 1000);
                    setCalcModalOpen(true);
                  }}
                  className="px-2 py-1 text-[11px] font-medium text-amber-900 bg-amber-50 hover:bg-amber-100 rounded border border-amber-200 cursor-pointer flex items-center gap-1"
                  title="Scale Ingredient Requirements"
                >
                  <Calculator className="h-3 w-3" />
                  <span>Scale</span>
                </button>
                <button
                  onClick={() => handlePrintFormula(r)}
                  className="p-1 text-stone-600 hover:text-emerald-700 hover:bg-stone-100 rounded cursor-pointer"
                  title="Print Formula Sheet"
                >
                  <Printer className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() => handleOpenEdit(r)}
                  className="p-1 text-stone-600 hover:text-emerald-700 hover:bg-stone-100 rounded cursor-pointer"
                  title="Edit"
                >
                  <Edit className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() => handleDelete(r)}
                  className="p-1 text-stone-400 hover:text-rose-700 hover:bg-stone-100 rounded cursor-pointer"
                  title="Delete"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ),
          },
        ]}
      />

      {/* MODAL: Add / Edit Formula */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingFormula ? 'Edit Formula / BOM' : 'Create Manufacturing Formula (BOM)'}
        subtitle="Specify exact chemical ingredients, packaging components, and labor/overhead"
        maxWidth="5xl"
      >
        <form onSubmit={handleSaveFormula} className="space-y-4 text-xs">
          {/* Header Specifications */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 bg-stone-50 p-3 rounded-lg border border-stone-200">
            <div>
              <label className="block font-semibold text-stone-700 mb-1">Finished Product *</label>
              <select
                required
                value={productId}
                onChange={e => setProductId(e.target.value)}
                className="w-full p-2 border border-stone-300 rounded font-medium bg-white"
              >
                <option value="">-- Select Product --</option>
                {db.finishedProducts.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.size})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-semibold text-stone-700 mb-1">Formula Number *</label>
              <input
                type="text"
                required
                value={formulaNumber}
                onChange={e => setFormulaNumber(e.target.value)}
                className="w-full p-2 border border-stone-300 rounded font-mono bg-white"
              />
            </div>

            <div>
              <label className="block font-semibold text-stone-700 mb-1">Version & Approval</label>
              <input
                type="text"
                value={version}
                onChange={e => setVersion(e.target.value)}
                className="w-full p-2 border border-stone-300 rounded bg-white"
              />
            </div>

            <div>
              <label className="block font-semibold text-stone-700 mb-1">Status</label>
              <select
                value={status}
                onChange={e => setStatus(e.target.value as any)}
                className="w-full p-2 border border-stone-300 rounded font-semibold bg-white"
              >
                <option value="draft">Draft / Testing</option>
                <option value="approved">Approved for Production</option>
                <option value="archived">Archived / Deprecated</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold text-stone-700 mb-1">Batch Compounding Size</label>
              <div className="flex gap-1">
                <input
                  type="number"
                  value={batchSize}
                  onChange={e => setBatchSize(Number(e.target.value))}
                  className="w-full p-2 border border-stone-300 rounded font-mono bg-white"
                />
                <select
                  value={batchUnit}
                  onChange={e => setBatchUnit(e.target.value)}
                  className="p-2 border border-stone-300 rounded font-mono bg-white"
                >
                  <option value="KG">KG</option>
                  <option value="L">L</option>
                  <option value="Gram">Gram</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block font-semibold text-stone-700 mb-1">Expected Finished Units</label>
              <input
                type="number"
                value={expectedOutputUnits}
                onChange={e => setExpectedOutputUnits(Number(e.target.value))}
                className="w-full p-2 border border-stone-300 rounded font-mono font-bold text-emerald-800 bg-white"
                placeholder="e.g. 2000 jars"
              />
            </div>

            <div>
              <label className="block font-semibold text-stone-700 mb-1">Standard Wastage %</label>
              <input
                type="number"
                step="0.1"
                value={standardWastagePercentage}
                onChange={e => setStandardWastagePercentage(Number(e.target.value))}
                className="w-full p-2 border border-stone-300 rounded font-mono bg-white"
              />
            </div>

            <div>
              <label className="block font-semibold text-stone-700 mb-1">Direct Labour Cost (PKR)</label>
              <input
                type="number"
                value={labourCost}
                onChange={e => setLabourCost(Number(e.target.value))}
                className="w-full p-2 border border-stone-300 rounded font-mono bg-white"
              />
            </div>
          </div>

          {/* Section 1: Chemical Ingredients */}
          <div className="border border-stone-200 rounded-lg p-3 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-stone-900 text-xs">
                1. Raw Material & Chemical Ingredients
              </span>
              <button
                type="button"
                onClick={handleAddIngredientRow}
                className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-800 hover:text-emerald-900 bg-emerald-50 px-2 py-1 rounded border border-emerald-200 cursor-pointer"
              >
                <Plus className="h-3 w-3" />
                <span>Add Ingredient</span>
              </button>
            </div>

            {ingredients.length === 0 ? (
              <div className="py-3 text-center text-stone-400 text-xs italic">
                No chemical ingredients added. Click &quot;Add Ingredient&quot; to choose raw materials from your master database.
              </div>
            ) : (
              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {ingredients.map((ing, idx) => (
                  <div key={idx} className="grid grid-cols-12 gap-2 items-center bg-stone-50 p-2 rounded border border-stone-200 text-xs">
                    <div className="col-span-4">
                      <select
                        value={ing.rawMaterialId}
                        onChange={e => {
                          const rm = db.rawMaterials.find(m => m.id === e.target.value);
                          if (rm) {
                            const updated = [...ingredients];
                            updated[idx] = {
                              ...updated[idx],
                              rawMaterialId: rm.id,
                              rawMaterialName: rm.name,
                              unit: rm.consumptionUnit,
                              unitCost: rm.averageCost || rm.purchaseRate || 500,
                              totalCost: updated[idx].quantity * (rm.averageCost || rm.purchaseRate || 500),
                            };
                            setIngredients(updated);
                          }
                        }}
                        className="w-full p-1.5 border border-stone-300 rounded font-medium bg-white"
                      >
                        {db.rawMaterials.map(rm => (
                          <option key={rm.id} value={rm.id}>
                            {rm.name} ({rm.category})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="col-span-2">
                      <input
                        type="number"
                        step="0.01"
                        placeholder="Quantity"
                        value={ing.quantity}
                        onChange={e => {
                          const qty = Number(e.target.value);
                          const updated = [...ingredients];
                          const pct = batchSize > 0 ? Number(((qty / batchSize) * 100).toFixed(2)) : 0;
                          updated[idx] = {
                            ...updated[idx],
                            quantity: qty,
                            percentage: pct,
                            totalCost: qty * updated[idx].unitCost,
                          };
                          setIngredients(updated);
                        }}
                        className="w-full p-1.5 border border-stone-300 rounded font-mono bg-white"
                      />
                    </div>

                    <div className="col-span-1 text-center font-mono text-stone-600">
                      {ing.unit}
                    </div>

                    <div className="col-span-2 text-right font-mono text-stone-600">
                      Rate: {formatPKR(ing.unitCost)}
                    </div>

                    <div className="col-span-2 text-right font-mono font-bold text-stone-900">
                      {formatPKR(ing.totalCost)}
                    </div>

                    <div className="col-span-1 text-center">
                      <button
                        type="button"
                        onClick={() => setIngredients(ingredients.filter((_, i) => i !== idx))}
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

          {/* Section 2: Packaging Components */}
          <div className="border border-stone-200 rounded-lg p-3 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-stone-900 text-xs">
                2. Packaging Material Requirements (per Batch)
              </span>
              <button
                type="button"
                onClick={handleAddPackagingRow}
                className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-800 hover:text-emerald-900 bg-emerald-50 px-2 py-1 rounded border border-emerald-200 cursor-pointer"
              >
                <Plus className="h-3 w-3" />
                <span>Add Packaging Item</span>
              </button>
            </div>

            {packagingItems.length === 0 ? (
              <div className="py-3 text-center text-stone-400 text-xs italic">
                No packaging components added yet (e.g. jars, labels, cartons). Click &quot;Add Packaging Item&quot;.
              </div>
            ) : (
              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {packagingItems.map((pkg, idx) => (
                  <div key={idx} className="grid grid-cols-12 gap-2 items-center bg-stone-50 p-2 rounded border border-stone-200 text-xs">
                    <div className="col-span-5">
                      <select
                        value={pkg.packagingMaterialId}
                        onChange={e => {
                          const p = db.packagingMaterials.find(item => item.id === e.target.value);
                          if (p) {
                            const updated = [...packagingItems];
                            updated[idx] = {
                              ...updated[idx],
                              packagingMaterialId: p.id,
                              packagingMaterialName: p.name,
                              unit: p.unit,
                              unitCost: p.purchaseRate || 25,
                              totalCost: updated[idx].quantity * (p.purchaseRate || 25),
                            };
                            setPackagingItems(updated);
                          }
                        }}
                        className="w-full p-1.5 border border-stone-300 rounded font-medium bg-white"
                      >
                        {db.packagingMaterials.map(p => (
                          <option key={p.id} value={p.id}>
                            {p.name} ({p.category})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="col-span-2">
                      <input
                        type="number"
                        placeholder="Quantity"
                        value={pkg.quantity}
                        onChange={e => {
                          const qty = Number(e.target.value);
                          const updated = [...packagingItems];
                          updated[idx] = {
                            ...updated[idx],
                            quantity: qty,
                            totalCost: qty * updated[idx].unitCost,
                          };
                          setPackagingItems(updated);
                        }}
                        className="w-full p-1.5 border border-stone-300 rounded font-mono bg-white"
                      />
                    </div>

                    <div className="col-span-1 text-center font-mono text-stone-600">
                      {pkg.unit}
                    </div>

                    <div className="col-span-2 text-right font-mono text-stone-600">
                      Rate: {formatPKR(pkg.unitCost)}
                    </div>

                    <div className="col-span-1 text-right font-mono font-bold text-stone-900">
                      {formatPKR(pkg.totalCost)}
                    </div>

                    <div className="col-span-1 text-center">
                      <button
                        type="button"
                        onClick={() => setPackagingItems(packagingItems.filter((_, i) => i !== idx))}
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

          {/* Overhead and Totals Strip */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 bg-stone-100 p-3 rounded-lg border border-stone-300 text-xs">
            <div>
              <span className="text-stone-500 block">Raw Materials:</span>
              <span className="font-mono font-bold text-stone-900">{formatPKR(currentTotalRmCost)}</span>
            </div>
            <div>
              <span className="text-stone-500 block">Packaging Total:</span>
              <span className="font-mono font-bold text-stone-900">{formatPKR(currentTotalPkgCost)}</span>
            </div>
            <div>
              <span className="text-stone-500 block">Total Manufacturing Cost:</span>
              <span className="font-mono font-bold text-lg text-emerald-900">{formatPKR(currentTotalCost)}</span>
            </div>
            <div>
              <span className="text-stone-500 block">Cost Per Unit:</span>
              <span className="font-mono font-bold text-lg text-emerald-800">{formatPKR(currentCostPerUnit)}</span>
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
              className="px-5 py-2 bg-emerald-800 text-white rounded font-medium hover:bg-emerald-700 shadow-xs"
            >
              Save Manufacturing Formula
            </button>
          </div>
        </form>
      </Modal>

      {/* MODAL: Scaling Requirements Calculator */}
      <Modal
        isOpen={calcModalOpen}
        onClose={() => setCalcModalOpen(false)}
        title={`Scale Formula Requirements · ${calcFormula?.formulaNumber}`}
        subtitle={`Dynamically compute chemical & packaging requirements for target production volume`}
        maxWidth="3xl"
      >
        {calcFormula && (
          <div className="space-y-4 text-xs">
            <div className="bg-stone-50 p-3 rounded-lg border border-stone-200 flex items-center justify-between">
              <div>
                <span className="text-stone-500 block">Selected Product:</span>
                <span className="font-bold text-stone-900 text-sm">{calcFormula.productName}</span>
              </div>
              <div className="flex items-center gap-2">
                <label className="font-semibold text-stone-700 whitespace-nowrap">
                  Target Batch Production (Units):
                </label>
                <input
                  type="number"
                  value={targetBatchUnits}
                  onChange={e => setTargetBatchUnits(Math.max(1, Number(e.target.value)))}
                  className="w-28 p-1.5 border border-stone-300 rounded font-mono font-bold text-emerald-900 text-center bg-white"
                />
              </div>
            </div>

            {(() => {
              const scaled = calculateRequirementsFromFormula(calcFormula, targetBatchUnits);
              return (
                <div className="space-y-3">
                  {/* Scaled Raw Materials */}
                  <div className="border border-stone-200 rounded-lg overflow-hidden">
                    <div className="bg-stone-100 px-3 py-1.5 font-bold text-stone-800 border-b border-stone-200">
                      Required Raw Materials (Chemicals)
                    </div>
                    <table className="w-full text-xs text-left border-collapse">
                      <thead>
                        <tr className="bg-stone-50 text-stone-600 border-b border-stone-200 font-semibold">
                          <th className="py-1.5 px-3">Chemical Ingredient</th>
                          <th className="py-1.5 px-3 text-right">Required Quantity</th>
                          <th className="py-1.5 px-3 text-right">Estimated Cost</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-stone-100">
                        {scaled.rawMaterials.map((rm, i) => (
                          <tr key={i}>
                            <td className="py-1.5 px-3 font-medium text-stone-900">{rm.materialName}</td>
                            <td className="py-1.5 px-3 text-right font-mono font-bold text-emerald-800">
                              {rm.requiredQty} {rm.unit}
                            </td>
                            <td className="py-1.5 px-3 text-right font-mono">{formatPKR(rm.totalCost)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Scaled Packaging */}
                  <div className="border border-stone-200 rounded-lg overflow-hidden">
                    <div className="bg-stone-100 px-3 py-1.5 font-bold text-stone-800 border-b border-stone-200">
                      Required Packaging Components
                    </div>
                    <table className="w-full text-xs text-left border-collapse">
                      <thead>
                        <tr className="bg-stone-50 text-stone-600 border-b border-stone-200 font-semibold">
                          <th className="py-1.5 px-3">Packaging Component</th>
                          <th className="py-1.5 px-3 text-right">Required Quantity</th>
                          <th className="py-1.5 px-3 text-right">Estimated Cost</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-stone-100">
                        {scaled.packaging.map((pkg, i) => (
                          <tr key={i}>
                            <td className="py-1.5 px-3 font-medium text-stone-900">{pkg.packagingName}</td>
                            <td className="py-1.5 px-3 text-right font-mono font-bold text-emerald-800">
                              {pkg.requiredQty} {pkg.unit}
                            </td>
                            <td className="py-1.5 px-3 text-right font-mono">{formatPKR(pkg.totalCost)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Total Scaled Cost Box */}
                  <div className="bg-emerald-50 border border-emerald-200 p-3 rounded-lg flex items-center justify-between text-xs">
                    <div>
                      <span className="text-emerald-900 font-medium">Estimated Batch Total Cost:</span>
                      <div className="font-mono font-bold text-base text-emerald-950">
                        {formatPKR(scaled.totalCost)}
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-emerald-900 font-medium">Derived Cost Per Finished Unit:</span>
                      <div className="font-mono font-bold text-base text-emerald-900">
                        {formatPKR(scaled.costPerUnit)}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })()}

            <div className="pt-3 border-t border-stone-200 flex justify-end">
              <button
                type="button"
                onClick={() => setCalcModalOpen(false)}
                className="px-4 py-2 bg-stone-800 text-white rounded font-medium hover:bg-stone-700 cursor-pointer"
              >
                Close Calculator
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
