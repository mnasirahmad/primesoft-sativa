import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  loadDatabase,
  getInitialDatabase,
  logAudit,
  checkMySQLHealth,
  fetchMySQLState,
  syncDatabaseToServer,
  ERPDatabase,
  MySQLStatus,
} from './services/storage';
import { Language, User } from './types/erp';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { Login } from './components/Login';
import { Dashboard } from './components/Dashboard';
import { CompanyProfiles } from './components/CompanyProfiles';
import { RawMaterials } from './components/RawMaterials';
import { PackagingMaterials } from './components/PackagingMaterials';
import { FinishedGoods } from './components/FinishedGoods';
import { FormulaBOM } from './components/FormulaBOM';
import { Production } from './components/Production';
import { QualityControl } from './components/QualityControl';
import { Purchases } from './components/Purchases';
import { Sales } from './components/Sales';
import { Accounting } from './components/Accounting';
import { ManufacturingCosting } from './components/ManufacturingCosting';
import { Reports } from './components/Reports';
import { UserManagement } from './components/UserManagement';
import { SystemSettings } from './components/SystemSettings';
import { BackupRestore } from './components/BackupRestore';
import { PrintDocumentModal, DocumentPrintData } from './components/PrintDocumentModal';
import { Modal } from './components/common/Modal';
import { DatabaseConfigPanel } from './components/DatabaseConfigPanel';
import { AlertCircle, Database, RefreshCw } from 'lucide-react';

