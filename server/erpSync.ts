import type { PoolConnection, RowDataPacket } from 'mysql2/promise';
import { ensureMySQLSchema, getMySQLPool } from './db.ts';
import { getInitialDatabase, type ERPDatabase } from '../src/services/storage.ts';
import type { User } from '../src/types/erp.ts';

function toSqlDate(val?: string | null): string | null {
  if (!val) return null;
  const d = new Date(val);
  if (Number.isNaN(d.getTime())) {
    const m = val.match(/^\d{4}-\d{2}-\d{2}/);
    return m ? m[0] : null;
  }
  return d.toISOString().slice(0, 10);
}

function toSqlDateTime(val?: string | null): string | null {
  if (!val) return null;
  const d = new Date(val);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString().slice(0, 19).replace('T', ' ');
}

export async function loadERPStateFromMySQL(): Promise<ERPDatabase | null> {
  await ensureMySQLSchema();
  const pool = getMySQLPool();

  const [snapshotRows] = await pool.query<RowDataPacket[]>(
    'SELECT `payload` FROM `erp_state_snapshots` WHERE `id` = ? LIMIT 1',
    ['main']
  );

  if (snapshotRows.length === 0 || !snapshotRows[0].payload) {
    return null;
  }

  const parsed = JSON.parse(String(snapshotRows[0].payload)) as ERPDatabase;

  // Merge latest user credentials & last_login from relational users table if present
  const [userRows] = await pool.query<RowDataPacket[]>(
    'SELECT `id`, `username`, `password_hash`, `name`, `email`, `role`, `department`, `phone`, `is_active`, `last_login` FROM `users`'
  );

  if (userRows.length > 0) {
    parsed.users = userRows.map((row) => ({
      id: String(row.id),
      username: String(row.username),
      password: String(row.password_hash),
      name: String(row.name),
      email: String(row.email),
      role: row.role as User['role'],
      department: String(row.department || 'Operations'),
      phone: String(row.phone || ''),
      isActive: Boolean(row.is_active),
      lastLogin: row.last_login ? new Date(row.last_login).toISOString() : undefined,
    }));
  }

  return parsed;
}

export async function authenticateAgainstMySQL(
  usernameInput: string,
  passwordInput: string
): Promise<{ success: boolean; user?: User; error?: string }> {
  await ensureMySQLSchema();
  const pool = getMySQLPool();
  const normalized = usernameInput.trim().toLowerCase();

  // Seed default ERP master data & users into MySQL on a brand-new empty database
  const [countRows] = await pool.query<RowDataPacket[]>('SELECT COUNT(*) AS cnt FROM `users`');
  if (Number(countRows[0]?.cnt || 0) === 0) {
    await syncERPStateToMySQL(getInitialDatabase());
  }

  const [rows] = await pool.query<RowDataPacket[]>(
    'SELECT `id`, `username`, `password_hash`, `name`, `email`, `role`, `department`, `phone`, `is_active`, `last_login` FROM `users` WHERE LOWER(`username`) = ? OR LOWER(`email`) = ? LIMIT 1',
    [normalized, normalized]
  );

  if (rows.length === 0) {
    return {
      success: false,
      error: 'User not found in MySQL database. Please verify your username.',
    };
  }

  const row = rows[0];
  if (!row.is_active) {
    return {
      success: false,
      error: 'This user account is deactivated. Contact System Administrator.',
    };
  }

  if (String(row.password_hash) !== passwordInput) {
    return {
      success: false,
      error: 'Incorrect password. Please try again.',
    };
  }

  const nowIso = new Date().toISOString();
  const nowSql = toSqlDateTime(nowIso);
  await pool.query('UPDATE `users` SET `last_login` = ? WHERE `id` = ?', [nowSql, row.id]);

  await pool.query(
    'INSERT INTO `audit_logs` (`id`, `event_timestamp`, `user_id`, `user_name`, `role`, `module`, `action`, `details`) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    [
      `log-auth-${Date.now()}`,
      nowSql,
      String(row.id),
      String(row.name),
      String(row.role),
      'Authentication',
      'login',
      `User ${row.name} (${row.username}) signed in via MySQL database.`,
    ]
  );

  return {
    success: true,
    user: {
      id: String(row.id),
      username: String(row.username),
      password: String(row.password_hash),
      name: String(row.name),
      email: String(row.email),
      role: row.role as User['role'],
      department: String(row.department || 'Operations'),
      phone: String(row.phone || ''),
      isActive: Boolean(row.is_active),
      lastLogin: nowIso,
    },
  };
}

