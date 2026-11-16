import { ERPDatabase } from './storage';
import {
  RawMaterial,
  PackagingMaterial,
  FinishedProduct,
  StockLedgerEntry,
  MaterialBatch,
  PackagingBatch,
  FinishedProductBatch,
} from '../types/erp';

export function addRawMaterialStock(
  db: ERPDatabase,
  materialId: string,
  batch: MaterialBatch,
  referenceNo: string,
  date: string
): ERPDatabase {
  const materialIndex = db.rawMaterials.findIndex(m => m.id === materialId);
  if (materialIndex < 0) return db;

  const material = { ...db.rawMaterials[materialIndex] };
  const existingBatchIndex = material.batches.findIndex(b => b.batchNumber === batch.batchNumber);

  if (existingBatchIndex >= 0) {
    const existing = { ...material.batches[existingBatchIndex] };
    existing.quantity += batch.quantity;
    material.batches[existingBatchIndex] = existing;
  } else {
    material.batches.push(batch);
  }

  // Update total available stock
  const newAvailableStock = material.batches.reduce((sum, b) => sum + b.quantity, 0);
  
  // Calculate weighted average cost
  const totalValue = material.batches.reduce((sum, b) => sum + b.quantity * b.costRate, 0);
  const newAvgCost = newAvailableStock > 0 ? totalValue / newAvailableStock : material.averageCost;

  material.availableStock = Number(newAvailableStock.toFixed(2));
  material.averageCost = Number(newAvgCost.toFixed(2));

  // Add stock ledger entry
  const ledgerEntry: StockLedgerEntry = {
    id: `led-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    date,
    itemType: 'raw_material',
    itemId: material.id,
    itemName: material.name,
    batchNumber: batch.batchNumber,
    transactionType: 'purchase',
    referenceNo,
    quantityIn: batch.quantity,
    quantityOut: 0,
    balanceQuantity: material.availableStock,
    rate: batch.costRate,
    totalAmount: batch.quantity * batch.costRate,
    warehouseId: material.warehouseId,
  };

  const updatedRawMaterials = [...db.rawMaterials];
  updatedRawMaterials[materialIndex] = material;

  return {
    ...db,
    rawMaterials: updatedRawMaterials,
    stockLedger: [ledgerEntry, ...db.stockLedger],
  };
}

export function issueRawMaterialFEFO(
  db: ERPDatabase,
  materialId: string,
  requiredQty: number,
  referenceNo: string,
  date: string
): { updatedDb: ERPDatabase; issuedBatches: { batchNumber: string; qty: number; cost: number }[]; error?: string } {
  const materialIndex = db.rawMaterials.findIndex(m => m.id === materialId);
  if (materialIndex < 0) return { updatedDb: db, issuedBatches: [], error: 'Material not found.' };

  const material = { ...db.rawMaterials[materialIndex] };
  if (material.availableStock < requiredQty) {
    return {
      updatedDb: db,
      issuedBatches: [],
      error: `Insufficient stock for ${material.name}. Available: ${material.availableStock} ${material.consumptionUnit}, Required: ${requiredQty} ${material.consumptionUnit}.`,
    };
  }

  // Sort batches by expiry date (FEFO)
  const sortedBatches = [...material.batches]
    .filter(b => b.quantity > 0 && b.qcStatus !== 'rejected')
    .sort((a, b) => new Date(a.expiryDate || '2099-12-31').getTime() - new Date(b.expiryDate || '2099-12-31').getTime());

  let remainingToIssue = requiredQty;
  const issuedBatches: { batchNumber: string; qty: number; cost: number }[] = [];
  const updatedBatches = [...material.batches];
  const newLedgerEntries: StockLedgerEntry[] = [];

  for (const b of sortedBatches) {
    if (remainingToIssue <= 0) break;
    const bIndex = updatedBatches.findIndex(x => x.batchNumber === b.batchNumber);
    const take = Math.min(b.quantity, remainingToIssue);

    updatedBatches[bIndex] = {
      ...updatedBatches[bIndex],
      quantity: Number((updatedBatches[bIndex].quantity - take).toFixed(3)),
    };

    issuedBatches.push({
      batchNumber: b.batchNumber,
      qty: take,
      cost: b.costRate,
    });

    remainingToIssue -= take;
  }

  material.batches = updatedBatches;
  material.availableStock = Number(material.batches.reduce((sum, b) => sum + b.quantity, 0).toFixed(2));

  for (const ib of issuedBatches) {
    newLedgerEntries.push({
      id: `led-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      date,
      itemType: 'raw_material',
      itemId: material.id,
      itemName: material.name,
      batchNumber: ib.batchNumber,
      transactionType: 'issue_production',
      referenceNo,
      quantityIn: 0,
      quantityOut: ib.qty,
      balanceQuantity: material.availableStock,
      rate: ib.cost,
      totalAmount: ib.qty * ib.cost,
      warehouseId: material.warehouseId,
    });
  }

  const updatedRawMaterials = [...db.rawMaterials];
  updatedRawMaterials[materialIndex] = material;

  return {
    updatedDb: {
      ...db,
      rawMaterials: updatedRawMaterials,
      stockLedger: [...newLedgerEntries, ...db.stockLedger],
    },
    issuedBatches,
  };
}

