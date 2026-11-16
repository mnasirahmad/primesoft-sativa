import React, { useState } from 'react';
import { ERPDatabase, logAudit, syncDatabaseToServer, MySQLStatus } from '../services/storage';
import { Save, CheckCircle2, Globe, AlertCircle } from 'lucide-react';
import { Language } from '../types/erp';
import { DatabaseConfigPanel } from './DatabaseConfigPanel';

interface SystemSettingsProps {
  db: ERPDatabase;
  setDb: React.Dispatch<React.SetStateAction<ERPDatabase>>;
  language: Language;
  onToggleLanguage: () => void;
  mysqlConnected?: boolean;
  onMySQLStatusChange?: (status: MySQLStatus) => void;
  onMySQLSyncError?: (error?: string) => void;
}

export const SystemSettings: React.FC<SystemSettingsProps> = ({
  db,
  setDb,
  language,
  onToggleLanguage,
  mysqlConnected = false,
  onMySQLStatusChange,
  onMySQLSyncError,
}) => {
  const [formData, setFormData] = useState({
    name: db.company.name,
    businessType: db.company.businessType,
    address: db.company.address,
    phone: db.company.phone,
    email: db.company.email,
    ntn: db.company.ntn,
    strn: db.company.strn,
    currency: 'PKR',
    systemYear: '2026-27',
    softwareTitle: 'SATIVA COSMETICS – Manufacturing & Inventory ERP',
    developedBy: 'Prime Soft Vehari',
  });

  const [savedSuccess, setSavedSuccess] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaveError(null);
    setSavedSuccess(false);

    if (!mysqlConnected) {
      setSaveError('MySQL is not connected. Connect MySQL below before saving system settings.');
      return;
    }

    let updatedDb = {
      ...db,
      company: {
        ...db.company,
        ...formData,
      },
    };
    updatedDb = logAudit(updatedDb, 'System Settings', 'update', 'Updated ERP global configuration.');

    setIsSaving(true);
    const syncRes = await syncDatabaseToServer(updatedDb);
    setIsSaving(false);

    if (!syncRes.ok) {
      onMySQLSyncError?.(syncRes.error);
      setSaveError(syncRes.error || 'Failed to save system settings to MySQL.');
      return;
    }

    setDb(updatedDb);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  return (
    <div className="space-y-5">
      {/* Top Header Card */}
      <div className="bg-white rounded-xl border border-stone-200 p-5 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="bg-white p-2 rounded-xl border border-stone-200 shadow-2xs shrink-0">
            <img
              src="./assets/aistudio/sativa_b7dc1d13.webp"
              alt="Sativa Cosmetics"
              className="h-10 w-auto object-contain"
            />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider">
                System Configuration
              </span>
              <span className="text-xs text-stone-400">·</span>
              <span className="text-xs text-stone-500">Global Parameters & Localization</span>
            </div>
            <h1 className="text-lg font-bold text-stone-900 mt-0.5">
              ERP System Settings & Fiscal Parameters
            </h1>
            <p className="text-xs text-stone-500">
              Configure financial year, base currency (PKR), Pakistan date format (DD-MM-YYYY), and company branding
            </p>
          </div>
        </div>
      </div>

      {saveError && (
        <div className="p-3 bg-rose-50 border border-rose-200 text-rose-900 rounded-lg text-xs font-medium flex items-center gap-2">
          <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />
          <span>{saveError}</span>
        </div>
      )}

      {savedSuccess && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-lg text-xs font-medium flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-emerald-700" />
          <span>System configuration saved to MySQL successfully!</span>
        </div>
      )}

      {/* Settings Form Card */}
      <div className="bg-white rounded-xl border border-stone-200 p-6 shadow-2xs">
        <form onSubmit={handleSave} className="space-y-6 text-xs">
          {/* Section 1: Localization & Financial Year */}
          <div>
            <h2 className="text-xs font-bold text-stone-900 uppercase tracking-wider border-b border-stone-200 pb-2 mb-3">
              Fiscal Cycle & Localization
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block font-medium text-stone-700 mb-1">Fiscal Year</label>
                <input
                  type="text"
                  value={formData.systemYear}
                  onChange={e => setFormData({ ...formData, systemYear: e.target.value })}
                  className="w-full p-2 border border-stone-300 rounded font-mono font-bold text-emerald-900 bg-stone-50"
                />
              </div>

              <div>
                <label className="block font-medium text-stone-700 mb-1">Base Currency</label>
                <input
                  type="text"
                  readOnly
                  value="Pakistan Rupee (PKR - Rs.)"
                  className="w-full p-2 border border-stone-200 rounded font-bold text-stone-800 bg-stone-100"
                />
              </div>

              <div>
                <label className="block font-medium text-stone-700 mb-1">Standard Date Format</label>
                <input
                  type="text"
                  readOnly
                  value="DD-MM-YYYY (e.g. 12-11-2026)"
                  className="w-full p-2 border border-stone-200 rounded font-mono text-stone-800 bg-stone-100"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Language Preference */}
          <div>
            <h2 className="text-xs font-bold text-stone-900 uppercase tracking-wider border-b border-stone-200 pb-2 mb-3">
              Language Interface Preference
            </h2>
            <div className="flex items-center gap-4">
              <span className="text-stone-700">Active Language Interface:</span>
              <button
                type="button"
                onClick={onToggleLanguage}
                className="px-4 py-1.5 text-xs font-bold text-emerald-900 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 rounded-lg flex items-center gap-2 cursor-pointer"
              >
                <Globe className="h-4 w-4" />
                <span>{language === 'en' ? 'English (Current) · Switch to اردو' : 'اردو (فعال) · Switch to English'}</span>
              </button>
            </div>
          </div>

          {/* Section 3: Software & Developer Credits */}
          <div>
            <h2 className="text-xs font-bold text-stone-900 uppercase tracking-wider border-b border-stone-200 pb-2 mb-3">
              Software Credits & Licensing
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-medium text-stone-700 mb-1">Software Title</label>
                <input
                  type="text"
                  readOnly
                  value={formData.softwareTitle}
                  className="w-full p-2 border border-stone-200 rounded text-stone-700 bg-stone-100 font-semibold"
                />
              </div>

              <div>
                <label className="block font-medium text-stone-700 mb-1">Software Developed By</label>
                <input
                  type="text"
                  readOnly
                  value={formData.developedBy}
                  className="w-full p-2 border border-stone-200 rounded text-emerald-900 bg-stone-100 font-bold"
                />
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-stone-200 flex justify-end">
            <button
              type="submit"
              disabled={isSaving}
              className="inline-flex items-center gap-1.5 px-5 py-2 text-xs font-semibold text-white bg-emerald-800 hover:bg-emerald-700 rounded-lg shadow-2xs transition-colors cursor-pointer disabled:opacity-60"
            >
              <Save className="h-4 w-4" />
              <span>{isSaving ? 'Saving to MySQL...' : 'Save System Settings'}</span>
            </button>
          </div>
        </form>
      </div>

      {/* Live MySQL Database Configuration */}
      <DatabaseConfigPanel db={db} setDb={setDb} onStatusChange={onMySQLStatusChange} />
    </div>
  );
};