export default function App() {
  const [db, setDb] = useState<ERPDatabase>(() => loadDatabase());
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [language, setLanguage] = useState<Language>('en');
  const [printDocument, setPrintDocument] = useState<DocumentPrintData | null>(null);
  const [mysqlStatus, setMysqlStatus] = useState<MySQLStatus>({
    connected: false,
    checking: true,
  });
  const [mysqlConfigModalOpen, setMysqlConfigModalOpen] = useState(false);

  const hasHydratedServerRef = useRef<boolean>(false);
  const skipNextSyncRef = useRef<boolean>(false);
  const isInitialRenderRef = useRef<boolean>(true);
  const wasConnectedRef = useRef<boolean>(false);

  const refreshMySQLState = useCallback(async (): Promise<boolean> => {
    setMysqlStatus(prev => ({ ...prev, checking: true }));
    const health = await checkMySQLHealth();
    if (!health.connected) {
      hasHydratedServerRef.current = true;
      wasConnectedRef.current = false;
      setMysqlStatus({ ...health, connected: false, checking: false });
      return false;
    }

    const stateRes = await fetchMySQLState();
    hasHydratedServerRef.current = true;

    if (!stateRes.connected) {
      wasConnectedRef.current = false;
      setMysqlStatus({
        ...health,
        connected: false,
        checking: false,
        error: stateRes.error || health.error,
        code: stateRes.code || health.code,
      });
      return false;
    }

    wasConnectedRef.current = true;
    setMysqlStatus({ ...health, connected: true, checking: false, error: undefined });

    if (stateRes.data) {
      skipNextSyncRef.current = true;
      setDb(stateRes.data);
    } else {
      const seed = getInitialDatabase();
      const seedRes = await syncDatabaseToServer(seed);
      if (!seedRes.ok) {
        wasConnectedRef.current = false;
        setMysqlStatus({
          ...health,
          connected: false,
          checking: false,
          error: seedRes.error,
          code: seedRes.code,
        });
        return false;
      }
      skipNextSyncRef.current = true;
      setDb(seed);
    }

    return true;
  }, []);

  // Hydrate latest ERP data exclusively from MySQL backend on startup
  useEffect(() => {
    refreshMySQLState();
  }, [refreshMySQLState]);

  // Sync state changes exclusively to MySQL backend API (no localStorage)
  useEffect(() => {
    if (isInitialRenderRef.current) {
      isInitialRenderRef.current = false;
      return;
    }
    if (skipNextSyncRef.current) {
      skipNextSyncRef.current = false;
      return;
    }
    if (!hasHydratedServerRef.current) return;

    const timer = setTimeout(async () => {
      const res = await syncDatabaseToServer(db);
      if (!res.ok) {
        wasConnectedRef.current = false;
        setMysqlStatus(prev => ({
          ...prev,
          connected: false,
          checking: false,
          error: res.error || 'Failed to save changes to MySQL.',
          code: res.code,
        }));
      } else {
        wasConnectedRef.current = true;
        setMysqlStatus(prev =>
          prev.connected && !prev.checking
            ? prev
            : { ...prev, connected: true, checking: false, error: undefined }
        );
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [db]);

  const handleMySQLStatusChange = useCallback(
    (nextStatus: MySQLStatus) => {
      const becameConnected = nextStatus.connected && !wasConnectedRef.current;
      wasConnectedRef.current = nextStatus.connected;
      setMysqlStatus({ ...nextStatus, checking: false });
      if (becameConnected) {
        refreshMySQLState();
      }
    },
    [refreshMySQLState]
  );

  const handleMySQLSyncError = useCallback((error?: string) => {
    wasConnectedRef.current = false;
    setMysqlStatus(prev => ({
      ...prev,
      connected: false,
      checking: false,
      error: error || 'MySQL write failed.',
    }));
  }, []);

  // Active User
  const activeUser: User =
    db.users.find(u => u.id === db.activeUserId) || db.users[0] || {
      id: 'user-admin',
      username: 'admin',
      password: 'sativa123',
      name: 'M. Nadeem (Administrator)',
      email: 'admin@sativa.pk',
      role: 'admin',
      department: 'Executive',
      phone: '',
      isActive: true,
    };

  const handleToggleLanguage = () => {
    setLanguage((prev: Language) => (prev === 'en' ? 'ur' : 'en'));
  };

  const handleLogout = () => {
    if (mysqlStatus.connected) {
      setDb(prev =>
        logAudit(prev, 'Authentication', 'logout', `User ${activeUser.name} (${activeUser.username}) signed out.`)
      );
    }
    setIsAuthenticated(false);
    setActiveTab('dashboard');
  };

  if (!isAuthenticated) {
    return (
      <Login
        db={db}
        setDb={setDb}
        language={language}
        onToggleLanguage={handleToggleLanguage}
        onLoginSuccess={() => {
          setActiveTab('dashboard');
          setIsAuthenticated(true);
        }}
        mysqlStatus={mysqlStatus}
        onMySQLStatusChange={handleMySQLStatusChange}
      />
    );
  }

  // Badge calculations
  const lowStockCount =
    db.rawMaterials.filter(rm => rm.availableStock <= rm.minimumStockLevel).length +
    db.packagingMaterials.filter(p => p.availableStock <= p.minimumStockLevel).length +
    db.finishedProducts.filter(fp => fp.availableStock <= fp.minimumStockLevel).length;

  const pendingOrdersCount = db.productionOrders.filter(
    o => o.status === 'pending' || o.status === 'in_progress'
  ).length;

  const qcAlertsCount = db.qualityInspections.filter(q => q.overallStatus === 'rejected').length;

  return (
    <div className={`min-h-screen bg-stone-100 flex flex-col font-sans ${language === 'ur' ? 'font-sans' : ''}`}>
      {/* Top Bar Header strictly following Top Bar Contract */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        activeUser={activeUser}
        language={language}
        onToggleLanguage={handleToggleLanguage}
        onQuickNewProduction={() => setActiveTab('production')}
        onLogout={handleLogout}
        mysqlStatus={mysqlStatus}
        onOpenMySQLConfig={() => setMysqlConfigModalOpen(true)}
      />

      {/* Global Top Notice when MySQL is Not Connected */}
      {!mysqlStatus.checking && !mysqlStatus.connected && (
        <div className="no-print bg-rose-950 text-rose-100 border-b border-rose-800 px-6 py-2.5 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-rose-400 shrink-0" />
            <span className="font-semibold">MySQL Not Connected:</span>
            <span className="text-rose-200">
              Local backend is disabled. All postings, sales, purchases, and live reports require an active MySQL connection.
              {mysqlStatus.error ? ` (${mysqlStatus.error})` : ''}
            </span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => refreshMySQLState()}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-rose-900 hover:bg-rose-800 border border-rose-700 rounded text-[11px] font-semibold cursor-pointer"
            >
              <RefreshCw className="h-3 w-3" />
              <span>Retry</span>
            </button>
            <button
              type="button"
              onClick={() => setMysqlConfigModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1 bg-white text-rose-950 hover:bg-rose-100 rounded text-[11px] font-bold cursor-pointer"
            >
              <Database className="h-3 w-3" />
              <span>Configure MySQL</span>
            </button>
          </div>
        </div>
      )}

      {/* Main Workspace: Sidebar + Content Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar Navigation */}
        <Sidebar
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          language={language}
          userRole={activeUser.role}
          badgeCounts={{
            lowStock: lowStockCount,
            pendingOrders: pendingOrdersCount,
            qcAlerts: qcAlertsCount,
          }}
        />

        {/* Content Viewport */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          <div className="max-w-7xl mx-auto">
            {activeTab === 'dashboard' && (
              <Dashboard db={db} onNavigate={tab => setActiveTab(tab)} language={language} />
            )}

            {activeTab === 'company_profiles' && (
              <CompanyProfiles
                db={db}
                setDb={setDb}
                onPrintDocument={doc => setPrintDocument(doc)}
              />
            )}

            {activeTab === 'raw_materials' && (
              <RawMaterials
                db={db}
                setDb={setDb}
                onPrintDocument={doc => setPrintDocument(doc)}
              />
            )}

            {activeTab === 'packaging_materials' && (
              <PackagingMaterials
                db={db}
                setDb={setDb}
                onPrintDocument={doc => setPrintDocument(doc)}
              />
            )}

            {activeTab === 'finished_goods' && (
              <FinishedGoods
                db={db}
                setDb={setDb}
                onPrintDocument={doc => setPrintDocument(doc)}
              />
            )}

            {activeTab === 'formula_bom' && (
              <FormulaBOM
                db={db}
                setDb={setDb}
                onPrintDocument={doc => setPrintDocument(doc)}
                onPlanProductionOrder={() => setActiveTab('production')}
              />
            )}

            {activeTab === 'production' && (
              <Production
                db={db}
                setDb={setDb}
                onPrintDocument={doc => setPrintDocument(doc)}
              />
            )}

            {activeTab === 'quality_control' && (
              <QualityControl
                db={db}
                setDb={setDb}
                onPrintDocument={doc => setPrintDocument(doc)}
              />
            )}

            {activeTab === 'purchases' && (
              <Purchases
                db={db}
                setDb={setDb}
                onPrintDocument={doc => setPrintDocument(doc)}
                mysqlConnected={mysqlStatus.connected}
                onMySQLSyncError={handleMySQLSyncError}
                onOpenMySQLConfig={() => setMysqlConfigModalOpen(true)}
              />
            )}

            {activeTab === 'sales' && (
              <Sales
                db={db}
                setDb={setDb}
                onPrintDocument={doc => setPrintDocument(doc)}
                mysqlConnected={mysqlStatus.connected}
                onMySQLSyncError={handleMySQLSyncError}
                onOpenMySQLConfig={() => setMysqlConfigModalOpen(true)}
              />
            )}

            {activeTab === 'accounting' && (
              <Accounting
                db={db}
                setDb={setDb}
                onPrintDocument={doc => setPrintDocument(doc)}
              />
            )}

            {activeTab === 'costing' && (
              <ManufacturingCosting
                db={db}
                onPrintDocument={doc => setPrintDocument(doc)}
              />
            )}

            {activeTab === 'reports' && (
              <Reports
                db={db}
                onPrintDocument={doc => setPrintDocument(doc)}
                mysqlStatus={mysqlStatus}
                onRefreshFromMySQL={refreshMySQLState}
                onOpenMySQLConfig={() => setMysqlConfigModalOpen(true)}
              />
            )}

            {activeTab === 'users' && (
              <UserManagement db={db} setDb={setDb} />
            )}

            {activeTab === 'settings' && (
              <SystemSettings
                db={db}
                setDb={setDb}
                language={language}
                onToggleLanguage={handleToggleLanguage}
                mysqlConnected={mysqlStatus.connected}
                onMySQLStatusChange={handleMySQLStatusChange}
                onMySQLSyncError={handleMySQLSyncError}
              />
            )}

            {activeTab === 'backup_restore' && (
              <BackupRestore
                db={db}
                setDb={setDb}
                mysqlConnected={mysqlStatus.connected}
                onMySQLStatusChange={handleMySQLStatusChange}
                onMySQLSyncError={handleMySQLSyncError}
                onOpenMySQLConfig={() => setMysqlConfigModalOpen(true)}
              />
            )}

            {/* Official Sativa Footer Card */}
            <footer className="mt-8 pt-6 pb-2 border-t border-stone-200/80 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-stone-500">
              <div className="flex items-center gap-3">
                <div className="bg-white p-1 rounded-md border border-stone-200 shadow-2xs">
                  <img
                    src="./assets/aistudio/sativa_b7dc1d13.webp"
                    alt="Sativa Cosmetics"
                    className="h-6 w-auto object-contain"
                  />
                </div>
                <div>
                  <span className="font-semibold text-stone-700">SATIVA COSMETICS</span>
                  <span className="mx-1.5 text-stone-300">·</span>
                  <span>5-KM Multan Road, Vehari, Pakistan</span>
                </div>
              </div>
              <div className="flex items-center gap-2 text-[11px] text-stone-400">
                <span>Developed by Prime Soft Vehari</span>
                <span>·</span>
                <span>System Year: 2026-27</span>
              </div>
            </footer>
          </div>
        </main>
      </div>

      {/* Global Print Document Modal */}
      <PrintDocumentModal
        isOpen={!!printDocument}
        onClose={() => setPrintDocument(null)}
        document={printDocument}
      />

      {/* Global MySQL Configuration Modal */}
      <Modal
        isOpen={mysqlConfigModalOpen}
        onClose={() => setMysqlConfigModalOpen(false)}
        title="MySQL Database Configuration"
        subtitle="Connect and manage Sativa Cosmetics ERP MySQL server"
        maxWidth="3xl"
      >
        <DatabaseConfigPanel
          db={db}
          setDb={setDb}
          compact
          onStatusChange={handleMySQLStatusChange}
        />
      </Modal>
    </div>
  );
}
