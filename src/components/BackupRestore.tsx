import React, { useRef, useState } from 'react';
import {
  ERPDatabase,
  exportDatabaseBackup,
  importDatabaseBackup,
  getInitialDatabase,
  getCosmeticStarterTemplates,
  logAudit,
  syncDatabaseToServer,
  MySQLStatus,
} from '../services/storage';
import { getMySQLSchemaOnly, generateMySQLFullDump } from '../services/mysqlExport';
import { DatabaseConfigPanel } from './DatabaseConfigPanel';
import { Database, Download, Upload, RefreshCw, AlertTriangle, Sparkles, CheckCircle2, FileCode2, AlertCircle } from 'lucide-react';

interface BackupRestoreProps {
  db: ERPDatabase;
  setDb: React.Dispatch<React.SetStateAction<ERPDatabase>>;
  mysqlConnected?: boolean;
  onMySQLStatusChange?: (status: MySQLStatus) => void;
  onMySQLSyncError?: (error?: string) => void;
  onOpenMySQLConfig?: () => void;
}

export const BackupRestore: React.FC<BackupRestoreProps> = ({
  db,
  setDb,
  mysqlConnected = false,
  onMySQLStatusChange,
  onMySQLSyncError,
  onOpenMySQLConfig,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [statusBanner, setStatusBanner] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [pendingConfirm, setPendingConfirm] = useState<'reset' | 'templates' | null>(null);
  const [isBusy, setIsBusy] = useState(false);

  // 1. Download Backup
  const handleDownloadBackup = () => {
    const jsonStr = exportDatabaseBackup(db);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Sativa_Cosmetics_ERP_Backup_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    const updatedDb = logAudit(db, 'Backup', 'backup', 'Downloaded full database JSON snapshot.');
    setDb(updatedDb);
    setStatusBanner({ type: 'success', message: 'Database backup successfully generated and downloaded!' });
  };

  const triggerSQLDownload = (sqlContent: string, filename: string, auditMsg: string, successMsg: string) => {
    const blob = new Blob([sqlContent], { type: 'application/sql;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    const updatedDb = logAudit(db, 'Backup', 'backup', auditMsg);
    setDb(updatedDb);
    setStatusBanner({ type: 'success', message: successMsg });
  };

  const handleDownloadMySQLSchema = () => {
    triggerSQLDownload(
      getMySQLSchemaOnly(),
      'sativa_cosmetics_erp_mysql_schema.sql',
      'Exported MySQL relational schema DDL (.sql).',
      'MySQL schema file (sativa_cosmetics_erp_mysql_schema.sql) downloaded!'
    );
  };

  const handleDownloadMySQLDump = () => {
    triggerSQLDownload(
      generateMySQLFullDump(db),
      `Sativa_Cosmetics_MySQL_Dump_${new Date().toISOString().slice(0, 10)}.sql`,
      'Exported full MySQL schema and live ERP date/data records (.sql).',
      'Complete MySQL schema + live data & date records (.sql) downloaded!'
    );
  };

  // 2. Restore Backup directly to MySQL
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!mysqlConnected) {
      setStatusBanner({
        type: 'error',
        message: 'MySQL is not connected. Connect MySQL first before restoring a backup.',
      });
      e.target.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = async event => {
      setIsBusy(true);
      try {
        const content = event.target?.result as string;
        const restored = importDatabaseBackup(content);
        const updatedDb = logAudit(restored, 'Backup', 'backup', `Restored database from ${file.name}`);
        const syncRes = await syncDatabaseToServer(updatedDb);
        if (!syncRes.ok) {
          onMySQLSyncError?.(syncRes.error);
          setStatusBanner({
            type: 'error',
            message: syncRes.error || 'Failed to save restored backup to MySQL.',
          });
          return;
        }
        setDb(updatedDb);
        setStatusBanner({
          type: 'success',
          message: `Database successfully restored from ${file.name} and saved to MySQL!`,
        });
      } catch (err: any) {
        setStatusBanner({
          type: 'error',
          message: `Failed to restore backup: ${err.message || 'Corrupt JSON file'}`,
        });
      } finally {
        setIsBusy(false);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  // 3. Reset to Clean Master Data (zero opening balances) in MySQL
  const handleConfirmResetClean = async () => {
    if (!mysqlConnected) {
      setStatusBanner({
        type: 'error',
        message: 'MySQL is not connected. Connect MySQL before resetting the database.',
      });
      setPendingConfirm(null);
      return;
    }
    setIsBusy(true);
    const clean = getInitialDatabase();
    const syncRes = await syncDatabaseToServer(clean);
    setIsBusy(false);
    setPendingConfirm(null);
    if (!syncRes.ok) {
      onMySQLSyncError?.(syncRes.error);
      setStatusBanner({
        type: 'error',
        message: syncRes.error || 'Failed to reset MySQL database.',
      });
      return;
    }
    setDb(clean);
    setStatusBanner({
      type: 'success',
      message: 'MySQL database reset to clean master state with zero opening balances.',
    });
  };

  // 4. Load Cosmetics Industry Starter Master Templates into MySQL
  const handleConfirmLoadTemplates = async () => {
    if (!mysqlConnected) {
      setStatusBanner({
        type: 'error',
        message: 'MySQL is not connected. Connect MySQL before loading templates.',
      });
      setPendingConfirm(null);
      return;
    }
    setIsBusy(true);
    const templates = getCosmeticStarterTemplates();
    let updatedDb = {
      ...db,
      suppliers: db.suppliers.length > 0 ? db.suppliers : templates.sampleSuppliers,
      customers: db.customers.length > 0 ? db.customers : templates.sampleCustomers,
      rawMaterials: db.rawMaterials.length > 0 ? db.rawMaterials : templates.sampleRawMaterials,
      packagingMaterials:
        db.packagingMaterials.length > 0 ? db.packagingMaterials : templates.samplePackagingMaterials,
      finishedProducts:
        db.finishedProducts.length > 0 ? db.finishedProducts : templates.sampleFinishedProducts,
      formulas: db.formulas.length > 0 ? db.formulas : [templates.sampleFormula],
    };
    updatedDb = logAudit(
      updatedDb,
      'System',
      'create',
      'Loaded cosmetics industry standard master profiles and approved formula template.'
    );
    const syncRes = await syncDatabaseToServer(updatedDb);
    setIsBusy(false);
    setPendingConfirm(null);
    if (!syncRes.ok) {
      onMySQLSyncError?.(syncRes.error);
      setStatusBanner({
        type: 'error',
        message: syncRes.error || 'Failed to save templates to MySQL.',
      });
      return;
    }
    setDb(updatedDb);
    setStatusBanner({
      type: 'success',
      message: 'Cosmetics industry standard templates loaded and saved to MySQL with 0 opening balances!',
    });
  };

  return (
    <div className="space-y-6">
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
                Disaster Recovery & Data Integrity
              </span>
              <span className="text-xs text-stone-400">·</span>
              <span className="text-xs text-stone-500">MySQL Backup & Schema Hub</span>
            </div>
            <h1 className="text-lg font-bold text-stone-900 mt-0.5">
              Database Backup & Restore Hub
            </h1>
            <p className="text-xs text-stone-500">
              Export full MySQL state (profiles, formulas, batches, ledger, vouchers) or restore directly into your MySQL server
            </p>
          </div>
        </div>
      </div>

      {statusBanner && (
        <div
          className={`p-3 rounded-lg text-xs font-medium flex items-center justify-between gap-2 border ${
            statusBanner.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
              : 'bg-rose-50 border-rose-200 text-rose-900'
          }`}
        >
          <div className="flex items-center gap-2">
            {statusBanner.type === 'success' ? (
              <CheckCircle2 className="h-4 w-4 text-emerald-700 shrink-0" />
            ) : (
              <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />
            )}
            <span>{statusBanner.message}</span>
          </div>
          {statusBanner.type === 'error' && !mysqlConnected && onOpenMySQLConfig && (
            <button
              type="button"
              onClick={onOpenMySQLConfig}
              className="px-2.5 py-1 bg-rose-200/80 hover:bg-rose-300 text-rose-950 font-semibold rounded text-[11px] whitespace-nowrap cursor-pointer"
            >
              Configure MySQL
            </button>
          )}
        </div>
      )}

      {pendingConfirm && (
        <div className="p-4 bg-amber-50 border border-amber-300 rounded-xl text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start gap-2.5 text-amber-950">
            <AlertTriangle className="h-4 w-4 text-amber-700 shrink-0 mt-0.5" />
            <div>
              <div className="font-bold">
                {pendingConfirm === 'reset'
                  ? 'Confirm Clean Database Reset in MySQL'
                  : 'Confirm Loading Cosmetics Starter Templates into MySQL'}
              </div>
              <div className="mt-0.5 text-amber-900">
                {pendingConfirm === 'reset'
                  ? 'This will reset the live MySQL database to clean master data with zero opening balances. All current transactions will be cleared.'
                  : 'This will add standard cosmetics raw chemicals, packaging (with 0 opening stock), and a sample cream formula directly to MySQL.'}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              disabled={isBusy}
              onClick={() => setPendingConfirm(null)}
              className="px-3 py-1.5 bg-white hover:bg-stone-100 border border-stone-300 text-stone-700 font-semibold rounded-lg cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={isBusy}
              onClick={pendingConfirm === 'reset' ? handleConfirmResetClean : handleConfirmLoadTemplates}
              className={`px-3 py-1.5 font-semibold text-white rounded-lg cursor-pointer ${
                pendingConfirm === 'reset' ? 'bg-rose-700 hover:bg-rose-600' : 'bg-emerald-800 hover:bg-emerald-700'
              }`}
            >
              {isBusy ? 'Syncing MySQL...' : 'Confirm & Sync MySQL'}
            </button>
          </div>
        </div>
      )}

      {/* Main Operations Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Card 1: Download Backup */}
        <div className="bg-white rounded-xl border border-stone-200 p-6 shadow-2xs flex flex-col justify-between space-y-4">
          <div className="space-y-2">
            <div className="h-10 w-10 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center">
              <Download className="h-5 w-5" />
            </div>
            <h2 className="text-sm font-bold text-stone-900">Download Complete ERP Backup</h2>
            <p className="text-xs text-stone-600">
              Generates a full JSON snapshot of all master data, chemical batches, production orders, QC records, invoices, and balanced accounting vouchers.
            </p>
          </div>

          <div className="pt-2">
            <button
              onClick={handleDownloadBackup}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-semibold text-white bg-emerald-800 hover:bg-emerald-700 rounded-lg transition-colors cursor-pointer shadow-xs"
            >
              <Download className="h-4 w-4" />
              <span>Download Backup File (.json)</span>
            </button>
          </div>
        </div>

        {/* Card 2: Restore Backup */}
        <div className="bg-white rounded-xl border border-stone-200 p-6 shadow-2xs flex flex-col justify-between space-y-4">
          <div className="space-y-2">
            <div className="h-10 w-10 rounded-lg bg-blue-100 text-blue-800 flex items-center justify-center">
              <Upload className="h-5 w-5" />
            </div>
            <h2 className="text-sm font-bold text-stone-900">Restore Database to MySQL</h2>
            <p className="text-xs text-stone-600">
              Upload a previously saved Sativa Cosmetics backup file to restore and sync full system state into MySQL.
            </p>
          </div>

          <div className="pt-2">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept=".json"
              className="hidden"
            />
            <button
              disabled={isBusy}
              onClick={() => fileInputRef.current?.click()}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-semibold text-stone-800 bg-stone-100 hover:bg-stone-200 border border-stone-300 rounded-lg transition-colors cursor-pointer disabled:opacity-60"
            >
              <Upload className="h-4 w-4" />
              <span>{isBusy ? 'Syncing to MySQL...' : 'Select Backup File to Restore'}</span>
            </button>
          </div>
        </div>

        {/* Card 3: Cosmetics Industry Master Templates */}
        <div className="bg-white rounded-xl border border-stone-200 p-6 shadow-2xs flex flex-col justify-between space-y-4">
          <div className="space-y-2">
            <div className="h-10 w-10 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center">
              <Sparkles className="h-5 w-5" />
            </div>
            <h2 className="text-sm font-bold text-stone-900">
              Load Cosmetics Industry Starter Master Data
            </h2>
            <p className="text-xs text-stone-600">
              Populates standard cosmetic raw chemicals (Stearic Acid, Cetyl Alcohol, Glycerine, Rose Fragrance), packaging (50g jars, boxes), and an approved cream BOM formula with zero opening stock balances.
            </p>
          </div>

          <div className="pt-2">
            <button
              disabled={isBusy}
              onClick={() => setPendingConfirm('templates')}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-semibold text-amber-900 bg-amber-100 hover:bg-amber-200 border border-amber-300 rounded-lg transition-colors cursor-pointer disabled:opacity-60"
            >
              <Sparkles className="h-4 w-4" />
              <span>Load Cosmetics Industry Templates</span>
            </button>
          </div>
        </div>

        {/* Card 4: Clean Slate Reset */}
        <div className="bg-white rounded-xl border border-rose-200 p-6 shadow-2xs flex flex-col justify-between space-y-4">
          <div className="space-y-2">
            <div className="h-10 w-10 rounded-lg bg-rose-100 text-rose-800 flex items-center justify-center">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <h2 className="text-sm font-bold text-rose-900">Reset to Clean Database</h2>
            <p className="text-xs text-stone-600">
              Resets the MySQL database to a clean master foundation with zero opening balances, ready for live factory operations at the Vehari plant.
            </p>
          </div>

          <div className="pt-2">
            <button
              disabled={isBusy}
              onClick={() => setPendingConfirm('reset')}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg transition-colors cursor-pointer disabled:opacity-60"
            >
              <RefreshCw className="h-4 w-4" />
              <span>Reset Clean Database</span>
            </button>
          </div>
        </div>
      </div>

      {/* Live MySQL Database Configuration */}
      <DatabaseConfigPanel db={db} setDb={setDb} onStatusChange={onMySQLStatusChange} />

      {/* MySQL Relational Schema & SQL Export */}
      <div className="bg-white rounded-xl border border-stone-200 p-6 shadow-2xs space-y-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-stone-200 pb-4">
          <div className="flex items-start gap-3">
            <div className="h-10 w-10 rounded-lg bg-stone-900 text-emerald-400 flex items-center justify-center shrink-0">
              <Database className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-stone-900">
                MySQL 8.0+ / MariaDB Relational Tables & Date Schema
              </h2>
              <p className="text-xs text-stone-600 mt-0.5">
                34 normalized InnoDB tables with DATE, DATETIME, foreign keys, and FEFO expiry indexes ready for MySQL / phpMyAdmin import.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleDownloadMySQLSchema}
              className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-stone-800 bg-stone-100 hover:bg-stone-200 border border-stone-300 rounded-lg transition-colors whitespace-nowrap cursor-pointer"
            >
              <FileCode2 className="h-4 w-4" />
              <span>Download Schema (.sql)</span>
            </button>
            <button
              type="button"
              onClick={handleDownloadMySQLDump}
              className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-white bg-emerald-800 hover:bg-emerald-700 rounded-lg transition-colors whitespace-nowrap cursor-pointer shadow-xs"
            >
              <Download className="h-4 w-4" />
              <span>Export Full MySQL Dump (Schema + Data)</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
          {[
            { name: 'users & company_profile', dates: 'last_login, created_at (DATETIME)', desc: 'Login credentials, roles & company profile' },
            { name: 'raw_material_batches', dates: 'manufacturing_date, expiry_date (DATE)', desc: 'Chemical lot tracking & FEFO expiry index' },
            { name: 'packaging_material_batches', dates: 'received_date (DATE)', desc: 'Bottles, jars, labels & carton lots' },
            { name: 'finished_product_batches', dates: 'mfg_date, exp_date (DATE)', desc: 'Finished cosmetic batches & QC status' },
            { name: 'production_orders & formulas', dates: 'order_date, completion_date, approved_date (DATE)', desc: 'BOM recipes, compounding & output tracking' },
            { name: 'quality_inspections', dates: 'inspection_date (DATE)', desc: 'Lab QC parameters, pH & microbial logs' },
            { name: 'purchase_invoices & items', dates: 'invoice_date, mfg_date, expiry_date (DATE)', desc: 'Supplier bills & inward batch dates' },
            { name: 'sales_invoices & returns', dates: 'invoice_date, return_date (DATE)', desc: 'Customer billing, FEFO dispatch & returns' },
            { name: 'financial_vouchers & stock_ledger', dates: 'voucher_date, transaction_date, event_timestamp', desc: 'Double-entry GL, stock card & audit log' },
          ].map(tbl => (
            <div key={tbl.name} className="p-3 rounded-lg border border-stone-200 bg-stone-50/70">
              <div className="font-mono font-semibold text-stone-900 text-[11px]">{tbl.name}</div>
              <div className="text-[11px] text-emerald-800 font-medium mt-0.5">{tbl.dates}</div>
              <div className="text-[11px] text-stone-500 mt-0.5">{tbl.desc}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
