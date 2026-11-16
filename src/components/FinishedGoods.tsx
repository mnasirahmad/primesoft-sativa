import React, { useState } from 'react';
import { ERPDatabase, logAudit } from '../services/storage';
import { formatPKR, formatDateDMY } from '../utils/formatters';
import { FinishedProduct, FinishedProductBatch } from '../types/erp';
import { DataTable } from './common/DataTable';
import { Modal } from './common/Modal';
import { Plus, Edit, Trash2, Sparkles, Barcode, Calendar, ShieldCheck } from 'lucide-react';
import { addFinishedGoodsStock } from '../services/inventory';

interface FinishedGoodsProps {
  db: ERPDatabase;
  setDb: React.Dispatch<React.SetStateAction<ERPDatabase>>;
  onPrintDocument: (data: any) => void;
}

export const FinishedGoods: React.FC<FinishedGoodsProps> = ({
  db,
  setDb,
  onPrintDocument,
}) => {
  const [modalOpen, setModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<FinishedProduct | null>(null);

  // Manual Batch Stock Receipt (Opening/Adjustment)
  const [batchModalOpen, setBatchModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<FinishedProduct | null>(null);
  const [batchForm, setBatchForm] = useState({
    batchNumber: '',
    quantity: 100,
    costPerUnit: 150,
    mfgDate: new Date().toISOString().slice(0, 10),
    expDate: new Date(Date.now() + 730 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
    qcStatus: 'approved' as const,
  });

  const [formData, setFormData] = useState<Partial<FinishedProduct>>({
    code: '',
    barcode: '',
    name: '',
    brand: 'SATIVA GOLD',
    category: 'Skin Care & Creams',
    size: '50g',
    packingUnit: 'Piece',
    mrp: 650,
    wholesaleRate: 450,
    retailRate: 590,
    productionCost: 190,
    minimumStockLevel: 100,
    warehouseId: 'wh-fg',
    openingStock: 0,
    availableStock: 0,
  });

  const handleOpenAdd = () => {
    setEditingProduct(null);
    setFormData({
      code: `FP-${String(db.finishedProducts.length + 1).padStart(3, '0')}`,
      barcode: `896400${String(db.finishedProducts.length + 1).padStart(6, '0')}`,
      name: '',
      brand: db.brands[0]?.name || 'SATIVA GOLD',
      category: db.categories[0]?.name || 'Skin Care & Creams',
      size: '50g',
      packingUnit: 'Piece',
      mrp: 650,
      wholesaleRate: 450,
      retailRate: 590,
      productionCost: 190,
      minimumStockLevel: 100,
      warehouseId: 'wh-fg',
      openingStock: 0,
      availableStock: 0,
    });
    setModalOpen(true);
  };

  const handleOpenEdit = (p: FinishedProduct) => {
    setEditingProduct(p);
    setFormData(p);
    setModalOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.code) return;

    if (editingProduct) {
      const updated = db.finishedProducts.map(p =>
        p.id === editingProduct.id ? { ...p, ...formData } : p
      );
      let updatedDb = { ...db, finishedProducts: updated as FinishedProduct[] };
      updatedDb = logAudit(updatedDb, 'Finished Products', 'update', `Updated product ${formData.name}`);
      setDb(updatedDb);
    } else {
      const newProduct: FinishedProduct = {
        id: `fp-${Date.now()}`,
        code: formData.code || `FP-${db.finishedProducts.length + 1}`,
        barcode: formData.barcode || `896400${Date.now().toString().slice(-6)}`,
        name: formData.name || '',
        brand: formData.brand || 'SATIVA GOLD',
        category: formData.category || 'Skin Care & Creams',
        size: formData.size || '50g',
        packingUnit: formData.packingUnit || 'Piece',
        mrp: Number(formData.mrp) || 0,
        wholesaleRate: Number(formData.wholesaleRate) || 0,
        retailRate: Number(formData.retailRate) || 0,
        productionCost: Number(formData.productionCost) || 0,
        minimumStockLevel: Number(formData.minimumStockLevel) || 0,
        warehouseId: formData.warehouseId || 'wh-fg',
        openingStock: 0,
        availableStock: 0,
        batches: [],
      };
      let updatedDb = { ...db, finishedProducts: [...db.finishedProducts, newProduct] };
      updatedDb = logAudit(updatedDb, 'Finished Products', 'create', `Created product profile ${newProduct.name}`);
      setDb(updatedDb);
    }
    setModalOpen(false);
  };

  const handleDelete = (p: FinishedProduct) => {
    if (confirm(`Delete product profile ${p.name}?`)) {
      const updated = db.finishedProducts.filter(item => item.id !== p.id);
      let updatedDb = { ...db, finishedProducts: updated };
      updatedDb = logAudit(updatedDb, 'Finished Products', 'delete', `Deleted product ${p.name}`);
      setDb(updatedDb);
    }
  };

  const handleAddBatch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduct) return;

    const newBatch: FinishedProductBatch = {
      batchNumber: batchForm.batchNumber || `BATCH-FG-${Date.now().toString().slice(-4)}`,
      productionOrderId: 'OPENING',
      quantity: Number(batchForm.quantity),
      mfgDate: batchForm.mfgDate,
      expDate: batchForm.expDate,
      costPerUnit: Number(batchForm.costPerUnit),
      qcStatus: batchForm.qcStatus,
    };

    let updatedDb = addFinishedGoodsStock(
      db,
      selectedProduct.id,
      newBatch,
      'Opening / Production Finished Goods Stock',
      new Date().toISOString().slice(0, 10)
    );

    updatedDb = logAudit(
      updatedDb,
      'Finished Products',
      'create',
      `Added batch ${newBatch.batchNumber} (${newBatch.quantity} pcs) for ${selectedProduct.name}`
    );

    setDb(updatedDb);
    setBatchModalOpen(false);
    setSelectedProduct(null);
  };

  const handlePrintStock = () => {
    onPrintDocument({
      type: 'material_issue',
      docNumber: `FG-REP-${Date.now().toString().slice(-4)}`,
      date: new Date().toISOString(),
      title: 'FINISHED GOODS WAREHOUSE STOCK REPORT',
      details: [
        { label: 'Central Warehouse', value: 'Vehari Finished Goods Depot' },
        { label: 'Active Product SKUs', value: db.finishedProducts.length },
        {
          label: 'Total Valuation (Cost)',
          value: formatPKR(
            db.finishedProducts.reduce((sum, p) => sum + p.availableStock * p.productionCost, 0)
          ),
        },
        {
          label: 'Total Market Value (MRP)',
          value: formatPKR(
            db.finishedProducts.reduce((sum, p) => sum + p.availableStock * p.mrp, 0)
          ),
        },
      ],
      tableHeaders: ['Code', 'Barcode', 'Product Name', 'Brand', 'Size', 'Stock (Pcs)', 'Cost', 'Wholesale', 'MRP', 'Stock Value'],
      tableRows: db.finishedProducts.map(p => [
        p.code,
        p.barcode,
        p.name,
        p.brand,
        p.size,
        p.availableStock,
        p.productionCost,
        p.wholesaleRate,
        p.mrp,
        p.availableStock * p.productionCost,
      ]),
      summaryRows: [
        {
          label: 'Total Inventory Cost Valuation',
          value: formatPKR(
            db.finishedProducts.reduce((sum, p) => sum + p.availableStock * p.productionCost, 0)
          ),
          isBold: true,
        },
      ],
      narration: 'Finished goods inventory report audited under cosmetic GMP packaging protocols.',
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
                Finished Goods & Dispatch
              </span>
              <span className="text-xs text-stone-400">·</span>
              <span className="text-xs text-stone-500">Beauty Creams, Lotions, Serums, Shampoos</span>
            </div>
            <h1 className="text-lg font-bold text-stone-900 mt-0.5">
              Finished Goods / Product Inventory
            </h1>
            <p className="text-xs text-stone-500">
              Saleable cosmetic products, batch-wise availability, MRP, wholesale rates, and barcode tracking
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={handlePrintStock}
            className="px-3.5 py-1.5 text-xs font-medium text-stone-700 bg-white border border-stone-300 rounded-lg hover:bg-stone-50 transition-colors shadow-2xs cursor-pointer"
          >
            Print Stock Report
          </button>
          <button
            onClick={handleOpenAdd}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-emerald-800 hover:bg-emerald-700 rounded-lg shadow-2xs transition-colors cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            <span>Add Finished Product</span>
          </button>
        </div>
      </div>

      {/* Finished Goods Table */}
      <DataTable<FinishedProduct>
        title="Finished Products"
        data={db.finishedProducts}
        searchPlaceholder="Search products by code, barcode, product name, brand..."
        columns={[
          { header: 'Code', accessorKey: 'code', className: 'font-mono font-bold text-emerald-800' },
          { header: 'Barcode', accessorKey: 'barcode', className: 'font-mono text-stone-500' },
          {
            header: 'Product Name',
            accessorKey: 'name',
            cell: r => (
              <div>
                <div className="font-bold text-stone-900">{r.name}</div>
                <div className="text-[11px] text-stone-500">
                  {r.brand} · {r.size} · {r.category}
                </div>
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
                    className={`font-mono font-bold text-sm ${
                      isLow ? 'text-rose-700 bg-rose-50 px-1.5 py-0.5 rounded' : 'text-stone-900'
                    }`}
                  >
                    {r.availableStock} {r.packingUnit}
                  </span>
                  {isLow && <span className="block text-[10px] text-rose-600 font-medium">Low Stock</span>}
                </div>
              );
            },
          },
          {
            header: 'Prod Cost',
            accessorKey: 'productionCost',
            align: 'right',
            cell: r => formatPKR(r.productionCost),
          },
          {
            header: 'Wholesale',
            accessorKey: 'wholesaleRate',
            align: 'right',
            cell: r => <span className="font-semibold text-emerald-800">{formatPKR(r.wholesaleRate)}</span>,
          },
          {
            header: 'MRP',
            accessorKey: 'mrp',
            align: 'right',
            cell: r => <span className="font-mono text-stone-600">{formatPKR(r.mrp)}</span>,
          },
          {
            header: 'Stock Value (Cost)',
            align: 'right',
            cell: r => (
              <span className="font-mono font-semibold text-stone-900">
                {formatPKR(r.availableStock * r.productionCost)}
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
                    setSelectedProduct(r);
                    setBatchForm({
                      batchNumber: `BATCH-${r.code.slice(3)}-${Date.now().toString().slice(-4)}`,
                      quantity: 200,
                      costPerUnit: r.productionCost || 180,
                      mfgDate: new Date().toISOString().slice(0, 10),
                      expDate: new Date(Date.now() + 730 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
                      qcStatus: 'approved',
                    });
                    setBatchModalOpen(true);
                  }}
                  className="px-2 py-1 text-[11px] font-medium text-emerald-800 bg-emerald-50 hover:bg-emerald-100 rounded border border-emerald-200 cursor-pointer"
                  title="Add / Receive Batch"
                >
                  + Batch
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

      {/* Batch Lots Details Table */}
      {db.finishedProducts.some(p => p.batches.length > 0) && (
        <div className="bg-white rounded-xl border border-stone-200 p-5 shadow-2xs space-y-3">
          <div className="flex items-center justify-between border-b border-stone-100 pb-2">
            <h3 className="text-xs font-bold text-stone-900 uppercase tracking-wider flex items-center gap-1.5">
              <ShieldCheck className="h-4 w-4 text-emerald-700" />
              <span>Finished Goods Batches & QC Release Status</span>
            </h3>
            <span className="text-[11px] text-stone-400">Saleable Batches Traceability</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr className="bg-stone-50 text-stone-600 font-semibold border-b border-stone-200">
                  <th className="py-2 px-3">Product Name</th>
                  <th className="py-2 px-3">Batch Number</th>
                  <th className="py-2 px-3 text-right">Available Stock</th>
                  <th className="py-2 px-3 text-right">Cost Per Unit</th>
                  <th className="py-2 px-3">Mfg Date</th>
                  <th className="py-2 px-3">Expiry Date</th>
                  <th className="py-2 px-3 text-center">QC Approval</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100 text-stone-800">
                {db.finishedProducts.flatMap(p =>
                  p.batches.filter(b => b.quantity > 0).map((b, i) => (
                    <tr key={`${p.id}-${b.batchNumber}-${i}`} className="hover:bg-stone-50">
                      <td className="py-2 px-3 font-semibold text-stone-900">{p.name}</td>
                      <td className="py-2 px-3 font-mono font-bold text-emerald-800">{b.batchNumber}</td>
                      <td className="py-2 px-3 text-right tabular-nums font-bold text-stone-900">
                        {b.quantity} pcs
                      </td>
                      <td className="py-2 px-3 text-right tabular-nums">{formatPKR(b.costPerUnit)}</td>
                      <td className="py-2 px-3 font-mono">{formatDateDMY(b.mfgDate)}</td>
                      <td className="py-2 px-3 font-mono font-semibold text-stone-800">
                        {formatDateDMY(b.expDate)}
                      </td>
                      <td className="py-2 px-3 text-center">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                            b.qcStatus === 'approved'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
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

      {/* MODAL: Add / Edit Product */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingProduct ? 'Edit Finished Product' : 'Add Finished Product Profile'}
        subtitle="Cosmetics SKU details, packaging variations, and pricing tiers"
      >
        <form onSubmit={handleSave} className="space-y-3 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-medium text-stone-700 mb-1">Product Code *</label>
              <input
                type="text"
                required
                value={formData.code || ''}
                onChange={e => setFormData({ ...formData, code: e.target.value })}
                className="w-full p-2 border border-stone-300 rounded font-mono"
              />
            </div>
            <div>
              <label className="block font-medium text-stone-700 mb-1">Barcode / EAN-13</label>
              <input
                type="text"
                value={formData.barcode || ''}
                onChange={e => setFormData({ ...formData, barcode: e.target.value })}
                className="w-full p-2 border border-stone-300 rounded font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block font-medium text-stone-700 mb-1">Product Commercial Name *</label>
            <input
              type="text"
              required
              value={formData.name || ''}
              onChange={e => setFormData({ ...formData, name: e.target.value })}
              className="w-full p-2 border border-stone-300 rounded"
              placeholder="e.g. Sativa Gold Radiance Beauty Cream"
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block font-medium text-stone-700 mb-1">Brand</label>
              <select
                value={formData.brand || 'SATIVA GOLD'}
                onChange={e => setFormData({ ...formData, brand: e.target.value })}
                className="w-full p-2 border border-stone-300 rounded"
              >
                {db.brands.map(b => (
                  <option key={b.id} value={b.name}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block font-medium text-stone-700 mb-1">Category</label>
              <select
                value={formData.category || 'Skin Care & Creams'}
                onChange={e => setFormData({ ...formData, category: e.target.value })}
                className="w-full p-2 border border-stone-300 rounded"
              >
                {db.categories.map(c => (
                  <option key={c.id} value={c.name}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block font-medium text-stone-700 mb-1">Pack Size (e.g. 50g, 100ml)</label>
              <input
                type="text"
                value={formData.size || '50g'}
                onChange={e => setFormData({ ...formData, size: e.target.value })}
                className="w-full p-2 border border-stone-300 rounded"
              />
            </div>
          </div>

          <div className="grid grid-cols-4 gap-3">
            <div>
              <label className="block font-medium text-stone-700 mb-1">Estimated Cost (PKR)</label>
              <input
                type="number"
                value={formData.productionCost || 0}
                onChange={e => setFormData({ ...formData, productionCost: Number(e.target.value) })}
                className="w-full p-2 border border-stone-300 rounded font-mono"
              />
            </div>
            <div>
              <label className="block font-medium text-stone-700 mb-1">Wholesale Rate (PKR)</label>
              <input
                type="number"
                value={formData.wholesaleRate || 0}
                onChange={e => setFormData({ ...formData, wholesaleRate: Number(e.target.value) })}
                className="w-full p-2 border border-stone-300 rounded font-mono"
              />
            </div>
            <div>
              <label className="block font-medium text-stone-700 mb-1">Retail Rate (PKR)</label>
              <input
                type="number"
                value={formData.retailRate || 0}
                onChange={e => setFormData({ ...formData, retailRate: Number(e.target.value) })}
                className="w-full p-2 border border-stone-300 rounded font-mono"
              />
            </div>
            <div>
              <label className="block font-medium text-stone-700 mb-1">Maximum Retail (MRP)</label>
              <input
                type="number"
                value={formData.mrp || 0}
                onChange={e => setFormData({ ...formData, mrp: Number(e.target.value) })}
                className="w-full p-2 border border-stone-300 rounded font-mono font-bold text-emerald-800"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-medium text-stone-700 mb-1">Minimum Safety Stock Level</label>
              <input
                type="number"
                value={formData.minimumStockLevel || 100}
                onChange={e => setFormData({ ...formData, minimumStockLevel: Number(e.target.value) })}
                className="w-full p-2 border border-stone-300 rounded font-mono"
              />
            </div>
            <div>
              <label className="block font-medium text-stone-700 mb-1">Packing Unit</label>
              <input
                type="text"
                value={formData.packingUnit || 'Piece'}
                onChange={e => setFormData({ ...formData, packingUnit: e.target.value })}
                className="w-full p-2 border border-stone-300 rounded"
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
              Save Product
            </button>
          </div>
        </form>
      </Modal>

      {/* MODAL: Receive Batch Stock */}
      <Modal
        isOpen={batchModalOpen}
        onClose={() => setBatchModalOpen(false)}
        title={`Receive Finished Product Batch · ${selectedProduct?.name}`}
        subtitle="Add approved finished batch to saleable central warehouse"
      >
        <form onSubmit={handleAddBatch} className="space-y-3 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-medium text-stone-700 mb-1">Batch Number *</label>
              <input
                type="text"
                required
                value={batchForm.batchNumber}
                onChange={e => setBatchForm({ ...batchForm, batchNumber: e.target.value })}
                className="w-full p-2 border border-stone-300 rounded font-mono"
              />
            </div>
            <div>
              <label className="block font-medium text-stone-700 mb-1">
                Quantity ({selectedProduct?.packingUnit || 'Pieces'}) *
              </label>
              <input
                type="number"
                required
                value={batchForm.quantity}
                onChange={e => setBatchForm({ ...batchForm, quantity: Number(e.target.value) })}
                className="w-full p-2 border border-stone-300 rounded font-mono font-bold"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block font-medium text-stone-700 mb-1">Cost Per Unit (PKR)</label>
              <input
                type="number"
                value={batchForm.costPerUnit}
                onChange={e => setBatchForm({ ...batchForm, costPerUnit: Number(e.target.value) })}
                className="w-full p-2 border border-stone-300 rounded font-mono"
              />
            </div>
            <div>
              <label className="block font-medium text-stone-700 mb-1">Mfg Date</label>
              <input
                type="date"
                value={batchForm.mfgDate}
                onChange={e => setBatchForm({ ...batchForm, mfgDate: e.target.value })}
                className="w-full p-2 border border-stone-300 rounded font-mono"
              />
            </div>
            <div>
              <label className="block font-medium text-stone-700 mb-1">Expiry Date</label>
              <input
                type="date"
                value={batchForm.expDate}
                onChange={e => setBatchForm({ ...batchForm, expDate: e.target.value })}
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
              Confirm Finished Batch
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
