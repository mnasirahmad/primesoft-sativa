export type UserRole = 'admin' | 'manager' | 'operator';
export type Language = 'en' | 'ur';

export interface User {
  id: string;
  username: string;
  password: string;
  name: string;
  email: string;
  role: UserRole;
  department: string;
  phone: string;
  isActive: boolean;
  lastLogin?: string;
}

export interface CompanyInfo {
  name: string;
  businessType: string;
  address: string;
  phone: string;
  email: string;
  ntn: string;
  strn: string;
  currency: string;
  systemYear: string;
  softwareTitle: string;
  developedBy: string;
}

export interface Warehouse {
  id: string;
  code: string;
  name: string;
  type: 'raw_material' | 'packaging' | 'finished_goods' | 'quarantine' | 'general';
  location: string;
  capacity?: string;
  managerName?: string;
}

export interface Customer {
  id: string;
  code: string;
  name: string;
  companyName: string;
  customerType: 'distributor' | 'wholesaler' | 'parlour' | 'retailer';
  phone: string;
  email: string;
  city: string;
  address: string;
  creditLimit: number;
  currentBalance: number; // Positive = Receivable
  salesRepId?: string;
  ntn?: string;
}

export interface Supplier {
  id: string;
  code: string;
  name: string;
  companyName: string;
  supplierType: 'chemical' | 'packaging' | 'machinery' | 'general';
  phone: string;
  email: string;
  city: string;
  address: string;
  currentBalance: number; // Positive = Payable
  ntn?: string;
  paymentTermsDays: number;
}

export interface SalesRep {
  id: string;
  code: string;
  name: string;
  phone: string;
  territory: string;
  commissionRate: number; // percentage
  targetAmount: number;
}

export interface ProductCategory {
  id: string;
  code: string;
  name: string;
  description?: string;
}

export interface ProductBrand {
  id: string;
  name: string;
  tagline?: string;
}

export interface UnitOfMeasure {
  id: string;
  code: string;
  name: string;
  symbol: string;
  baseUnit?: string;
  conversionFactor: number; // e.g. 1 KG = 1000 Grams (conversion factor to base)
}

export interface RawMaterial {
  id: string;
  code: string;
  name: string;
  category: string;
  supplierId?: string;
  purchaseUnit: string;
  consumptionUnit: string;
  conversionRate: number; // e.g. 1 purchase unit = X consumption units
  minimumStockLevel: number;
  reorderLevel: number;
  warehouseId: string;
  openingStock: number;
  availableStock: number;
  purchaseRate: number;
  averageCost: number;
  batches: MaterialBatch[];
}

export interface MaterialBatch {
  batchNumber: string;
  quantity: number;
  costRate: number;
  manufacturingDate: string;
  expiryDate: string;
  supplierBatchNo?: string;
  qcStatus: 'approved' | 'quarantine' | 'rejected';
}

export interface PackagingMaterial {
  id: string;
  code: string;
  name: string;
  category: 'bottles' | 'jars' | 'caps' | 'pumps' | 'labels' | 'cartons' | 'boxes' | 'seals' | 'accessories';
  supplierId?: string;
  unit: string;
  minimumStockLevel: number;
  warehouseId: string;
  openingStock: number;
  availableStock: number;
  purchaseRate: number;
  batches: PackagingBatch[];
}

export interface PackagingBatch {
  batchNumber: string;
  quantity: number;
  costRate: number;
  receivedDate: string;
}

export interface FinishedProduct {
  id: string;
  code: string;
  barcode: string;
  name: string;
  brand: string;
  category: string;
  size: string; // e.g. 50ml, 100g, 200ml
  packingUnit: string; // Piece, Box
  mrp: number;
  wholesaleRate: number;
  retailRate: number;
  productionCost: number;
  minimumStockLevel: number;
  warehouseId: string;
  openingStock: number;
  availableStock: number;
  formulaId?: string;
  batches: FinishedProductBatch[];
}

export interface FinishedProductBatch {
  batchNumber: string;
  productionOrderId: string;
  quantity: number;
  mfgDate: string;
  expDate: string;
  costPerUnit: number;
  qcStatus: 'approved' | 'quarantine' | 'rejected';
}

export interface FormulaIngredient {
  rawMaterialId: string;
  rawMaterialName: string;
  quantity: number; // in consumption unit
  unit: string;
  percentage: number;
  unitCost: number;
  totalCost: number;
}

export interface FormulaPackagingItem {
  packagingMaterialId: string;
  packagingMaterialName: string;
  quantity: number;
  unit: string;
  unitCost: number;
  totalCost: number;
}

export interface ManufacturingFormula {
  id: string;
  formulaNumber: string;
  version: string;
  productId: string;
  productName: string;
  batchSize: number; // e.g. 100 KG
  batchUnit: string;
  expectedOutputUnits: number; // e.g. 1000 pieces of 100g
  standardWastagePercentage: number;
  status: 'draft' | 'approved' | 'archived';
  approvedBy?: string;
  approvedDate?: string;
  ingredients: FormulaIngredient[];
  packagingItems: FormulaPackagingItem[];
  labourCost: number;
  overheadCost: number;
  otherExpenses: number;
  totalEstimatedCost: number;
  costPerUnit: number;
  notes?: string;
}

export type ProductionStatus = 'pending' | 'approved' | 'in_progress' | 'on_hold' | 'completed' | 'cancelled';

