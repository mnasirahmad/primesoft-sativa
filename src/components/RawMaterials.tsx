import React, { useState } from 'react';
import { ERPDatabase, logAudit } from '../services/storage';
import { formatPKR, formatDateDMY } from '../utils/formatters';
import { RawMaterial, MaterialBatch } from '../types/erp';
import { DataTable } from './common/DataTable';
import { Modal } from './common/Modal';
import { Plus, Edit, Trash2, Layers, AlertCircle, Calendar, Sparkles } from 'lucide-react';
import { addRawMaterialStock } from '../services/inventory';

interface RawMaterialsProps {
  db: ERPDatabase;
  setDb: React.Dispatch<React.SetStateAction<ERPDatabase>>;
  onPrintDocument: (data: any) => void;
}

export const RawMaterials: React.FC<RawMaterialsProps> = ({
  db,
  setDb,
  onPrintDocument,
}) => {
  const [modalOpen, setModalOpen] = useState(false);
  const [editingMaterial, setEditingMaterial] = useState<RawMaterial | null>(null);

  // Batch addition modal
  const [batchModalOpen, setBatchModalOpen] = useState(false);
  const [selectedMaterialForBatch, setSelectedMaterialForBatch] = useState<RawMaterial | null>(null);
  const [batchForm, setBatchForm] = useState({
    batchNumber: '',
    quantity: 10,
    costRate: 500,
    manufacturingDate: new Date().toISOString().slice(0, 10),
    expiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
    qcStatus: 'approved' as const,
  });

  // Material Form State
  const [formData, setFormData] = useState<Partial<RawMaterial>>({
    code: '',
    name: '',
    category: 'Base Chemicals',
    supplierId: '',
    purchaseUnit: 'KG',
    consumptionUnit: 'KG',
    conversionRate: 1,
    minimumStockLevel: 25,
    reorderLevel: 50,
    warehouseId: 'wh-rm',
    openingStock: 0,
    availableStock: 0,
    purchaseRate: 500,
    averageCost: 500,
  });

  const categoriesList = [
    'Base Chemicals',
    'Fragrances and Perfumes',
    'Essential Oils',
    'Preservatives',
    'Emulsifiers',
    'Surfactants',
    'Colorants and Pigments',
    'Active Ingredients',
    'Herbal Extracts',
    'Moisturizing Ingredients',
    'Other Manufacturing Ingredients',
  ];

  const handleOpenAdd = () => {
    setEditingMaterial(null);
    setFormData({
      code: `RM-${String(db.rawMaterials.length + 1).padStart(3, '0')}`,
      name: '',
      category: 'Base Chemicals',
      supplierId: db.suppliers[0]?.id || '',
      purchaseUnit: 'KG',
      consumptionUnit: 'KG',
      conversionRate: 1,
      minimumStockLevel: 25,
      reorderLevel: 50,
      warehouseId: 'wh-rm',
      openingStock: 0,
      availableStock: 0,
      purchaseRate: 500,
      averageCost: 500,
    });
    setModalOpen(true);
  };

  const handleOpenEdit = (material: RawMaterial) => {
    setEditingMaterial(material);
    setFormData(material);
    setModalOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.code) return;

    if (editingMaterial) {
      const updatedList = db.rawMaterials.map(m =>
        m.id === editingMaterial.id ? { ...m, ...formData } : m
      );
      let updatedDb = { ...db, rawMaterials: updatedList as RawMaterial[] };
      updatedDb = logAudit(updatedDb, 'Raw Materials', 'update', `Updated chemical ${formData.name}`);
      setDb(updatedDb);
    } else {
      const newMaterial: RawMaterial = {
        id: `rm-${Date.now()}`,
        code: formData.code || `RM-${db.rawMaterials.length + 1}`,
        name: formData.name || '',
        category: formData.category || 'Base Chemicals',
        supplierId: formData.supplierId || '',
        purchaseUnit: formData.purchaseUnit || 'KG',
        consumptionUnit: formData.consumptionUnit || 'KG',
        conversionRate: Number(formData.conversionRate) || 1,
        minimumStockLevel: Number(formData.minimumStockLevel) || 0,
        reorderLevel: Number(formData.reorderLevel) || 0,
        warehouseId: formData.warehouseId || 'wh-rm',
        openingStock: 0,
        availableStock: 0,
        purchaseRate: Number(formData.purchaseRate) || 0,
        averageCost: Number(formData.purchaseRate) || 0,
        batches: [],
      };
      let updatedDb = { ...db, rawMaterials: [...db.rawMaterials, newMaterial] };
      updatedDb = logAudit(updatedDb, 'Raw Materials', 'create', `Created chemical profile ${newMaterial.name}`);
      setDb(updatedDb);
    }

    setModalOpen(false);
  };

  const handleDelete = (material: RawMaterial) => {
    if (confirm(`Delete raw material profile ${material.name}?`)) {
      const updated = db.rawMaterials.filter(m => m.id !== material.id);
      let updatedDb = { ...db, rawMaterials: updated };
      updatedDb = logAudit(updatedDb, 'Raw Materials', 'delete', `Deleted chemical ${material.name}`);
      setDb(updatedDb);
    }
  };

  const handleAddBatchStock = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMaterialForBatch) return;

    const newBatch: MaterialBatch = {
      batchNumber: batchForm.batchNumber || `LOT-${Date.now().toString().slice(-4)}`,
      quantity: Number(batchForm.quantity),
      costRate: Number(batchForm.costRate),
      manufacturingDate: batchForm.manufacturingDate,
      expiryDate: batchForm.expiryDate,
      qcStatus: batchForm.qcStatus,
    };

    let updatedDb = addRawMaterialStock(
      db,
      selectedMaterialForBatch.id,
      newBatch,
      'Opening / Direct Batch Receipt',
      new Date().toISOString().slice(0, 10)
    );

    updatedDb = logAudit(
      updatedDb,
      'Raw Materials',
      'create',
      `Received batch ${newBatch.batchNumber} (${newBatch.quantity} ${selectedMaterialForBatch.consumptionUnit}) for ${selectedMaterialForBatch.name}`
    );

    setDb(updatedDb);
    setBatchModalOpen(false);
    setSelectedMaterialForBatch(null);
  };

  // Print Inventory Sheet
  const handlePrintStockReport = () => {
    onPrintDocument({
      type: 'material_issue',
      docNumber: `RM-REP-${Date.now().toString().slice(-4)}`,
      date: new Date().toISOString(),
      title: 'RAW MATERIAL & CHEMICAL INVENTORY REPORT',
      details: [
        { label: 'Facility', value: 'Vehari Central Plant' },
        { label: 'Total Chemical SKUs', value: db.rawMaterials.length },
        {
          label: 'Total Valuation',
          value: formatPKR(
            db.rawMaterials.reduce((sum, m) => sum + m.availableStock * (m.averageCost || m.purchaseRate), 0)
          ),
        },
      ],
      tableHeaders: ['Code', 'Chemical Name', 'Category', 'Available Stock', 'Unit', 'Avg Cost', 'Total Valuation'],
      tableRows: db.rawMaterials.map(m => [
        m.code,
        m.name,
        m.category,
        m.availableStock,
        m.consumptionUnit,
        m.averageCost || m.purchaseRate,
        m.availableStock * (m.averageCost || m.purchaseRate),
      ]),
      summaryRows: [
        {
          label: 'Total Inventory Value',
          value: formatPKR(
            db.rawMaterials.reduce((sum, m) => sum + m.availableStock * (m.averageCost || m.purchaseRate), 0)
          ),
          isBold: true,
        },
      ],
      narration: 'Physical vs. ERP chemical ledger balance report. Batch tracking compliant with FEFO rules.',
    });
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
                Store & Compounding
              </span>
              <span className="text-xs text-stone-400">·</span>
              <span className="text-xs text-stone-500">FEFO Expiry Tracking</span>
            </div>
            <h1 className="text-lg font-bold text-stone-900 mt-0.5">
              Raw Materials & Chemical Inventory
            </h1>
            <p className="text-xs text-stone-500">
              Base chemicals, fragrances, essential oils, emulsifiers, preservatives, and active extracts
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={handlePrintStockReport}
            className="px-3.5 py-1.5 text-xs font-medium text-stone-700 bg-white border border-stone-300 rounded-lg hover:bg-stone-50 transition-colors shadow-2xs cursor-pointer"
          >
            Print Stock Sheet
          </button>
          <button
            onClick={handleOpenAdd}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-emerald-800 hover:bg-emerald-700 rounded-lg shadow-2xs transition-colors cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            <span>Add Raw Material</span>
          </button>
        </div>
      </div>

      {/* Chemical Inventory Table */}
      <DataTable<RawMaterial>
        title="Raw Materials & Chemicals"
        data={db.rawMaterials}
        searchPlaceholder="Search by material code, chemical name, category..."
        columns={[
          { header: 'Code', accessorKey: 'code', className: 'font-mono font-bold text-emerald-800' },
          {
            header: 'Chemical Name',
            accessorKey: 'name',
            cell: r => (
              <div>
                <div className="font-semibold text-stone-900">{r.name}</div>
                <div className="text-[11px] text-stone-500">{r.category}</div>
              </div>
            ),
          },
          {
            header: 'Available Stock',
            accessorKey: 'availableStock',
            align: 'right',
            cell: r => {
              const isLow = r.availableStock <= r.minimumStockLevel;
              return (
                <div className="text-right">
                  <span
                    className={`font-mono font-bold ${
                      isLow ? 'text-rose-700 bg-rose-50 px-1.5 py-0.5 rounded' : 'text-stone-900'
                    }`}
                  >
                    {r.availableStock} {r.consumptionUnit}
                  </span>
                  {isLow && (
                    <span className="block text-[10px] text-rose-600 font-medium">Low Stock</span>
                  )}
                </div>
              );
            },
          },
          {
            header: 'Batches (FEFO)',
            align: 'center',
            cell: r => {
              const activeBatches = r.batches.filter(b => b.quantity > 0);
              return (
                <div className="text-center">
                  <span className="font-mono text-xs font-semibold text-stone-700">
                    {activeBatches.length} Active Lots
                  </span>
                  {activeBatches.length > 0 && (
                    <span className="block text-[10px] text-stone-400">
                      Next Exp: {formatDateDMY(activeBatches[0]?.expiryDate)}
                    </span>
                  )}
                </div>
              );
            },
          },
          {
            header: 'Avg Cost / Unit',
            accessorKey: 'averageCost',
            align: 'right',
            cell: r => formatPKR(r.averageCost || r.purchaseRate),
          },
          {
            header: 'Total Valuation',
            align: 'right',
            cell: r => (
              <span className="font-mono font-semibold text-stone-900">
                {formatPKR(r.availableStock * (r.averageCost || r.purchaseRate))}
              </span>
            ),
          },
          {
            header: 'Actions',
            align: 'center',
            cell: r => (
              <div className="flex items-center justify-center gap-1">
                <button
                  onClick={() => {
                    setSelectedMaterialForBatch(r);
                    setBatchForm({
                      batchNumber: `LOT-${r.code.slice(3, 7)}-${Date.now().toString().slice(-4)}`,
                      quantity: 25,
                      costRate: r.purchaseRate || 500,
                      manufacturingDate: new Date().toISOString().slice(0, 10),
                      expiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
                      qcStatus: 'approved',
                    });
                    setBatchModalOpen(true);
                  }}
                  className="px-2 py-1 text-[11px] font-medium text-emerald-800 bg-emerald-50 hover:bg-emerald-100 rounded border border-emerald-200 cursor-pointer"
                  title="Receive / Add Batch"
                >
                  + Batch Stock
                </button>
                <button
                  onClick={() => handleOpenEdit(r)}
                  className="p-1 text-stone-500 hover:text-emerald-700 hover:bg-stone-100 rounded cursor-pointer"
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

      {/* Batch Details Sub-card when batches exist */}
      {db.rawMaterials.some(m => m.batches.length > 0) && (
        <div className="bg-white rounded-xl border border-stone-200 p-5 shadow-2xs space-y-3">
          <div className="flex items-center justify-between border-b border-stone-100 pb-2">
            <h3 className="text-xs font-bold text-stone-900 uppercase tracking-wider flex items-center gap-1.5">
              <Calendar className="h-4 w-4 text-emerald-700" />
              <span>Active Batch Lots & Expiry Register (FEFO)</span>
            </h3>
            <span className="text-[11px] text-stone-400">Chronological Expiry Sequencing</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr className="bg-stone-50 text-stone-600 font-semibold border-b border-stone-200">
                  <th className="py-2 px-3">Chemical Name</th>
                  <th className="py-2 px-3">Batch / Lot #</th>
                  <th className="py-2 px-3 text-right">Available Qty</th>
                  <th className="py-2 px-3 text-right">Cost Rate</th>
                  <th className="py-2 px-3">Mfg Date</th>
                  <th className="py-2 px-3">Expiry Date</th>
                  <th className="py-2 px-3 text-center">QC Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100 text-stone-800">
                {db.rawMaterials.flatMap(m =>
                  m.batches.filter(b => b.quantity > 0).map((b, i) => (
                    <tr key={`${m.id}-${b.batchNumber}-${i}`} className="hover:bg-stone-50">
                      <td className="py-2 px-3 font-medium text-stone-900">{m.name}</td>
                      <td className="py-2 px-3 font-mono font-semibold text-emerald-800">{b.batchNumber}</td>
                      <td className="py-2 px-3 text-right tabular-nums font-bold">
                        {b.quantity} {m.consumptionUnit}
                      </td>
                      <td className="py-2 px-3 text-right tabular-nums">{formatPKR(b.costRate)}</td>
                      <td className="py-2 px-3 font-mono">{formatDateDMY(b.manufacturingDate)}</td>
                      <td className="py-2 px-3 font-mono font-semibold text-stone-800">
                        {formatDateDMY(b.expiryDate)}
                      </td>
                      <td className="py-2 px-3 text-center">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-emerald-100 text-emerald-800">
                          {b.qcStatus}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL: Add/Edit Raw Material */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingMaterial ? 'Edit Chemical Profile' : 'Add Raw Material / Chemical Profile'}
        subtitle="Define cosmetic ingredients, units, and minimum safety stock"
      >
        <form onSubmit={handleSave} className="space-y-3 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-medium text-stone-700 mb-1">Material Code *</label>
              <input
                type="text"
                required
                value={formData.code || ''}
                onChange={e => setFormData({ ...formData, code: e.target.value })}
                className="w-full p-2 border border-stone-300 rounded font-mono"
              />
            </div>
            <div>
              <label className="block font-medium text-stone-700 mb-1">Material / Chemical Name *</label>
              <input
                type="text"
                required
                value={formData.name || ''}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
                className="w-full p-2 border border-stone-300 rounded"
                placeholder="e.g. Stearic Acid USP, Glycerine 99%"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-medium text-stone-700 mb-1">Cosmetic Category</label>
              <select
                value={formData.category || 'Base Chemicals'}
                onChange={e => setFormData({ ...formData, category: e.target.value })}
                className="w-full p-2 border border-stone-300 rounded"
              >
                {categoriesList.map(cat => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block font-medium text-stone-700 mb-1">Preferred Supplier</label>
              <select
                value={formData.supplierId || ''}
                onChange={e => setFormData({ ...formData, supplierId: e.target.value })}
                className="w-full p-2 border border-stone-300 rounded"
              >
                <option value="">-- Direct / Various --</option>
                {db.suppliers.map(s => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.city})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block font-medium text-stone-700 mb-1">Purchase Unit</label>
              <select
                value={formData.purchaseUnit || 'KG'}
                onChange={e => setFormData({ ...formData, purchaseUnit: e.target.value })}
                className="w-full p-2 border border-stone-300 rounded font-mono"
              >
                {db.units.map(u => (
                  <option key={u.id} value={u.code}>
                    {u.name} ({u.code})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block font-medium text-stone-700 mb-1">Production Unit</label>
              <select
                value={formData.consumptionUnit || 'KG'}
                onChange={e => setFormData({ ...formData, consumptionUnit: e.target.value })}
                className="w-full p-2 border border-stone-300 rounded font-mono"
              >
                {db.units.map(u => (
                  <option key={u.id} value={u.code}>
                    {u.name} ({u.code})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block font-medium text-stone-700 mb-1">Conversion Factor</label>
              <input
                type="number"
                step="0.001"
                value={formData.conversionRate || 1}
                onChange={e => setFormData({ ...formData, conversionRate: Number(e.target.value) })}
                className="w-full p-2 border border-stone-300 rounded font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block font-medium text-stone-700 mb-1">Purchase Rate (PKR)</label>
              <input
                type="number"
                value={formData.purchaseRate || 0}
                onChange={e => setFormData({ ...formData, purchaseRate: Number(e.target.value) })}
                className="w-full p-2 border border-stone-300 rounded font-mono"
              />
            </div>
            <div>
              <label className="block font-medium text-stone-700 mb-1">Min Stock Alert</label>
              <input
                type="number"
                value={formData.minimumStockLevel || 0}
                onChange={e => setFormData({ ...formData, minimumStockLevel: Number(e.target.value) })}
                className="w-full p-2 border border-stone-300 rounded font-mono"
              />
            </div>
            <div>
              <label className="block font-medium text-stone-700 mb-1">Reorder Level</label>
              <input
                type="number"
                value={formData.reorderLevel || 0}
                onChange={e => setFormData({ ...formData, reorderLevel: Number(e.target.value) })}
                className="w-full p-2 border border-stone-300 rounded font-mono"
              />
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
              className="px-4 py-2 bg-emerald-800 text-white rounded font-medium hover:bg-emerald-700"
            >
              Save Raw Material
            </button>
          </div>
        </form>
      </Modal>

      {/* MODAL: Receive Batch Stock */}
      <Modal
        isOpen={batchModalOpen}
        onClose={() => setBatchModalOpen(false)}
        title={`Receive Chemical Batch · ${selectedMaterialForBatch?.name}`}
        subtitle="Add batch number and expiry date with FEFO stock updating"
      >
        <form onSubmit={handleAddBatchStock} className="space-y-3 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-medium text-stone-700 mb-1">Batch / Lot Number *</label>
              <input
                type="text"
                required
                value={batchForm.batchNumber}
                onChange={e => setBatchForm({ ...batchForm, batchNumber: e.target.value })}
                className="w-full p-2 border border-stone-300 rounded font-mono"
                placeholder="e.g. LOT-CHEM-2601"
              />
            </div>
            <div>
              <label className="block font-medium text-stone-700 mb-1">
                Quantity ({selectedMaterialForBatch?.consumptionUnit}) *
              </label>
              <input
                type="number"
                step="0.01"
                required
                value={batchForm.quantity}
                onChange={e => setBatchForm({ ...batchForm, quantity: Number(e.target.value) })}
                className="w-full p-2 border border-stone-300 rounded font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block font-medium text-stone-700 mb-1">Cost Rate (PKR)</label>
              <input
                type="number"
                value={batchForm.costRate}
                onChange={e => setBatchForm({ ...batchForm, costRate: Number(e.target.value) })}
                className="w-full p-2 border border-stone-300 rounded font-mono"
              />
            </div>
            <div>
              <label className="block font-medium text-stone-700 mb-1">Mfg Date</label>
              <input
                type="date"
                value={batchForm.manufacturingDate}
                onChange={e => setBatchForm({ ...batchForm, manufacturingDate: e.target.value })}
                className="w-full p-2 border border-stone-300 rounded font-mono"
              />
            </div>
            <div>
              <label className="block font-medium text-stone-700 mb-1">Expiry Date (FEFO)</label>
              <input
                type="date"
                value={batchForm.expiryDate}
                onChange={e => setBatchForm({ ...batchForm, expiryDate: e.target.value })}
                className="w-full p-2 border border-stone-300 rounded font-mono"
              />
            </div>
          </div>

          <div className="pt-3 border-t border-stone-200 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setBatchModalOpen(false)}
              className="px-4 py-2 border border-stone-300 rounded text-stone-700 hover:bg-stone-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-emerald-800 text-white rounded font-medium hover:bg-emerald-700"
            >
              Confirm Batch Receipt
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
