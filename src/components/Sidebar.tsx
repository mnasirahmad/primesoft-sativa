import React from 'react';
import {
  LayoutDashboard,
  Building2,
  FlaskConical,
  Package,
  Sparkles,
  ScrollText,
  Factory,
  ShieldCheck,
  ShoppingBag,
  TrendingUp,
  Receipt,
  Calculator,
  BarChart3,
  Users,
  Settings,
  Database,
  AlertTriangle,
} from 'lucide-react';
import { Language, UserRole } from '../types/erp';
import { translations } from '../utils/translations';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  language: Language;
  userRole: UserRole;
  badgeCounts: {
    lowStock: number;
    pendingOrders: number;
    qcAlerts: number;
  };
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  language,
  userRole,
  badgeCounts,
}) => {
  const t = translations[language];

  const menuItems = [
    { id: 'dashboard', label: t.dashboard, icon: LayoutDashboard },
    { id: 'company_profiles', label: t.companyProfiles, icon: Building2 },
    {
      id: 'raw_materials',
      label: t.rawMaterials,
      icon: FlaskConical,
      badge: badgeCounts.lowStock > 0 ? badgeCounts.lowStock : undefined,
      badgeColor: 'bg-amber-500 text-stone-900',
    },
    { id: 'packaging_materials', label: t.packagingMaterials, icon: Package },
    { id: 'finished_goods', label: t.finishedGoods, icon: Sparkles },
    { id: 'formula_bom', label: t.formulaBOM, icon: ScrollText },
    {
      id: 'production',
      label: t.production,
      icon: Factory,
      badge: badgeCounts.pendingOrders > 0 ? badgeCounts.pendingOrders : undefined,
      badgeColor: 'bg-emerald-500 text-white',
    },
    {
      id: 'quality_control',
      label: t.qualityControl,
      icon: ShieldCheck,
      badge: badgeCounts.qcAlerts > 0 ? badgeCounts.qcAlerts : undefined,
      badgeColor: 'bg-rose-500 text-white',
    },
    { id: 'purchases', label: t.purchases, icon: ShoppingBag },
    { id: 'sales', label: t.sales, icon: TrendingUp },
    {
      id: 'accounting',
      label: t.accounting,
      icon: Receipt,
      restrictedRoles: ['operator'], // Operators can't access financial ledgers per business rule
    },
    { id: 'costing', label: t.costing, icon: Calculator },
    {
      id: 'reports',
      label: t.reports,
      icon: BarChart3,
      restrictedRoles: ['operator'], // Operators restricted from confidential reports
    },
    {
      id: 'users',
      label: t.userManagement,
      icon: Users,
      restrictedRoles: ['operator', 'manager'],
    },
    { id: 'settings', label: t.settings, icon: Settings },
    {
      id: 'backup_restore',
      label: t.backupRestore,
      icon: Database,
      restrictedRoles: ['operator'],
    },
  ];

  return (
    <aside className="no-print w-64 bg-stone-950 text-stone-300 border-r border-stone-800 flex flex-col shrink-0 select-none">
      {/* Plant Info Sub-header with Official Logo */}
      <div className="p-4 border-b border-stone-800/80 bg-stone-900/60">
        <div className="bg-white rounded-lg p-2 mb-3 shadow-xs flex items-center justify-center border border-stone-700/40">
          <img
            src="./assets/aistudio/sativa_b7dc1d13.webp"
            alt="Sativa Cosmetics - No. 1 Cosmetics Brand"
            className="h-10 w-auto object-contain"
          />
        </div>
        <div className="text-[11px] font-semibold text-emerald-400 uppercase tracking-wider">
          Manufacturing Facility
        </div>
        <div className="text-xs text-stone-200 font-medium truncate mt-0.5">
          5-KM Multan Road, Vehari
        </div>
        <div className="text-[10px] text-stone-400 flex items-center justify-between mt-1">
          <span>Active Role:</span>
          <span className="font-mono uppercase font-bold text-amber-400">{userRole}</span>
        </div>
      </div>

      {/* Navigation List */}
      <div className="flex-1 overflow-y-auto py-2 px-2.5 space-y-0.5">
        {menuItems.map(item => {
          const isRestricted = item.restrictedRoles?.includes(userRole);
          if (isRestricted) return null;

          const isActive = activeTab === item.id;
          const Icon = item.icon;

          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                isActive
                  ? 'bg-emerald-900/60 text-white border border-emerald-600/30 font-semibold shadow-xs'
                  : 'text-stone-300 hover:bg-stone-900 hover:text-white'
              }`}
            >
              <div className="flex items-center gap-2.5 truncate">
                <Icon
                  className={`h-4 w-4 shrink-0 ${
                    isActive ? 'text-amber-400' : 'text-stone-400'
                  }`}
                />
                <span className="truncate">{item.label}</span>
              </div>

              {item.badge !== undefined && (
                <span
                  className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${item.badgeColor}`}
                >
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Footer Branding */}
      <div className="p-3 border-t border-stone-800/80 bg-stone-900/60 text-center">
        <div className="text-[10px] text-stone-400 font-medium">
          Sativa Cosmetics ERP v26.1
        </div>
        <div className="text-[9px] text-emerald-500 font-mono mt-0.5">
          Powered by Prime Soft Vehari
        </div>
      </div>
    </aside>
  );
};
