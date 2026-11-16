import {
  CompanyInfo,
  Warehouse,
  Customer,
  Supplier,
  SalesRep,
  ProductCategory,
  ProductBrand,
  UnitOfMeasure,
  RawMaterial,
  PackagingMaterial,
  FinishedProduct,
  ManufacturingFormula,
  ProductionOrder,
  QualityInspection,
  PurchaseInvoice,
  SalesInvoice,
  SalesReturn,
  PurchaseReturn,
  AccountHead,
  FinancialVoucher,
  StockLedgerEntry,
  AuditLog,
  User,
} from '../types/erp';

export interface ERPDatabase {
  company: CompanyInfo;
  users: User[];
  activeUserId: string;
  warehouses: Warehouse[];
  customers: Customer[];
  suppliers: Supplier[];
  salesReps: SalesRep[];
  categories: ProductCategory[];
  brands: ProductBrand[];
  units: UnitOfMeasure[];
  rawMaterials: RawMaterial[];
  packagingMaterials: PackagingMaterial[];
  finishedProducts: FinishedProduct[];
  formulas: ManufacturingFormula[];
  productionOrders: ProductionOrder[];
  qualityInspections: QualityInspection[];
  purchaseInvoices: PurchaseInvoice[];
  salesInvoices: SalesInvoice[];
  purchaseReturns: PurchaseReturn[];
  salesReturns: SalesReturn[];
  accounts: AccountHead[];
  vouchers: FinancialVoucher[];
  stockLedger: StockLedgerEntry[];
  auditLogs: AuditLog[];
}

// MySQL-only persistence (no browser localStorage backend)

export const initialCompany: CompanyInfo = {
  name: 'SATIVA COSMETICS',
  businessType: 'Cosmetics Manufacturing Company',
  address: '5-KM Multan Road, Vehari, Pakistan',
  phone: '+92 67 3624510 / +92 300 7712345',
  email: 'info@sativacosmetics.pk',
  ntn: '7392810-4',
  strn: '3277876123456',
  currency: 'PKR',
  systemYear: '2026-27',
  softwareTitle: 'SATIVA COSMETICS – Manufacturing & Inventory ERP',
  developedBy: 'Prime Soft Vehari',
};

export const initialUsers: User[] = [
  {
    id: 'user-admin',
    username: 'admin',
    password: 'sativa123',
    name: 'M. Nadeem (Administrator)',
    email: 'admin@sativa.pk',
    role: 'admin',
    department: 'Executive Management',
    phone: '+92 300 7712345',
    isActive: true,
    lastLogin: new Date().toISOString(),
  },
  {
    id: 'user-manager',
    username: 'tariq',
    password: 'tariq123',
    name: 'Tariq Mahmood (Plant Manager)',
    email: 'tariq@sativa.pk',
    role: 'manager',
    department: 'Plant & Production',
    phone: '+92 301 6654321',
    isActive: true,
  },
  {
    id: 'user-operator',
    username: 'rashid',
    password: 'rashid123',
    name: 'Rashid Ali (Store & Floor Operator)',
    email: 'rashid@sativa.pk',
    role: 'operator',
    department: 'Floor Operations & Store',
    phone: '+92 302 5543210',
    isActive: true,
  },
];

export const initialWarehouses: Warehouse[] = [
  { id: 'wh-rm', code: 'WH-RM', name: 'Raw Materials & Chemical Store', type: 'raw_material', location: 'Section A - 5KM Multan Road Vehari', managerName: 'Rashid Ali' },
  { id: 'wh-pkg', code: 'WH-PKG', name: 'Packaging Materials Store', type: 'packaging', location: 'Section B - 5KM Multan Road Vehari', managerName: 'Rashid Ali' },
  { id: 'wh-fg', code: 'WH-FG', name: 'Finished Goods Central Warehouse', type: 'finished_goods', location: 'Section C - 5KM Multan Road Vehari', managerName: 'M. Nadeem' },
  { id: 'wh-qc', code: 'WH-QC', name: 'Quality Quarantine & Testing Hold', type: 'quarantine', location: 'QC Lab Area', managerName: 'Dr. Asif (QC Head)' },
];

