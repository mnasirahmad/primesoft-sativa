-- ============================================================================
-- SATIVA COSMETICS – Manufacturing & Inventory ERP (System Year: 2026-27)
-- Developed by: Prime Soft Vehari | 5-KM Multan Road, Vehari, Pakistan
-- Engine: MySQL 8.0+ / MariaDB 10.6+ (InnoDB, utf8mb4)
-- Complete Relational Schema with DATE / DATETIME Tracking & FEFO Indexes
-- ============================================================================

-- Note: On shared hosting (e.g. StackCP), select your target database before running.
-- CREATE DATABASE IF NOT EXISTS `sativa_cosmetics_erp`
--   CHARACTER SET utf8mb4
--   COLLATE utf8mb4_unicode_ci;
-- USE `sativa_cosmetics_erp`;

SET FOREIGN_KEY_CHECKS = 0;

-- ----------------------------------------------------------------------------
-- 1. Company & Master Configuration Tables
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS `company_profile` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(150) NOT NULL DEFAULT 'SATIVA COSMETICS',
  `business_type` VARCHAR(150) NOT NULL DEFAULT 'Cosmetics Manufacturing Company',
  `address` VARCHAR(255) NOT NULL,
  `phone` VARCHAR(80) NOT NULL,
  `email` VARCHAR(120) NOT NULL,
  `ntn` VARCHAR(40) NULL,
  `strn` VARCHAR(40) NULL,
  `currency` VARCHAR(10) NOT NULL DEFAULT 'PKR',
  `system_year` VARCHAR(20) NOT NULL DEFAULT '2026-27',
  `software_title` VARCHAR(180) NOT NULL,
  `developed_by` VARCHAR(120) NOT NULL DEFAULT 'Prime Soft Vehari',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `users` (
  `id` VARCHAR(64) NOT NULL,
  `username` VARCHAR(80) NOT NULL,
  `password_hash` VARCHAR(255) NOT NULL,
  `name` VARCHAR(150) NOT NULL,
  `email` VARCHAR(150) NOT NULL,
  `role` ENUM('admin', 'manager', 'operator') NOT NULL DEFAULT 'operator',
  `department` VARCHAR(120) NOT NULL DEFAULT 'Operations',
  `phone` VARCHAR(40) NULL,
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  `last_login` DATETIME NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_users_username` (`username`),
  UNIQUE KEY `uq_users_email` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `warehouses` (
  `id` VARCHAR(64) NOT NULL,
  `code` VARCHAR(32) NOT NULL,
  `name` VARCHAR(150) NOT NULL,
  `type` ENUM('raw_material', 'packaging', 'finished_goods', 'quarantine', 'general') NOT NULL DEFAULT 'general',
  `location` VARCHAR(200) NOT NULL,
  `capacity` VARCHAR(80) NULL,
  `manager_name` VARCHAR(120) NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_warehouses_code` (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `sales_reps` (
  `id` VARCHAR(64) NOT NULL,
  `code` VARCHAR(32) NOT NULL,
  `name` VARCHAR(150) NOT NULL,
  `phone` VARCHAR(40) NOT NULL,
  `territory` VARCHAR(150) NOT NULL,
  `commission_rate` DECIMAL(6,2) NOT NULL DEFAULT 0.00,
  `target_amount` DECIMAL(14,2) NOT NULL DEFAULT 0.00,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_sales_reps_code` (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `customers` (
  `id` VARCHAR(64) NOT NULL,
  `code` VARCHAR(32) NOT NULL,
  `name` VARCHAR(150) NOT NULL,
  `company_name` VARCHAR(180) NOT NULL,
  `customer_type` ENUM('distributor', 'wholesaler', 'parlour', 'retailer') NOT NULL DEFAULT 'wholesaler',
  `phone` VARCHAR(40) NOT NULL,
  `email` VARCHAR(150) NULL,
  `city` VARCHAR(100) NOT NULL,
  `address` VARCHAR(255) NOT NULL,
  `credit_limit` DECIMAL(14,2) NOT NULL DEFAULT 0.00,
  `current_balance` DECIMAL(14,2) NOT NULL DEFAULT 0.00,
  `sales_rep_id` VARCHAR(64) NULL,
  `ntn` VARCHAR(40) NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_customers_code` (`code`),
  KEY `idx_customers_sales_rep` (`sales_rep_id`),
  CONSTRAINT `fk_customers_sales_rep` FOREIGN KEY (`sales_rep_id`) REFERENCES `sales_reps` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `suppliers` (
  `id` VARCHAR(64) NOT NULL,
  `code` VARCHAR(32) NOT NULL,
  `name` VARCHAR(150) NOT NULL,
  `company_name` VARCHAR(180) NOT NULL,
  `supplier_type` ENUM('chemical', 'packaging', 'machinery', 'general') NOT NULL DEFAULT 'chemical',
  `phone` VARCHAR(40) NOT NULL,
  `email` VARCHAR(150) NULL,
  `city` VARCHAR(100) NOT NULL,
  `address` VARCHAR(255) NOT NULL,
  `current_balance` DECIMAL(14,2) NOT NULL DEFAULT 0.00,
  `ntn` VARCHAR(40) NULL,
  `payment_terms_days` INT NOT NULL DEFAULT 30,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_suppliers_code` (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `product_categories` (
  `id` VARCHAR(64) NOT NULL,
  `code` VARCHAR(32) NOT NULL,
  `name` VARCHAR(150) NOT NULL,
  `description` TEXT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_categories_code` (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `product_brands` (
  `id` VARCHAR(64) NOT NULL,
  `name` VARCHAR(120) NOT NULL,
  `tagline` VARCHAR(200) NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_brands_name` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `units_of_measure` (
  `id` VARCHAR(64) NOT NULL,
  `code` VARCHAR(20) NOT NULL,
  `name` VARCHAR(80) NOT NULL,
  `symbol` VARCHAR(20) NOT NULL,
  `base_unit` VARCHAR(20) NULL,
  `conversion_factor` DECIMAL(14,6) NOT NULL DEFAULT 1.000000,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_units_code` (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- 2. Raw Materials, Packaging Materials & Finished Goods (with DATE Batches)
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS `raw_materials` (
  `id` VARCHAR(64) NOT NULL,
  `code` VARCHAR(40) NOT NULL,
  `name` VARCHAR(180) NOT NULL,
  `category` VARCHAR(120) NOT NULL,
  `supplier_id` VARCHAR(64) NULL,
  `purchase_unit` VARCHAR(30) NOT NULL,
  `consumption_unit` VARCHAR(30) NOT NULL,
  `conversion_rate` DECIMAL(12,4) NOT NULL DEFAULT 1.0000,
  `minimum_stock_level` DECIMAL(14,3) NOT NULL DEFAULT 0.000,
  `reorder_level` DECIMAL(14,3) NOT NULL DEFAULT 0.000,
  `warehouse_id` VARCHAR(64) NOT NULL,
  `opening_stock` DECIMAL(14,3) NOT NULL DEFAULT 0.000,
  `available_stock` DECIMAL(14,3) NOT NULL DEFAULT 0.000,
  `purchase_rate` DECIMAL(14,2) NOT NULL DEFAULT 0.00,
  `average_cost` DECIMAL(14,2) NOT NULL DEFAULT 0.00,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_rm_code` (`code`),
  KEY `idx_rm_supplier` (`supplier_id`),
  KEY `idx_rm_warehouse` (`warehouse_id`),
  CONSTRAINT `fk_rm_supplier` FOREIGN KEY (`supplier_id`) REFERENCES `suppliers` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_rm_warehouse` FOREIGN KEY (`warehouse_id`) REFERENCES `warehouses` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `raw_material_batches` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `raw_material_id` VARCHAR(64) NOT NULL,
  `batch_number` VARCHAR(80) NOT NULL,
  `quantity` DECIMAL(14,3) NOT NULL DEFAULT 0.000,
  `cost_rate` DECIMAL(14,2) NOT NULL DEFAULT 0.00,
  `manufacturing_date` DATE NOT NULL,
  `expiry_date` DATE NOT NULL,
  `supplier_batch_no` VARCHAR(80) NULL,
  `qc_status` ENUM('approved', 'quarantine', 'rejected') NOT NULL DEFAULT 'approved',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_rm_batches_fefo` (`raw_material_id`, `expiry_date`, `qc_status`),
  CONSTRAINT `fk_rm_batches_material` FOREIGN KEY (`raw_material_id`) REFERENCES `raw_materials` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `packaging_materials` (
  `id` VARCHAR(64) NOT NULL,
  `code` VARCHAR(40) NOT NULL,
  `name` VARCHAR(180) NOT NULL,
  `category` ENUM('bottles', 'jars', 'caps', 'pumps', 'labels', 'cartons', 'boxes', 'seals', 'accessories') NOT NULL DEFAULT 'bottles',
  `supplier_id` VARCHAR(64) NULL,
  `unit` VARCHAR(30) NOT NULL DEFAULT 'Pieces',
  `minimum_stock_level` DECIMAL(14,3) NOT NULL DEFAULT 0.000,
  `warehouse_id` VARCHAR(64) NOT NULL,
  `opening_stock` DECIMAL(14,3) NOT NULL DEFAULT 0.000,
  `available_stock` DECIMAL(14,3) NOT NULL DEFAULT 0.000,
  `purchase_rate` DECIMAL(14,2) NOT NULL DEFAULT 0.00,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_pkg_code` (`code`),
  KEY `idx_pkg_supplier` (`supplier_id`),
  KEY `idx_pkg_warehouse` (`warehouse_id`),
  CONSTRAINT `fk_pkg_supplier` FOREIGN KEY (`supplier_id`) REFERENCES `suppliers` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_pkg_warehouse` FOREIGN KEY (`warehouse_id`) REFERENCES `warehouses` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `packaging_material_batches` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `packaging_material_id` VARCHAR(64) NOT NULL,
  `batch_number` VARCHAR(80) NOT NULL,
  `quantity` DECIMAL(14,3) NOT NULL DEFAULT 0.000,
  `cost_rate` DECIMAL(14,2) NOT NULL DEFAULT 0.00,
  `received_date` DATE NOT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_pkg_batches_date` (`packaging_material_id`, `received_date`),
  CONSTRAINT `fk_pkg_batches_material` FOREIGN KEY (`packaging_material_id`) REFERENCES `packaging_materials` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `finished_products` (
  `id` VARCHAR(64) NOT NULL,
  `code` VARCHAR(40) NOT NULL,
  `barcode` VARCHAR(64) NULL,
  `name` VARCHAR(180) NOT NULL,
  `brand` VARCHAR(120) NOT NULL,
  `category` VARCHAR(120) NOT NULL,
  `size` VARCHAR(40) NOT NULL,
  `packing_unit` VARCHAR(40) NOT NULL DEFAULT 'Piece',
  `mrp` DECIMAL(14,2) NOT NULL DEFAULT 0.00,
  `wholesale_rate` DECIMAL(14,2) NOT NULL DEFAULT 0.00,
  `retail_rate` DECIMAL(14,2) NOT NULL DEFAULT 0.00,
  `production_cost` DECIMAL(14,2) NOT NULL DEFAULT 0.00,
  `minimum_stock_level` DECIMAL(14,3) NOT NULL DEFAULT 0.000,
  `warehouse_id` VARCHAR(64) NOT NULL,
  `opening_stock` DECIMAL(14,3) NOT NULL DEFAULT 0.000,
  `available_stock` DECIMAL(14,3) NOT NULL DEFAULT 0.000,
  `formula_id` VARCHAR(64) NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_fp_code` (`code`),
  KEY `idx_fp_barcode` (`barcode`),
  KEY `idx_fp_warehouse` (`warehouse_id`),
  CONSTRAINT `fk_fp_warehouse` FOREIGN KEY (`warehouse_id`) REFERENCES `warehouses` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `finished_product_batches` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `product_id` VARCHAR(64) NOT NULL,
  `batch_number` VARCHAR(80) NOT NULL,
  `production_order_id` VARCHAR(64) NULL,
  `quantity` DECIMAL(14,3) NOT NULL DEFAULT 0.000,
  `mfg_date` DATE NOT NULL,
  `exp_date` DATE NOT NULL,
  `cost_per_unit` DECIMAL(14,2) NOT NULL DEFAULT 0.00,
  `qc_status` ENUM('approved', 'quarantine', 'rejected') NOT NULL DEFAULT 'approved',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_fp_batches_fefo` (`product_id`, `exp_date`, `qc_status`),
  CONSTRAINT `fk_fp_batches_product` FOREIGN KEY (`product_id`) REFERENCES `finished_products` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- 3. Manufacturing Formulas (BOM), Production Planning & Quality Control
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS `manufacturing_formulas` (
  `id` VARCHAR(64) NOT NULL,
  `formula_number` VARCHAR(40) NOT NULL,
  `version` VARCHAR(60) NOT NULL,
  `product_id` VARCHAR(64) NOT NULL,
  `product_name` VARCHAR(180) NOT NULL,
  `batch_size` DECIMAL(14,3) NOT NULL,
  `batch_unit` VARCHAR(30) NOT NULL DEFAULT 'KG',
  `expected_output_units` DECIMAL(14,3) NOT NULL,
  `standard_wastage_percentage` DECIMAL(6,2) NOT NULL DEFAULT 0.00,
  `status` ENUM('draft', 'approved', 'archived') NOT NULL DEFAULT 'draft',
  `approved_by` VARCHAR(120) NULL,
  `approved_date` DATE NULL,
  `labour_cost` DECIMAL(14,2) NOT NULL DEFAULT 0.00,
  `overhead_cost` DECIMAL(14,2) NOT NULL DEFAULT 0.00,
  `other_expenses` DECIMAL(14,2) NOT NULL DEFAULT 0.00,
  `total_estimated_cost` DECIMAL(14,2) NOT NULL DEFAULT 0.00,
  `cost_per_unit` DECIMAL(14,2) NOT NULL DEFAULT 0.00,
  `notes` TEXT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_formula_number` (`formula_number`),
  KEY `idx_formulas_product` (`product_id`),
  CONSTRAINT `fk_formulas_product` FOREIGN KEY (`product_id`) REFERENCES `finished_products` (`id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `formula_ingredients` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `formula_id` VARCHAR(64) NOT NULL,
  `raw_material_id` VARCHAR(64) NOT NULL,
  `raw_material_name` VARCHAR(180) NOT NULL,
  `quantity` DECIMAL(14,4) NOT NULL,
  `unit` VARCHAR(30) NOT NULL,
  `percentage` DECIMAL(7,3) NOT NULL DEFAULT 0.000,
  `unit_cost` DECIMAL(14,2) NOT NULL DEFAULT 0.00,
  `total_cost` DECIMAL(14,2) NOT NULL DEFAULT 0.00,
  PRIMARY KEY (`id`),
  KEY `idx_fi_formula` (`formula_id`),
  CONSTRAINT `fk_fi_formula` FOREIGN KEY (`formula_id`) REFERENCES `manufacturing_formulas` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_fi_raw_material` FOREIGN KEY (`raw_material_id`) REFERENCES `raw_materials` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `formula_packaging_items` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `formula_id` VARCHAR(64) NOT NULL,
  `packaging_material_id` VARCHAR(64) NOT NULL,
  `packaging_material_name` VARCHAR(180) NOT NULL,
  `quantity` DECIMAL(14,3) NOT NULL,
  `unit` VARCHAR(30) NOT NULL,
  `unit_cost` DECIMAL(14,2) NOT NULL DEFAULT 0.00,
  `total_cost` DECIMAL(14,2) NOT NULL DEFAULT 0.00,
  PRIMARY KEY (`id`),
  KEY `idx_fpi_formula` (`formula_id`),
  CONSTRAINT `fk_fpi_formula` FOREIGN KEY (`formula_id`) REFERENCES `manufacturing_formulas` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_fpi_packaging` FOREIGN KEY (`packaging_material_id`) REFERENCES `packaging_materials` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `production_orders` (
  `id` VARCHAR(64) NOT NULL,
  `order_number` VARCHAR(40) NOT NULL,
  `order_date` DATE NOT NULL,
  `target_completion_date` DATE NOT NULL,
  `completion_date` DATE NULL,
  `product_id` VARCHAR(64) NOT NULL,
  `product_name` VARCHAR(180) NOT NULL,
  `formula_id` VARCHAR(64) NOT NULL,
  `formula_number` VARCHAR(40) NOT NULL,
  `planned_batch_count` DECIMAL(10,2) NOT NULL DEFAULT 1.00,
  `planned_quantity` DECIMAL(14,3) NOT NULL,
  `actual_quantity` DECIMAL(14,3) NOT NULL DEFAULT 0.000,
  `batch_number` VARCHAR(80) NOT NULL,
  `supervisor` VARCHAR(120) NOT NULL,
  `status` ENUM('pending', 'approved', 'in_progress', 'on_hold', 'completed', 'cancelled') NOT NULL DEFAULT 'pending',
  `raw_material_issued` TINYINT(1) NOT NULL DEFAULT 0,
  `packaging_issued` TINYINT(1) NOT NULL DEFAULT 0,
  `wastage_quantity` DECIMAL(14,3) NOT NULL DEFAULT 0.000,
  `wastage_percentage` DECIMAL(6,2) NOT NULL DEFAULT 0.00,
  `labour_cost` DECIMAL(14,2) NOT NULL DEFAULT 0.00,
  `overhead_cost` DECIMAL(14,2) NOT NULL DEFAULT 0.00,
  `total_cost` DECIMAL(14,2) NOT NULL DEFAULT 0.00,
  `cost_per_unit` DECIMAL(14,2) NOT NULL DEFAULT 0.00,
  `qc_status` ENUM('pending', 'passed', 'failed') NOT NULL DEFAULT 'pending',
  `remarks` TEXT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_po_order_number` (`order_number`),
  KEY `idx_po_dates` (`order_date`, `target_completion_date`, `completion_date`),
  CONSTRAINT `fk_po_product` FOREIGN KEY (`product_id`) REFERENCES `finished_products` (`id`),
  CONSTRAINT `fk_po_formula` FOREIGN KEY (`formula_id`) REFERENCES `manufacturing_formulas` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `production_raw_material_issues` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `production_order_id` VARCHAR(64) NOT NULL,
  `material_id` VARCHAR(64) NOT NULL,
  `material_name` VARCHAR(180) NOT NULL,
  `required_qty` DECIMAL(14,4) NOT NULL,
  `issued_qty` DECIMAL(14,4) NOT NULL,
  `unit` VARCHAR(30) NOT NULL,
  `unit_cost` DECIMAL(14,2) NOT NULL,
  `batch_number_used` VARCHAR(80) NULL,
  PRIMARY KEY (`id`),
  KEY `idx_prmi_order` (`production_order_id`),
  CONSTRAINT `fk_prmi_order` FOREIGN KEY (`production_order_id`) REFERENCES `production_orders` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `production_packaging_issues` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `production_order_id` VARCHAR(64) NOT NULL,
  `packaging_id` VARCHAR(64) NOT NULL,
  `packaging_name` VARCHAR(180) NOT NULL,
  `required_qty` DECIMAL(14,3) NOT NULL,
  `issued_qty` DECIMAL(14,3) NOT NULL,
  `unit` VARCHAR(30) NOT NULL,
  `unit_cost` DECIMAL(14,2) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_ppi_order` (`production_order_id`),
  CONSTRAINT `fk_ppi_order` FOREIGN KEY (`production_order_id`) REFERENCES `production_orders` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `quality_inspections` (
  `id` VARCHAR(64) NOT NULL,
  `inspection_number` VARCHAR(40) NOT NULL,
  `inspection_date` DATE NOT NULL,
  `type` ENUM('raw_material', 'finished_goods') NOT NULL,
  `reference_batch_number` VARCHAR(80) NOT NULL,
  `item_id` VARCHAR(64) NOT NULL,
  `item_name` VARCHAR(180) NOT NULL,
  `production_order_id` VARCHAR(64) NULL,
  `inspector_name` VARCHAR(120) NOT NULL,
  `overall_status` ENUM('approved', 'rejected', 'conditional') NOT NULL,
  `weight_verification` VARCHAR(120) NOT NULL,
  `ph_value` VARCHAR(40) NULL,
  `viscosity` VARCHAR(60) NULL,
  `microbial_test` VARCHAR(120) NULL,
  `packaging_integrity` VARCHAR(120) NULL,
  `remarks` TEXT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_qc_number` (`inspection_number`),
  KEY `idx_qc_date_batch` (`inspection_date`, `reference_batch_number`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `quality_inspection_parameters` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `inspection_id` VARCHAR(64) NOT NULL,
  `parameter_name` VARCHAR(120) NOT NULL,
  `specification` VARCHAR(120) NOT NULL,
  `actual_result` VARCHAR(120) NOT NULL,
  `status` ENUM('pass', 'fail') NOT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_qip_inspection` (`inspection_id`),
  CONSTRAINT `fk_qip_inspection` FOREIGN KEY (`inspection_id`) REFERENCES `quality_inspections` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- 4. Purchases, Sales & Returns (with Invoice & Expiry Dates)
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS `purchase_invoices` (
  `id` VARCHAR(64) NOT NULL,
  `invoice_number` VARCHAR(40) NOT NULL,
  `supplier_invoice_number` VARCHAR(60) NULL,
  `invoice_date` DATE NOT NULL,
  `supplier_id` VARCHAR(64) NOT NULL,
  `supplier_name` VARCHAR(180) NOT NULL,
  `payment_type` ENUM('cash', 'credit') NOT NULL DEFAULT 'credit',
  `subtotal` DECIMAL(14,2) NOT NULL DEFAULT 0.00,
  `tax_amount` DECIMAL(14,2) NOT NULL DEFAULT 0.00,
  `discount_amount` DECIMAL(14,2) NOT NULL DEFAULT 0.00,
  `net_total` DECIMAL(14,2) NOT NULL DEFAULT 0.00,
  `paid_amount` DECIMAL(14,2) NOT NULL DEFAULT 0.00,
  `balance_amount` DECIMAL(14,2) NOT NULL DEFAULT 0.00,
  `warehouse_id` VARCHAR(64) NOT NULL,
  `status` ENUM('posted', 'cancelled') NOT NULL DEFAULT 'posted',
  `notes` TEXT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_pi_number` (`invoice_number`),
  KEY `idx_pi_date` (`invoice_date`),
  CONSTRAINT `fk_pi_supplier` FOREIGN KEY (`supplier_id`) REFERENCES `suppliers` (`id`),
  CONSTRAINT `fk_pi_warehouse` FOREIGN KEY (`warehouse_id`) REFERENCES `warehouses` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `purchase_invoice_items` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `purchase_invoice_id` VARCHAR(64) NOT NULL,
  `item_type` ENUM('raw_material', 'packaging') NOT NULL,
  `item_id` VARCHAR(64) NOT NULL,
  `item_name` VARCHAR(180) NOT NULL,
  `batch_number` VARCHAR(80) NOT NULL,
  `mfg_date` DATE NULL,
  `expiry_date` DATE NULL,
  `quantity` DECIMAL(14,3) NOT NULL,
  `unit` VARCHAR(30) NOT NULL,
  `unit_price` DECIMAL(14,2) NOT NULL,
  `total_price` DECIMAL(14,2) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_pii_invoice` (`purchase_invoice_id`),
  CONSTRAINT `fk_pii_invoice` FOREIGN KEY (`purchase_invoice_id`) REFERENCES `purchase_invoices` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `purchase_returns` (
  `id` VARCHAR(64) NOT NULL,
  `return_number` VARCHAR(40) NOT NULL,
  `purchase_invoice_id` VARCHAR(64) NOT NULL,
  `purchase_invoice_number` VARCHAR(40) NOT NULL,
  `return_date` DATE NOT NULL,
  `supplier_id` VARCHAR(64) NOT NULL,
  `supplier_name` VARCHAR(180) NOT NULL,
  `total_refund_amount` DECIMAL(14,2) NOT NULL DEFAULT 0.00,
  `notes` TEXT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_pr_number` (`return_number`),
  KEY `idx_pr_date` (`return_date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `sales_invoices` (
  `id` VARCHAR(64) NOT NULL,
  `invoice_number` VARCHAR(40) NOT NULL,
  `invoice_date` DATE NOT NULL,
  `customer_id` VARCHAR(64) NOT NULL,
  `customer_name` VARCHAR(180) NOT NULL,
  `sales_rep_id` VARCHAR(64) NULL,
  `sales_rep_name` VARCHAR(150) NULL,
  `payment_type` ENUM('cash', 'credit') NOT NULL DEFAULT 'cash',
  `subtotal` DECIMAL(14,2) NOT NULL DEFAULT 0.00,
  `discount_amount` DECIMAL(14,2) NOT NULL DEFAULT 0.00,
  `tax_amount` DECIMAL(14,2) NOT NULL DEFAULT 0.00,
  `net_total` DECIMAL(14,2) NOT NULL DEFAULT 0.00,
  `paid_amount` DECIMAL(14,2) NOT NULL DEFAULT 0.00,
  `balance_amount` DECIMAL(14,2) NOT NULL DEFAULT 0.00,
  `status` ENUM('posted', 'cancelled') NOT NULL DEFAULT 'posted',
  `notes` TEXT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_si_number` (`invoice_number`),
  KEY `idx_si_date` (`invoice_date`),
  CONSTRAINT `fk_si_customer` FOREIGN KEY (`customer_id`) REFERENCES `customers` (`id`),
  CONSTRAINT `fk_si_rep` FOREIGN KEY (`sales_rep_id`) REFERENCES `sales_reps` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `sales_invoice_items` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `sales_invoice_id` VARCHAR(64) NOT NULL,
  `product_id` VARCHAR(64) NOT NULL,
  `product_name` VARCHAR(180) NOT NULL,
  `batch_number` VARCHAR(80) NOT NULL,
  `quantity` DECIMAL(14,3) NOT NULL,
  `unit` VARCHAR(30) NOT NULL,
  `unit_price` DECIMAL(14,2) NOT NULL,
  `total_price` DECIMAL(14,2) NOT NULL,
  `unit_cost` DECIMAL(14,2) NOT NULL DEFAULT 0.00,
  PRIMARY KEY (`id`),
  KEY `idx_sii_invoice` (`sales_invoice_id`),
  CONSTRAINT `fk_sii_invoice` FOREIGN KEY (`sales_invoice_id`) REFERENCES `sales_invoices` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `sales_returns` (
  `id` VARCHAR(64) NOT NULL,
  `return_number` VARCHAR(40) NOT NULL,
  `sales_invoice_id` VARCHAR(64) NOT NULL,
  `sales_invoice_number` VARCHAR(40) NOT NULL,
  `return_date` DATE NOT NULL,
  `customer_id` VARCHAR(64) NOT NULL,
  `customer_name` VARCHAR(180) NOT NULL,
  `total_refund_amount` DECIMAL(14,2) NOT NULL DEFAULT 0.00,
  `notes` TEXT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_sr_number` (`return_number`),
  KEY `idx_sr_date` (`return_date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- 5. Double-Entry Accounting, Stock Ledger & Security Audit Trail
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS `account_heads` (
  `id` VARCHAR(64) NOT NULL,
  `code` VARCHAR(20) NOT NULL,
  `name` VARCHAR(180) NOT NULL,
  `category` ENUM('asset', 'liability', 'equity', 'revenue', 'expense') NOT NULL,
  `parent_code` VARCHAR(20) NULL,
  `current_balance` DECIMAL(16,2) NOT NULL DEFAULT 0.00,
  `is_system` TINYINT(1) NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_accounts_code` (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `financial_vouchers` (
  `id` VARCHAR(64) NOT NULL,
  `voucher_number` VARCHAR(40) NOT NULL,
  `voucher_type` ENUM('payment', 'receipt', 'journal', 'contra') NOT NULL,
  `voucher_date` DATE NOT NULL,
  `reference_no` VARCHAR(80) NULL,
  `cheque_no` VARCHAR(60) NULL,
  `total_debit` DECIMAL(16,2) NOT NULL DEFAULT 0.00,
  `total_credit` DECIMAL(16,2) NOT NULL DEFAULT 0.00,
  `narration` TEXT NOT NULL,
  `posted_by` VARCHAR(120) NOT NULL,
  `is_automatic` TINYINT(1) NOT NULL DEFAULT 0,
  `status` ENUM('posted', 'cancelled') NOT NULL DEFAULT 'posted',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_vouchers_number` (`voucher_number`),
  KEY `idx_vouchers_date` (`voucher_date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `financial_voucher_entries` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `voucher_id` VARCHAR(64) NOT NULL,
  `account_id` VARCHAR(64) NOT NULL,
  `account_code` VARCHAR(20) NOT NULL,
  `account_name` VARCHAR(180) NOT NULL,
  `debit` DECIMAL(16,2) NOT NULL DEFAULT 0.00,
  `credit` DECIMAL(16,2) NOT NULL DEFAULT 0.00,
  `description` VARCHAR(255) NULL,
  PRIMARY KEY (`id`),
  KEY `idx_fve_voucher` (`voucher_id`),
  KEY `idx_fve_account` (`account_id`),
  CONSTRAINT `fk_fve_voucher` FOREIGN KEY (`voucher_id`) REFERENCES `financial_vouchers` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_fve_account` FOREIGN KEY (`account_id`) REFERENCES `account_heads` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `stock_ledger` (
  `id` VARCHAR(64) NOT NULL,
  `transaction_date` DATE NOT NULL,
  `item_type` ENUM('raw_material', 'packaging', 'finished_goods') NOT NULL,
  `item_id` VARCHAR(64) NOT NULL,
  `item_name` VARCHAR(180) NOT NULL,
  `batch_number` VARCHAR(80) NULL,
  `transaction_type` ENUM('opening', 'purchase', 'issue_production', 'production_receipt', 'sales', 'sales_return', 'purchase_return', 'adjustment') NOT NULL,
  `reference_no` VARCHAR(80) NOT NULL,
  `quantity_in` DECIMAL(14,3) NOT NULL DEFAULT 0.000,
  `quantity_out` DECIMAL(14,3) NOT NULL DEFAULT 0.000,
  `balance_quantity` DECIMAL(14,3) NOT NULL DEFAULT 0.000,
  `rate` DECIMAL(14,2) NOT NULL DEFAULT 0.00,
  `total_amount` DECIMAL(16,2) NOT NULL DEFAULT 0.00,
  `warehouse_id` VARCHAR(64) NOT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_stock_ledger_date_item` (`transaction_date`, `item_type`, `item_id`),
  CONSTRAINT `fk_sl_warehouse` FOREIGN KEY (`warehouse_id`) REFERENCES `warehouses` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `audit_logs` (
  `id` VARCHAR(64) NOT NULL,
  `event_timestamp` DATETIME NOT NULL,
  `user_id` VARCHAR(64) NOT NULL,
  `user_name` VARCHAR(150) NOT NULL,
  `role` VARCHAR(40) NOT NULL,
  `module` VARCHAR(80) NOT NULL,
  `action` ENUM('create', 'update', 'delete', 'approve', 'cancel', 'login', 'logout', 'backup') NOT NULL,
  `details` TEXT NOT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_audit_timestamp` (`event_timestamp`),
  KEY `idx_audit_user` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET FOREIGN_KEY_CHECKS = 1;