export interface ProductionOrder {
  id: string;
  orderNumber: string;
  date: string;
  targetCompletionDate: string;
  productId: string;
  productName: string;
  formulaId: string;
  formulaNumber: string;
  plannedBatchCount: number;
  plannedQuantity: number; // units of finished product
  actualQuantity: number;
  batchNumber: string;
  supervisor: string;
  status: ProductionStatus;
  rawMaterialIssued: boolean;
  packagingIssued: boolean;
  rawMaterialsIssuedList: {
    materialId: string;
    materialName: string;
    requiredQty: number;
    issuedQty: number;
    unit: string;
    unitCost: number;
    batchNumberUsed?: string;
  }[];
  packagingIssuedList: {
    packagingId: string;
    packagingName: string;
    requiredQty: number;
    issuedQty: number;
    unit: string;
    unitCost: number;
  }[];
  wastageQuantity: number;
  wastagePercentage: number;
  labourCost: number;
  overheadCost: number;
  totalCost: number;
  costPerUnit: number;
  qcStatus: 'pending' | 'passed' | 'failed';
  remarks?: string;
  completionDate?: string;
}

export interface QualityInspection {
  id: string;
  inspectionNumber: string;
  date: string;
  type: 'raw_material' | 'finished_goods';
  referenceBatchNumber: string;
  itemId: string;
  itemName: string;
  productionOrderId?: string;
  inspectorName: string;
  parameters: {
    parameterName: string;
    specification: string;
    actualResult: string;
    status: 'pass' | 'fail';
  }[];
  overallStatus: 'approved' | 'rejected' | 'conditional';
  weightVerification: string;
  phValue?: string;
  viscosity?: string;
  microbialTest?: string;
  packagingIntegrity?: string;
  remarks: string;
}

export interface PurchaseItem {
  itemType: 'raw_material' | 'packaging';
  itemId: string;
  itemName: string;
  batchNumber: string;
  mfgDate?: string;
  expiryDate?: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  totalPrice: number;
}

export interface PurchaseInvoice {
  id: string;
  invoiceNumber: string;
  supplierInvoiceNumber?: string;
  date: string;
  supplierId: string;
  supplierName: string;
  paymentType: 'cash' | 'credit';
  items: PurchaseItem[];
  subtotal: number;
  taxAmount: number;
  discountAmount: number;
  netTotal: number;
  paidAmount: number;
  balanceAmount: number;
  warehouseId: string;
  status: 'posted' | 'cancelled';
  notes?: string;
}

export interface SalesItem {
  productId: string;
  productName: string;
  batchNumber: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  totalPrice: number;
  unitCost: number;
}

export interface SalesInvoice {
  id: string;
  invoiceNumber: string;
  date: string;
  customerId: string;
  customerName: string;
  salesRepId?: string;
  salesRepName?: string;
  paymentType: 'cash' | 'credit';
  items: SalesItem[];
  subtotal: number;
  discountAmount: number;
  taxAmount: number;
  netTotal: number;
  paidAmount: number;
  balanceAmount: number;
  status: 'posted' | 'cancelled';
  notes?: string;
}

export interface SalesReturn {
  id: string;
  returnNumber: string;
  salesInvoiceId: string;
  salesInvoiceNumber: string;
  date: string;
  customerId: string;
  customerName: string;
  items: {
    productId: string;
    productName: string;
    batchNumber: string;
    quantity: number;
    unitPrice: number;
    totalAmount: number;
    reason: string;
  }[];
  totalRefundAmount: number;
  notes?: string;
}

export interface PurchaseReturn {
  id: string;
  returnNumber: string;
  purchaseInvoiceId: string;
  purchaseInvoiceNumber: string;
  date: string;
  supplierId: string;
  supplierName: string;
  items: {
    itemId: string;
    itemName: string;
    batchNumber: string;
    quantity: number;
    unitPrice: number;
    totalAmount: number;
    reason: string;
  }[];
  totalRefundAmount: number;
  notes?: string;
}

export interface AccountHead {
  id: string;
  code: string;
  name: string;
  category: 'asset' | 'liability' | 'equity' | 'revenue' | 'expense';
  parentCode?: string;
  currentBalance: number;
  isSystem: boolean;
}

export interface JournalEntry {
  accountId: string;
  accountCode: string;
  accountName: string;
  debit: number;
  credit: number;
  description?: string;
}

export interface FinancialVoucher {
  id: string;
  voucherNumber: string;
  voucherType: 'payment' | 'receipt' | 'journal' | 'contra';
  date: string;
  referenceNo?: string;
  chequeNo?: string;
  entries: JournalEntry[];
  totalDebit: number;
  totalCredit: number;
  narration: string;
  postedBy: string;
  isAutomatic: boolean;
  status: 'posted' | 'cancelled';
}

export interface StockLedgerEntry {
  id: string;
  date: string;
  itemType: 'raw_material' | 'packaging' | 'finished_goods';
  itemId: string;
  itemName: string;
  batchNumber?: string;
  transactionType: 'opening' | 'purchase' | 'issue_production' | 'production_receipt' | 'sales' | 'sales_return' | 'purchase_return' | 'adjustment';
  referenceNo: string;
  quantityIn: number;
  quantityOut: number;
  balanceQuantity: number;
  rate: number;
  totalAmount: number;
  warehouseId: string;
}

export interface AuditLog {
  id: string;
  timestamp: string;
  userId: string;
  userName: string;
  role: string;
  module: string;
  action: 'create' | 'update' | 'delete' | 'approve' | 'cancel' | 'login' | 'logout' | 'backup';
  details: string;
}