export const initialCategories: ProductCategory[] = [
  { id: 'cat-skin', code: 'SKIN', name: 'Skin Care & Creams', description: 'Beauty creams, whitening serums, lotions' },
  { id: 'cat-hair', code: 'HAIR', name: 'Hair Care & Oils', description: 'Shampoos, conditioners, herbal oils' },
  { id: 'cat-face', code: 'FACE', name: 'Face Wash & Cleansers', description: 'Foaming face wash, cleansers, scrubs' },
  { id: 'cat-frag', code: 'FRAG', name: 'Fragrances & Attars', description: 'Body sprays, roll-ons, cosmetic perfumes' },
  { id: 'cat-soap', code: 'SOAP', name: 'Beauty Soaps & Bars', description: 'Moisturizing beauty bars and medicated soaps' },
];

export const initialBrands: ProductBrand[] = [
  { id: 'brand-sativa-gold', name: 'SATIVA GOLD', tagline: 'Pure Luxury Herbal Radiance' },
  { id: 'brand-sativa-glow', name: 'SATIVA GLOW', tagline: 'Natural Skin Brightening' },
  { id: 'brand-sativa-herbal', name: 'SATIVA HERBAL', tagline: 'Ancient Organic Formulations' },
  { id: 'brand-sativa-care', name: 'SATIVA CARE', tagline: 'Daily Family Hygiene' },
];

export const initialUnits: UnitOfMeasure[] = [
  { id: 'u-kg', code: 'KG', name: 'Kilogram', symbol: 'kg', conversionFactor: 1 },
  { id: 'u-g', code: 'G', name: 'Gram', symbol: 'g', baseUnit: 'KG', conversionFactor: 0.001 },
  { id: 'u-l', code: 'L', name: 'Liter', symbol: 'L', conversionFactor: 1 },
  { id: 'u-ml', code: 'ML', name: 'Milliliter', symbol: 'ml', baseUnit: 'L', conversionFactor: 0.001 },
  { id: 'u-pcs', code: 'PCS', name: 'Pieces', symbol: 'pcs', conversionFactor: 1 },
  { id: 'u-box', code: 'BOX', name: 'Box / Carton', symbol: 'box', conversionFactor: 1 },
  { id: 'u-doz', code: 'DOZ', name: 'Dozen', symbol: 'doz', baseUnit: 'PCS', conversionFactor: 12 },
];

export const initialSalesReps: SalesRep[] = [
  { id: 'rep-1', code: 'SR-01', name: 'Muhammad Waqas', phone: '+92 300 8899112', territory: 'Vehari & Burewala', commissionRate: 2.5, targetAmount: 2000000 },
  { id: 'rep-2', code: 'SR-02', name: 'Zahid Hussain', phone: '+92 301 7766554', territory: 'Multan & Khanewal', commissionRate: 2.5, targetAmount: 3500000 },
  { id: 'rep-3', code: 'SR-03', name: 'Farhan Akhtar', phone: '+92 303 4455667', territory: 'Lahore Division', commissionRate: 3.0, targetAmount: 5000000 },
];