export function addPackagingStock(
  db: ERPDatabase,
  packagingId: string,
  batch: PackagingBatch,
  referenceNo: string,
  date: string
): ERPDatabase {
  const pkgIndex = db.packagingMaterials.findIndex(p => p.id === packagingId);
  if (pkgIndex < 0) return db;

  const pkg = { ...db.packagingMaterials[pkgIndex] };
  pkg.batches = [...pkg.batches, batch];
  pkg.availableStock = Number(pkg.batches.reduce((sum, b) => sum + b.quantity, 0).toFixed(2));

  const ledgerEntry: StockLedgerEntry = {
    id: `led-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    date,
    itemType: 'packaging',
    itemId: pkg.id,
    itemName: pkg.name,
    batchNumber: batch.batchNumber,
    transactionType: 'purchase',
    referenceNo,
    quantityIn: batch.quantity,
    quantityOut: 0,
    balanceQuantity: pkg.availableStock,
    rate: batch.costRate,
    totalAmount: batch.quantity * batch.costRate,
    warehouseId: pkg.warehouseId,
  };

  const updatedPkg = [...db.packagingMaterials];
  updatedPkg[pkgIndex] = pkg;

  return {
    ...db,
    packagingMaterials: updatedPkg,
    stockLedger: [ledgerEntry, ...db.stockLedger],
  };
}

export function issuePackagingMaterial(
  db: ERPDatabase,
  packagingId: string,
  requiredQty: number,
  referenceNo: string,
  date: string
): { updatedDb: ERPDatabase; error?: string } {
  const pkgIndex = db.packagingMaterials.findIndex(p => p.id === packagingId);
  if (pkgIndex < 0) return { updatedDb: db, error: 'Packaging material not found.' };

  const pkg = { ...db.packagingMaterials[pkgIndex] };
  if (pkg.availableStock < requiredQty) {
    return {
      updatedDb: db,
      error: `Insufficient packaging stock for ${pkg.name}. Available: ${pkg.availableStock}, Required: ${requiredQty}.`,
    };
  }

  let remaining = requiredQty;
  const updatedBatches = [...pkg.batches];

  for (let i = 0; i < updatedBatches.length; i++) {
    if (remaining <= 0) break;
    const b = updatedBatches[i];
    if (b.quantity > 0) {
      const take = Math.min(b.quantity, remaining);
      updatedBatches[i] = { ...b, quantity: b.quantity - take };
      remaining -= take;
    }
  }

  pkg.batches = updatedBatches;
  pkg.availableStock = Number(pkg.batches.reduce((sum, b) => sum + b.quantity, 0).toFixed(2));

  const ledgerEntry: StockLedgerEntry = {
    id: `led-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    date,
    itemType: 'packaging',
    itemId: pkg.id,
    itemName: pkg.name,
    transactionType: 'issue_production',
    referenceNo,
    quantityIn: 0,
    quantityOut: requiredQty,
    balanceQuantity: pkg.availableStock,
    rate: pkg.purchaseRate,
    totalAmount: requiredQty * pkg.purchaseRate,
    warehouseId: pkg.warehouseId,
  };

  const updatedPkg = [...db.packagingMaterials];
  updatedPkg[pkgIndex] = pkg;

  return {
    updatedDb: {
      ...db,
      packagingMaterials: updatedPkg,
      stockLedger: [ledgerEntry, ...db.stockLedger],
    },
  };
}