export async function syncERPStateToMySQL(db: ERPDatabase): Promise<void> {
  await ensureMySQLSchema();
  const pool = getMySQLPool();
  const conn: PoolConnection = await pool.getConnection();

  try {
    await conn.beginTransaction();
    await conn.query('SET FOREIGN_KEY_CHECKS = 0');

    // 1. Full JSON snapshot for fast atomic hydration
    await conn.query(
      'INSERT INTO `erp_state_snapshots` (`id`, `payload`) VALUES (?, ?) ON DUPLICATE KEY UPDATE `payload` = VALUES(`payload`)',
      ['main', JSON.stringify(db)]
    );

    // 2. Company Profile
    await conn.query(
      `INSERT INTO \`company_profile\` (\`id\`, \`name\`, \`business_type\`, \`address\`, \`phone\`, \`email\`, \`ntn\`, \`strn\`, \`currency\`, \`system_year\`, \`software_title\`, \`developed_by\`)
       VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         \`name\`=VALUES(\`name\`), \`business_type\`=VALUES(\`business_type\`), \`address\`=VALUES(\`address\`),
         \`phone\`=VALUES(\`phone\`), \`email\`=VALUES(\`email\`), \`ntn\`=VALUES(\`ntn\`), \`strn\`=VALUES(\`strn\`),
         \`currency\`=VALUES(\`currency\`), \`system_year\`=VALUES(\`system_year\`),
         \`software_title\`=VALUES(\`software_title\`), \`developed_by\`=VALUES(\`developed_by\`)`,
      [
        db.company.name,
        db.company.businessType,
        db.company.address,
        db.company.phone,
        db.company.email,
        db.company.ntn || null,
        db.company.strn || null,
        db.company.currency,
        db.company.systemYear,
        db.company.softwareTitle,
        db.company.developedBy,
      ]
    );

    // 3. Users
    for (const u of db.users) {
      await conn.query(
        `INSERT INTO \`users\` (\`id\`, \`username\`, \`password_hash\`, \`name\`, \`email\`, \`role\`, \`department\`, \`phone\`, \`is_active\`, \`last_login\`)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
           \`username\`=VALUES(\`username\`), \`password_hash\`=VALUES(\`password_hash\`),
           \`name\`=VALUES(\`name\`), \`email\`=VALUES(\`email\`), \`role\`=VALUES(\`role\`),
           \`department\`=VALUES(\`department\`), \`phone\`=VALUES(\`phone\`),
           \`is_active\`=VALUES(\`is_active\`), \`last_login\`=COALESCE(VALUES(\`last_login\`), \`last_login\`)`,
        [
          u.id,
          u.username,
          u.password,
          u.name,
          u.email,
          u.role,
          u.department,
          u.phone || null,
          u.isActive ? 1 : 0,
          toSqlDateTime(u.lastLogin),
        ]
      );
    }

    // 4. Master Lookup Tables
    for (const w of db.warehouses) {
      await conn.query(
        `INSERT INTO \`warehouses\` (\`id\`, \`code\`, \`name\`, \`type\`, \`location\`, \`capacity\`, \`manager_name\`)
         VALUES (?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE \`name\`=VALUES(\`name\`), \`location\`=VALUES(\`location\`), \`manager_name\`=VALUES(\`manager_name\`)`,
        [w.id, w.code, w.name, w.type, w.location, w.capacity || null, w.managerName || null]
      );
    }

    for (const sr of db.salesReps) {
      await conn.query(
        `INSERT INTO \`sales_reps\` (\`id\`, \`code\`, \`name\`, \`phone\`, \`territory\`, \`commission_rate\`, \`target_amount\`)
         VALUES (?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE \`name\`=VALUES(\`name\`), \`phone\`=VALUES(\`phone\`), \`territory\`=VALUES(\`territory\`)`,
        [sr.id, sr.code, sr.name, sr.phone, sr.territory, sr.commissionRate, sr.targetAmount]
      );
    }

    for (const c of db.customers) {
      await conn.query(
        `INSERT INTO \`customers\` (\`id\`, \`code\`, \`name\`, \`company_name\`, \`customer_type\`, \`phone\`, \`email\`, \`city\`, \`address\`, \`credit_limit\`, \`current_balance\`, \`sales_rep_id\`, \`ntn\`)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE \`name\`=VALUES(\`name\`), \`current_balance\`=VALUES(\`current_balance\`), \`credit_limit\`=VALUES(\`credit_limit\`)`,
        [
          c.id,
          c.code,
          c.name,
          c.companyName,
          c.customerType,
          c.phone,
          c.email || null,
          c.city,
          c.address,
          c.creditLimit,
          c.currentBalance,
          c.salesRepId || null,
          c.ntn || null,
        ]
      );
    }

    for (const s of db.suppliers) {
      await conn.query(
        `INSERT INTO \`suppliers\` (\`id\`, \`code\`, \`name\`, \`company_name\`, \`supplier_type\`, \`phone\`, \`email\`, \`city\`, \`address\`, \`current_balance\`, \`ntn\`, \`payment_terms_days\`)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE \`name\`=VALUES(\`name\`), \`current_balance\`=VALUES(\`current_balance\`)`,
        [
          s.id,
          s.code,
          s.name,
          s.companyName,
          s.supplierType,
          s.phone,
          s.email || null,
          s.city,
          s.address,
          s.currentBalance,
          s.ntn || null,
          s.paymentTermsDays || 30,
        ]
      );
    }

    for (const cat of db.categories) {
      await conn.query(
        'INSERT INTO `product_categories` (`id`, `code`, `name`, `description`) VALUES (?, ?, ?, ?) ON DUPLICATE KEY UPDATE `name`=VALUES(`name`)',
        [cat.id, cat.code, cat.name, cat.description || null]
      );
    }

    for (const b of db.brands) {
      await conn.query(
        'INSERT INTO `product_brands` (`id`, `name`, `tagline`) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE `tagline`=VALUES(`tagline`)',
        [b.id, b.name, b.tagline || null]
      );
    }

    for (const u of db.units) {
      await conn.query(
        'INSERT INTO `units_of_measure` (`id`, `code`, `name`, `symbol`, `base_unit`, `conversion_factor`) VALUES (?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE `name`=VALUES(`name`)',
        [u.id, u.code, u.name, u.symbol, u.baseUnit || null, u.conversionFactor]
      );
    }

    // 5. Inventory & Batch Dates
    await conn.query('DELETE FROM `raw_material_batches`');
    for (const rm of db.rawMaterials) {
      await conn.query(
        `INSERT INTO \`raw_materials\` (\`id\`, \`code\`, \`name\`, \`category\`, \`supplier_id\`, \`purchase_unit\`, \`consumption_unit\`, \`conversion_rate\`, \`minimum_stock_level\`, \`reorder_level\`, \`warehouse_id\`, \`opening_stock\`, \`available_stock\`, \`purchase_rate\`, \`average_cost\`)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE \`available_stock\`=VALUES(\`available_stock\`), \`average_cost\`=VALUES(\`average_cost\`), \`purchase_rate\`=VALUES(\`purchase_rate\`)`,
        [
          rm.id,
          rm.code,
          rm.name,
          rm.category,
          rm.supplierId || null,
          rm.purchaseUnit,
          rm.consumptionUnit,
          rm.conversionRate,
          rm.minimumStockLevel,
          rm.reorderLevel,
          rm.warehouseId,
          rm.openingStock,
          rm.availableStock,
          rm.purchaseRate,
          rm.averageCost,
        ]
      );
      for (const batch of rm.batches) {
        await conn.query(
          `INSERT INTO \`raw_material_batches\` (\`raw_material_id\`, \`batch_number\`, \`quantity\`, \`cost_rate\`, \`manufacturing_date\`, \`expiry_date\`, \`supplier_batch_no\`, \`qc_status\`)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            rm.id,
            batch.batchNumber,
            batch.quantity,
            batch.costRate,
            toSqlDate(batch.manufacturingDate) || toSqlDate(new Date().toISOString()),
            toSqlDate(batch.expiryDate) || toSqlDate(new Date().toISOString()),
            batch.supplierBatchNo || null,
            batch.qcStatus,
          ]
        );
      }
    }

    await conn.query('DELETE FROM `packaging_material_batches`');
    for (const pkg of db.packagingMaterials) {
      await conn.query(
        `INSERT INTO \`packaging_materials\` (\`id\`, \`code\`, \`name\`, \`category\`, \`supplier_id\`, \`unit\`, \`minimum_stock_level\`, \`warehouse_id\`, \`opening_stock\`, \`available_stock\`, \`purchase_rate\`)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE \`available_stock\`=VALUES(\`available_stock\`), \`purchase_rate\`=VALUES(\`purchase_rate\`)`,
        [
          pkg.id,
          pkg.code,
          pkg.name,
          pkg.category,
          pkg.supplierId || null,
          pkg.unit,
          pkg.minimumStockLevel,
          pkg.warehouseId,
          pkg.openingStock,
          pkg.availableStock,
          pkg.purchaseRate,
        ]
      );
      for (const batch of pkg.batches) {
        await conn.query(
          'INSERT INTO `packaging_material_batches` (`packaging_material_id`, `batch_number`, `quantity`, `cost_rate`, `received_date`) VALUES (?, ?, ?, ?, ?)',
          [
            pkg.id,
            batch.batchNumber,
            batch.quantity,
            batch.costRate,
            toSqlDate(batch.receivedDate) || toSqlDate(new Date().toISOString()),
          ]
        );
      }
    }

    await conn.query('DELETE FROM `finished_product_batches`');
    for (const fp of db.finishedProducts) {
      await conn.query(
        `INSERT INTO \`finished_products\` (\`id\`, \`code\`, \`barcode\`, \`name\`, \`brand\`, \`category\`, \`size\`, \`packing_unit\`, \`mrp\`, \`wholesale_rate\`, \`retail_rate\`, \`production_cost\`, \`minimum_stock_level\`, \`warehouse_id\`, \`opening_stock\`, \`available_stock\`, \`formula_id\`)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE \`available_stock\`=VALUES(\`available_stock\`), \`production_cost\`=VALUES(\`production_cost\`)`,
        [
          fp.id,
          fp.code,
          fp.barcode || null,
          fp.name,
          fp.brand,
          fp.category,
          fp.size,
          fp.packingUnit,
          fp.mrp,
          fp.wholesaleRate,
          fp.retailRate,
          fp.productionCost,
          fp.minimumStockLevel,
          fp.warehouseId,
          fp.openingStock,
          fp.availableStock,
          fp.formulaId || null,
        ]
      );
      for (const batch of fp.batches) {
        await conn.query(
          `INSERT INTO \`finished_product_batches\` (\`product_id\`, \`batch_number\`, \`production_order_id\`, \`quantity\`, \`mfg_date\`, \`exp_date\`, \`cost_per_unit\`, \`qc_status\`)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            fp.id,
            batch.batchNumber,
            batch.productionOrderId || null,
            batch.quantity,
            toSqlDate(batch.mfgDate) || toSqlDate(new Date().toISOString()),
            toSqlDate(batch.expDate) || toSqlDate(new Date().toISOString()),
            batch.costPerUnit,
            batch.qcStatus,
          ]
        );
      }
    }

    // 6. Formulas, Production & QC
    for (const f of db.formulas) {
      await conn.query(
        `INSERT INTO \`manufacturing_formulas\` (\`id\`, \`formula_number\`, \`version\`, \`product_id\`, \`product_name\`, \`batch_size\`, \`batch_unit\`, \`expected_output_units\`, \`standard_wastage_percentage\`, \`status\`, \`approved_by\`, \`approved_date\`, \`labour_cost\`, \`overhead_cost\`, \`other_expenses\`, \`total_estimated_cost\`, \`cost_per_unit\`, \`notes\`)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE \`status\`=VALUES(\`status\`), \`total_estimated_cost\`=VALUES(\`total_estimated_cost\`), \`cost_per_unit\`=VALUES(\`cost_per_unit\`)`,
        [
          f.id,
          f.formulaNumber,
          f.version,
          f.productId,
          f.productName,
          f.batchSize,
          f.batchUnit,
          f.expectedOutputUnits,
          f.standardWastagePercentage,
          f.status,
          f.approvedBy || null,
          toSqlDate(f.approvedDate),
          f.labourCost,
          f.overheadCost,
          f.otherExpenses,
          f.totalEstimatedCost,
          f.costPerUnit,
          f.notes || null,
        ]
      );
    }

    for (const po of db.productionOrders) {
      await conn.query(
        `INSERT INTO \`production_orders\` (\`id\`, \`order_number\`, \`order_date\`, \`target_completion_date\`, \`completion_date\`, \`product_id\`, \`product_name\`, \`formula_id\`, \`formula_number\`, \`planned_batch_count\`, \`planned_quantity\`, \`actual_quantity\`, \`batch_number\`, \`supervisor\`, \`status\`, \`raw_material_issued\`, \`packaging_issued\`, \`wastage_quantity\`, \`wastage_percentage\`, \`labour_cost\`, \`overhead_cost\`, \`total_cost\`, \`cost_per_unit\`, \`qc_status\`, \`remarks\`)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE \`status\`=VALUES(\`status\`), \`actual_quantity\`=VALUES(\`actual_quantity\`), \`completion_date\`=VALUES(\`completion_date\`), \`qc_status\`=VALUES(\`qc_status\`)`,
        [
          po.id,
          po.orderNumber,
          toSqlDate(po.date) || toSqlDate(new Date().toISOString()),
          toSqlDate(po.targetCompletionDate) || toSqlDate(new Date().toISOString()),
          toSqlDate(po.completionDate),
          po.productId,
          po.productName,
          po.formulaId,
          po.formulaNumber,
          po.plannedBatchCount,
          po.plannedQuantity,
          po.actualQuantity,
          po.batchNumber,
          po.supervisor,
          po.status,
          po.rawMaterialIssued ? 1 : 0,
          po.packagingIssued ? 1 : 0,
          po.wastageQuantity,
          po.wastagePercentage,
          po.labourCost,
          po.overheadCost,
          po.totalCost,
          po.costPerUnit,
          po.qcStatus,
          po.remarks || null,
        ]
      );
    }

    for (const qc of db.qualityInspections) {
      await conn.query(
        `INSERT INTO \`quality_inspections\` (\`id\`, \`inspection_number\`, \`inspection_date\`, \`type\`, \`reference_batch_number\`, \`item_id\`, \`item_name\`, \`production_order_id\`, \`inspector_name\`, \`overall_status\`, \`weight_verification\`, \`ph_value\`, \`viscosity\`, \`microbial_test\`, \`packaging_integrity\`, \`remarks\`)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE \`overall_status\`=VALUES(\`overall_status\`)`,
        [
          qc.id,
          qc.inspectionNumber,
          toSqlDate(qc.date) || toSqlDate(new Date().toISOString()),
          qc.type,
          qc.referenceBatchNumber,
          qc.itemId,
          qc.itemName,
          qc.productionOrderId || null,
          qc.inspectorName,
          qc.overallStatus,
          qc.weightVerification,
          qc.phValue || null,
          qc.viscosity || null,
          qc.microbialTest || null,
          qc.packagingIntegrity || null,
          qc.remarks || null,
        ]
      );
    }

    // 7. Purchases, Sales Invoices & Returns (with relational line items)
    await conn.query('DELETE FROM `purchase_invoice_items`');
    for (const pi of db.purchaseInvoices) {
      await conn.query(
        `INSERT INTO \`purchase_invoices\` (\`id\`, \`invoice_number\`, \`supplier_invoice_number\`, \`invoice_date\`, \`supplier_id\`, \`supplier_name\`, \`payment_type\`, \`subtotal\`, \`tax_amount\`, \`discount_amount\`, \`net_total\`, \`paid_amount\`, \`balance_amount\`, \`warehouse_id\`, \`status\`, \`notes\`)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE \`paid_amount\`=VALUES(\`paid_amount\`), \`balance_amount\`=VALUES(\`balance_amount\`), \`status\`=VALUES(\`status\`)`,
        [
          pi.id,
          pi.invoiceNumber,
          pi.supplierInvoiceNumber || null,
          toSqlDate(pi.date) || toSqlDate(new Date().toISOString()),
          pi.supplierId,
          pi.supplierName,
          pi.paymentType,
          pi.subtotal,
          pi.taxAmount,
          pi.discountAmount,
          pi.netTotal,
          pi.paidAmount,
          pi.balanceAmount,
          pi.warehouseId,
          pi.status,
          pi.notes || null,
        ]
      );
      for (const item of pi.items || []) {
        await conn.query(
          `INSERT INTO \`purchase_invoice_items\` (\`purchase_invoice_id\`, \`item_type\`, \`item_id\`, \`item_name\`, \`batch_number\`, \`mfg_date\`, \`expiry_date\`, \`quantity\`, \`unit\`, \`unit_price\`, \`total_price\`)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            pi.id,
            item.itemType,
            item.itemId,
            item.itemName,
            item.batchNumber,
            toSqlDate(item.mfgDate),
            toSqlDate(item.expiryDate),
            item.quantity,
            item.unit,
            item.unitPrice,
            item.totalPrice,
          ]
        );
      }
    }

    for (const pr of db.purchaseReturns || []) {
      await conn.query(
        `INSERT INTO \`purchase_returns\` (\`id\`, \`return_number\`, \`purchase_invoice_id\`, \`purchase_invoice_number\`, \`return_date\`, \`supplier_id\`, \`supplier_name\`, \`total_refund_amount\`, \`notes\`)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE \`total_refund_amount\`=VALUES(\`total_refund_amount\`)`,
        [
          pr.id,
          pr.returnNumber,
          pr.purchaseInvoiceId,
          pr.purchaseInvoiceNumber,
          toSqlDate(pr.date) || toSqlDate(new Date().toISOString()),
          pr.supplierId,
          pr.supplierName,
          pr.totalRefundAmount,
          pr.notes || null,
        ]
      );
    }

    await conn.query('DELETE FROM `sales_invoice_items`');
    for (const si of db.salesInvoices) {
      await conn.query(
        `INSERT INTO \`sales_invoices\` (\`id\`, \`invoice_number\`, \`invoice_date\`, \`customer_id\`, \`customer_name\`, \`sales_rep_id\`, \`sales_rep_name\`, \`payment_type\`, \`subtotal\`, \`discount_amount\`, \`tax_amount\`, \`net_total\`, \`paid_amount\`, \`balance_amount\`, \`status\`, \`notes\`)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE \`paid_amount\`=VALUES(\`paid_amount\`), \`balance_amount\`=VALUES(\`balance_amount\`), \`status\`=VALUES(\`status\`)`,
        [
          si.id,
          si.invoiceNumber,
          toSqlDate(si.date) || toSqlDate(new Date().toISOString()),
          si.customerId,
          si.customerName,
          si.salesRepId || null,
          si.salesRepName || null,
          si.paymentType,
          si.subtotal,
          si.discountAmount,
          si.taxAmount,
          si.netTotal,
          si.paidAmount,
          si.balanceAmount,
          si.status,
          si.notes || null,
        ]
      );
      for (const item of si.items || []) {
        await conn.query(
          `INSERT INTO \`sales_invoice_items\` (\`sales_invoice_id\`, \`product_id\`, \`product_name\`, \`batch_number\`, \`quantity\`, \`unit\`, \`unit_price\`, \`total_price\`, \`unit_cost\`)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            si.id,
            item.productId,
            item.productName,
            item.batchNumber || 'OPENING',
            item.quantity,
            item.unit,
            item.unitPrice,
            item.totalPrice,
            item.unitCost || 0,
          ]
        );
      }
    }

    for (const sr of db.salesReturns || []) {
      await conn.query(
        `INSERT INTO \`sales_returns\` (\`id\`, \`return_number\`, \`sales_invoice_id\`, \`sales_invoice_number\`, \`return_date\`, \`customer_id\`, \`customer_name\`, \`total_refund_amount\`, \`notes\`)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE \`total_refund_amount\`=VALUES(\`total_refund_amount\`)`,
        [
          sr.id,
          sr.returnNumber,
          sr.salesInvoiceId,
          sr.salesInvoiceNumber,
          toSqlDate(sr.date) || toSqlDate(new Date().toISOString()),
          sr.customerId,
          sr.customerName,
          sr.totalRefundAmount,
          sr.notes || null,
        ]
      );
    }

    // 8. Accounts, Vouchers, Stock Ledger, Audit Logs
    for (const acc of db.accounts) {
      await conn.query(
        `INSERT INTO \`account_heads\` (\`id\`, \`code\`, \`name\`, \`category\`, \`parent_code\`, \`current_balance\`, \`is_system\`)
         VALUES (?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE \`current_balance\`=VALUES(\`current_balance\`)`,
        [acc.id, acc.code, acc.name, acc.category, acc.parentCode || null, acc.currentBalance, acc.isSystem ? 1 : 0]
      );
    }

    await conn.query('DELETE FROM `financial_voucher_entries`');
    for (const v of db.vouchers) {
      await conn.query(
        `INSERT INTO \`financial_vouchers\` (\`id\`, \`voucher_number\`, \`voucher_type\`, \`voucher_date\`, \`reference_no\`, \`cheque_no\`, \`total_debit\`, \`total_credit\`, \`narration\`, \`posted_by\`, \`is_automatic\`, \`status\`)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE \`status\`=VALUES(\`status\`)`,
        [
          v.id,
          v.voucherNumber,
          v.voucherType,
          toSqlDate(v.date) || toSqlDate(new Date().toISOString()),
          v.referenceNo || null,
          v.chequeNo || null,
          v.totalDebit,
          v.totalCredit,
          v.narration,
          v.postedBy,
          v.isAutomatic ? 1 : 0,
          v.status,
        ]
      );
      for (const entry of v.entries || []) {
        await conn.query(
          `INSERT INTO \`financial_voucher_entries\` (\`voucher_id\`, \`account_id\`, \`account_code\`, \`account_name\`, \`debit\`, \`credit\`, \`description\`)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [
            v.id,
            entry.accountId,
            entry.accountCode,
            entry.accountName,
            entry.debit || 0,
            entry.credit || 0,
            entry.description || null,
          ]
        );
      }
    }

    for (const sl of db.stockLedger) {
      await conn.query(
        `INSERT IGNORE INTO \`stock_ledger\` (\`id\`, \`transaction_date\`, \`item_type\`, \`item_id\`, \`item_name\`, \`batch_number\`, \`transaction_type\`, \`reference_no\`, \`quantity_in\`, \`quantity_out\`, \`balance_quantity\`, \`rate\`, \`total_amount\`, \`warehouse_id\`)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          sl.id,
          toSqlDate(sl.date) || toSqlDate(new Date().toISOString()),
          sl.itemType,
          sl.itemId,
          sl.itemName,
          sl.batchNumber || null,
          sl.transactionType,
          sl.referenceNo,
          sl.quantityIn,
          sl.quantityOut,
          sl.balanceQuantity,
          sl.rate,
          sl.totalAmount,
          sl.warehouseId,
        ]
      );
    }

    for (const log of db.auditLogs) {
      await conn.query(
        `INSERT IGNORE INTO \`audit_logs\` (\`id\`, \`event_timestamp\`, \`user_id\`, \`user_name\`, \`role\`, \`module\`, \`action\`, \`details\`)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          log.id,
          toSqlDateTime(log.timestamp) || toSqlDateTime(new Date().toISOString()),
          log.userId,
          log.userName,
          log.role,
          log.module,
          log.action,
          log.details,
        ]
      );
    }

    await conn.query('SET FOREIGN_KEY_CHECKS = 1');
    await conn.commit();
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}