export const initialAccounts: AccountHead[] = [
  // 1000 - Assets
  { id: 'acc-1010', code: '1010', name: 'Cash in Hand (Factory Vehari)', category: 'asset', currentBalance: 0, isSystem: true },
  { id: 'acc-1020', code: '1020', name: 'Habib Bank Limited (A/C: 1284-79012345)', category: 'asset', currentBalance: 0, isSystem: true },
  { id: 'acc-1021', code: '1021', name: 'Meezan Bank Islamic (A/C: 0103-99881122)', category: 'asset', currentBalance: 0, isSystem: true },
  { id: 'acc-1030', code: '1030', name: 'Customer Receivables (Trade Debtors)', category: 'asset', currentBalance: 0, isSystem: true },
  { id: 'acc-1040', code: '1040', name: 'Raw Material & Chemical Inventory', category: 'asset', currentBalance: 0, isSystem: true },
  { id: 'acc-1050', code: '1050', name: 'Packaging Materials Inventory', category: 'asset', currentBalance: 0, isSystem: true },
  { id: 'acc-1060', code: '1060', name: 'Finished Goods Inventory', category: 'asset', currentBalance: 0, isSystem: true },
  { id: 'acc-1070', code: '1070', name: 'Plant & Cosmetics Machinery', category: 'asset', currentBalance: 0, isSystem: true },

  // 2000 - Liabilities
  { id: 'acc-2010', code: '2010', name: 'Supplier Payables (Trade Creditors)', category: 'liability', currentBalance: 0, isSystem: true },
  { id: 'acc-2020', code: '2020', name: 'Sales Tax / FBR Payable', category: 'liability', currentBalance: 0, isSystem: true },
  { id: 'acc-2030', code: '2030', name: 'Accrued Factory Expenses & Utility Bills', category: 'liability', currentBalance: 0, isSystem: true },

  // 3000 - Equity
  { id: 'acc-3010', code: '3010', name: 'Proprietor Capital Account', category: 'equity', currentBalance: 0, isSystem: true },
  { id: 'acc-3020', code: '3020', name: 'Retained Earnings / Current Year Profit', category: 'equity', currentBalance: 0, isSystem: true },

  // 4000 - Revenue
  { id: 'acc-4010', code: '4010', name: 'Sales Revenue - Cosmetics Wholesale', category: 'revenue', currentBalance: 0, isSystem: true },
  { id: 'acc-4020', code: '4020', name: 'Sales Revenue - Retail & Direct Outlets', category: 'revenue', currentBalance: 0, isSystem: true },
  { id: 'acc-4030', code: '4030', name: 'Sales Returns and Allowances', category: 'revenue', currentBalance: 0, isSystem: true },

  // 5000 - Cost of Goods Sold & Production
  { id: 'acc-5010', code: '5010', name: 'Cost of Goods Sold (Raw Materials)', category: 'expense', currentBalance: 0, isSystem: true },
  { id: 'acc-5015', code: '5015', name: 'Packaging Material Cost', category: 'expense', currentBalance: 0, isSystem: true },
  { id: 'acc-5020', code: '5020', name: 'Direct Factory Labour & Wages', category: 'expense', currentBalance: 0, isSystem: true },
  { id: 'acc-5030', code: '5030', name: 'Factory Electricity, Steam & Power', category: 'expense', currentBalance: 0, isSystem: true },
  { id: 'acc-5040', code: '5040', name: 'Production Wastage & Spoilage', category: 'expense', currentBalance: 0, isSystem: true },

  // 6000 - Operating & Administrative Expenses
  { id: 'acc-6010', code: '6010', name: 'Administrative Staff Salaries', category: 'expense', currentBalance: 0, isSystem: true },
  { id: 'acc-6020', code: '6020', name: 'Vehari Factory Rent & Lease', category: 'expense', currentBalance: 0, isSystem: true },
  { id: 'acc-6030', code: '6030', name: 'Machinery Maintenance & Calibration', category: 'expense', currentBalance: 0, isSystem: true },
  { id: 'acc-6040', code: '6040', name: 'Sales Commission & Freight Outward', category: 'expense', currentBalance: 0, isSystem: true },
  { id: 'acc-6050', code: '6050', name: 'Printing, Stationery & Office Supplies', category: 'expense', currentBalance: 0, isSystem: true },
];