export function addFinishedGoodsStock(
  db: ERPDatabase,
  productId: string,
  batch: FinishedProductBatch,
  referenceNo: string,
  date: string
): ERPDatabase {
  const productIndex = db.finishedProducts.findIndex(p => p.id === productId);
  if (productIndex < 0) return db;

  const product = { ...db.finishedProducts[productIndex] };
  product.batches = [...product.batches, batch];
  product.availableStock = Number(product.batches.reduce((sum, b) => (b.qcStatus === 'approved' ? sum + b.quantity : sum), 0).toFixed(2));
  product.productionCost = batch.costPerUnit;

  const ledgerEntry: StockLedgerEntry = {
    id: `led-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    date,
    itemType: 'finished_goods',
    itemId: product.id,
    itemName: product.name,
    batchNumber: batch.batchNumber,
    transactionType: 'production_receipt',
    referenceNo,
    quantityIn: batch.quantity,
    quantityOut: 0,
    balanceQuantity: product.availableStock,
    rate: batch.costPerUnit,
    totalAmount: batch.quantity * batch.costPerUnit,
    warehouseId: product.warehouseId,
  };

  const updatedProducts = [...db.finishedProducts];
  updatedProducts[productIndex] = product;

  return {
    ...db,
    finishedProducts: updatedProducts,
    stockLedger: [ledgerEntry, ...db.stockLedger],
  };
}

export function deductFinishedGoodsStock(
  db: ERPDatabase,
  productId: string,
  batchNumber: string,
  quantity: number,
  referenceNo: string,
  rate: number,
  date: string
): { updatedDb: ERPDatabase; error?: string } {
  const productIndex = db.finishedProducts.findIndex(p => p.id === productId);
  if (productIndex < 0) return { updatedDb: db, error: 'Product not found.' };

  if (!Number.isFinite(quantity) || quantity <= 0) {
    return { updatedDb: db, error: 'Invoice line quantity must be greater than zero.' };
  }

  const product = { ...db.finishedProducts[productIndex] };

  // Support products that have opening/available stock recorded without batch entries
  if (product.batches.length === 0) {
    if (product.availableStock < quantity) {
      return {
        updatedDb: db,
        error: `No QC-approved batch or sufficient stock for ${product.name}. Available: ${product.availableStock}, Requested: ${quantity}. Please receive a batch in Finished Goods first.`,
      };
    }

    product.availableStock = Number((product.availableStock - quantity).toFixed(2));
    const resolvedBatch = batchNumber && batchNumber !== 'NO-BATCH' ? batchNumber : 'OPENING';

    const ledgerEntry: StockLedgerEntry = {
      id: `led-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      date,
      itemType: 'finished_goods',
      itemId: product.id,
      itemName: product.name,
      batchNumber: resolvedBatch,
      transactionType: 'sales',
      referenceNo,
      quantityIn: 0,
      quantityOut: quantity,
      balanceQuantity: product.availableStock,
      rate,
      totalAmount: quantity * rate,
      warehouseId: product.warehouseId,
    };

    const updatedProducts = [...db.finishedProducts];
    updatedProducts[productIndex] = product;

    return {
      updatedDb: {
        ...db,
        finishedProducts: updatedProducts,
        stockLedger: [ledgerEntry, ...db.stockLedger],
      },
    };
  }

  if (!batchNumber || batchNumber === 'NO-BATCH') {
    return {
      updatedDb: db,
      error: `No QC-approved batch available/selected for ${product.name}. Please receive or QC-approve a batch in Finished Goods first.`,
    };
  }

  const batchIndex = product.batches.findIndex(b => b.batchNumber === batchNumber);

  if (batchIndex < 0) {
    return { updatedDb: db, error: `Batch ${batchNumber} not found for product ${product.name}.` };
  }

  const batch = product.batches[batchIndex];
  if (batch.qcStatus !== 'approved') {
    return { updatedDb: db, error: `Batch ${batchNumber} is not approved for sale (Status: ${batch.qcStatus}).` };
  }

  if (batch.quantity < quantity) {
    return {
      updatedDb: db,
      error: `Insufficient stock in batch ${batchNumber} for ${product.name}. Available: ${batch.quantity}, Requested: ${quantity}.`,
    };
  }

  const updatedBatches = [...product.batches];
  updatedBatches[batchIndex] = {
    ...batch,
    quantity: Number((batch.quantity - quantity).toFixed(2)),
  };

  product.batches = updatedBatches;
  product.availableStock = Number(
    product.batches.reduce((sum, b) => (b.qcStatus === 'approved' ? sum + b.quantity : sum), 0).toFixed(2)
  );

  const ledgerEntry: StockLedgerEntry = {
    id: `led-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    date,
    itemType: 'finished_goods',
    itemId: product.id,
    itemName: product.name,
    batchNumber,
    transactionType: 'sales',
    referenceNo,
    quantityIn: 0,
    quantityOut: quantity,
    balanceQuantity: product.availableStock,
    rate,
    totalAmount: quantity * rate,
    warehouseId: product.warehouseId,
  };

  const updatedProducts = [...db.finishedProducts];
  updatedProducts[productIndex] = product;

  return {
    updatedDb: {
      ...db,
      finishedProducts: updatedProducts,
      stockLedger: [ledgerEntry, ...db.stockLedger],
    },
  };
}
