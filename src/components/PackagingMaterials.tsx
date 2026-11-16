import React, { useState } from 'react';
import { ERPDatabase, logAudit } from '../services/storage';
import { formatPKR, formatDateDMY } from '../utils/formatters';
import { PackagingMaterial, PackagingBatch } from '../types/erp';
import { DataTable } from './common/DataTable';
import { Modal } from './common/Modal';
import { Plus, Edit, Trash2, Package, Layers } from 'lucide-react';
import { addPackagingStock } from '../services/inventory';

interface PackagingMaterialsProps {
  db: ERPDatabase;
  setDb: React.Dispatch<React.SetStateAction<ERPDatabase>>;
  onPrintDocument: (data: any) => void;
}

export const PackagingMaterials: React.FC<PackagingMaterialsProps> = ({
  db,
  setDb,
  onPrintDocument,
}) => {
  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<PackagingMaterial | null>(null);

  // Stock lot modal
  const [stockModalOpen, setStockModalOpen] = useState(false);
  const [selectedPkg, setSelectedPkg] = useState<PackagingMaterial | null>(null);
  const [stockForm, setStockForm] = useState({
    batchNumber: '',
    quantity: 1000,
    costRate: 25,
  });

  const [formData, setFormData] = useState<Partial<PackagingMaterial>>({
    code: '',
    name: '',
    category: 'jars',
    supplierId: '',
    unit: 'Pieces',
    minimumStockLevel: 500,
    warehouseId: 'wh-pkg',
    openingStock: 0,
    availableStock: 0,
    purchaseRate: 25,
  });

  const categories = [
    { id: 'jars', label: 'Jars (Acrylic / Glass / Plastic)' },
    { id: 'bottles', label: 'Bottles (Shampoo / Lotion / Spray)' },
    { id: 'caps', label: 'Caps & Closures (Gold, Flip-top, Screw)' },
    { id: 'pumps', label: 'Dispenser Pumps & Sprayers' },
    { id: 'tubes', label: 'Laminated & Aluminum Tubes' },
    { id: 'labels', label: 'Labels & Foiled Stickers' },
    { id: 'cartons', label: 'Master Shipping Cartons' },
    { id: 'boxes', label: 'Inner Retail Boxes / Unit Cartons' },
    { id: 'seals', label: 'Induction Seals & Shrink Sleeves' },
    { id: 'accessories', label: 'Spatulas, Leaflets & Inserts' },
  ];

  const handleOpenAdd = () => {
    setEditingItem(null);
    setFormData({
      code: `PKG-${String(db.packagingMaterials.length + 1).padStart(3, '0')}`,
      name: '',
      category: 'jars',
      supplierId: db.suppliers[0]?.id || '',
      unit: 'Pieces',
      minimumStockLevel: 500,
      warehouseId: 'wh-pkg',
      openingStock: 0,
      availableStock: 0,
      purchaseRate: 25,
    });
    setModalOpen(true);
  };

  const handleOpenEdit = (item: PackagingMaterial) => {
    setEditingItem(item);
    setFormData(item);
    setModalOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.code) return;

    if (editingItem) {
      const updated = db.packagingMaterials.map(p =>
        p.id === editingItem.id ? { ...p, ...formData } : p
      );
      let updatedDb = { ...db, packagingMaterials: updated as PackagingMaterial[] };
      updatedDb = logAudit(updatedDb, 'Packaging', 'update', `Updated packaging item ${formData.name}`);
      setDb(updatedDb);
    } else {
      const newItem: PackagingMaterial = {
        id: `pkg-${Date.now()}`,
        code: formData.code || `PKG-${db.packagingMaterials.length + 1}`,
        name: formData.name || '',
        category: formData.category || 'jars',
        supplierId: formData.supplierId || '',
        unit: formData.unit || 'Pieces',
        minimumStockLevel: Number(formData.minimumStockLevel) || 0,
        warehouseId: formData.warehouseId || 'wh-pkg',
        openingStock: 0,
        availableStock: 0,
        purchaseRate: Number(formData.purchaseRate) || 0,
        batches: [],
      };
      let updatedDb = { ...db, packagingMaterials: [...db.packagingMaterials, newItem] };
      updatedDb = logAudit(updatedDb, 'Packaging', 'create', `Created packaging item ${newItem.name}`);
      setDb(updatedDb);
    }
    setModalOpen(false);
  };

  const handleDelete = (item: PackagingMaterial) => {
    if (confirm(`Delete packaging profile ${item.name}?`)) {
      const updated = db.packagingMaterials.filter(p => p.id !== item.id);
      let updatedDb = { ...db, packagingMaterials: updated };
      updatedDb = logAudit(updatedDb, 'Packaging', 'delete', `Deleted packaging item ${item.name}`);
      setDb(updatedDb);
    }
  };

  const handleAddStock = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPkg) return;

    const newBatch: PackagingBatch = {
      batchNumber: stockForm.batchNumber || `LOT-PKG-${Date.now().toString().slice(-4)}`,
      quantity: Number(stockForm.quantity),
      costRate: Number(stockForm.costRate),
      receivedDate: new Date().toISOString().slice(0, 10),
    };

    let updatedDb = addPackagingStock(
      db,
      selectedPkg.id,
      newBatch,
      'Direct Packaging Receipt',
      new Date().toISOString().slice(0, 10)
    );

    updatedDb = logAudit(
      updatedDb,
      'Packaging',
      'create',
      `Received ${newBatch.quantity} ${selectedPkg.unit} of ${selectedPkg.name}`
    );

    setDb(updatedDb);
    setStockModalOpen(false);
    setSelectedPkg(null);
  };

  const handlePrintReport = () => {
    onPrintDocument({
      type: 'material_issue',
      docNumber: `PKG-REP-${Date.now().toString().slice(-4)}`,
      date: new Date().toISOString(),
      title: 'PACKAGING MATERIALS INVENTORY REGISTER',
      details: [
        { label: 'Store Location', value: 'Section B - Vehari Plant' },
        { label: 'Total Packaging SKUs', value: db.packagingMaterials.length },
        {
          label: 'Total Stock Value',
          value: formatPKR(
            db.packagingMaterials.reduce((sum, p) => sum + p.availableStock * p.purchaseRate, 0)
          ),
        },
      ],
      tableHeaders: ['Code', 'Packaging Item', 'Category', 'Available Stock', 'Unit', 'Unit Rate', 'Valuation'],
      tableRows: db.packagingMaterials.map(p => [
        p.code,
        p.name,
        p.category.toUpperCase(),
        p.availableStock,
        p.unit,
        p.purchaseRate,
        p.availableStock * p.purchaseRate,
      ]),
      summaryRows: [
        {
          label: 'Total Packaging Valuation',
          value: formatPKR(
            db.packagingMaterials.reduce((sum, p) => sum + p.availableStock * p.purchaseRate, 0)
          ),
          isBold: true,
        },
      ],
      narration: 'Official packaging materials stock report for cosmetics assembly & filling lines.',
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
                Store & Assembly
              </span>
              <span className="text-xs text-stone-400">·</span>
              <span className="text-xs text-stone-500">Jars, Bottles, Cartons, Pumps</span>
            </div>
            <h1 className="text-lg font-bold text-stone-900 mt-0.5">
              Packaging Materials Inventory
            </h1>
            <p className="text-xs text-stone-500">
              Track bottles, jars, pumps, caps, labels, cartons, and boxes integrated into batch manufacturing cost
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={handlePrintReport}
            className="px-3.5 py-1.5 text-xs font-medium text-stone-700 bg-white border border-stone-300 rounded-lg hover:bg-stone-50 transition-colors shadow-2xs cursor-pointer"
          >
            Print Register
          </button>
          <button
            onClick={handleOpenAdd}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-emerald-800 hover:bg-emerald-700 rounded-lg shadow-2xs transition-colors cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            <span>Add Packaging Material</span>
          </button>
        </div>
      </div>

      {/* Packaging Table */}
      <DataTable<PackagingMaterial>
        title="Packaging Materials"
        data={db.packagingMaterials}
        searchPlaceholder="Search packaging items by code, name, category..."
        columns={[
          { header: 'Code', accessorKey: 'code', className: 'font-mono font-bold text-emerald-800' },
          {
            header: 'Item Name',
            accessorKey: 'name',
            cell: r => (
              <div>
                <div className="font-semibold text-stone-900">{r.name}</div>
                <div className="text-[11px] text-stone-500 capitalize">{r.category}</div>
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
                    {r.availableStock} {r.unit}
                  </span>
                  {isLow && <span className="block text-[10px] text-rose-600 font-medium">Low Stock</span>}
                </div>
              );
            },
          },
          {
            header: 'Unit Rate (PKR)',
            accessorKey: 'purchaseRate',
            align: 'right',
            cell: r => formatPKR(r.purchaseRate),
          },
          {
            header: 'Total Valuation',
            align: 'right',
            cell: r => (
              <span className="font-mono font-semibold text-stone-900">
                {formatPKR(r.availableStock * r.purchaseRate)}
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
                    setSelectedPkg(r);
                    setStockForm({
                      batchNumber: `LOT-PKG-${r.code.slice(4)}-${Date.now().toString().slice(-4)}`,
                      quantity: 1000,
                      costRate: r.purchaseRate || 25,
                    });
                    setStockModalOpen(true);
                  }}
                  className="px-2 py-1 text-[11px] font-medium text-emerald-800 bg-emerald-50 hover:bg-emerald-100 rounded border border-emerald-200 cursor-pointer"
                  title="Receive Stock"
                >
                  + Add Stock
                </button>
                <button
                  onClick={() => handleOpenEdit(r)}
                  className="p-1 text-stone-500 hover:text-emerald-700 hover:bg-stone-100 rounded cursor-pointer"
                >
                  <Edit className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() => handleDelete(r)}
                  className="p-1 text-stone-400 hover:text-rose-700 hover:bg-stone-100 rounded cursor-pointer"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ),
          },
        ]}
      />

      {/* MODAL: Add/Edit Packaging Material */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingItem ? 'Edit Packaging Profile' : 'Add Packaging Profile'}
        subtitle="Bottles, jars, caps, dispensers, outer cartons and labels"
      >
        <form onSubmit={handleSave} className="space-y-3 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-medium text-stone-700 mb-1">Code *</label>
              <input
                type="text"
                required
                value={formData.code || ''}
                onChange={e => setFormData({ ...formData, code: e.target.value })}
                className="w-full p-2 border border-stone-300 rounded font-mono"
              />
            </div>
            <div>
              <label className="block font-medium text-stone-700 mb-1">Packaging Name *</label>
              <input
                type="text"
                required
                value={formData.name || ''}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
                className="w-full p-2 border border-stone-300 rounded"
                placeholder="e.g. 50ml Acrylic Cream Jar Gold Cap"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-medium text-stone-700 mb-1">Category</label>
              <select
                value={formData.category || 'jars'}
                onChange={e => setFormData({ ...formData, category: e.target.value as any })}
                className="w-full p-2 border border-stone-300 rounded"
              >
                {categories.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block font-medium text-stone-700 mb-1">Unit</label>
              <select
                value={formData.unit || 'Pieces'}
                onChange={e => setFormData({ ...formData, unit: e.target.value })}
                className="w-full p-2 border border-stone-300 rounded font-mono"
              >
                <option value="Pieces">Pieces</option>
                <option value="Carton">Cartons</option>
                <option value="Box">Boxes</option>
                <option value="Dozen">Dozens</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-medium text-stone-700 mb-1">Unit Purchase Rate (PKR)</label>
              <input
                type="number"
                step="0.1"
                value={formData.purchaseRate || 0}
                onChange={e => setFormData({ ...formData, purchaseRate: Number(e.target.value) })}
                className="w-full p-2 border border-stone-300 rounded font-mono"
              />
            </div>
            <div>
              <label className="block font-medium text-stone-700 mb-1">Min Stock Alert Level</label>
              <input
                type="number"
                value={formData.minimumStockLevel || 0}
                onChange={e => setFormData({ ...formData, minimumStockLevel: Number(e.target.value) })}
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
              Save Packaging
            </button>
          </div>
        </form>
      </Modal>

      {/* MODAL: Direct Stock Receipt */}
      <Modal
        isOpen={stockModalOpen}
        onClose={() => setStockModalOpen(false)}
        title={`Receive Packaging Stock · ${selectedPkg?.name}`}
        subtitle="Add incoming shipment directly to store ledger"
      >
        <form onSubmit={handleAddStock} className="space-y-3 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-medium text-stone-700 mb-1">Lot / Batch Reference</label>
              <input
                type="text"
                value={stockForm.batchNumber}
                onChange={e => setStockForm({ ...stockForm, batchNumber: e.target.value })}
                className="w-full p-2 border border-stone-300 rounded font-mono"
              />
            </div>
            <div>
              <label className="block font-medium text-stone-700 mb-1">
                Quantity ({selectedPkg?.unit}) *
              </label>
              <input
                type="number"
                required
                value={stockForm.quantity}
                onChange={e => setStockForm({ ...stockForm, quantity: Number(e.target.value) })}
                className="w-full p-2 border border-stone-300 rounded font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block font-medium text-stone-700 mb-1">Cost Rate (PKR)</label>
            <input
              type="number"
              value={stockForm.costRate}
              onChange={e => setStockForm({ ...stockForm, costRate: Number(e.target.value) })}
              className="w-full p-2 border border-stone-300 rounded font-mono"
            />
          </div>

          <div className="pt-3 border-t border-stone-200 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setStockModalOpen(false)}
              className="px-4 py-2 border border-stone-300 rounded text-stone-700 hover:bg-stone-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-emerald-800 text-white rounded font-medium hover:bg-emerald-700"
            >
              Confirm Receipt
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