export function getInitialDatabase(): ERPDatabase {
  return {
    company: initialCompany,
    users: initialUsers,
    activeUserId: 'user-admin',
    warehouses: initialWarehouses,
    customers: [],
    suppliers: [],
    salesReps: initialSalesReps,
    categories: initialCategories,
    brands: initialBrands,
    units: initialUnits,
    rawMaterials: [],
    packagingMaterials: [],
    finishedProducts: [],
    formulas: [],
    productionOrders: [],
    qualityInspections: [],
    purchaseInvoices: [],
    salesInvoices: [],
    purchaseReturns: [],
    salesReturns: [],
    accounts: initialAccounts,
    vouchers: [],
    stockLedger: [],
    auditLogs: [
      {
        id: 'audit-init',
        timestamp: new Date().toISOString(),
        userId: 'user-admin',
        userName: 'M. Nadeem (Administrator)',
        role: 'admin',
        module: 'System',
        action: 'login',
        details: 'ERP Initialized with clean master database for Sativa Cosmetics (2026-27).',
      },
    ],
  };
}

function normalizeUsers(users: User[] | undefined): User[] {
  if (!Array.isArray(users) || users.length === 0) {
    return initialUsers;
  }
  return users.map(u => {
    const defaultMatch = initialUsers.find(def => def.id === u.id || def.email === u.email);
    const fallbackUsername = u.username || defaultMatch?.username || (u.email ? u.email.split('@')[0] : u.id);
    const fallbackPassword = u.password || defaultMatch?.password || 'sativa123';
    return {
      ...u,
      username: fallbackUsername,
      password: fallbackPassword,
      isActive: u.isActive ?? true,
    };
  });
}

export interface MySQLStatus {
  connected: boolean;
  checking?: boolean;
  host?: string;
  port?: number;
  database?: string;
  version?: string;
  tableCount?: number;
  error?: string;
  code?: string;
}

export function loadDatabase(): ERPDatabase {
  return getInitialDatabase();
}

export function exportDatabaseBackup(db: ERPDatabase): string {
  return JSON.stringify(db, null, 2);
}

export function importDatabaseBackup(jsonString: string): ERPDatabase {
  const parsed = JSON.parse(jsonString);
  if (!parsed.company || !parsed.accounts) {
    throw new Error('Invalid ERP backup file structure.');
  }
  return {
    ...getInitialDatabase(),
    ...parsed,
    users: normalizeUsers(parsed.users),
  };
}

export interface AuthResult {
  success: boolean;
  user?: User;
  updatedDb?: ERPDatabase;
  error?: string;
  mysqlUnavailable?: boolean;
}

export async function checkMySQLHealth(): Promise<MySQLStatus> {
  try {
    const res = await fetch('/api/health');
    if (!res.ok) {
      return {
        connected: false,
        error: `Backend HTTP ${res.status}`,
      };
    }
    const json = await res.json();
    return {
      connected: Boolean(json.mysqlConnected),
      host: json.host,
      port: json.port,
      database: json.database,
      version: json.version,
      tableCount: json.tableCount ?? 0,
      error: json.error || json.reason,
      code: json.code,
    };
  } catch (err: any) {
    return {
      connected: false,
      error: err?.message || 'Unable to reach server.',
    };
  }
}

export async function fetchMySQLState(): Promise<{
  connected: boolean;
  data: ERPDatabase | null;
  error?: string;
  code?: string;
}> {
  try {
    const res = await fetch('/api/erp/state');
    const json = await res.json();
    if (!res.ok || !json.connected) {
      return {
        connected: false,
        data: null,
        error: json.error || 'MySQL database is not connected.',
        code: json.code,
      };
    }
    if (!json.data) {
      return { connected: true, data: null };
    }
    const merged: ERPDatabase = {
      ...getInitialDatabase(),
      ...json.data,
      users: normalizeUsers(json.data.users),
    };
    return { connected: true, data: merged };
  } catch (err: any) {
    return {
      connected: false,
      data: null,
      error: err?.message || 'Unable to connect to MySQL backend.',
    };
  }
}

export async function fetchDatabaseFromServer(): Promise<ERPDatabase | null> {
  const res = await fetchMySQLState();
  return res.connected ? res.data : null;
}

