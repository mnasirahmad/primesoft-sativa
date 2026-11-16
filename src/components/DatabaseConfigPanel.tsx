import React, { useEffect, useState } from 'react';
import { ERPDatabase, fetchDatabaseFromServer, logAudit, MySQLStatus } from '../services/storage';
import {
  Database,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  RefreshCw,
  Save,
  Server,
  UploadCloud,
  DownloadCloud,
} from 'lucide-react';

interface DatabaseConfigPanelProps {
  db: ERPDatabase;
  setDb: React.Dispatch<React.SetStateAction<ERPDatabase>>;
  compact?: boolean;
  onStatusChange?: (status: MySQLStatus) => void;
}

interface ConnectionStatus {
  connected: boolean;
  version?: string;
  database?: string;
  tableCount?: number;
  tables?: string[];
  error?: string;
  code?: string;
}

export const DatabaseConfigPanel: React.FC<DatabaseConfigPanelProps> = ({
  db,
  setDb,
  compact = false,
  onStatusChange,
}) => {
  const [host, setHost] = useState('');
  const [port, setPort] = useState('3306');
  const [database, setDatabase] = useState('');
  const [user, setUser] = useState('');
  const [password, setPassword] = useState('');
  const [hasSavedPassword, setHasSavedPassword] = useState(false);
  const [ssl, setSsl] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const [loadingConfig, setLoadingConfig] = useState(true);
  const [busyAction, setBusyAction] = useState<'test' | 'save' | 'init' | 'pull' | null>(null);
  const [status, setStatus] = useState<ConnectionStatus | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(
    null
  );

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await fetch('/api/db/config?check=1');
        if (!res.ok) return;
        const data = await res.json();
        if (!active) return;
        setHost(data.host || '');
        setPort(String(data.port || 3306));
        setDatabase(data.database || '');
        setUser(data.user || '');
        setSsl(Boolean(data.ssl));
        setHasSavedPassword(Boolean(data.hasPassword));
        if (data.status) {
          const nextStatus: ConnectionStatus = {
            ...data.status,
            tableCount: data.status.tables?.length ?? 0,
          };
          setStatus(nextStatus);
          onStatusChange?.({
            connected: Boolean(nextStatus.connected),
            host: data.host,
            port: data.port,
            database: nextStatus.database || data.database,
            version: nextStatus.version,
            tableCount: nextStatus.tableCount,
            error: nextStatus.error,
            code: nextStatus.code,
          });
        }
      } catch {
        // ignore fetch error when offline
      } finally {
        if (active) setLoadingConfig(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const payloadConfig = () => ({
    host: host.trim(),
    port: Number(port) || 3306,
    database: database.trim(),
    user: user.trim(),
    password,
    ssl,
  });

  const handleTestConnection = async () => {
    setBusyAction('test');
    setFeedback(null);
    try {
      const res = await fetch('/api/db/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payloadConfig()),
      });
      const data = await res.json();
      const nextStatus: ConnectionStatus = {
        connected: Boolean(data.connected),
        version: data.version,
        database: data.database,
        tableCount: data.tables?.length ?? 0,
        tables: data.tables,
        error: data.error,
        code: data.code,
      };
      setStatus(nextStatus);
      onStatusChange?.({
        connected: nextStatus.connected,
        host: host.trim(),
        port: Number(port) || 3306,
        database: nextStatus.database || database.trim(),
        version: nextStatus.version,
        tableCount: nextStatus.tableCount,
        error: nextStatus.error,
        code: nextStatus.code,
      });
      if (data.connected) {
        setFeedback({
          type: 'success',
          message: `Connected to ${data.database} (${data.version}) — ${data.tables?.length ?? 0} tables found.`,
        });
      } else {
        setFeedback({
          type: 'error',
          message: data.error || 'Connection failed.',
        });
      }
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err?.message || 'Unable to reach ERP backend server.',
      });
    } finally {
      setBusyAction(null);
    }
  };

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusyAction('save');
    setFeedback(null);
    try {
      const res = await fetch('/api/db/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payloadConfig()),
      });
      const data = await res.json();
      if (!res.ok) {
        setFeedback({ type: 'error', message: data.error || 'Failed to save configuration.' });
        return;
      }
      setHasSavedPassword(Boolean(data.config?.hasPassword));
      setPassword('');
      const nextStatus: ConnectionStatus = {
        connected: Boolean(data.connected),
        version: data.version,
        database: data.database,
        tableCount: data.tables?.length ?? 0,
        tables: data.tables,
        error: data.error,
        code: data.code,
      };
      setStatus(nextStatus);
      onStatusChange?.({
        connected: nextStatus.connected,
        host: host.trim(),
        port: Number(port) || 3306,
        database: nextStatus.database || database.trim(),
        version: nextStatus.version,
        tableCount: nextStatus.tableCount,
        error: nextStatus.error,
        code: nextStatus.code,
      });

      if (data.connected) {
        setDb(prev =>
          logAudit(prev, 'System Settings', 'update', `Updated & connected MySQL database ${data.database} on ${host}.`)
        );
        setFeedback({
          type: 'success',
          message: `MySQL configuration saved and connected to ${data.database} (${data.version}).`,
        });
      } else {
        setFeedback({
          type: 'error',
          message: `Configuration saved, but connection failed: ${data.error || 'Check host/credentials/Remote MySQL IP allowlist.'}`,
        });
      }
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err?.message || 'Error saving MySQL configuration.',
      });
    } finally {
      setBusyAction(null);
    }
  };

  const handleInitTablesAndSync = async () => {
    setBusyAction('init');
    setFeedback(null);
    try {
      const res = await fetch('/api/db/init-tables', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          config: payloadConfig(),
          erpState: db,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        const failStatus: ConnectionStatus = {
          connected: false,
          error: data.error,
          code: data.code,
        };
        setStatus(failStatus);
        onStatusChange?.({
          connected: false,
          host: host.trim(),
          port: Number(port) || 3306,
          database: database.trim(),
          error: data.error,
          code: data.code,
        });
        setFeedback({
          type: 'error',
          message: data.error || 'Failed to create tables & sync data.',
        });
        return;
      }

      setHasSavedPassword(true);
      setPassword('');
      const okStatus: ConnectionStatus = {
        connected: true,
        database,
        tableCount: data.tableCount,
        tables: data.tables,
      };
      setStatus(okStatus);
      onStatusChange?.({
        connected: true,
        host: host.trim(),
        port: Number(port) || 3306,
        database: database.trim(),
        tableCount: data.tableCount,
      });
      setDb(prev =>
        logAudit(
          prev,
          'Backup',
          'create',
          `Initialized ${data.tableCount} MySQL tables and synced ERP data to ${database}.`
        )
      );
      setFeedback({
        type: 'success',
        message: `Created/verified ${data.tableCount} MySQL tables and synced all ERP data & dates.`,
      });
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err?.message || 'Error initializing MySQL tables.',
      });
    } finally {
      setBusyAction(null);
    }
  };

  const handlePullFromMySQL = async () => {
    setBusyAction('pull');
    setFeedback(null);
    try {
      const serverDb = await fetchDatabaseFromServer();
      if (!serverDb) {
        setFeedback({
          type: 'error',
          message: 'No synced snapshot found in MySQL yet, or MySQL is unreachable.',
        });
        return;
      }
      setDb(serverDb);
      setFeedback({
        type: 'success',
        message: 'Successfully loaded latest ERP records and users from MySQL.',
      });
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err?.message || 'Failed to pull data from MySQL.',
      });
    } finally {
      setBusyAction(null);
    }
  };

  return (
    <div className={compact ? 'space-y-4' : 'bg-white rounded-xl border border-stone-200 p-6 shadow-2xs space-y-5'}>
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-stone-200 pb-4">
        <div className="flex items-start gap-3">
          <div className="h-9 w-9 rounded-lg bg-stone-900 text-emerald-400 flex items-center justify-center shrink-0">
            <Server className="h-4 w-4" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-stone-900">MySQL Database Configuration</h2>
            <p className="text-xs text-stone-500 mt-0.5">
              Configure your MySQL Host, Port, Database Name, Username, and Password directly inside the app
            </p>
          </div>
        </div>

        {/* Connection State Label */}
        {!loadingConfig && status && (
          <div className="flex items-center gap-1.5 text-xs font-semibold shrink-0">
            {status.connected ? (
              <span className="inline-flex items-center gap-1.5 text-emerald-800">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                <span>Connected ({status.tableCount ?? 0} tables)</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 text-rose-700">
                <AlertCircle className="h-4 w-4 text-rose-600" />
                <span>Disconnected {status.code ? `(${status.code})` : ''}</span>
              </span>
            )}
          </div>
        )}
      </div>

      {/* Feedback Banner */}
      {feedback && (
        <div
          role="alert"
          className={`p-3 rounded-lg border text-xs flex items-start gap-2.5 ${
            feedback.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
              : 'bg-rose-50 border-rose-200 text-rose-900'
          }`}
        >
          {feedback.type === 'success' ? (
            <CheckCircle2 className="h-4 w-4 text-emerald-700 shrink-0 mt-0.5" />
          ) : (
            <AlertCircle className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
          )}
          <div className="space-y-1">
            <div className="font-medium">{feedback.message}</div>
            {feedback.type === 'error' && status?.code === 'ER_ACCESS_DENIED_ERROR' && (
              <div className="text-[11px] text-rose-800">
                Verify the MySQL password in your hosting panel (e.g. StackCP → MySQL Databases) and ensure Remote MySQL Access permits incoming connections from this host IP.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Credentials Form */}
      <form onSubmit={handleSaveConfig} className="space-y-4 text-xs">
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3.5">
          <div className="sm:col-span-6">
            <label className="block font-semibold text-stone-700 mb-1">MySQL Host / IP *</label>
            <input
              type="text"
              required
              value={host}
              onChange={e => setHost(e.target.value)}
              placeholder="e.g. mysql.gb.stackcp.com or 127.0.0.1"
              className="w-full p-2.5 border border-stone-300 rounded-lg font-mono text-stone-900 focus:outline-none focus:ring-2 focus:ring-emerald-700"
            />
          </div>

          <div className="sm:col-span-2">
            <label className="block font-semibold text-stone-700 mb-1">Port *</label>
            <input
              type="number"
              required
              value={port}
              onChange={e => setPort(e.target.value)}
              placeholder="3306"
              className="w-full p-2.5 border border-stone-300 rounded-lg font-mono text-stone-900 tabular-nums focus:outline-none focus:ring-2 focus:ring-emerald-700"
            />
          </div>

          <div className="sm:col-span-4">
            <label className="block font-semibold text-stone-700 mb-1">Database Name *</label>
            <input
              type="text"
              required
              value={database}
              onChange={e => setDatabase(e.target.value)}
              placeholder="sativa_cosmetics_erp"
              className="w-full p-2.5 border border-stone-300 rounded-lg font-mono text-stone-900 focus:outline-none focus:ring-2 focus:ring-emerald-700"
            />
          </div>

          <div className="sm:col-span-6">
            <label className="block font-semibold text-stone-700 mb-1">MySQL Username *</label>
            <input
              type="text"
              required
              value={user}
              onChange={e => setUser(e.target.value)}
              placeholder="e.g. nasir-sativa"
              className="w-full p-2.5 border border-stone-300 rounded-lg font-mono text-stone-900 focus:outline-none focus:ring-2 focus:ring-emerald-700"
            />
          </div>

          <div className="sm:col-span-6">
            <label className="block font-semibold text-stone-700 mb-1">
              MySQL Password {hasSavedPassword ? '(Saved — enter new to change)' : '*'}
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                required={!hasSavedPassword}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder={hasSavedPassword ? 'Leave blank to keep saved password' : 'Enter MySQL password'}
                className="w-full p-2.5 pr-9 border border-stone-300 rounded-lg font-mono text-stone-900 focus:outline-none focus:ring-2 focus:ring-emerald-700"
              />
              <button
                type="button"
                onClick={() => setShowPassword(p => !p)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-700 p-1 cursor-pointer"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between gap-4 pt-1">
          <label className="inline-flex items-center gap-2 text-stone-700 font-medium cursor-pointer select-none">
            <input
              type="checkbox"
              checked={ssl}
              onChange={e => setSsl(e.target.checked)}
              className="rounded border-stone-300 text-emerald-800 focus:ring-emerald-700"
            />
            <span>Use SSL / TLS encrypted connection</span>
          </label>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5 pt-3 border-t border-stone-200">
          <button
            type="button"
            disabled={busyAction !== null}
            onClick={handleTestConnection}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-stone-800 bg-stone-100 hover:bg-stone-200 border border-stone-300 rounded-lg transition-colors whitespace-nowrap cursor-pointer disabled:opacity-60"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${busyAction === 'test' ? 'animate-spin' : ''}`} />
            <span>{busyAction === 'test' ? 'Testing...' : 'Test Connection'}</span>
          </button>

          <button
            type="submit"
            disabled={busyAction !== null}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-emerald-800 hover:bg-emerald-700 rounded-lg transition-colors whitespace-nowrap cursor-pointer shadow-2xs disabled:opacity-60"
          >
            <Save className="h-3.5 w-3.5" />
            <span>{busyAction === 'save' ? 'Saving...' : 'Save & Connect'}</span>
          </button>

          <button
            type="button"
            disabled={busyAction !== null}
            onClick={handleInitTablesAndSync}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-stone-900 bg-amber-400 hover:bg-amber-300 rounded-lg transition-colors whitespace-nowrap cursor-pointer shadow-2xs disabled:opacity-60"
          >
            <UploadCloud className="h-3.5 w-3.5" />
            <span>{busyAction === 'init' ? 'Creating Tables...' : 'Create Tables & Sync Data'}</span>
          </button>

          <button
            type="button"
            disabled={busyAction !== null}
            onClick={handlePullFromMySQL}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-stone-700 bg-white hover:bg-stone-50 border border-stone-300 rounded-lg transition-colors whitespace-nowrap cursor-pointer disabled:opacity-60"
          >
            <DownloadCloud className="h-3.5 w-3.5" />
            <span>{busyAction === 'pull' ? 'Loading...' : 'Load Data from MySQL'}</span>
          </button>
        </div>
      </form>
    </div>
  );
};
