import React from 'react';
import { Printer, X } from 'lucide-react';
import { formatPKR, formatDateDMY } from '../utils/formatters';

export interface DocumentPrintData {
  type: 'sales_invoice' | 'purchase_invoice' | 'production_sheet' | 'qc_report' | 'voucher' | 'material_issue';
  docNumber: string;
  date: string;
  title: string;
  parties?: {
    partyName: string;
    partyType: string; // e.g. Customer, Supplier, Department
    address?: string;
    phone?: string;
    ntn?: string;
  };
  details: {
    label: string;
    value: string | number;
  }[];
  tableHeaders: string[];
  tableRows: (string | number)[][];
  summaryRows?: {
    label: string;
    value: string;
    isBold?: boolean;
  }[];
  narration?: string;
  signatories?: string[];
}

interface PrintDocumentModalProps {
  isOpen: boolean;
  onClose: () => void;
  document: DocumentPrintData | null;
}

export const PrintDocumentModal: React.FC<PrintDocumentModalProps> = ({
  isOpen,
  onClose,
  document,
}) => {
  if (!isOpen || !document) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-stone-900/60 backdrop-blur-xs transition-opacity no-print"
        onClick={onClose}
      />

      {/* Container */}
      <div className="flex min-h-screen items-center justify-center p-2 sm:p-6">
        <div className="relative w-full max-w-4xl bg-white rounded-xl shadow-2xl border border-stone-200 overflow-hidden print-card">
          {/* Action Bar (Hidden in Print) */}
          <div className="no-print flex items-center justify-between border-b border-stone-200 bg-stone-100 px-6 py-3">
            <span className="text-xs font-semibold text-stone-700 uppercase tracking-wider">
              Document Preview · {document.title}
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={handlePrint}
                className="inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-medium text-white bg-emerald-800 rounded-lg hover:bg-emerald-900 shadow-sm transition-colors cursor-pointer"
              >
                <Printer className="h-4 w-4" />
                <span>Print Document</span>
              </button>
              <button
                onClick={onClose}
                className="rounded-lg p-1.5 text-stone-400 hover:bg-stone-200 hover:text-stone-700 transition-colors cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Printable Document Paper */}
          <div className="p-8 sm:p-10 text-stone-900 font-sans print:p-0">
            {/* Header */}
            <div className="border-b-2 border-emerald-900 pb-4 mb-6">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-4">
                  <div className="bg-white p-1.5 rounded-lg border border-stone-200 shrink-0 shadow-2xs">
                    <img
                      src="./assets/aistudio/sativa_b7dc1d13.webp"
                      alt="Sativa Cosmetics - No. 1 Cosmetics Brand"
                      className="h-16 w-auto object-contain"
                    />
                  </div>
                  <div>
                    <h1 className="text-2xl font-bold tracking-tight text-emerald-950 font-sans">
                      SATIVA COSMETICS
                    </h1>
                    <p className="text-xs text-stone-600 mt-0.5">
                      Cosmetics Manufacturing & Processing Plant
                    </p>
                    <p className="text-xs text-stone-600">
                      5-KM Multan Road, Vehari, Pakistan · Phone: +92 67 3624510 / +92 300 7712345
                    </p>
                    <p className="text-[11px] text-stone-500">
                      NTN: 7392810-4 · STRN: 3277876123456 · System Year: 2026-27
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="inline-block border border-emerald-800 bg-emerald-50 text-emerald-900 font-semibold px-3 py-1 rounded text-xs uppercase tracking-wider">
                    {document.title}
                  </div>
                  <div className="mt-2 text-xs text-stone-600 space-y-0.5">
                    <div>
                      <span className="font-semibold text-stone-800">Doc No: </span>
                      <span className="font-mono">{document.docNumber}</span>
                    </div>
                    <div>
                      <span className="font-semibold text-stone-800">Date: </span>
                      <span className="font-mono">{formatDateDMY(document.date)}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Parties & Details Strip */}
            <div className="grid grid-cols-2 gap-4 mb-6 text-xs bg-stone-50 p-4 rounded-lg border border-stone-200">
              {document.parties && (
                <div>
                  <span className="text-stone-500 uppercase tracking-wider font-semibold text-[10px]">
                    {document.parties.partyType} Information
                  </span>
                  <div className="font-semibold text-stone-900 text-sm mt-0.5">
                    {document.parties.partyName}
                  </div>
                  {document.parties.address && (
                    <div className="text-stone-600 mt-0.5">{document.parties.address}</div>
                  )}
                  {document.parties.phone && (
                    <div className="text-stone-600">Phone: {document.parties.phone}</div>
                  )}
                  {document.parties.ntn && (
                    <div className="text-stone-600">NTN / STRN: {document.parties.ntn}</div>
                  )}
                </div>
              )}

              <div>
                <span className="text-stone-500 uppercase tracking-wider font-semibold text-[10px]">
                  Transaction Specifications
                </span>
                <div className="mt-1 grid grid-cols-2 gap-x-2 gap-y-1">
                  {document.details.map((d, i) => (
                    <div key={i} className="text-xs">
                      <span className="text-stone-500">{d.label}: </span>
                      <span className="font-semibold text-stone-800 font-mono">{d.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Document Line Items Table */}
            <div className="mb-6 border border-stone-200 rounded-lg overflow-hidden">
              <table className="w-full text-xs text-left border-collapse">
                <thead>
                  <tr className="bg-stone-100 text-stone-700 font-semibold border-b border-stone-200">
                    {document.tableHeaders.map((h, i) => (
                      <th
                        key={i}
                        className={`py-2 px-3 ${
                          h.toLowerCase().includes('amount') ||
                          h.toLowerCase().includes('rate') ||
                          h.toLowerCase().includes('price') ||
                          h.toLowerCase().includes('cost') ||
                          h.toLowerCase().includes('debit') ||
                          h.toLowerCase().includes('credit')
                            ? 'text-right'
                            : ''
                        }`}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100 text-stone-800">
                  {document.tableRows.map((row, rIdx) => (
                    <tr key={rIdx} className="hover:bg-stone-50">
                      {row.map((val, cIdx) => (
                        <td
                          key={cIdx}
                          className={`py-2 px-3 ${
                            typeof val === 'number' || (typeof val === 'string' && val.startsWith('Rs.'))
                              ? 'text-right tabular-nums'
                              : ''
                          }`}
                        >
                          {typeof val === 'number' ? formatPKR(val) : val}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Summary & Narration */}
            <div className="flex flex-col sm:flex-row justify-between items-start gap-6 mb-8 text-xs">
              <div className="flex-1 text-stone-600 bg-stone-50 p-3 rounded border border-stone-200">
                <div className="font-semibold text-stone-800 mb-1">Notes / Narration:</div>
                <p className="italic">
                  {document.narration ||
                    'All goods manufactured & tested under cosmetic GMP standards at Sativa Cosmetics Vehari plant.'}
                </p>
              </div>

              {document.summaryRows && (
                <div className="w-64 space-y-1.5 bg-stone-50 p-3 rounded border border-stone-200 text-xs">
                  {document.summaryRows.map((sr, i) => (
                    <div
                      key={i}
                      className={`flex justify-between ${
                        sr.isBold ? 'font-bold text-stone-900 border-t border-stone-300 pt-1 text-sm' : 'text-stone-600'
                      }`}
                    >
                      <span>{sr.label}:</span>
                      <span className="font-mono tabular-nums">{sr.value}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Signatures & Seal Box */}
            <div className="mt-12 pt-6 border-t border-stone-300 grid grid-cols-4 gap-4 text-center text-xs">
              {(
                document.signatories || [
                  'Prepared By / Store Keeper',
                  'Quality Control Officer',
                  'Plant Manager',
                  'Managing Director',
                ]
              ).map((sig, i) => (
                <div key={i} className="flex flex-col items-center">
                  <div className="w-full border-b border-stone-400 mb-2 h-8"></div>
                  <span className="text-stone-700 font-medium text-[11px]">{sig}</span>
                  <span className="text-stone-400 text-[10px]">Sign & Stamp</span>
                </div>
              ))}
            </div>

            {/* Software Footer */}
            <div className="mt-8 text-center border-t border-stone-200 pt-3 text-[10px] text-stone-400">
              SATIVA COSMETICS – Manufacturing & Inventory ERP · Powered by Prime Soft Vehari
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