export async function syncDatabaseToServer(
  db: ERPDatabase
): Promise<{ ok: boolean; error?: string; code?: string }> {
  try {
    const res = await fetch('/api/erp/state', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(db),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok || !json.connected) {
      return {
        ok: false,
        error: json.error || `MySQL save failed (HTTP ${res.status}).`,
        code: json.code,
      };
    }
    return { ok: true };
  } catch (err: any) {
    return {
      ok: false,
      error: err?.message || 'MySQL backend unreachable.',
    };
  }
}

export async function authenticateUserWithServer(
  db: ERPDatabase,
  usernameInput: string,
  passwordInput: string
): Promise<AuthResult> {
  const trimmedUser = usernameInput.trim();
  if (!trimmedUser || !passwordInput) {
    return {
      success: false,
      error: 'Please enter both username and password.',
    };
  }

  try {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: trimmedUser, password: passwordInput }),
    });
    const data = await res.json();

    if (res.status === 503 || data.mysqlUnavailable) {
      return {
        success: false,
        mysqlUnavailable: true,
        error:
          data.error ||
          'MySQL database is not connected. Please open MySQL Settings at the top to connect your MySQL database.',
      };
    }

    if (!res.ok || !data.success || !data.user) {
      return {
        success: false,
        error: data.error || 'Invalid username or password.',
      };
    }

    const serverUser: User = data.user;
    const existsLocally = db.users.some(u => u.id === serverUser.id);
    const updatedUsers = existsLocally
      ? db.users.map(u => (u.id === serverUser.id ? { ...u, ...serverUser } : u))
      : [...db.users, serverUser];

    const updatedDb: ERPDatabase = {
      ...db,
      users: updatedUsers,
      activeUserId: serverUser.id,
    };

    return {
      success: true,
      user: serverUser,
      updatedDb,
    };
  } catch (err: any) {
    return {
      success: false,
      mysqlUnavailable: true,
      error:
        err?.message ||
        'Unable to reach MySQL server. Please verify MySQL Settings at the top.',
    };
  }
}

