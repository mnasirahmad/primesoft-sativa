import 'dotenv/config';
import mysql, { Pool, RowDataPacket } from 'mysql2/promise';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const CONFIG_FILE_PATH = path.resolve(__dirname, 'mysql-config.json');

export interface MySQLConnectionConfig {
  host: string;
  port: number;
  user: string;
  password: string;
  database: string;
  ssl: boolean;
}

declare global {
  var _mysqlPool: Pool | undefined;
  var _schemaInitialized: boolean | undefined;
}

export function getActiveMySQLConfig(): MySQLConnectionConfig {
  let fileConfig: Partial<MySQLConnectionConfig> = {};
  try {
    if (fs.existsSync(CONFIG_FILE_PATH)) {
      const raw = fs.readFileSync(CONFIG_FILE_PATH, 'utf-8');
      fileConfig = JSON.parse(raw);
    }
  } catch {
    fileConfig = {};
  }

  return {
    host: (fileConfig.host ?? process.env.MYSQL_HOST ?? '').trim(),
    port: Number(fileConfig.port ?? process.env.MYSQL_PORT ?? 3306),
    user: (fileConfig.user ?? process.env.MYSQL_USER ?? '').trim(),
    password: fileConfig.password ?? process.env.MYSQL_PASSWORD ?? '',
    database: (fileConfig.database ?? process.env.MYSQL_DATABASE ?? '').trim(),
    ssl: Boolean(fileConfig.ssl ?? false),
  };
}

export async function saveMySQLConfig(next: Partial<MySQLConnectionConfig>): Promise<MySQLConnectionConfig> {
  const current = getActiveMySQLConfig();
  const merged: MySQLConnectionConfig = {
    host: next.host !== undefined ? next.host.trim() : current.host,
    port: next.port !== undefined ? Number(next.port) || 3306 : current.port,
    user: next.user !== undefined ? next.user.trim() : current.user,
    password:
      next.password !== undefined && next.password !== ''
        ? next.password
        : current.password,
    database: next.database !== undefined ? next.database.trim() : current.database,
    ssl: next.ssl !== undefined ? Boolean(next.ssl) : current.ssl,
  };

  fs.writeFileSync(CONFIG_FILE_PATH, JSON.stringify(merged, null, 2), 'utf-8');
  await resetMySQLPool();
  return merged;
}

export async function resetMySQLPool(): Promise<void> {
  if (global._mysqlPool) {
    try {
      await global._mysqlPool.end();
    } catch {
      // ignore close errors
    }
    global._mysqlPool = undefined;
  }
  global._schemaInitialized = false;
}

export function isMySQLConfigured(): boolean {
  const cfg = getActiveMySQLConfig();
  return Boolean(cfg.host && cfg.user && cfg.database);
}

export function getMySQLPool(): Pool {
  if (!global._mysqlPool) {
    const cfg = getActiveMySQLConfig();
    global._mysqlPool = mysql.createPool({
      host: cfg.host,
      port: cfg.port || 3306,
      user: cfg.user,
      password: cfg.password,
      database: cfg.database,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
      connectTimeout: 15000,
      multipleStatements: true,
      ...(cfg.ssl ? { ssl: { rejectUnauthorized: false } } : {}),
    });
  }
  return global._mysqlPool;
}

export async function testMySQLConnection(override?: Partial<MySQLConnectionConfig>): Promise<{
  connected: boolean;
  version?: string;
  database?: string;
  tables?: string[];
  error?: string;
  code?: string;
}> {
  const active = getActiveMySQLConfig();
  const cfg: MySQLConnectionConfig = {
    host: override?.host !== undefined ? override.host.trim() : active.host,
    port: override?.port !== undefined ? Number(override.port) || 3306 : active.port,
    user: override?.user !== undefined ? override.user.trim() : active.user,
    password:
      override?.password !== undefined && override.password !== ''
        ? override.password
        : active.password,
    database: override?.database !== undefined ? override.database.trim() : active.database,
    ssl: override?.ssl !== undefined ? Boolean(override.ssl) : active.ssl,
  };

  if (!cfg.host || !cfg.user || !cfg.database) {
    return {
      connected: false,
      error: 'Host, Username, and Database Name are required.',
      code: 'MISSING_CONFIG',
    };
  }

  let conn: mysql.Connection | undefined;
  try {
    conn = await mysql.createConnection({
      host: cfg.host,
      port: cfg.port || 3306,
      user: cfg.user,
      password: cfg.password,
      database: cfg.database,
      connectTimeout: 12000,
      ...(cfg.ssl ? { ssl: { rejectUnauthorized: false } } : {}),
    });

    const [verRows] = await conn.query<RowDataPacket[]>(
      'SELECT VERSION() AS version, DATABASE() AS dbName'
    );
    const [tblRows] = await conn.query<RowDataPacket[]>('SHOW TABLES');
    const tables = tblRows.map((row) => String(Object.values(row)[0]));

    return {
      connected: true,
      version: String(verRows[0]?.version || 'MySQL'),
      database: String(verRows[0]?.dbName || cfg.database),
      tables,
    };
  } catch (err: any) {
    return {
      connected: false,
      error: err?.message || 'Unable to connect to MySQL server.',
      code: err?.code || 'CONNECTION_ERROR',
    };
  } finally {
    if (conn) {
      try {
        await conn.end();
      } catch {
        // ignore
      }
    }
  }
}

export async function ensureMySQLSchema(): Promise<void> {
  if (global._schemaInitialized) return;

  const pool = getMySQLPool();
  const schemaPath = path.resolve(__dirname, '../database/sativa_cosmetics_erp_mysql.sql');
  const schemaSQL = fs.readFileSync(schemaPath, 'utf-8');

  await pool.query(schemaSQL);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS \`erp_state_snapshots\` (
      \`id\` VARCHAR(64) NOT NULL,
      \`payload\` LONGTEXT NOT NULL,
      \`updated_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (\`id\`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);

  global._schemaInitialized = true;
}
