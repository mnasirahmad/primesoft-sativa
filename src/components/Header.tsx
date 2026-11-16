import React from 'react';
import { User, Language } from '../types/erp';
import { MySQLStatus } from '../services/storage';
import { translations } from '../utils/translations';
import { Globe, LogOut, UserCheck, Factory, Database } from 'lucide-react';

interface HeaderProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  activeUser: User;
  language: Language;
  onToggleLanguage: () => void;
  onQuickNewProduction: () => void;
  onLogout: () => void;
  mysqlStatus: MySQLStatus;
  onOpenMySQLConfig: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  activeUser,
  language,
  onToggleLanguage,
  onQuickNewProduction,
  onLogout,
  mysqlStatus,
  onOpenMySQLConfig,
}) => {
  const t = translations[language];

  return (
    <header className="no-print sticky top-0 z-40 flex items-center justify-between gap-4 px-6 py-3.5 bg-stone-900 border-b border-stone-800 text-stone-100 shadow-md">
      {/* Zone 1: Brand Title (Single text element wordmark, one line) */}
      <div className="flex items-center gap-3 shrink-0">
        <div className="bg-white/95 px-2 py-1 rounded-lg border border-white/30 shadow-xs flex items-center justify-center">
          <img
            src="./assets/aistudio/sativa_b7dc1d13.webp"
            alt="Sativa Cosmetics"
            className="h-7 w-auto object-contain"
          />
        </div>
        <div className="flex flex-col">
          <span className="text-base font-bold tracking-tight text-white whitespace-nowrap shrink-0">
            Sativa Cosmetics ERP
          </span>
          <span className="text-[10px] text-emerald-400 font-medium tracking-wider whitespace-nowrap">
            VEHARI · SYSTEM 2026-27
          </span>
        </div>
      </div>

      {/* Zone 2: 4-5 concise single-line nav links */}
      <nav className="hidden lg:flex items-center gap-5 text-xs font-medium text-stone-300">
        <button
          type="button"
          onClick={() => setActiveTab('dashboard')}
          className={`hover:text-emerald-400 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
            activeTab === 'dashboard' ? 'text-emerald-400 font-semibold' : ''
          }`}
        >
          {t.dashboard}
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('production')}
          className={`hover:text-emerald-400 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
            activeTab === 'production' ? 'text-emerald-400 font-semibold' : ''
          }`}
        >
          {t.production}
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('formula_bom')}
          className={`hover:text-emerald-400 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
            activeTab === 'formula_bom' ? 'text-emerald-400 font-semibold' : ''
          }`}
        >
          {t.formulaBOM}
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('raw_materials')}
          className={`hover:text-emerald-400 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
            activeTab === 'raw_materials' || activeTab === 'packaging_materials' || activeTab === 'finished_goods'
              ? 'text-emerald-400 font-semibold'
              : ''
          }`}
        >
          Inventory
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('sales')}
          className={`hover:text-emerald-400 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
            activeTab === 'sales' ? 'text-emerald-400 font-semibold' : ''
          }`}
        >
          {t.sales}
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('accounting')}
          className={`hover:text-emerald-400 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
            activeTab === 'accounting' ? 'text-emerald-400 font-semibold' : ''
          }`}
        >
          {t.accounting}
        </button>
      </nav>

      {/* Zone 3: MySQL Connection Indicator + Primary Action & Utility Switchers */}
      <div className="flex items-center gap-2.5 shrink-0">
        {/* Live MySQL Status Badge */}
        <button
          type="button"
          onClick={onOpenMySQLConfig}
          title={
            mysqlStatus.connected
              ? `MySQL Connected${mysqlStatus.database ? ` (${mysqlStatus.database})` : ''} — Click to manage MySQL Settings`
              : `MySQL Not Connected${mysqlStatus.error ? `: ${mysqlStatus.error}` : ''} — Click to configure MySQL`
          }
          className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-md border transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
            mysqlStatus.checking
              ? 'bg-stone-800 text-stone-300 border-stone-700'
              : mysqlStatus.connected
              ? 'bg-emerald-950/80 text-emerald-300 border-emerald-700/70 hover:bg-emerald-900/80'
              : 'bg-rose-950/90 text-rose-300 border-rose-700/80 hover:bg-rose-900/80'
          }`}
        >
          <span
            className={`h-2 w-2 rounded-full shrink-0 ${
              mysqlStatus.checking
                ? 'bg-amber-400 animate-pulse'
                : mysqlStatus.connected
                ? 'bg-emerald-400'
                : 'bg-rose-500'
            }`}
          />
          <Database className="h-3.5 w-3.5 shrink-0" />
          <span>
            {mysqlStatus.checking
              ? 'Checking MySQL...'
              : mysqlStatus.connected
              ? 'MySQL Connected'
              : 'MySQL Not Connected'}
          </span>
        </button>

        {/* Language Switcher */}
        <button
          type="button"
          onClick={onToggleLanguage}
          className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-stone-300 bg-stone-800 hover:bg-stone-700 rounded-md border border-stone-700 transition-colors cursor-pointer"
          title="Switch Language (English / اردو)"
        >
          <Globe className="h-3.5 w-3.5 text-emerald-400" />
          <span>{language === 'en' ? 'اردو' : 'English'}</span>
        </button>

        {/* Authenticated User & Logout */}
        <div className="hidden xl:flex items-center gap-2 px-2.5 py-1 text-xs bg-stone-800/80 border border-stone-700 rounded-md text-stone-200 whitespace-nowrap shrink-0">
          <UserCheck className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
          <span className="font-medium max-w-[140px] truncate">{activeUser.name}</span>
          <span className="text-stone-500">·</span>
          <span className="font-mono text-[10px] uppercase font-bold text-amber-400">{activeUser.role}</span>
        </div>

        <button
          type="button"
          onClick={onLogout}
          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-stone-200 bg-stone-800 hover:bg-rose-900/80 hover:text-white border border-stone-700 hover:border-rose-700 rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          title="Sign out to Login screen"
        >
          <LogOut className="h-3.5 w-3.5" />
          <span>{language === 'ur' ? 'لاگ آؤٹ' : 'Logout'}</span>
        </button>

        {/* Primary Action Button */}
        <button
          type="button"
          onClick={onQuickNewProduction}
          className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-stone-900 bg-amber-400 hover:bg-amber-300 rounded-lg shadow-sm transition-colors whitespace-nowrap shrink-0 cursor-pointer"
        >
          <Factory className="h-3.5 w-3.5" />
          <span>New Production Order</span>
        </button>
      </div>
    </header>
  );
};