export function logAudit(
  db: ERPDatabase,
  module: string,
  action: AuditLog['action'],
  details: string
): ERPDatabase {
  const activeUser = db.users.find(u => u.id === db.activeUserId) || db.users[0];
  const newLog: AuditLog = {
    id: `log-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    timestamp: new Date().toISOString(),
    userId: activeUser.id,
    userName: activeUser.name,
    role: activeUser.role,
    module,
    action,
    details,
  };
  return {
    ...db,
    auditLogs: [newLog, ...db.auditLogs].slice(0, 500),
  };
}

/**
 * Optional cosmetic industry starter templates that can be loaded on request.
 * Starts with 0 opening stock as requested by business rules.
 */
export function getCosmeticStarterTemplates() {
  return {
    sampleSuppliers: [
      {
        id: 'sup-1',
        code: 'SUP-01',
        name: 'Fine Chemical Importers Karachi',
        companyName: 'Fine Chemical Co. Ltd',
        supplierType: 'chemical' as const,
        phone: '+92 21 34567890',
        email: 'sales@finechem.pk',
        city: 'Karachi',
        address: 'Plot 45, Korangi Industrial Area, Karachi',
        currentBalance: 0,
        ntn: '4192830-1',
        paymentTermsDays: 30,
      },
      {
        id: 'sup-2',
        code: 'SUP-02',
        name: 'Apex Plastic & Bottles Lahore',
        companyName: 'Apex Packaging Industries',
        supplierType: 'packaging' as const,
        phone: '+92 42 37890123',
        email: 'orders@apexpkg.com',
        city: 'Lahore',
        address: 'Sundar Industrial Estate, Lahore',
        currentBalance: 0,
        ntn: '5283921-8',
        paymentTermsDays: 15,
      },
    ],
    sampleCustomers: [
      {
        id: 'cust-1',
        code: 'CUST-01',
        name: 'Madina Cosmetics Wholesale',
        companyName: 'Madina Cosmetics & Perfumery',
        customerType: 'wholesaler' as const,
        phone: '+92 67 3344556',
        email: 'madinacosmetics@yahoo.com',
        city: 'Vehari',
        address: 'Shop 12, Main Ghalla Mandi, Vehari',
        creditLimit: 500000,
        currentBalance: 0,
        salesRepId: 'rep-1',
      },
      {
        id: 'cust-2',
        code: 'CUST-02',
        name: 'Al-Karam Beauty Care Center',
        companyName: 'Al-Karam Parlour & Spa',
        customerType: 'parlour' as const,
        phone: '+92 61 6543210',
        email: 'alkaram.multan@gmail.com',
        city: 'Multan',
        address: 'Bosan Road, Near Gol Bagh, Multan',
        creditLimit: 300000,
        currentBalance: 0,
        salesRepId: 'rep-2',
      },
    ],
    sampleRawMaterials: [
      {
        id: 'rm-1',
        code: 'RM-STE-01',
        name: 'Stearic Acid (Triple Pressed)',
        category: 'Base Chemicals',
        purchaseUnit: 'KG',
        consumptionUnit: 'KG',
        conversionRate: 1,
        minimumStockLevel: 50,
        reorderLevel: 80,
        warehouseId: 'wh-rm',
        openingStock: 0,
        availableStock: 0,
        purchaseRate: 580,
        averageCost: 580,
        batches: [],
      },
      {
        id: 'rm-2',
        code: 'RM-CET-02',
        name: 'Cetyl Alcohol USP',
        category: 'Emulsifiers',
        purchaseUnit: 'KG',
        consumptionUnit: 'KG',
        conversionRate: 1,
        minimumStockLevel: 40,
        reorderLevel: 60,
        warehouseId: 'wh-rm',
        openingStock: 0,
        availableStock: 0,
        purchaseRate: 640,
        averageCost: 640,
        batches: [],
      },
      {
        id: 'rm-3',
        code: 'RM-GLY-03',
        name: 'Glycerine Pure 99.5% USP',
        category: 'Moisturizing Ingredients',
        purchaseUnit: 'KG',
        consumptionUnit: 'KG',
        conversionRate: 1,
        minimumStockLevel: 60,
        reorderLevel: 100,
        warehouseId: 'wh-rm',
        openingStock: 0,
        availableStock: 0,
        purchaseRate: 420,
        averageCost: 420,
        batches: [],
      },
      {
        id: 'rm-4',
        code: 'RM-FRAG-04',
        name: 'Sativa French Rose Fragrance Oil',
        category: 'Fragrances and Perfumes',
        purchaseUnit: 'KG',
        consumptionUnit: 'Gram',
        conversionRate: 1000,
        minimumStockLevel: 5,
        reorderLevel: 10,
        warehouseId: 'wh-rm',
        openingStock: 0,
        availableStock: 0,
        purchaseRate: 4800,
        averageCost: 4800,
        batches: [],
      },
      {
        id: 'rm-5',
        code: 'RM-VITE-05',
        name: 'Vitamin E Acetate (Tocopheryl)',
        category: 'Active Ingredients',
        purchaseUnit: 'KG',
        consumptionUnit: 'Gram',
        conversionRate: 1000,
        minimumStockLevel: 5,
        reorderLevel: 8,
        warehouseId: 'wh-rm',
        openingStock: 0,
        availableStock: 0,
        purchaseRate: 7200,
        averageCost: 7200,
        batches: [],
      },
    ],
    samplePackagingMaterials: [
      {
        id: 'pkg-1',
        code: 'PKG-JAR-50',
        name: 'Acrylic Cosmetic Jar 50g Gold Cap',
        category: 'jars' as const,
        unit: 'Pieces',
        minimumStockLevel: 500,
        warehouseId: 'wh-pkg',
        openingStock: 0,
        availableStock: 0,
        purchaseRate: 38,
        batches: [],
      },
      {
        id: 'pkg-2',
        code: 'PKG-LBL-50',
        name: 'Sativa Gold Beauty Cream Waterproof Label',
        category: 'labels' as const,
        unit: 'Pieces',
        minimumStockLevel: 1000,
        warehouseId: 'wh-pkg',
        openingStock: 0,
        availableStock: 0,
        purchaseRate: 4.5,
        batches: [],
      },
      {
        id: 'pkg-3',
        code: 'PKG-BOX-50',
        name: 'Laminated Outer Box 50g with Hologram',
        category: 'boxes' as const,
        unit: 'Pieces',
        minimumStockLevel: 500,
        warehouseId: 'wh-pkg',
        openingStock: 0,
        availableStock: 0,
        purchaseRate: 12,
        batches: [],
      },
    ],
    sampleFinishedProducts: [
      {
        id: 'fp-1',
        code: 'FP-SGC-50',
        barcode: '896400123001',
        name: 'Sativa Gold Radiance Beauty Cream',
        brand: 'SATIVA GOLD',
        category: 'Skin Care & Creams',
        size: '50g',
        packingUnit: 'Piece',
        mrp: 650,
        wholesaleRate: 450,
        retailRate: 590,
        productionCost: 210,
        minimumStockLevel: 200,
        warehouseId: 'wh-fg',
        openingStock: 0,
        availableStock: 0,
        batches: [],
      },
    ],
    sampleFormula: {
      id: 'form-1',
      formulaNumber: 'BOM-SGC-01',
      version: 'v1.0 (Standard Approved)',
      productId: 'fp-1',
      productName: 'Sativa Gold Radiance Beauty Cream',
      batchSize: 100, // 100 KG batch
      batchUnit: 'KG',
      expectedOutputUnits: 2000, // 2000 jars of 50g
      standardWastagePercentage: 2,
      status: 'approved' as const,
      approvedBy: 'Dr. Asif (Head Chemist)',
      approvedDate: '2026-01-10',
      ingredients: [
        { rawMaterialId: 'rm-1', rawMaterialName: 'Stearic Acid (Triple Pressed)', quantity: 18, unit: 'KG', percentage: 18, unitCost: 580, totalCost: 10440 },
        { rawMaterialId: 'rm-2', rawMaterialName: 'Cetyl Alcohol USP', quantity: 6, unit: 'KG', percentage: 6, unitCost: 640, totalCost: 3840 },
        { rawMaterialId: 'rm-3', rawMaterialName: 'Glycerine Pure 99.5% USP', quantity: 8, unit: 'KG', percentage: 8, unitCost: 420, totalCost: 3360 },
        { rawMaterialId: 'rm-4', rawMaterialName: 'Sativa French Rose Fragrance Oil', quantity: 1000, unit: 'Gram', percentage: 1, unitCost: 4.8, totalCost: 4800 },
        { rawMaterialId: 'rm-5', rawMaterialName: 'Vitamin E Acetate (Tocopheryl)', quantity: 2000, unit: 'Gram', percentage: 2, unitCost: 7.2, totalCost: 14400 },
      ],
      packagingItems: [
        { packagingMaterialId: 'pkg-1', packagingMaterialName: 'Acrylic Cosmetic Jar 50g Gold Cap', quantity: 2000, unit: 'Pieces', unitCost: 38, totalCost: 76000 },
        { packagingMaterialId: 'pkg-2', packagingMaterialName: 'Sativa Gold Beauty Cream Waterproof Label', quantity: 2000, unit: 'Pieces', unitCost: 4.5, totalCost: 9000 },
        { packagingMaterialId: 'pkg-3', packagingMaterialName: 'Laminated Outer Box 50g with Hologram', quantity: 2000, unit: 'Pieces', unitCost: 12, totalCost: 24000 },
      ],
      labourCost: 12000,
      overheadCost: 15000,
      otherExpenses: 5000,
      totalEstimatedCost: 177840,
      costPerUnit: 88.92,
      notes: 'Standard approved hot-process emulsion formula for 50g cream. Emulsification at 75°C.',
    },
  };
}
