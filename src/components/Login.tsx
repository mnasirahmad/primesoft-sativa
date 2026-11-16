import React, { useState } from 'react';
import { ERPDatabase, authenticateUserWithServer, MySQLStatus } from '../services/storage';
import { Language } from '../types/erp';
import { Lock, User as UserIcon, Eye, EyeOff, AlertCircle, Globe, ArrowRight, CheckCircle2, Database } from 'lucide-react';
import { Modal } from './common/Modal';
import { DatabaseConfigPanel } from './DatabaseConfigPanel';

interface LoginProps {
  db: ERPDatabase;
  setDb: React.Dispatch<React.SetStateAction<ERPDatabase>>;
  language: Language;
  onToggleLanguage: () => void;
  onLoginSuccess: () => void;
  mysqlStatus: MySQLStatus;
  onMySQLStatusChange: (status: MySQLStatus) => void;
}

export const Login: React.FC<LoginProps> = ({
  db,
  setDb,
  language,
  onToggleLanguage,
  onLoginSuccess,
  mysqlStatus,
  onMySQLStatusChange,
}) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [dbConfigOpen, setDbConfigOpen] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsVerifying(true);

    const result = await authenticateUserWithServer(db, username, password);
    if (!result.success || !result.updatedDb) {
      setError(result.error || 'Invalid username or password.');
      if (result.mysqlUnavailable) {
        onMySQLStatusChange({
          ...mysqlStatus,
          connected: false,
          checking: false,
          error: result.error,
        });
      }
      setIsVerifying(false);
      return;
    }

    onMySQLStatusChange({ ...mysqlStatus, connected: true, checking: false });
    setDb(result.updatedDb);
    setIsVerifying(false);
    onLoginSuccess();
  };

  const handlePrefillAccount = (uname: string, pass: string) => {
    setUsername(uname);
    setPassword(pass);
    setError(null);
  };

  return (
    <div className="min-h-screen bg-stone-100 flex flex-col justify-between p-4 sm:p-6 lg:p-8">
      {/* Minimal Top Bar */}
      <div className="max-w-6xl w-full mx-auto flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="bg-white p-1.5 rounded-lg border border-stone-200 shadow-2xs shrink-0">
            <img
              src="./assets/aistudio/sativa_b7dc1d13.webp"
              alt="Sativa Cosmetics"
              referrerPolicy="no-referrer"
              className="h-8 w-auto object-contain"
            />
          </div>
          <div>
            <div className="text-sm font-bold text-stone-900 tracking-tight whitespace-nowrap">
              {db.company.name}
            </div>
            <div className="text-[11px] text-stone-500 whitespace-nowrap">
              {db.company.address}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {/* Live MySQL Status Badge */}
          <button
            type="button"
            onClick={() => setDbConfigOpen(true)}
            title={
              mysqlStatus.connected
                ? `Connected to ${mysqlStatus.database || 'MySQL'}`
                : mysqlStatus.error || 'Click to configure MySQL connection'
            }
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border shadow-2xs transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              mysqlStatus.checking
                ? 'bg-white text-stone-600 border-stone-200'
                : mysqlStatus.connected
                ? 'bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100'
                : 'bg-rose-50 text-rose-800 border-rose-300 hover:bg-rose-100'
            }`}
          >
            <span
              className={`h-2 w-2 rounded-full shrink-0 ${
                mysqlStatus.checking
                  ? 'bg-amber-500 animate-pulse'
                  : mysqlStatus.connected
                  ? 'bg-emerald-600'
                  : 'bg-rose-600'
              }`}
            />
            <span>
              {mysqlStatus.checking
                ? 'Checking MySQL...'
                : mysqlStatus.connected
                ? 'MySQL Connected'
                : 'MySQL Not Connected'}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setDbConfigOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-stone-700 bg-white hover:bg-stone-50 border border-stone-200 rounded-lg shadow-2xs transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Database className="h-3.5 w-3.5 text-emerald-800" />
            <span>MySQL Settings</span>
          </button>

          <button
            type="button"
            onClick={onToggleLanguage}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-stone-700 bg-white hover:bg-stone-50 border border-stone-200 rounded-lg shadow-2xs transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Globe className="h-3.5 w-3.5 text-emerald-800" />
            <span>{language === 'en' ? 'اردو' : 'English'}</span>
          </button>
        </div>
      </div>

      {/* Main Centered Split Container */}
      <div className="max-w-5xl w-full mx-auto my-8 grid grid-cols-1 lg:grid-cols-12 bg-white rounded-2xl border border-stone-200 shadow-sm overflow-hidden items-stretch">
        {/* Left Panel: Brand Identity & Facility Overview */}
        <div className="lg:col-span-6 bg-stone-900 text-stone-100 p-8 sm:p-10 flex flex-col justify-between gap-8">
          <div className="space-y-6">
            <div className="inline-block bg-white px-4 py-3 rounded-xl border border-stone-700/40 shadow-xs">
              <img
                src="./assets/aistudio/sativa_b7dc1d13.webp"
                alt="Sativa Cosmetics - No. 1 Cosmetics Brand"
                referrerPolicy="no-referrer"
                className="h-14 w-auto object-contain"
              />
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-2 text-xs text-emerald-400 font-semibold">
                <span>Enterprise Manufacturing & Inventory ERP</span>
                <span aria-hidden="true">·</span>
                <span className="font-mono tabular-nums">FY {db.company.systemYear}</span>
              </div>

              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white text-balance">
                {db.company.softwareTitle}
              </h1>

              <p className="text-sm text-stone-300 leading-relaxed">
                Integrated cosmetics plant operations for raw chemical inventory, formula BOM compounding,
                packaging control, batch quality assurance, sales billing, and double-entry accounting.
              </p>
            </div>
          </div>

          <div className="pt-6 border-t border-stone-800 space-y-3 text-xs">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-stone-400">Manufacturing Plant</div>
                <div className="font-medium text-stone-100 mt-0.5">{db.company.address}</div>
              </div>
              <div>
                <div className="text-stone-400">Software Partner</div>
                <div className="font-medium text-stone-100 mt-0.5">{db.company.developedBy}</div>
              </div>
            </div>
            <div className="flex items-center gap-2 text-[11px] text-stone-400 pt-1">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
              <span>Direct MySQL database authentication with live transaction persistence</span>
            </div>
          </div>
        </div>

        {/* Right Panel: MySQL Database Login Form */}
        <div className="lg:col-span-6 p-8 sm:p-10 flex flex-col justify-center">
          <div className="mb-6">
            <div className="flex items-center gap-2 text-xs text-stone-500">
              <span>Authorized Access</span>
              <span aria-hidden="true">·</span>
              <span>MySQL Server Authentication</span>
            </div>
            <h2 className="text-xl font-bold text-stone-900 mt-1">
              {language === 'ur' ? 'سسٹم لاگ ان' : 'Sign in to ERP System'}
            </h2>
            <p className="text-xs text-stone-500 mt-1">
              {language === 'ur'
                ? 'اپنا یوزر نام اور پاس ورڈ درج کر کے MySQL ڈیٹابیس سے تصدیق کریں'
                : 'Enter your username and password to verify credentials directly against MySQL.'}
            </p>
          </div>

          {!mysqlStatus.checking && !mysqlStatus.connected && (
            <div className="mb-4 p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-start justify-between gap-2.5">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-4 w-4 text-amber-700 shrink-0 mt-0.5" />
                <div>
                  <div className="font-semibold">MySQL Database Not Connected</div>
                  <div className="mt-0.5">
                    {mysqlStatus.error || 'Connect your MySQL database first to authenticate and load ERP data.'}
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setDbConfigOpen(true)}
                className="px-2.5 py-1 bg-amber-200/80 hover:bg-amber-300 text-amber-950 font-semibold rounded text-[11px] whitespace-nowrap shrink-0 cursor-pointer"
              >
                Configure
              </button>
            </div>
          )}

          {error && (
            <div
              role="alert"
              className="mb-5 p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2.5"
            >
              <AlertCircle className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <div className="font-semibold">Authentication Failed</div>
                <div className="mt-0.5">{error}</div>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="login-username"
                className="block text-xs font-semibold text-stone-700 mb-1.5"
              >
                {language === 'ur' ? 'یوزر نام (Username)' : 'Username or Email'}
              </label>
              <div className="relative">
                <UserIcon className="h-4 w-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  id="login-username"
                  type="text"
                  autoFocus
                  autoComplete="username"
                  required
                  value={username}
                  onChange={e => {
                    setUsername(e.target.value);
                    if (error) setError(null);
                  }}
                  placeholder="Enter username (e.g. admin)"
                  className="w-full pl-9 pr-3 py-2.5 text-sm bg-white border border-stone-300 rounded-lg text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-emerald-700 focus:border-emerald-700 transition-colors"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="login-password"
                className="block text-xs font-semibold text-stone-700 mb-1.5"
              >
                {language === 'ur' ? 'پاس ورڈ (Password)' : 'Password'}
              </label>
              <div className="relative">
                <Lock className="h-4 w-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={e => {
                    setPassword(e.target.value);
                    if (error) setError(null);
                  }}
                  placeholder="Enter your password"
                  className="w-full pl-9 pr-10 py-2.5 text-sm bg-white border border-stone-300 rounded-lg text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-emerald-700 focus:border-emerald-700 transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(prev => !prev)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-stone-400 hover:text-stone-700 rounded cursor-pointer"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isVerifying}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-emerald-800 hover:bg-emerald-700 disabled:opacity-60 rounded-lg shadow-2xs transition-colors whitespace-nowrap cursor-pointer mt-2"
            >
              <span>{isVerifying ? 'Confirming from MySQL...' : language === 'ur' ? 'لاگ ان کریں' : 'Confirm & Open ERP'}</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          </form>

          {/* Registered MySQL Database Users Directory Helper (only when connected to MySQL) */}
          {mysqlStatus.connected && (
            <div className="mt-7 pt-5 border-t border-stone-200">
              <div className="text-[11px] font-semibold text-stone-500 mb-2.5">
                MySQL Database Users ({db.users.filter(u => u.isActive).length} active) — click to fill
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {db.users
                  .filter(u => u.isActive)
                  .slice(0, 3)
                  .map(user => (
                    <button
                      key={user.id}
                      type="button"
                      onClick={() => handlePrefillAccount(user.username, user.password)}
                      className="text-left p-2.5 rounded-lg border border-stone-200 bg-stone-50 hover:bg-emerald-50 hover:border-emerald-300 transition-colors cursor-pointer"
                    >
                      <div className="text-[11px] font-bold text-stone-900 capitalize">{user.role}</div>
                      <div className="text-[11px] font-mono text-emerald-800 truncate mt-0.5">
                        {user.username}
                      </div>
                      <div className="text-[10px] font-mono text-stone-500 truncate">
                        pass: {user.password}
                      </div>
                    </button>
                  ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="max-w-6xl w-full mx-auto flex flex-col sm:flex-row items-center justify-between gap-2 text-[11px] text-stone-500">
        <span>
          {db.company.name} · {db.company.address}
        </span>
        <span>
          {db.company.developedBy} · System Year {db.company.systemYear}
        </span>
      </div>

      {/* In-App MySQL Database Configuration Modal */}
      <Modal
        isOpen={dbConfigOpen}
        onClose={() => setDbConfigOpen(false)}
        title="MySQL Database Configuration"
        subtitle="Connect and initialize Sativa Cosmetics ERP tables on your MySQL server"
        maxWidth="3xl"
      >
        <DatabaseConfigPanel
          db={db}
          setDb={setDb}
          compact
          onStatusChange={onMySQLStatusChange}
        />
      </Modal>
    </div>
  );
};
