import { ERPDatabase } from './storage';
import mysqlSchemaSQL from '../../database/sativa_cosmetics_erp_mysql.sql?raw';

function esc(val: unknown): string {
  if (val === null || val === undefined) return 'NULL';
  const str = String(val)
    .replace(/\\/g, '\\\\')
    .replace(/'/g, "\\'")
    .replace(/\r/g, '\\r')
    .replace(/\n/g, '\\n');
  return `'${str}'`;
}

function sqlDate(val?: string | null): string {
  if (!val) return 'NULL';
  const d = new Date(val);
  if (Number.isNaN(d.getTime())) {
    const match = val.match(/^\d{4}-\d{2}-\d{2}/);
    return match ? `'${match[0]}'` : 'NULL';
  }
  return `'${d.toISOString().slice(0, 10)}'`;
}

function sqlDateTime(val?: string | null): string {
  if (!val) return 'NULL';
  const d = new Date(val);
  if (Number.isNaN(d.getTime())) return 'NULL';
  return `'${d.toISOString().slice(0, 19).replace('T', ' ')}'`;
}

function num(val: unknown, fallback = 0): string {
  const n = Number(val);
  return Number.isFinite(n) ? String(n) : String(fallback);
}

export function getMySQLSchemaOnly(): string {
  return mysqlSchemaSQL;
}

export function generateMySQLFullDump(db: ERPDatabase): string {
  const lines: string[] = [
    mysqlSchemaSQL.trim(),
    '',
    '-- ============================================================================',
    `-- SATIVA COSMETICS ERP LIVE DATA & DATE RECORDS DUMP`,
    `-- Generated At: ${new Date().toISOString()}`,
    '-- ============================================================================',
    '',
    'USE `sativa_cosmetics_erp`;',
    'SET FOREIGN_KEY_CHECKS = 0;',
    '',
  ];

  // 1. Company Profile
  lines.push(
    `INSERT INTO \`company_profile\` (\`id\`, \`name\`, \`business_type\`, \`address\`, \`phone\`, \`email\`, \`ntn\`, \`strn\`, \`currency\`, \`system_year\`, \`software_title\`, \`developed_by\`) VALUES (1, ${esc(db.company.name)}, ${esc(db.company.businessType)}, ${esc(db.company.address)}, ${esc(db.company.phone)}, ${esc(db.company.email)}, ${esc(db.company.ntn)}, ${esc(db.company.strn)}, ${esc(db.company.currency)}, ${esc(db.company.systemYear)}, ${esc(db.company.softwareTitle)}, ${esc(db.company.developedBy)}) ON DUPLICATE KEY UPDATE \`name\`=VALUES(\`name\`), \`address\`=VALUES(\`address\`);`
  );

  // 2. Users
  for (const u of db.users) {
    lines.push(
      `INSERT INTO \`users\` (\`id\`, \`username\`, \`password_hash\`, \`name\`, \`email\`, \`role\`, \`department\`, \`phone\`, \`is_active\`, \`last_login\`) VALUES (${esc(u.id)}, ${esc(u.username)}, ${esc(u.password)}, ${esc(u.name)}, ${esc(u.email)}, ${esc(u.role)}, ${esc(u.department)}, ${esc(u.phone)}, ${u.isActive ? 1 : 0}, ${sqlDateTime(u.lastLogin)}) ON DUPLICATE KEY UPDATE \`last_login\`=VALUES(\`last_login\`);`
    );
  }

  // 3. Warehouses
  for (const w of db.warehouses) {
    lines.push(
      `INSERT IGNORE INTO \`warehouses\` (\`id\`, \`code\`, \`name\`, \`type\`, \`location\`, \`capacity\`, \`manager_name\`) VALUES (${esc(w.id)}, ${esc(w.code)}, ${esc(w.name)}, ${esc(w.type)}, ${esc(w.location)}, ${esc(w.capacity)}, ${esc(w.managerName)});`
    );
  }

  // 4. Sales Reps
  for (const sr of db.salesReps) {
    lines.push(
      `INSERT IGNORE INTO \`sales_reps\` (\`id\`, \`code\`, \`name\`, \`phone\`, \`territory\`, \`commission_rate\`, \`target_amount\`) VALUES (${esc(sr.id)}, ${esc(sr.code)}, ${esc(sr.name)}, ${esc(sr.phone)}, ${esc(sr.territory)}, ${num(sr.commissionRate)}, ${num(sr.targetAmount)});`
    );
  }

  // 5. Customers & Suppliers
  for (const c of db.customers) {
    lines.push(
      `INSERT IGNORE INTO \`customers\` (\`id\`, \`code\`, \`name\`, \`company_name\`, \`customer_type\`, \`phone\`, \`email\`, \`city\`, \`address\`, \`credit_limit\`, \`current_balance\`, \`sales_rep_id\`, \`ntn\`) VALUES (${esc(c.id)}, ${esc(c.code)}, ${esc(c.name)}, ${esc(c.companyName)}, ${esc(c.customerType)}, ${esc(c.phone)}, ${esc(c.email)}, ${esc(c.city)}, ${esc(c.address)}, ${num(c.creditLimit)}, ${num(c.currentBalance)}, ${esc(c.salesRepId)}, ${esc(c.ntn)});`
    );
  }

  for (const s of db.suppliers) {
    lines.push(
      `INSERT IGNORE INTO \`suppliers\` (\`id\`, \`code\`, \`name\`, \`company_name\`, \`supplier_type\`, \`phone\`, \`email\`, \`city\`, \`address\`, \`current_balance\`, \`ntn\`, \`payment_terms_days\`) VALUES (${esc(s.id)}, ${esc(s.code)}, ${esc(s.name)}, ${esc(s.companyName)}, ${esc(s.supplierType)}, ${esc(s.phone)}, ${esc(s.email)}, ${esc(s.city)}, ${esc(s.address)}, ${num(s.currentBalance)}, ${esc(s.ntn)}, ${num(s.paymentTermsDays, 30)});`
    );
  }

  // 6. Categories, Brands, Units
  for (const cat of db.categories) {
    lines.push(
      `INSERT IGNORE INTO \`product_categories\` (\`id\`, \`code\`, \`name\`, \`description\`) VALUES (${esc(cat.id)}, ${esc(cat.code)}, ${esc(cat.name)}, ${esc(cat.description)});`
    );
  }
  for (const b of db.brands) {
    lines.push(
      `INSERT IGNORE INTO \`product_brands\` (\`id\`, \`name\`, \`tagline\`) VALUES (${esc(b.id)}, ${esc(b.name)}, ${esc(b.tagline)});`
    );
  }
  for (const u of db.units) {
    lines.push(
      `INSERT IGNORE INTO \`units_of_measure\` (\`id\`, \`code\`, \`name\`, \`symbol\`, \`base_unit\`, \`conversion_factor\`) VALUES (${esc(u.id)}, ${esc(u.code)}, ${esc(u.name)}, ${esc(u.symbol)}, ${esc(u.baseUnit)}, ${num(u.conversionFactor, 1)});`
    );
  }

  // 7. Raw Materials & Batches (with manufacturing_date, expiry_date)
  for (const rm of db.rawMaterials) {
    lines.push(
      `INSERT IGNORE INTO \`raw_materials\` (\`id\`, \`code\`, \`name\`, \`category\`, \`supplier_id\`, \`purchase_unit\`, \`consumption_unit\`, \`conversion_rate\`, \`minimum_stock_level\`, \`reorder_level\`, \`warehouse_id\`, \`opening_stock\`, \`available_stock\`, \`purchase_rate\`, \`average_cost\`) VALUES (${esc(rm.id)}, ${esc(rm.code)}, ${esc(rm.name)}, ${esc(rm.category)}, ${esc(rm.supplierId)}, ${esc(rm.purchaseUnit)}, ${esc(rm.consumptionUnit)}, ${num(rm.conversionRate, 1)}, ${num(rm.minimumStockLevel)}, ${num(rm.reorderLevel)}, ${esc(rm.warehouseId)}, ${num(rm.openingStock)}, ${num(rm.availableStock)}, ${num(rm.purchaseRate)}, ${num(rm.averageCost)});`
    );
    for (const b of rm.batches) {
      lines.push(
        `INSERT INTO \`raw_material_batches\` (\`raw_material_id\`, \`batch_number\`, \`quantity\`, \`cost_rate\`, \`manufacturing_date\`, \`expiry_date\`, \`supplier_batch_no\`, \`qc_status\`) VALUES (${esc(rm.id)}, ${esc(b.batchNumber)}, ${num(b.quantity)}, ${num(b.costRate)}, ${sqlDate(b.manufacturingDate)}, ${sqlDate(b.expiryDate)}, ${esc(b.supplierBatchNo)}, ${esc(b.qcStatus)});`
      );
    }
  }

  // 8. Packaging Materials & Batches (with received_date)
  for (const pkg of db.packagingMaterials) {
    lines.push(
      `INSERT IGNORE INTO \`packaging_materials\` (\`id\`, \`code\`, \`name\`, \`category\`, \`supplier_id\`, \`unit\`, \`minimum_stock_level\`, \`warehouse_id\`, \`opening_stock\`, \`available_stock\`, \`purchase_rate\`) VALUES (${esc(pkg.id)}, ${esc(pkg.code)}, ${esc(pkg.name)}, ${esc(pkg.category)}, ${esc(pkg.supplierId)}, ${esc(pkg.unit)}, ${num(pkg.minimumStockLevel)}, ${esc(pkg.warehouseId)}, ${num(pkg.openingStock)}, ${num(pkg.availableStock)}, ${num(pkg.purchaseRate)});`
    );
    for (const b of pkg.batches) {
      lines.push(
        `INSERT INTO \`packaging_material_batches\` (\`packaging_material_id\`, \`batch_number\`, \`quantity\`, \`cost_rate\`, \`received_date\`) VALUES (${esc(pkg.id)}, ${esc(b.batchNumber)}, ${num(b.quantity)}, ${num(b.costRate)}, ${sqlDate(b.receivedDate)});`
      );
    }
  }

  // 9. Finished Products & Batches (with mfg_date, exp_date)
  for (const fp of db.finishedProducts) {
    lines.push(
      `INSERT IGNORE INTO \`finished_products\` (\`id\`, \`code\`, \`barcode\`, \`name\`, \`brand\`, \`category\`, \`size\`, \`packing_unit\`, \`mrp\`, \`wholesale_rate\`, \`retail_rate\`, \`production_cost\`, \`minimum_stock_level\`, \`warehouse_id\`, \`opening_stock\`, \`available_stock\`, \`formula_id\`) VALUES (${esc(fp.id)}, ${esc(fp.code)}, ${esc(fp.barcode)}, ${esc(fp.name)}, ${esc(fp.brand)}, ${esc(fp.category)}, ${esc(fp.size)}, ${esc(fp.packingUnit)}, ${num(fp.mrp)}, ${num(fp.wholesaleRate)}, ${num(fp.retailRate)}, ${num(fp.productionCost)}, ${num(fp.minimumStockLevel)}, ${esc(fp.warehouseId)}, ${num(fp.openingStock)}, ${num(fp.availableStock)}, ${esc(fp.formulaId)});`
    );
    for (const b of fp.batches) {
      lines.push(
        `INSERT INTO \`finished_product_batches\` (\`product_id\`, \`batch_number\`, \`production_order_id\`, \`quantity\`, \`mfg_date\`, \`exp_date\`, \`cost_per_unit\`, \`qc_status\`) VALUES (${esc(fp.id)}, ${esc(b.batchNumber)}, ${esc(b.productionOrderId)}, ${num(b.quantity)}, ${sqlDate(b.mfgDate)}, ${sqlDate(b.expDate)}, ${num(b.costPerUnit)}, ${esc(b.qcStatus)});`
      );
    }
  }

  // 10. Formulas (with approved_date)
  for (const f of db.formulas) {
    lines.push(
      `INSERT IGNORE INTO \`manufacturing_formulas\` (\`id\`, \`formula_number\`, \`version\`, \`product_id\`, \`product_name\`, \`batch_size\`, \`batch_unit\`, \`expected_output_units\`, \`standard_wastage_percentage\`, \`status\`, \`approved_by\`, \`approved_date\`, \`labour_cost\`, \`overhead_cost\`, \`other_expenses\`, \`total_estimated_cost\`, \`cost_per_unit\`, \`notes\`) VALUES (${esc(f.id)}, ${esc(f.formulaNumber)}, ${esc(f.version)}, ${esc(f.productId)}, ${esc(f.productName)}, ${num(f.batchSize)}, ${esc(f.batchUnit)}, ${num(f.expectedOutputUnits)}, ${num(f.standardWastagePercentage)}, ${esc(f.status)}, ${esc(f.approvedBy)}, ${sqlDate(f.approvedDate)}, ${num(f.labourCost)}, ${num(f.overheadCost)}, ${num(f.otherExpenses)}, ${num(f.totalEstimatedCost)}, ${num(f.costPerUnit)}, ${esc(f.notes)});`
    );
    for (const ing of f.ingredients) {
      lines.push(
        `INSERT INTO \`formula_ingredients\` (\`formula_id\`, \`raw_material_id\`, \`raw_material_name\`, \`quantity\`, \`unit\`, \`percentage\`, \`unit_cost\`, \`total_cost\`) VALUES (${esc(f.id)}, ${esc(ing.rawMaterialId)}, ${esc(ing.rawMaterialName)}, ${num(ing.quantity)}, ${esc(ing.unit)}, ${num(ing.percentage)}, ${num(ing.unitCost)}, ${num(ing.totalCost)});`
      );
    }
    for (const pkg of f.packagingItems) {
      lines.push(
        `INSERT INTO \`formula_packaging_items\` (\`formula_id\`, \`packaging_material_id\`, \`packaging_material_name\`, \`quantity\`, \`unit\`, \`unit_cost\`, \`total_cost\`) VALUES (${esc(f.id)}, ${esc(pkg.packagingMaterialId)}, ${esc(pkg.packagingMaterialName)}, ${num(pkg.quantity)}, ${esc(pkg.unit)}, ${num(pkg.unitCost)}, ${num(pkg.totalCost)});`
      );
    }
  }

  // 11. Production Orders (with order_date, target_completion_date, completion_date)
  for (const po of db.productionOrders) {
    lines.push(
      `INSERT IGNORE INTO \`production_orders\` (\`id\`, \`order_number\`, \`order_date\`, \`target_completion_date\`, \`completion_date\`, \`product_id\`, \`product_name\`, \`formula_id\`, \`formula_number\`, \`planned_batch_count\`, \`planned_quantity\`, \`actual_quantity\`, \`batch_number\`, \`supervisor\`, \`status\`, \`raw_material_issued\`, \`packaging_issued\`, \`wastage_quantity\`, \`wastage_percentage\`, \`labour_cost\`, \`overhead_cost\`, \`total_cost\`, \`cost_per_unit\`, \`qc_status\`, \`remarks\`) VALUES (${esc(po.id)}, ${esc(po.orderNumber)}, ${sqlDate(po.date)}, ${sqlDate(po.targetCompletionDate)}, ${sqlDate(po.completionDate)}, ${esc(po.productId)}, ${esc(po.productName)}, ${esc(po.formulaId)}, ${esc(po.formulaNumber)}, ${num(po.plannedBatchCount, 1)}, ${num(po.plannedQuantity)}, ${num(po.actualQuantity)}, ${esc(po.batchNumber)}, ${esc(po.supervisor)}, ${esc(po.status)}, ${po.rawMaterialIssued ? 1 : 0}, ${po.packagingIssued ? 1 : 0}, ${num(po.wastageQuantity)}, ${num(po.wastagePercentage)}, ${num(po.labourCost)}, ${num(po.overheadCost)}, ${num(po.totalCost)}, ${num(po.costPerUnit)}, ${esc(po.qcStatus)}, ${esc(po.remarks)});`
    );
  }

  // 12. Quality Inspections (with inspection_date)
  for (const qc of db.qualityInspections) {
    lines.push(
      `INSERT IGNORE INTO \`quality_inspections\` (\`id\`, \`inspection_number\`, \`inspection_date\`, \`type\`, \`reference_batch_number\`, \`item_id\`, \`item_name\`, \`production_order_id\`, \`inspector_name\`, \`overall_status\`, \`weight_verification\`, \`ph_value\`, \`viscosity\`, \`microbial_test\`, \`packaging_integrity\`, \`remarks\`) VALUES (${esc(qc.id)}, ${esc(qc.inspectionNumber)}, ${sqlDate(qc.date)}, ${esc(qc.type)}, ${esc(qc.referenceBatchNumber)}, ${esc(qc.itemId)}, ${esc(qc.itemName)}, ${esc(qc.productionOrderId)}, ${esc(qc.inspectorName)}, ${esc(qc.overallStatus)}, ${esc(qc.weightVerification)}, ${esc(qc.phValue)}, ${esc(qc.viscosity)}, ${esc(qc.microbialTest)}, ${esc(qc.packagingIntegrity)}, ${esc(qc.remarks)});`
    );
  }

  // 13. Purchase & Sales Invoices (with invoice_date, mfg_date, expiry_date)
  for (const pi of db.purchaseInvoices) {
    lines.push(
      `INSERT IGNORE INTO \`purchase_invoices\` (\`id\`, \`invoice_number\`, \`supplier_invoice_number\`, \`invoice_date\`, \`supplier_id\`, \`supplier_name\`, \`payment_type\`, \`subtotal\`, \`tax_amount\`, \`discount_amount\`, \`net_total\`, \`paid_amount\`, \`balance_amount\`, \`warehouse_id\`, \`status\`, \`notes\`) VALUES (${esc(pi.id)}, ${esc(pi.invoiceNumber)}, ${esc(pi.supplierInvoiceNumber)}, ${sqlDate(pi.date)}, ${esc(pi.supplierId)}, ${esc(pi.supplierName)}, ${esc(pi.paymentType)}, ${num(pi.subtotal)}, ${num(pi.taxAmount)}, ${num(pi.discountAmount)}, ${num(pi.netTotal)}, ${num(pi.paidAmount)}, ${num(pi.balanceAmount)}, ${esc(pi.warehouseId)}, ${esc(pi.status)}, ${esc(pi.notes)});`
    );
    for (const item of pi.items) {
      lines.push(
        `INSERT INTO \`purchase_invoice_items\` (\`purchase_invoice_id\`, \`item_type\`, \`item_id\`, \`item_name\`, \`batch_number\`, \`mfg_date\`, \`expiry_date\`, \`quantity\`, \`unit\`, \`unit_price\`, \`total_price\`) VALUES (${esc(pi.id)}, ${esc(item.itemType)}, ${esc(item.itemId)}, ${esc(item.itemName)}, ${esc(item.batchNumber)}, ${sqlDate(item.mfgDate)}, ${sqlDate(item.expiryDate)}, ${num(item.quantity)}, ${esc(item.unit)}, ${num(item.unitPrice)}, ${num(item.totalPrice)});`
      );
    }
  }

  for (const si of db.salesInvoices) {
    lines.push(
      `INSERT IGNORE INTO \`sales_invoices\` (\`id\`, \`invoice_number\`, \`invoice_date\`, \`customer_id\`, \`customer_name\`, \`sales_rep_id\`, \`sales_rep_name\`, \`payment_type\`, \`subtotal\`, \`discount_amount\`, \`tax_amount\`, \`net_total\`, \`paid_amount\`, \`balance_amount\`, \`status\`, \`notes\`) VALUES (${esc(si.id)}, ${esc(si.invoiceNumber)}, ${sqlDate(si.date)}, ${esc(si.customerId)}, ${esc(si.customerName)}, ${esc(si.salesRepId)}, ${esc(si.salesRepName)}, ${esc(si.paymentType)}, ${num(si.subtotal)}, ${num(si.discountAmount)}, ${num(si.taxAmount)}, ${num(si.netTotal)}, ${num(si.paidAmount)}, ${num(si.balanceAmount)}, ${esc(si.status)}, ${esc(si.notes)});`
    );
    for (const item of si.items) {
      lines.push(
        `INSERT INTO \`sales_invoice_items\` (\`sales_invoice_id\`, \`product_id\`, \`product_name\`, \`batch_number\`, \`quantity\`, \`unit\`, \`unit_price\`, \`total_price\`, \`unit_cost\`) VALUES (${esc(si.id)}, ${esc(item.productId)}, ${esc(item.productName)}, ${esc(item.batchNumber)}, ${num(item.quantity)}, ${esc(item.unit)}, ${num(item.unitPrice)}, ${num(item.totalPrice)}, ${num(item.unitCost)});`
      );
    }
  }

  // 14. Accounts & Vouchers (with voucher_date)
  for (const acc of db.accounts) {
    lines.push(
      `INSERT IGNORE INTO \`account_heads\` (\`id\`, \`code\`, \`name\`, \`category\`, \`parent_code\`, \`current_balance\`, \`is_system\`) VALUES (${esc(acc.id)}, ${esc(acc.code)}, ${esc(acc.name)}, ${esc(acc.category)}, ${esc(acc.parentCode)}, ${num(acc.currentBalance)}, ${acc.isSystem ? 1 : 0});`
    );
  }

  for (const v of db.vouchers) {
    lines.push(
      `INSERT IGNORE INTO \`financial_vouchers\` (\`id\`, \`voucher_number\`, \`voucher_type\`, \`voucher_date\`, \`reference_no\`, \`cheque_no\`, \`total_debit\`, \`total_credit\`, \`narration\`, \`posted_by\`, \`is_automatic\`, \`status\`) VALUES (${esc(v.id)}, ${esc(v.voucherNumber)}, ${esc(v.voucherType)}, ${sqlDate(v.date)}, ${esc(v.referenceNo)}, ${esc(v.chequeNo)}, ${num(v.totalDebit)}, ${num(v.totalCredit)}, ${esc(v.narration)}, ${esc(v.postedBy)}, ${v.isAutomatic ? 1 : 0}, ${esc(v.status)});`
    );
    for (const e of v.entries) {
      lines.push(
        `INSERT INTO \`financial_voucher_entries\` (\`voucher_id\`, \`account_id\`, \`account_code\`, \`account_name\`, \`debit\`, \`credit\`, \`description\`) VALUES (${esc(v.id)}, ${esc(e.accountId)}, ${esc(e.accountCode)}, ${esc(e.accountName)}, ${num(e.debit)}, ${num(e.credit)}, ${esc(e.description)});`
      );
    }
  }

  // 15. Stock Ledger & Audit Logs (with transaction_date, event_timestamp)
  for (const sl of db.stockLedger) {
    lines.push(
      `INSERT IGNORE INTO \`stock_ledger\` (\`id\`, \`transaction_date\`, \`item_type\`, \`item_id\`, \`item_name\`, \`batch_number\`, \`transaction_type\`, \`reference_no\`, \`quantity_in\`, \`quantity_out\`, \`balance_quantity\`, \`rate\`, \`total_amount\`, \`warehouse_id\`) VALUES (${esc(sl.id)}, ${sqlDate(sl.date)}, ${esc(sl.itemType)}, ${esc(sl.itemId)}, ${esc(sl.itemName)}, ${esc(sl.batchNumber)}, ${esc(sl.transactionType)}, ${esc(sl.referenceNo)}, ${num(sl.quantityIn)}, ${num(sl.quantityOut)}, ${num(sl.balanceQuantity)}, ${num(sl.rate)}, ${num(sl.totalAmount)}, ${esc(sl.warehouseId)});`
    );
  }

  for (const log of db.auditLogs) {
    lines.push(
      `INSERT IGNORE INTO \`audit_logs\` (\`id\`, \`event_timestamp\`, \`user_id\`, \`user_name\`, \`role\`, \`module\`, \`action\`, \`details\`) VALUES (${esc(log.id)}, ${sqlDateTime(log.timestamp)}, ${esc(log.userId)}, ${esc(log.userName)}, ${esc(log.role)}, ${esc(log.module)}, ${esc(log.action)}, ${esc(log.details)});`
    );
  }

  lines.push('', 'SET FOREIGN_KEY_CHECKS = 1;', '');
  return lines.join('\n');
}
