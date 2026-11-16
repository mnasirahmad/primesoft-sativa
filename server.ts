import 'dotenv/config';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  isMySQLConfigured,
  ensureMySQLSchema,
  getMySQLPool,
  getActiveMySQLConfig,
  saveMySQLConfig,
  testMySQLConnection,
} from './server/db.ts';
import {
  authenticateAgainstMySQL,
  loadERPStateFromMySQL,
  syncERPStateToMySQL,
} from './server/erpSync.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const port = Number(process.env.PORT || 3000);

  app.use(express.json({ limit: '15mb' }));

  // Health & MySQL connectivity check
  app.get('/api/health', async (_req, res) => {
    if (!isMySQLConfigured()) {
      res.json({ ok: true, mysqlConnected: false, reason: 'MySQL configuration not set.' });
      return;
    }

    const cfg = getActiveMySQLConfig();
    const testResult = await testMySQLConnection();
    res.json({
      ok: true,
      mysqlConnected: testResult.connected,
      host: cfg.host,
      port: cfg.port,
      database: cfg.database,
      version: testResult.version,
      tableCount: testResult.tables?.length || 0,
      error: testResult.error,
      code: testResult.code,
    });
  });

  // Get current MySQL configuration (password masked)
  app.get('/api/db/config', async (req, res) => {
    const cfg = getActiveMySQLConfig();
    const status = req.query.check === '1' ? await testMySQLConnection() : null;
    res.json({
      host: cfg.host,
      port: cfg.port,
      user: cfg.user,
      database: cfg.database,
      ssl: cfg.ssl,
      hasPassword: Boolean(cfg.password),
      status,
    });
  });

  // Save MySQL configuration and test connection
  app.post('/api/db/config', async (req, res) => {
    try {
      const { host, port: dbPort, user, password, database, ssl } = req.body || {};
      if (!host || !user || !database) {
        res.status(400).json({ error: 'MySQL Host, Username, and Database Name are required.' });
        return;
      }

      const saved = await saveMySQLConfig({
        host: String(host),
        port: Number(dbPort || 3306),
        user: String(user),
        password: password !== undefined ? String(password) : '',
        database: String(database),
        ssl: Boolean(ssl),
      });

      const testResult = await testMySQLConnection();
      res.json({
        saved: true,
        config: {
          host: saved.host,
          port: saved.port,
          user: saved.user,
          database: saved.database,
          ssl: saved.ssl,
          hasPassword: Boolean(saved.password),
        },
        ...testResult,
      });
    } catch (err: any) {
      res.status(500).json({
        saved: false,
        connected: false,
        error: err?.message || 'Failed to save MySQL configuration.',
      });
    }
  });

  // Test MySQL connection with provided credentials (or saved credentials)
  app.post('/api/db/test', async (req, res) => {
    const { host, port: dbPort, user, password, database, ssl } = req.body || {};
    const result = await testMySQLConnection({
      host,
      port: dbPort ? Number(dbPort) : undefined,
      user,
      password,
      database,
      ssl,
    });
    res.json(result);
  });

  // Initialize MySQL tables & sync current ERP data
  app.post('/api/db/init-tables', async (req, res) => {
    try {
      const { config, erpState } = req.body || {};
      if (config && config.host && config.user && config.database) {
        await saveMySQLConfig({
          host: String(config.host),
          port: Number(config.port || 3306),
          user: String(config.user),
          password: config.password !== undefined ? String(config.password) : '',
          database: String(config.database),
          ssl: Boolean(config.ssl),
        });
      }

      await ensureMySQLSchema();
      if (erpState && erpState.company && Array.isArray(erpState.users)) {
        await syncERPStateToMySQL(erpState);
      }

      const [tblRows] = await getMySQLPool().query<any[]>('SHOW TABLES');
      const tables = tblRows.map((row) => String(Object.values(row)[0]));

      res.json({
        success: true,
        connected: true,
        tableCount: tables.length,
        tables,
      });
    } catch (err: any) {
      res.status(503).json({
        success: false,
        connected: false,
        error: err?.message || 'Failed to initialize MySQL tables.',
        code: err?.code,
      });
    }
  });

  // Load ERP State from MySQL
  app.get('/api/erp/state', async (_req, res) => {
    if (!isMySQLConfigured()) {
      res.status(503).json({ connected: false, error: 'MySQL is not configured.' });
      return;
    }

    try {
      const data = await loadERPStateFromMySQL();
      res.json({ connected: true, data });
    } catch (err: any) {
      res.status(503).json({
        connected: false,
        error: err?.message || 'MySQL connection failed',
        code: err?.code,
      });
    }
  });

  // Sync ERP State to MySQL relational tables + snapshot
  app.put('/api/erp/state', async (req, res) => {
    if (!isMySQLConfigured()) {
      res.status(503).json({ connected: false, error: 'MySQL is not configured.' });
      return;
    }

    try {
      const dbPayload = req.body;
      if (!dbPayload || !dbPayload.company || !Array.isArray(dbPayload.users)) {
        res.status(400).json({ error: 'Invalid ERP database payload.' });
        return;
      }
      await syncERPStateToMySQL(dbPayload);
      res.json({ connected: true, savedAt: new Date().toISOString() });
    } catch (err: any) {
      res.status(503).json({
        connected: false,
        error: err?.message || 'MySQL sync failed',
        code: err?.code,
      });
    }
  });

  // Authenticate User against MySQL users table
  app.post('/api/auth/login', async (req, res) => {
    const { username, password } = req.body || {};
    if (!username || !password) {
      res.status(400).json({ success: false, error: 'Please enter both username and password.' });
      return;
    }

    if (!isMySQLConfigured()) {
      res.status(503).json({ success: false, mysqlUnavailable: true, error: 'MySQL not configured.' });
      return;
    }

    try {
      const result = await authenticateAgainstMySQL(String(username), String(password));
      res.status(result.success ? 200 : 401).json(result);
    } catch (err: any) {
      res.status(503).json({
        success: false,
        mysqlUnavailable: true,
        error: err?.message || 'MySQL unreachable',
        code: err?.code,
      });
    }
  });

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(port, '0.0.0.0', () => {
    console.log(`Sativa Cosmetics ERP server running on http://0.0.0.0:${port}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start Sativa Cosmetics ERP server:', err);
  process.exit(1);
});
