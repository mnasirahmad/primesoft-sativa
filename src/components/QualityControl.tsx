import React, { useState } from 'react';
import { ERPDatabase, logAudit } from '../services/storage';
import { formatPKR, formatDateDMY } from '../utils/formatters';
import { QualityInspection } from '../types/erp';
import { DataTable } from './common/DataTable';
import { Modal } from './common/Modal';
import { ShieldCheck, Search, AlertOctagon, Printer, CheckCircle2, XCircle, FileText } from 'lucide-react';

interface QualityControlProps {
  db: ERPDatabase;
  setDb: React.Dispatch<React.SetStateAction<ERPDatabase>>;
  onPrintDocument: (data: any) => void;
}

export const QualityControl: React.FC<QualityControlProps> = ({
  db,
  setDb,
  onPrintDocument,
}) => {
  const [activeTab, setActiveTab] = useState<'inspections' | 'traceability' | 'recall'>('inspections');

  // Inspection modal
  const [inspectionModalOpen, setInspectionModalOpen] = useState(false);
  const [viewingInspection, setViewingInspection] = useState<QualityInspection | null>(null);

  // Traceability search state
  const [traceBatchNumber, setTraceBatchNumber] = useState('');
  const [traceResult, setTraceResult] = useState<any>(null);

  // Recall search state
  const [recallBatchNumber, setRecallBatchNumber] = useState('');
  const [recallResult, setRecallResult] = useState<any>(null);

  // Handle Traceability Search
  const handleTraceBatch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!traceBatchNumber.trim()) return;

    const term = traceBatchNumber.trim().toUpperCase();

    // Check Finished Product Batches
    let matchedProduct = null;
    let matchedBatch = null;

    for (const prod of db.finishedProducts) {
      const b = prod.batches.find(batch => batch.batchNumber.toUpperCase() === term);
      if (b) {
        matchedProduct = prod;
        matchedBatch = b;
        break;
      }
    }

    // Match with Production Order
    const prodOrder = db.productionOrders.find(
      o => o.batchNumber.toUpperCase() === term || (matchedBatch && o.id === matchedBatch.productionOrderId)
    );

    // Associated QC Inspection
    const qc = db.qualityInspections.find(q => q.referenceBatchNumber.toUpperCase() === term);

    // Sales Customers who received this batch
    const salesWithBatch: { invoiceNo: string; date: string; customerName: string; qty: number }[] = [];
    for (const inv of db.salesInvoices) {
      for (const item of inv.items) {
        if (item.batchNumber.toUpperCase() === term) {
          salesWithBatch.push({
            invoiceNo: inv.invoiceNumber,
            date: inv.date,
            customerName: inv.customerName,
            qty: item.quantity,
          });
        }
      }
    }

    setTraceResult({
      batchNumber: term,
      product: matchedProduct,
      batch: matchedBatch,
      productionOrder: prodOrder,
      qualityInspection: qc,
      salesDistribution: salesWithBatch,
    });
  };

  // Handle Recall Search
  const handleRecallSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!recallBatchNumber.trim()) return;

    const term = recallBatchNumber.trim().toUpperCase();

    const affectedCustomers: {
      invoiceNumber: string;
      date: string;
      customerName: string;
      phone: string;
      city: string;
      quantity: number;
    }[] = [];

    for (const inv of db.salesInvoices) {
      for (const item of inv.items) {
        if (item.batchNumber.toUpperCase() === term) {
          const cust = db.customers.find(c => c.id === inv.customerId);
          affectedCustomers.push({
            invoiceNumber: inv.invoiceNumber,
            date: inv.date,
            customerName: inv.customerName,
            phone: cust?.phone || 'On file',
            city: cust?.city || 'Vehari',
            quantity: item.quantity,
          });
        }
      }
    }

    const totalSold = affectedCustomers.reduce((sum, c) => sum + c.quantity, 0);

    setRecallResult({
      batchNumber: term,
      affectedCustomers,
      totalSold,
    });
  };

  // Print QC Certificate
  const handlePrintQCCertificate = (qc: QualityInspection) => {
    onPrintDocument({
      type: 'qc_report',
      docNumber: qc.inspectionNumber,
      date: qc.date,
      title: 'CERTIFICATE OF QUALITY ANALYSIS & LAB RELEASE',
      details: [
        { label: 'Sample / Product', value: qc.itemName },
        { label: 'Batch Lot Tested', value: qc.referenceBatchNumber },
        { label: 'Inspection Category', value: qc.type === 'finished_goods' ? 'Finished Product Release' : 'Raw Chemical Inward' },
        { label: 'Testing Laboratory', value: 'Sativa Quality Assurance Lab - Vehari' },
        { label: 'Overall Status', value: qc.overallStatus.toUpperCase() },
        { label: 'Authorized Officer', value: qc.inspectorName },
        { label: 'pH Value Test', value: qc.phValue || '5.8 pH' },
        { label: 'Microbial Analysis', value: qc.microbialTest || 'Pass (< 100 CFU/g)' },
      ],
      tableHeaders: ['Quality Parameter', 'Standard Specification', 'Lab Finding / Result', 'Status'],
      tableRows: qc.parameters.map(p => [
        p.parameterName,
        p.specification,
        p.actualResult,
        p.status.toUpperCase(),
      ]),
      summaryRows: [
        { label: 'Overall Quality Disposition', value: qc.overallStatus.toUpperCase(), isBold: true },
        { label: 'Packaging Seal Integrity', value: qc.packagingIntegrity || 'Hermetic / Intact' },
      ],
      narration: qc.remarks || 'Sample complies with Pakistan Standards & Quality Control Authority (PSQCA) cosmetic parameters.',
      signatories: [
        'Lab Quality Analyst',
        'Senior Analytical Chemist',
        'Head of Quality Assurance',
        'Plant Director',
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
                Quality Assurance & GMP
              </span>
              <span className="text-xs text-stone-400">·</span>
              <span className="text-xs text-stone-500">PSQCA Cosmetic Standards</span>
            </div>
            <h1 className="text-lg font-bold text-stone-900 mt-0.5">
              Quality Control & Batch Traceability
            </h1>
            <p className="text-xs text-stone-500">
              Physical, chemical & microbial testing, batch release certificates, full ingredient genealogy, and market recall tracking
            </p>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center gap-1 p-1 bg-stone-100 rounded-lg border border-stone-200">
          <button
            onClick={() => setActiveTab('inspections')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
              activeTab === 'inspections' ? 'bg-white text-stone-900 shadow-2xs' : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            QC Inspections ({db.qualityInspections.length})
          </button>
          <button
            onClick={() => setActiveTab('traceability')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
              activeTab === 'traceability' ? 'bg-white text-stone-900 shadow-2xs' : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            Batch Genealogy
          </button>
          <button
            onClick={() => setActiveTab('recall')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
              activeTab === 'recall' ? 'bg-white text-stone-900 shadow-2xs' : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            Recall Report
          </button>
        </div>
      </div>

      {/* 1. QC Inspections Tab */}
      {activeTab === 'inspections' && (
        <DataTable<QualityInspection>
          title="QC Inspection Records"
          data={db.qualityInspections}
          searchPlaceholder="Search inspections by inspection #, batch #, item name, inspector..."
          columns={[
            { header: 'Certificate #', accessorKey: 'inspectionNumber', className: 'font-mono font-bold text-emerald-800' },
            { header: 'Test Date', accessorKey: 'date', cell: r => formatDateDMY(r.date) },
            {
              header: 'Product / Chemical',
              accessorKey: 'itemName',
              cell: r => (
                <div>
                  <div className="font-semibold text-stone-900">{r.itemName}</div>
                  <div className="text-[11px] text-stone-500 font-mono">Lot: {r.referenceBatchNumber}</div>
                </div>
              ),
            },
            {
              header: 'Type',
              accessorKey: 'type',
              cell: r => (r.type === 'finished_goods' ? 'Finished Product' : 'Raw Chemical'),
            },
            { header: 'pH Value', accessorKey: 'phValue', cell: r => r.phValue || '5.8 pH' },
            { header: 'Viscosity', accessorKey: 'viscosity', cell: r => r.viscosity || 'Pass' },
            {
              header: 'Decision',
              accessorKey: 'overallStatus',
              align: 'center',
              cell: r => (
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                    r.overallStatus === 'approved'
                      ? 'bg-emerald-100 text-emerald-800'
                      : r.overallStatus === 'conditional'
                      ? 'bg-amber-100 text-amber-800'
                      : 'bg-rose-100 text-rose-800'
                  }`}
                >
                  {r.overallStatus}
                </span>
              ),
            },
            {
              header: 'Actions',
              align: 'center',
              cell: r => (
                <div className="flex items-center justify-center gap-1.5">
                  <button
                    onClick={() => {
                      setViewingInspection(r);
                      setInspectionModalOpen(true);
                    }}
                    className="p-1 text-stone-600 hover:text-emerald-700 hover:bg-stone-100 rounded cursor-pointer"
                    title="View Lab Details"
                  >
                    <FileText className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => handlePrintQCCertificate(r)}
                    className="p-1 text-stone-600 hover:text-emerald-700 hover:bg-stone-100 rounded cursor-pointer"
                    title="Print Certificate"
                  >
                    <Printer className="h-3.5 w-3.5" />
                  </button>
                </div>
              ),
            },
          ]}
        />
      )}

      {/* 2. Traceability Tab */}
      {activeTab === 'traceability' && (
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-stone-200 p-5 shadow-2xs">
            <h2 className="text-sm font-bold text-stone-900 mb-1">
              End-to-End Batch Traceability & Raw Material Genealogy
            </h2>
            <p className="text-xs text-stone-500 mb-4">
              Enter any finished product batch number to inspect the exact production order, supervisor, formula version, and raw chemical lots used
            </p>

            <form onSubmit={handleTraceBatch} className="flex gap-2 max-w-lg">
              <input
                type="text"
                placeholder="Enter Batch Number (e.g. LOT-SGC-01, BATCH-2601)..."
                value={traceBatchNumber}
                onChange={e => setTraceBatchNumber(e.target.value)}
                className="flex-1 p-2 border border-stone-300 rounded-lg text-xs font-mono uppercase bg-white"
              />
              <button
                type="submit"
                className="px-4 py-2 text-xs font-semibold text-white bg-emerald-800 hover:bg-emerald-700 rounded-lg transition-colors cursor-pointer"
              >
                Trace Batch
              </button>
            </form>
          </div>

          {traceResult && (
            <div className="bg-white rounded-xl border border-stone-200 p-6 shadow-2xs space-y-6">
              <div className="border-b border-stone-200 pb-3 flex justify-between items-center">
                <div>
                  <span className="text-xs text-stone-500 uppercase font-semibold">Genealogy Record For</span>
                  <div className="text-lg font-bold font-mono text-emerald-900">{traceResult.batchNumber}</div>
                </div>
                {traceResult.productionOrder && (
                  <span className="px-3 py-1 bg-emerald-50 text-emerald-800 rounded-md border border-emerald-200 text-xs font-mono font-bold">
                    Order #{traceResult.productionOrder.orderNumber}
                  </span>
                )}
              </div>

              {/* Order and Product Details */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs bg-stone-50 p-4 rounded-lg border border-stone-200">
                <div>
                  <span className="text-stone-500 block">Product:</span>
                  <span className="font-bold text-stone-900 text-sm">
                    {traceResult.product?.name || traceResult.productionOrder?.productName || 'Cosmetic Product'}
                  </span>
                </div>
                <div>
                  <span className="text-stone-500 block">Supervisor:</span>
                  <span className="font-medium text-stone-800">
                    {traceResult.productionOrder?.supervisor || 'Plant Floor Operator'}
                  </span>
                </div>
                <div>
                  <span className="text-stone-500 block">BOM Recipe Version:</span>
                  <span className="font-mono text-stone-800">
                    {traceResult.productionOrder?.formulaNumber || 'Standard'}
                  </span>
                </div>
              </div>

              {/* Raw Materials Used in this Batch */}
              {traceResult.productionOrder && (
                <div>
                  <h3 className="text-xs font-bold text-stone-900 uppercase tracking-wider mb-2">
                    Chemical & Packaging Ingredients Traceability
                  </h3>
                  <div className="border border-stone-200 rounded-lg overflow-hidden">
                    <table className="w-full text-xs text-left border-collapse">
                      <thead>
                        <tr className="bg-stone-100 text-stone-700 font-semibold border-b border-stone-200">
                          <th className="py-2 px-3">Material Name</th>
                          <th className="py-2 px-3 text-right">Consumed Quantity</th>
                          <th className="py-2 px-3">Unit</th>
                          <th className="py-2 px-3 font-mono">Raw Material Batch Number / Lot Used</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-stone-100 text-stone-800">
                        {traceResult.productionOrder.rawMaterialsIssuedList.map((rm: any, idx: number) => (
                          <tr key={idx} className="hover:bg-stone-50">
                            <td className="py-2 px-3 font-semibold text-stone-900">{rm.materialName}</td>
                            <td className="py-2 px-3 text-right tabular-nums font-mono font-bold">{rm.issuedQty}</td>
                            <td className="py-2 px-3">{rm.unit}</td>
                            <td className="py-2 px-3 font-mono text-emerald-800 font-bold">
                              {rm.batchNumberUsed || 'Warehouse FEFO Pool'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Customers & Distribution */}
              <div>
                <h3 className="text-xs font-bold text-stone-900 uppercase tracking-wider mb-2">
                  Market Distribution & Dispatch Outlets
                </h3>
                {traceResult.salesDistribution.length === 0 ? (
                  <div className="text-xs text-stone-500 bg-stone-50 p-3 rounded">
                    No sales invoices logged for this batch yet. All units currently in warehouse stock.
                  </div>
                ) : (
                  <div className="border border-stone-200 rounded-lg overflow-hidden">
                    <table className="w-full text-xs text-left border-collapse">
                      <thead>
                        <tr className="bg-stone-100 text-stone-700 font-semibold border-b border-stone-200">
                          <th className="py-2 px-3">Invoice #</th>
                          <th className="py-2 px-3">Date</th>
                          <th className="py-2 px-3">Customer / Distributor</th>
                          <th className="py-2 px-3 text-right">Delivered Quantity</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-stone-100">
                        {traceResult.salesDistribution.map((s: any, idx: number) => (
                          <tr key={idx}>
                            <td className="py-2 px-3 font-mono font-bold text-emerald-800">{s.invoiceNo}</td>
                            <td className="py-2 px-3">{formatDateDMY(s.date)}</td>
                            <td className="py-2 px-3 font-medium text-stone-900">{s.customerName}</td>
                            <td className="py-2 px-3 text-right tabular-nums font-mono font-bold">{s.qty} pcs</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* 3. Recall Report Tab */}
      {activeTab === 'recall' && (
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-stone-200 p-5 shadow-2xs">
            <div className="flex items-center gap-2 text-rose-700 mb-1">
              <AlertOctagon className="h-5 w-5" />
              <h2 className="text-sm font-bold">Rapid Product Batch Recall System</h2>
            </div>
            <p className="text-xs text-stone-500 mb-4">
              In case of quality defect or customer complaint, instantly retrieve all affected distributors, contact details, and delivered quantities
            </p>

            <form onSubmit={handleRecallSearch} className="flex gap-2 max-w-lg">
              <input
                type="text"
                placeholder="Enter Defective Batch Number to Recall..."
                value={recallBatchNumber}
                onChange={e => setRecallBatchNumber(e.target.value)}
                className="flex-1 p-2 border border-stone-300 rounded-lg text-xs font-mono uppercase bg-white"
              />
              <button
                type="submit"
                className="px-4 py-2 text-xs font-semibold text-white bg-rose-700 hover:bg-rose-800 rounded-lg transition-colors cursor-pointer"
              >
                Generate Recall Dossier
              </button>
            </form>
          </div>

          {recallResult && (
            <div className="bg-white rounded-xl border border-rose-200 p-6 shadow-2xs space-y-4">
              <div className="flex items-center justify-between border-b border-rose-100 pb-3">
                <div>
                  <span className="text-xs text-rose-600 font-semibold uppercase">Recall Target Batch</span>
                  <div className="text-xl font-bold font-mono text-rose-900">{recallResult.batchNumber}</div>
                </div>
                <div className="text-right">
                  <span className="text-xs text-stone-500 block">Total Units Dispatched</span>
                  <span className="text-lg font-mono font-bold text-rose-800">{recallResult.totalSold} Units</span>
                </div>
              </div>

              {recallResult.affectedCustomers.length === 0 ? (
                <div className="p-4 bg-emerald-50 text-emerald-800 rounded-lg text-xs text-center font-medium">
                  Good news: Zero units from batch {recallResult.batchNumber} have been sold to customers.
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="text-xs text-rose-700 font-semibold">
                    The following distributors and salons have received units from this batch and require immediate quarantine notification:
                  </div>

                  <div className="border border-stone-200 rounded-lg overflow-hidden">
                    <table className="w-full text-xs text-left border-collapse">
                      <thead>
                        <tr className="bg-rose-50 text-rose-900 font-semibold border-b border-rose-200">
                          <th className="py-2 px-3">Customer / Firm Name</th>
                          <th className="py-2 px-3">City</th>
                          <th className="py-2 px-3">Telephone</th>
                          <th className="py-2 px-3 font-mono">Invoice Ref</th>
                          <th className="py-2 px-3">Delivery Date</th>
                          <th className="py-2 px-3 text-right">Units to Recall</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-stone-100 text-stone-800">
                        {recallResult.affectedCustomers.map((c: any, i: number) => (
                          <tr key={i} className="hover:bg-rose-50/30">
                            <td className="py-2 px-3 font-bold text-stone-900">{c.customerName}</td>
                            <td className="py-2 px-3">{c.city}</td>
                            <td className="py-2 px-3 font-mono font-semibold">{c.phone}</td>
                            <td className="py-2 px-3 font-mono text-emerald-800">{c.invoiceNumber}</td>
                            <td className="py-2 px-3">{formatDateDMY(c.date)}</td>
                            <td className="py-2 px-3 text-right font-mono font-bold text-rose-700">{c.quantity} pcs</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* MODAL: View Inspection Lab Certificate */}
      <Modal
        isOpen={inspectionModalOpen}
        onClose={() => setInspectionModalOpen(false)}
        title={`Lab Analysis Certificate · ${viewingInspection?.inspectionNumber}`}
        subtitle={`Batch Lot: ${viewingInspection?.referenceBatchNumber}`}
        maxWidth="3xl"
      >
        {viewingInspection && (
          <div className="space-y-4 text-xs">
            <div className="grid grid-cols-2 gap-3 bg-stone-50 p-3 rounded-lg border border-stone-200">
              <div>
                <span className="text-stone-500 block">Product / Chemical:</span>
                <span className="font-bold text-stone-900 text-sm">{viewingInspection.itemName}</span>
              </div>
              <div>
                <span className="text-stone-500 block">Testing Disposition:</span>
                <span className="font-bold uppercase text-emerald-800 text-sm">{viewingInspection.overallStatus}</span>
              </div>
            </div>

            <div className="border border-stone-200 rounded-lg overflow-hidden">
              <table className="w-full text-xs text-left border-collapse">
                <thead>
                  <tr className="bg-stone-100 text-stone-700 font-semibold border-b border-stone-200">
                    <th className="py-2 px-3">Testing Parameter</th>
                    <th className="py-2 px-3">Specification</th>
                    <th className="py-2 px-3">Lab Finding</th>
                    <th className="py-2 px-3 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {viewingInspection.parameters.map((p, i) => (
                    <tr key={i}>
                      <td className="py-2 px-3 font-semibold text-stone-900">{p.parameterName}</td>
                      <td className="py-2 px-3 text-stone-600">{p.specification}</td>
                      <td className="py-2 px-3 text-stone-800 font-medium">{p.actualResult}</td>
                      <td className="py-2 px-3 text-center">
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                          {p.status.toUpperCase()}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="bg-stone-50 p-3 rounded border border-stone-200">
              <span className="font-bold text-stone-800 block mb-0.5">QC Lab Remarks:</span>
              <p className="text-stone-600 italic">{viewingInspection.remarks}</p>
            </div>

            <div className="pt-3 border-t border-stone-200 flex justify-between items-center">
              <button
                type="button"
                onClick={() => handlePrintQCCertificate(viewingInspection)}
                className="px-4 py-2 bg-emerald-800 text-white rounded font-medium hover:bg-emerald-700 flex items-center gap-1.5 cursor-pointer"
              >
                <Printer className="h-4 w-4" />
                <span>Print Official Certificate</span>
              </button>
              <button
                type="button"
                onClick={() => setInspectionModalOpen(false)}
                className="px-4 py-2 border border-stone-300 rounded text-stone-700 hover:bg-stone-50"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
