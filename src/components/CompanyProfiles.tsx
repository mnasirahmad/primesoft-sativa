import React, { useState } from 'react';
import { ERPDatabase, logAudit } from '../services/storage';
import { formatPKR, formatDateDMY } from '../utils/formatters';
import { Customer, Supplier, SalesRep, ProductCategory, ProductBrand, Warehouse, UnitOfMeasure } from '../types/erp';
import { DataTable, Column } from './common/DataTable';
import { Modal } from './common/Modal';
import { Building2, Plus, Edit, Trash2, Users, MapPin, Truck, Tags, Bookmark, Scale } from 'lucide-react';

interface CompanyProfilesProps {
  db: ERPDatabase;
  setDb: React.Dispatch<React.SetStateAction<ERPDatabase>>;
  onPrintDocument: (data: any) => void;
}

export const CompanyProfiles: React.FC<CompanyProfilesProps> = ({
  db,
  setDb,
  onPrintDocument,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<
    'company' | 'customers' | 'suppliers' | 'reps' | 'warehouses' | 'categories' | 'brands' | 'units'
  >('company');

  // Modal states
  const [modalType, setModalType] = useState<string | null>(null);
  const [editingItem, setEditingItem] = useState<any>(null);

  // Form states for Customer
  const [custForm, setCustForm] = useState<Partial<Customer>>({
    code: '',
    name: '',
    companyName: '',
    customerType: 'wholesaler',
    phone: '',
    email: '',
    city: 'Vehari',
    address: '',
    creditLimit: 200000,
    currentBalance: 0,
    salesRepId: '',
  });

  // Form states for Supplier
  const [supForm, setSupForm] = useState<Partial<Supplier>>({
    code: '',
    name: '',
    companyName: '',
    supplierType: 'chemical',
    phone: '',
    email: '',
    city: 'Karachi',
    address: '',
    currentBalance: 0,
    ntn: '',
    paymentTermsDays: 30,
  });

  // Form states for Sales Rep
  const [repForm, setRepForm] = useState<Partial<SalesRep>>({
    code: '',
    name: '',
    phone: '',
    territory: 'Vehari & Multan',
    commissionRate: 2.5,
    targetAmount: 2000000,
  });

  // Form states for Warehouse
  const [whForm, setWhForm] = useState<Partial<Warehouse>>({
    code: '',
    name: '',
    type: 'raw_material',
    location: '',
    managerName: '',
  });

  // Form states for Category
  const [catForm, setCatForm] = useState<Partial<ProductCategory>>({
    code: '',
    name: '',
    description: '',
  });

  // Form states for Brand
  const [brandForm, setBrandForm] = useState<Partial<ProductBrand>>({
    name: '',
    tagline: '',
  });

  // Form states for Unit
  const [unitForm, setUnitForm] = useState<Partial<UnitOfMeasure>>({
    code: '',
    name: '',
    symbol: '',
    conversionFactor: 1,
    baseUnit: '',
  });

  // Handle Company Profile Save
  const handleSaveCompany = (e: React.FormEvent) => {
    e.preventDefault();
    const updatedDb = logAudit(db, 'Company Profile', 'update', 'Updated Sativa Cosmetics corporate profile.');
    setDb(updatedDb);
    alert('Company details updated successfully!');
  };

  // Customer Save
  const handleSaveCustomer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!custForm.name || !custForm.code) return;

    if (editingItem) {
      const updated = db.customers.map(c => (c.id === editingItem.id ? { ...c, ...custForm } : c));
      let updatedDb = { ...db, customers: updated as Customer[] };
      updatedDb = logAudit(updatedDb, 'Customers', 'update', `Updated customer ${custForm.name}`);
      setDb(updatedDb);
    } else {
      const newCust: Customer = {
        id: `cust-${Date.now()}`,
        code: custForm.code || `CUST-${db.customers.length + 1}`,
        name: custForm.name || '',
        companyName: custForm.companyName || custForm.name || '',
        customerType: custForm.customerType || 'wholesaler',
        phone: custForm.phone || '',
        email: custForm.email || '',
        city: custForm.city || 'Vehari',
        address: custForm.address || '',
        creditLimit: Number(custForm.creditLimit) || 0,
        currentBalance: Number(custForm.currentBalance) || 0,
        salesRepId: custForm.salesRepId || '',
        ntn: custForm.ntn || '',
      };
      let updatedDb = { ...db, customers: [...db.customers, newCust] };
      updatedDb = logAudit(updatedDb, 'Customers', 'create', `Created customer ${newCust.name} (${newCust.code})`);
      setDb(updatedDb);
    }
    setModalType(null);
    setEditingItem(null);
  };

  // Supplier Save
  const handleSaveSupplier = (e: React.FormEvent) => {
    e.preventDefault();
    if (!supForm.name || !supForm.code) return;

    if (editingItem) {
      const updated = db.suppliers.map(s => (s.id === editingItem.id ? { ...s, ...supForm } : s));
      let updatedDb = { ...db, suppliers: updated as Supplier[] };
      updatedDb = logAudit(updatedDb, 'Suppliers', 'update', `Updated supplier ${supForm.name}`);
      setDb(updatedDb);
    } else {
      const newSup: Supplier = {
        id: `sup-${Date.now()}`,
        code: supForm.code || `SUP-${db.suppliers.length + 1}`,
        name: supForm.name || '',
        companyName: supForm.companyName || supForm.name || '',
        supplierType: supForm.supplierType || 'chemical',
        phone: supForm.phone || '',
        email: supForm.email || '',
        city: supForm.city || 'Karachi',
        address: supForm.address || '',
        currentBalance: Number(supForm.currentBalance) || 0,
        ntn: supForm.ntn || '',
        paymentTermsDays: Number(supForm.paymentTermsDays) || 30,
      };
      let updatedDb = { ...db, suppliers: [...db.suppliers, newSup] };
      updatedDb = logAudit(updatedDb, 'Suppliers', 'create', `Created supplier ${newSup.name} (${newSup.code})`);
      setDb(updatedDb);
    }
    setModalType(null);
    setEditingItem(null);
  };

  // Sales Rep Save
  const handleSaveRep = (e: React.FormEvent) => {
    e.preventDefault();
    if (!repForm.name || !repForm.code) return;

    if (editingItem) {
      const updated = db.salesReps.map(r => (r.id === editingItem.id ? { ...r, ...repForm } : r));
      let updatedDb = { ...db, salesReps: updated as SalesRep[] };
      updatedDb = logAudit(updatedDb, 'Sales Reps', 'update', `Updated sales representative ${repForm.name}`);
      setDb(updatedDb);
    } else {
      const newRep: SalesRep = {
        id: `rep-${Date.now()}`,
        code: repForm.code || `SR-${db.salesReps.length + 1}`,
        name: repForm.name || '',
        phone: repForm.phone || '',
        territory: repForm.territory || 'Vehari',
        commissionRate: Number(repForm.commissionRate) || 2.5,
        targetAmount: Number(repForm.targetAmount) || 1000000,
      };
      let updatedDb = { ...db, salesReps: [...db.salesReps, newRep] };
      updatedDb = logAudit(updatedDb, 'Sales Reps', 'create', `Created sales representative ${newRep.name}`);
      setDb(updatedDb);
    }
    setModalType(null);
    setEditingItem(null);
  };

  // Warehouse Save
  const handleSaveWarehouse = (e: React.FormEvent) => {
    e.preventDefault();
    if (!whForm.name || !whForm.code) return;

    if (editingItem) {
      const updated = db.warehouses.map(w => (w.id === editingItem.id ? { ...w, ...whForm } : w));
      let updatedDb = { ...db, warehouses: updated as Warehouse[] };
      updatedDb = logAudit(updatedDb, 'Warehouses', 'update', `Updated warehouse ${whForm.name}`);
      setDb(updatedDb);
    } else {
      const newWh: Warehouse = {
        id: `wh-${Date.now()}`,
        code: whForm.code || `WH-${db.warehouses.length + 1}`,
        name: whForm.name || '',
        type: whForm.type || 'raw_material',
        location: whForm.location || 'Vehari Plant',
        managerName: whForm.managerName || '',
      };
      let updatedDb = { ...db, warehouses: [...db.warehouses, newWh] };
      updatedDb = logAudit(updatedDb, 'Warehouses', 'create', `Created warehouse ${newWh.name}`);
      setDb(updatedDb);
    }
    setModalType(null);
    setEditingItem(null);
  };

  // Category Save
  const handleSaveCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!catForm.name || !catForm.code) return;

    if (editingItem) {
      const updated = db.categories.map(c => (c.id === editingItem.id ? { ...c, ...catForm } : c));
      let updatedDb = { ...db, categories: updated as ProductCategory[] };
      setDb(updatedDb);
    } else {
      const newCat: ProductCategory = {
        id: `cat-${Date.now()}`,
        code: catForm.code || `CAT-${db.categories.length + 1}`,
        name: catForm.name || '',
        description: catForm.description || '',
      };
      setDb({ ...db, categories: [...db.categories, newCat] });
    }
    setModalType(null);
    setEditingItem(null);
  };

  // Brand Save
  const handleSaveBrand = (e: React.FormEvent) => {
    e.preventDefault();
    if (!brandForm.name) return;

    if (editingItem) {
      const updated = db.brands.map(b => (b.id === editingItem.id ? { ...b, ...brandForm } : b));
      setDb({ ...db, brands: updated as ProductBrand[] });
    } else {
      const newBrand: ProductBrand = {
        id: `brand-${Date.now()}`,
        name: brandForm.name || '',
        tagline: brandForm.tagline || '',
      };
      setDb({ ...db, brands: [...db.brands, newBrand] });
    }
    setModalType(null);
    setEditingItem(null);
  };

  // Unit Save
  const handleSaveUnit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!unitForm.name || !unitForm.code) return;

    if (editingItem) {
      const updated = db.units.map(u => (u.id === editingItem.id ? { ...u, ...unitForm } : u));
      setDb({ ...db, units: updated as UnitOfMeasure[] });
    } else {
      const newUnit: UnitOfMeasure = {
        id: `u-${Date.now()}`,
        code: unitForm.code || `U-${db.units.length + 1}`,
        name: unitForm.name || '',
        symbol: unitForm.symbol || unitForm.code || '',
        conversionFactor: Number(unitForm.conversionFactor) || 1,
        baseUnit: unitForm.baseUnit || '',
      };
      setDb({ ...db, units: [...db.units, newUnit] });
    }
    setModalType(null);
    setEditingItem(null);
  };

  return (
    <div className="space-y-5">
      {/* Sub Tabs Navigation */}
      <div className="flex flex-wrap items-center gap-1.5 p-1 bg-stone-200/60 rounded-xl border border-stone-200">
        {[
          { id: 'company', label: 'Company Profile', icon: Building2 },
          { id: 'customers', label: `Customers (${db.customers.length})`, icon: Users },
          { id: 'suppliers', label: `Suppliers (${db.suppliers.length})`, icon: Truck },
          { id: 'reps', label: `Sales Reps (${db.salesReps.length})`, icon: Users },
          { id: 'warehouses', label: `Warehouses (${db.warehouses.length})`, icon: MapPin },
          { id: 'categories', label: `Categories (${db.categories.length})`, icon: Tags },
          { id: 'brands', label: `Brands (${db.brands.length})`, icon: Bookmark },
          { id: 'units', label: `Units (${db.units.length})`, icon: Scale },
        ].map(tab => {
          const Icon = tab.icon;
          const isActive = activeSubTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveSubTab(tab.id as any)}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer whitespace-nowrap ${
                isActive
                  ? 'bg-white text-stone-900 shadow-2xs'
                  : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
              }`}
            >
              <Icon className="h-3.5 w-3.5 text-emerald-700" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* 1. Company Profile View */}
      {activeSubTab === 'company' && (
        <div className="bg-white rounded-xl border border-stone-200 p-6 shadow-2xs">
          <div className="border-b border-stone-200 pb-4 mb-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="bg-stone-50 p-2.5 rounded-xl border border-stone-200 shrink-0">
                <img
                  src="./assets/aistudio/sativa_b7dc1d13.webp"
                  alt="Sativa Cosmetics - No. 1 Cosmetics Brand"
                  className="h-14 w-auto object-contain"
                />
              </div>
              <div>
                <h2 className="text-base font-bold text-stone-900">Corporate & Manufacturing Facility Profile</h2>
                <p className="text-xs text-stone-500">Official legal entity information printed on invoices and certificates</p>
                <div className="text-[11px] text-emerald-800 font-semibold mt-0.5">
                  Sativa Cosmetics · Vehari, Pakistan · No. 1 Cosmetics Brand
                </div>
              </div>
            </div>
            <span className="px-2.5 py-1 text-xs font-mono font-bold bg-emerald-50 text-emerald-800 rounded-md border border-emerald-200">
              Tax Year: 2026-27
            </span>
          </div>

          <form onSubmit={handleSaveCompany} className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block font-semibold text-stone-700 mb-1">Company Registered Name</label>
              <input
                type="text"
                value={db.company.name}
                onChange={e => setDb({ ...db, company: { ...db.company, name: e.target.value } })}
                className="w-full p-2 border border-stone-300 rounded-lg font-medium text-stone-900 bg-stone-50 focus:bg-white"
              />
            </div>

            <div>
              <label className="block font-semibold text-stone-700 mb-1">Business Nature / Type</label>
              <input
                type="text"
                value={db.company.businessType}
                onChange={e => setDb({ ...db, company: { ...db.company, businessType: e.target.value } })}
                className="w-full p-2 border border-stone-300 rounded-lg text-stone-900 bg-stone-50 focus:bg-white"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block font-semibold text-stone-700 mb-1">Factory & Plant Address</label>
              <input
                type="text"
                value={db.company.address}
                onChange={e => setDb({ ...db, company: { ...db.company, address: e.target.value } })}
                className="w-full p-2 border border-stone-300 rounded-lg text-stone-900 bg-stone-50 focus:bg-white"
              />
            </div>

            <div>
              <label className="block font-semibold text-stone-700 mb-1">Phone / Telephone Lines</label>
              <input
                type="text"
                value={db.company.phone}
                onChange={e => setDb({ ...db, company: { ...db.company, phone: e.target.value } })}
                className="w-full p-2 border border-stone-300 rounded-lg text-stone-900 bg-stone-50 focus:bg-white"
              />
            </div>

            <div>
              <label className="block font-semibold text-stone-700 mb-1">Official Email Address</label>
              <input
                type="email"
                value={db.company.email}
                onChange={e => setDb({ ...db, company: { ...db.company, email: e.target.value } })}
                className="w-full p-2 border border-stone-300 rounded-lg text-stone-900 bg-stone-50 focus:bg-white"
              />
            </div>

            <div>
              <label className="block font-semibold text-stone-700 mb-1">National Tax Number (NTN)</label>
              <input
                type="text"
                value={db.company.ntn}
                onChange={e => setDb({ ...db, company: { ...db.company, ntn: e.target.value } })}
                className="w-full p-2 border border-stone-300 rounded-lg text-stone-900 font-mono bg-stone-50 focus:bg-white"
              />
            </div>

            <div>
              <label className="block font-semibold text-stone-700 mb-1">Sales Tax Registration (STRN)</label>
              <input
                type="text"
                value={db.company.strn}
                onChange={e => setDb({ ...db, company: { ...db.company, strn: e.target.value } })}
                className="w-full p-2 border border-stone-300 rounded-lg text-stone-900 font-mono bg-stone-50 focus:bg-white"
              />
            </div>

            <div>
              <label className="block font-semibold text-stone-700 mb-1">Software Title</label>
              <input
                type="text"
                readOnly
                value={db.company.softwareTitle}
                className="w-full p-2 border border-stone-200 rounded-lg text-stone-600 bg-stone-100"
              />
            </div>

            <div>
              <label className="block font-semibold text-stone-700 mb-1">Software Developed By</label>
              <input
                type="text"
                readOnly
                value={db.company.developedBy}
                className="w-full p-2 border border-stone-200 rounded-lg text-emerald-800 font-semibold bg-stone-100"
              />
            </div>

            <div className="md:col-span-2 pt-3 flex justify-end">
              <button
                type="submit"
                className="px-5 py-2 text-xs font-semibold text-white bg-emerald-800 hover:bg-emerald-700 rounded-lg transition-colors cursor-pointer shadow-xs"
              >
                Save Company Profile
              </button>
            </div>
          </form>
        </div>
      )}

      {/* 2. Customers View */}
      {activeSubTab === 'customers' && (
        <DataTable<Customer>
          title="Customer Directory"
          data={db.customers}
          searchPlaceholder="Search customers by name, city, phone..."
          columns={[
            { header: 'Code', accessorKey: 'code', className: 'font-mono font-bold text-emerald-800' },
            { header: 'Customer / Parlour Name', accessorKey: 'name', className: 'font-medium text-stone-900' },
            { header: 'Type', accessorKey: 'customerType', className: 'capitalize' },
            { header: 'City', accessorKey: 'city' },
            { header: 'Phone', accessorKey: 'phone', className: 'font-mono' },
            {
              header: 'Credit Limit',
              accessorKey: 'creditLimit',
              align: 'right',
              cell: row => formatPKR(row.creditLimit),
            },
            {
              header: 'Receivable Balance',
              accessorKey: 'currentBalance',
              align: 'right',
              cell: row => (
                <span
                  className={`font-mono font-bold ${
                    row.currentBalance > 0 ? 'text-amber-700' : 'text-stone-600'
                  }`}
                >
                  {formatPKR(row.currentBalance)}
                </span>
              ),
            },
            {
              header: 'Actions',
              align: 'center',
              cell: row => (
                <div className="flex items-center justify-center gap-1.5">
                  <button
                    onClick={() => {
                      setEditingItem(row);
                      setCustForm(row);
                      setModalType('customer');
                    }}
                    className="p-1 text-stone-600 hover:text-emerald-700 hover:bg-stone-100 rounded"
                    title="Edit"
                  >
                    <Edit className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => {
                      if (confirm(`Delete customer ${row.name}?`)) {
                        const updated = db.customers.filter(c => c.id !== row.id);
                        setDb({ ...db, customers: updated });
                      }
                    }}
                    className="p-1 text-stone-400 hover:text-rose-700 hover:bg-stone-100 rounded"
                    title="Delete"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ),
            },
          ]}
          actions={
            <button
              onClick={() => {
                setEditingItem(null);
                setCustForm({
                  code: `CUST-${String(db.customers.length + 1).padStart(3, '0')}`,
                  name: '',
                  companyName: '',
                  customerType: 'wholesaler',
                  phone: '',
                  email: '',
                  city: 'Vehari',
                  address: '',
                  creditLimit: 250000,
                  currentBalance: 0,
                  salesRepId: db.salesReps[0]?.id || '',
                });
                setModalType('customer');
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-emerald-800 hover:bg-emerald-700 rounded-lg shadow-2xs whitespace-nowrap cursor-pointer"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Add Customer</span>
            </button>
          }
        />
      )}

      {/* 3. Suppliers View */}
      {activeSubTab === 'suppliers' && (
        <DataTable<Supplier>
          title="Supplier Directory"
          data={db.suppliers}
          searchPlaceholder="Search suppliers by name, company, city..."
          columns={[
            { header: 'Code', accessorKey: 'code', className: 'font-mono font-bold text-emerald-800' },
            { header: 'Supplier Name', accessorKey: 'name', className: 'font-medium text-stone-900' },
            { header: 'Category', accessorKey: 'supplierType', className: 'capitalize' },
            { header: 'City', accessorKey: 'city' },
            { header: 'Phone', accessorKey: 'phone', className: 'font-mono' },
            { header: 'Credit Terms', accessorKey: 'paymentTermsDays', cell: r => `${r.paymentTermsDays} Days` },
            {
              header: 'Payable Balance',
              accessorKey: 'currentBalance',
              align: 'right',
              cell: row => (
                <span
                  className={`font-mono font-bold ${
                    row.currentBalance > 0 ? 'text-rose-700' : 'text-stone-600'
                  }`}
                >
                  {formatPKR(row.currentBalance)}
                </span>
              ),
            },
            {
              header: 'Actions',
              align: 'center',
              cell: row => (
                <div className="flex items-center justify-center gap-1.5">
                  <button
                    onClick={() => {
                      setEditingItem(row);
                      setSupForm(row);
                      setModalType('supplier');
                    }}
                    className="p-1 text-stone-600 hover:text-emerald-700 hover:bg-stone-100 rounded"
                    title="Edit"
                  >
                    <Edit className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => {
                      if (confirm(`Delete supplier ${row.name}?`)) {
                        const updated = db.suppliers.filter(s => s.id !== row.id);
                        setDb({ ...db, suppliers: updated });
                      }
                    }}
                    className="p-1 text-stone-400 hover:text-rose-700 hover:bg-stone-100 rounded"
                    title="Delete"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ),
            },
          ]}
          actions={
            <button
              onClick={() => {
                setEditingItem(null);
                setSupForm({
                  code: `SUP-${String(db.suppliers.length + 1).padStart(3, '0')}`,
                  name: '',
                  companyName: '',
                  supplierType: 'chemical',
                  phone: '',
                  email: '',
                  city: 'Karachi',
                  address: '',
                  currentBalance: 0,
                  ntn: '',
                  paymentTermsDays: 30,
                });
                setModalType('supplier');
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-emerald-800 hover:bg-emerald-700 rounded-lg shadow-2xs whitespace-nowrap cursor-pointer"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Add Supplier</span>
            </button>
          }
        />
      )}

      {/* 4. Sales Reps View */}
      {activeSubTab === 'reps' && (
        <DataTable<SalesRep>
          title="Sales Representatives"
          data={db.salesReps}
          columns={[
            { header: 'Code', accessorKey: 'code', className: 'font-mono font-bold' },
            { header: 'Officer Name', accessorKey: 'name', className: 'font-semibold text-stone-900' },
            { header: 'Territory', accessorKey: 'territory' },
            { header: 'Phone', accessorKey: 'phone', className: 'font-mono' },
            { header: 'Commission Rate', accessorKey: 'commissionRate', cell: r => `${r.commissionRate}%` },
            { header: 'Monthly Target', accessorKey: 'targetAmount', align: 'right', cell: r => formatPKR(r.targetAmount) },
            {
              header: 'Actions',
              align: 'center',
              cell: row => (
                <div className="flex items-center justify-center gap-1.5">
                  <button
                    onClick={() => {
                      setEditingItem(row);
                      setRepForm(row);
                      setModalType('rep');
                    }}
                    className="p-1 text-stone-600 hover:text-emerald-700 hover:bg-stone-100 rounded"
                  >
                    <Edit className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => {
                      if (confirm(`Delete ${row.name}?`)) {
                        setDb({ ...db, salesReps: db.salesReps.filter(r => r.id !== row.id) });
                      }
                    }}
                    className="p-1 text-stone-400 hover:text-rose-700 hover:bg-stone-100 rounded"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ),
            },
          ]}
          actions={
            <button
              onClick={() => {
                setEditingItem(null);
                setRepForm({
                  code: `SR-0${db.salesReps.length + 1}`,
                  name: '',
                  phone: '',
                  territory: 'Vehari & Multan',
                  commissionRate: 2.5,
                  targetAmount: 2000000,
                });
                setModalType('rep');
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-emerald-800 hover:bg-emerald-700 rounded-lg shadow-2xs cursor-pointer"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Add Sales Rep</span>
            </button>
          }
        />
      )}

      {/* 5. Warehouses View */}
      {activeSubTab === 'warehouses' && (
        <DataTable<Warehouse>
          title="Factory Warehouses & Stores"
          data={db.warehouses}
          columns={[
            { header: 'Code', accessorKey: 'code', className: 'font-mono font-bold' },
            { header: 'Warehouse Name', accessorKey: 'name', className: 'font-semibold text-stone-900' },
            { header: 'Inventory Category', accessorKey: 'type', className: 'capitalize' },
            { header: 'Physical Location', accessorKey: 'location' },
            { header: 'Store In-Charge', accessorKey: 'managerName' },
            {
              header: 'Actions',
              align: 'center',
              cell: row => (
                <div className="flex items-center justify-center gap-1.5">
                  <button
                    onClick={() => {
                      setEditingItem(row);
                      setWhForm(row);
                      setModalType('warehouse');
                    }}
                    className="p-1 text-stone-600 hover:text-emerald-700 hover:bg-stone-100 rounded"
                  >
                    <Edit className="h-3.5 w-3.5" />
                  </button>
                </div>
              ),
            },
          ]}
          actions={
            <button
              onClick={() => {
                setEditingItem(null);
                setWhForm({
                  code: `WH-0${db.warehouses.length + 1}`,
                  name: '',
                  type: 'raw_material',
                  location: 'Vehari Plant',
                  managerName: 'Store Keeper',
                });
                setModalType('warehouse');
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-emerald-800 hover:bg-emerald-700 rounded-lg shadow-2xs cursor-pointer"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Add Warehouse</span>
            </button>
          }
        />
      )}

      {/* 6. Categories View */}
      {activeSubTab === 'categories' && (
        <DataTable<ProductCategory>
          title="Product Categories"
          data={db.categories}
          columns={[
            { header: 'Code', accessorKey: 'code', className: 'font-mono font-bold' },
            { header: 'Category Name', accessorKey: 'name', className: 'font-semibold text-stone-900' },
            { header: 'Description', accessorKey: 'description' },
          ]}
          actions={
            <button
              onClick={() => {
                setEditingItem(null);
                setCatForm({ code: '', name: '', description: '' });
                setModalType('category');
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-emerald-800 hover:bg-emerald-700 rounded-lg shadow-2xs cursor-pointer"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Add Category</span>
            </button>
          }
        />
      )}

      {/* 7. Brands View */}
      {activeSubTab === 'brands' && (
        <DataTable<ProductBrand>
          title="Cosmetics Brands"
          data={db.brands}
          columns={[
            { header: 'Brand Name', accessorKey: 'name', className: 'font-bold text-stone-900' },
            { header: 'Tagline / Slogan', accessorKey: 'tagline', className: 'italic text-stone-600' },
          ]}
          actions={
            <button
              onClick={() => {
                setEditingItem(null);
                setBrandForm({ name: '', tagline: '' });
                setModalType('brand');
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-emerald-800 hover:bg-emerald-700 rounded-lg shadow-2xs cursor-pointer"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Add Brand</span>
            </button>
          }
        />
      )}

      {/* 8. Units of Measurement View */}
      {activeSubTab === 'units' && (
        <DataTable<UnitOfMeasure>
          title="Units of Measurement (UOM)"
          data={db.units}
          columns={[
            { header: 'Code', accessorKey: 'code', className: 'font-mono font-bold' },
            { header: 'Unit Name', accessorKey: 'name', className: 'font-semibold text-stone-900' },
            { header: 'Symbol', accessorKey: 'symbol', className: 'font-mono' },
            { header: 'Base Unit', accessorKey: 'baseUnit', cell: r => r.baseUnit || 'Base' },
            {
              header: 'Conversion Factor',
              accessorKey: 'conversionFactor',
              align: 'right',
              cell: r => r.conversionFactor,
            },
          ]}
          actions={
            <button
              onClick={() => {
                setEditingItem(null);
                setUnitForm({ code: '', name: '', symbol: '', conversionFactor: 1, baseUnit: '' });
                setModalType('unit');
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-emerald-800 hover:bg-emerald-700 rounded-lg shadow-2xs cursor-pointer"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Add Unit</span>
            </button>
          }
        />
      )}

      {/* MODAL: Customer */}
      <Modal
        isOpen={modalType === 'customer'}
        onClose={() => setModalType(null)}
        title={editingItem ? 'Edit Customer' : 'Add New Customer Profile'}
        subtitle="Manage parlour, wholesale or retail customer records"
      >
        <form onSubmit={handleSaveCustomer} className="space-y-3 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-medium text-stone-700 mb-1">Customer Code *</label>
              <input
                type="text"
                required
                value={custForm.code || ''}
                onChange={e => setCustForm({ ...custForm, code: e.target.value })}
                className="w-full p-2 border border-stone-300 rounded font-mono"
              />
            </div>
            <div>
              <label className="block font-medium text-stone-700 mb-1">Customer / Parlour Name *</label>
              <input
                type="text"
                required
                value={custForm.name || ''}
                onChange={e => setCustForm({ ...custForm, name: e.target.value })}
                className="w-full p-2 border border-stone-300 rounded"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-medium text-stone-700 mb-1">Customer Type</label>
              <select
                value={custForm.customerType || 'wholesaler'}
                onChange={e => setCustForm({ ...custForm, customerType: e.target.value as any })}
                className="w-full p-2 border border-stone-300 rounded"
              >
                <option value="wholesaler">Wholesaler / Distributor</option>
                <option value="parlour">Beauty Parlour / Salon</option>
                <option value="retailer">Retail Outlet / Pharmacy</option>
                <option value="distributor">Regional Super Stockist</option>
              </select>
            </div>
            <div>
              <label className="block font-medium text-stone-700 mb-1">City</label>
              <input
                type="text"
                value={custForm.city || ''}
                onChange={e => setCustForm({ ...custForm, city: e.target.value })}
                className="w-full p-2 border border-stone-300 rounded"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-medium text-stone-700 mb-1">Phone Number</label>
              <input
                type="text"
                value={custForm.phone || ''}
                onChange={e => setCustForm({ ...custForm, phone: e.target.value })}
                className="w-full p-2 border border-stone-300 rounded font-mono"
              />
            </div>
            <div>
              <label className="block font-medium text-stone-700 mb-1">Assigned Sales Rep</label>
              <select
                value={custForm.salesRepId || ''}
                onChange={e => setCustForm({ ...custForm, salesRepId: e.target.value })}
                className="w-full p-2 border border-stone-300 rounded"
              >
                <option value="">-- None --</option>
                {db.salesReps.map(r => (
                  <option key={r.id} value={r.id}>
                    {r.name} ({r.territory})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block font-medium text-stone-700 mb-1">Address</label>
            <input
              type="text"
              value={custForm.address || ''}
              onChange={e => setCustForm({ ...custForm, address: e.target.value })}
              className="w-full p-2 border border-stone-300 rounded"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-medium text-stone-700 mb-1">Credit Limit (PKR)</label>
              <input
                type="number"
                value={custForm.creditLimit || 0}
                onChange={e => setCustForm({ ...custForm, creditLimit: Number(e.target.value) })}
                className="w-full p-2 border border-stone-300 rounded font-mono"
              />
            </div>
            <div>
              <label className="block font-medium text-stone-700 mb-1">Opening Balance (PKR)</label>
              <input
                type="number"
                value={custForm.currentBalance || 0}
                onChange={e => setCustForm({ ...custForm, currentBalance: Number(e.target.value) })}
                className="w-full p-2 border border-stone-300 rounded font-mono"
              />
              <span className="text-[10px] text-stone-400">Default 0 for clean start</span>
            </div>
          </div>

          <div className="pt-3 border-t border-stone-200 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setModalType(null)}
              className="px-4 py-2 border border-stone-300 rounded text-stone-700 hover:bg-stone-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-emerald-800 text-white rounded font-medium hover:bg-emerald-700"
            >
              Save Customer
            </button>
          </div>
        </form>
      </Modal>

      {/* MODAL: Supplier */}
      <Modal
        isOpen={modalType === 'supplier'}
        onClose={() => setModalType(null)}
        title={editingItem ? 'Edit Supplier' : 'Add New Supplier Profile'}
        subtitle="Manage chemical importers and packaging manufacturers"
      >
        <form onSubmit={handleSaveSupplier} className="space-y-3 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-medium text-stone-700 mb-1">Supplier Code *</label>
              <input
                type="text"
                required
                value={supForm.code || ''}
                onChange={e => setSupForm({ ...supForm, code: e.target.value })}
                className="w-full p-2 border border-stone-300 rounded font-mono"
              />
            </div>
            <div>
              <label className="block font-medium text-stone-700 mb-1">Supplier / Vendor Name *</label>
              <input
                type="text"
                required
                value={supForm.name || ''}
                onChange={e => setSupForm({ ...supForm, name: e.target.value })}
                className="w-full p-2 border border-stone-300 rounded"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-medium text-stone-700 mb-1">Supply Material Category</label>
              <select
                value={supForm.supplierType || 'chemical'}
                onChange={e => setSupForm({ ...supForm, supplierType: e.target.value as any })}
                className="w-full p-2 border border-stone-300 rounded"
              >
                <option value="chemical">Base Chemicals & Extracts</option>
                <option value="packaging">Bottles, Jars, Cartons & Caps</option>
                <option value="machinery">Machinery & Spares</option>
                <option value="general">General Factory Supplies</option>
              </select>
            </div>
            <div>
              <label className="block font-medium text-stone-700 mb-1">City</label>
              <input
                type="text"
                value={supForm.city || ''}
                onChange={e => setSupForm({ ...supForm, city: e.target.value })}
                className="w-full p-2 border border-stone-300 rounded"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-medium text-stone-700 mb-1">Phone</label>
              <input
                type="text"
                value={supForm.phone || ''}
                onChange={e => setSupForm({ ...supForm, phone: e.target.value })}
                className="w-full p-2 border border-stone-300 rounded font-mono"
              />
            </div>
            <div>
              <label className="block font-medium text-stone-700 mb-1">Payment Credit Terms (Days)</label>
              <input
                type="number"
                value={supForm.paymentTermsDays || 30}
                onChange={e => setSupForm({ ...supForm, paymentTermsDays: Number(e.target.value) })}
                className="w-full p-2 border border-stone-300 rounded font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block font-medium text-stone-700 mb-1">Address</label>
            <input
              type="text"
              value={supForm.address || ''}
              onChange={e => setSupForm({ ...supForm, address: e.target.value })}
              className="w-full p-2 border border-stone-300 rounded"
            />
          </div>

          <div className="pt-3 border-t border-stone-200 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setModalType(null)}
              className="px-4 py-2 border border-stone-300 rounded text-stone-700 hover:bg-stone-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-emerald-800 text-white rounded font-medium hover:bg-emerald-700"
            >
              Save Supplier
            </button>
          </div>
        </form>
      </Modal>

      {/* MODAL: Sales Rep */}
      <Modal
        isOpen={modalType === 'rep'}
        onClose={() => setModalType(null)}
        title={editingItem ? 'Edit Sales Officer' : 'Add Sales Officer'}
      >
        <form onSubmit={handleSaveRep} className="space-y-3 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-medium text-stone-700 mb-1">Code *</label>
              <input
                type="text"
                required
                value={repForm.code || ''}
                onChange={e => setRepForm({ ...repForm, code: e.target.value })}
                className="w-full p-2 border border-stone-300 rounded font-mono"
              />
            </div>
            <div>
              <label className="block font-medium text-stone-700 mb-1">Officer Name *</label>
              <input
                type="text"
                required
                value={repForm.name || ''}
                onChange={e => setRepForm({ ...repForm, name: e.target.value })}
                className="w-full p-2 border border-stone-300 rounded"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-medium text-stone-700 mb-1">Territory / Area</label>
              <input
                type="text"
                value={repForm.territory || ''}
                onChange={e => setRepForm({ ...repForm, territory: e.target.value })}
                className="w-full p-2 border border-stone-300 rounded"
              />
            </div>
            <div>
              <label className="block font-medium text-stone-700 mb-1">Phone</label>
              <input
                type="text"
                value={repForm.phone || ''}
                onChange={e => setRepForm({ ...repForm, phone: e.target.value })}
                className="w-full p-2 border border-stone-300 rounded font-mono"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-medium text-stone-700 mb-1">Commission %</label>
              <input
                type="number"
                step="0.1"
                value={repForm.commissionRate || 2.5}
                onChange={e => setRepForm({ ...repForm, commissionRate: Number(e.target.value) })}
                className="w-full p-2 border border-stone-300 rounded font-mono"
              />
            </div>
            <div>
              <label className="block font-medium text-stone-700 mb-1">Monthly Target (PKR)</label>
              <input
                type="number"
                value={repForm.targetAmount || 1000000}
                onChange={e => setRepForm({ ...repForm, targetAmount: Number(e.target.value) })}
                className="w-full p-2 border border-stone-300 rounded font-mono"
              />
            </div>
          </div>
          <div className="pt-3 border-t border-stone-200 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setModalType(null)}
              className="px-4 py-2 border border-stone-300 rounded text-stone-700 hover:bg-stone-50"
            >
              Cancel
            </button>
            <button type="submit" className="px-4 py-2 bg-emerald-800 text-white rounded font-medium">
              Save Sales Rep
            </button>
          </div>
        </form>
      </Modal>

      {/* MODAL: Warehouse */}
      <Modal
        isOpen={modalType === 'warehouse'}
        onClose={() => setModalType(null)}
        title={editingItem ? 'Edit Warehouse' : 'Add Warehouse'}
      >
        <form onSubmit={handleSaveWarehouse} className="space-y-3 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-medium text-stone-700 mb-1">Warehouse Code *</label>
              <input
                type="text"
                required
                value={whForm.code || ''}
                onChange={e => setWhForm({ ...whForm, code: e.target.value })}
                className="w-full p-2 border border-stone-300 rounded font-mono"
              />
            </div>
            <div>
              <label className="block font-medium text-stone-700 mb-1">Warehouse Name *</label>
              <input
                type="text"
                required
                value={whForm.name || ''}
                onChange={e => setWhForm({ ...whForm, name: e.target.value })}
                className="w-full p-2 border border-stone-300 rounded"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-medium text-stone-700 mb-1">Type</label>
              <select
                value={whForm.type || 'raw_material'}
                onChange={e => setWhForm({ ...whForm, type: e.target.value as any })}
                className="w-full p-2 border border-stone-300 rounded"
              >
                <option value="raw_material">Raw Materials & Chemicals</option>
                <option value="packaging">Packaging Materials</option>
                <option value="finished_goods">Finished Products</option>
                <option value="quarantine">Quarantine & QC Hold</option>
              </select>
            </div>
            <div>
              <label className="block font-medium text-stone-700 mb-1">Store In-Charge</label>
              <input
                type="text"
                value={whForm.managerName || ''}
                onChange={e => setWhForm({ ...whForm, managerName: e.target.value })}
                className="w-full p-2 border border-stone-300 rounded"
              />
            </div>
          </div>
          <div>
            <label className="block font-medium text-stone-700 mb-1">Location</label>
            <input
              type="text"
              value={whForm.location || ''}
              onChange={e => setWhForm({ ...whForm, location: e.target.value })}
              className="w-full p-2 border border-stone-300 rounded"
            />
          </div>
          <div className="pt-3 border-t border-stone-200 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setModalType(null)}
              className="px-4 py-2 border border-stone-300 rounded text-stone-700 hover:bg-stone-50"
            >
              Cancel
            </button>
            <button type="submit" className="px-4 py-2 bg-emerald-800 text-white rounded font-medium">
              Save Warehouse
            </button>
          </div>
        </form>
      </Modal>

      {/* MODAL: Category */}
      <Modal
        isOpen={modalType === 'category'}
        onClose={() => setModalType(null)}
        title="Add Product Category"
      >
        <form onSubmit={handleSaveCategory} className="space-y-3 text-xs">
          <div>
            <label className="block font-medium text-stone-700 mb-1">Category Code *</label>
            <input
              type="text"
              required
              value={catForm.code || ''}
              onChange={e => setCatForm({ ...catForm, code: e.target.value })}
              className="w-full p-2 border border-stone-300 rounded font-mono"
            />
          </div>
          <div>
            <label className="block font-medium text-stone-700 mb-1">Category Name *</label>
            <input
              type="text"
              required
              value={catForm.name || ''}
              onChange={e => setCatForm({ ...catForm, name: e.target.value })}
              className="w-full p-2 border border-stone-300 rounded"
            />
          </div>
          <div>
            <label className="block font-medium text-stone-700 mb-1">Description</label>
            <input
              type="text"
              value={catForm.description || ''}
              onChange={e => setCatForm({ ...catForm, description: e.target.value })}
              className="w-full p-2 border border-stone-300 rounded"
            />
          </div>
          <div className="pt-3 border-t border-stone-200 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setModalType(null)}
              className="px-4 py-2 border border-stone-300 rounded"
            >
              Cancel
            </button>
            <button type="submit" className="px-4 py-2 bg-emerald-800 text-white rounded font-medium">
              Save Category
            </button>
          </div>
        </form>
      </Modal>

      {/* MODAL: Brand */}
      <Modal isOpen={modalType === 'brand'} onClose={() => setModalType(null)} title="Add Product Brand">
        <form onSubmit={handleSaveBrand} className="space-y-3 text-xs">
          <div>
            <label className="block font-medium text-stone-700 mb-1">Brand Name *</label>
            <input
              type="text"
              required
              value={brandForm.name || ''}
              onChange={e => setBrandForm({ ...brandForm, name: e.target.value })}
              className="w-full p-2 border border-stone-300 rounded font-bold"
            />
          </div>
          <div>
            <label className="block font-medium text-stone-700 mb-1">Tagline</label>
            <input
              type="text"
              value={brandForm.tagline || ''}
              onChange={e => setBrandForm({ ...brandForm, tagline: e.target.value })}
              className="w-full p-2 border border-stone-300 rounded"
            />
          </div>
          <div className="pt-3 border-t border-stone-200 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setModalType(null)}
              className="px-4 py-2 border border-stone-300 rounded"
            >
              Cancel
            </button>
            <button type="submit" className="px-4 py-2 bg-emerald-800 text-white rounded font-medium">
              Save Brand
            </button>
          </div>
        </form>
      </Modal>

      {/* MODAL: Unit */}
      <Modal isOpen={modalType === 'unit'} onClose={() => setModalType(null)} title="Add Unit of Measurement">
        <form onSubmit={handleSaveUnit} className="space-y-3 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-medium text-stone-700 mb-1">Code *</label>
              <input
                type="text"
                required
                value={unitForm.code || ''}
                onChange={e => setUnitForm({ ...unitForm, code: e.target.value })}
                className="w-full p-2 border border-stone-300 rounded font-mono"
              />
            </div>
            <div>
              <label className="block font-medium text-stone-700 mb-1">Name *</label>
              <input
                type="text"
                required
                value={unitForm.name || ''}
                onChange={e => setUnitForm({ ...unitForm, name: e.target.value })}
                className="w-full p-2 border border-stone-300 rounded"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-medium text-stone-700 mb-1">Symbol</label>
              <input
                type="text"
                value={unitForm.symbol || ''}
                onChange={e => setUnitForm({ ...unitForm, symbol: e.target.value })}
                className="w-full p-2 border border-stone-300 rounded font-mono"
              />
            </div>
            <div>
              <label className="block font-medium text-stone-700 mb-1">Conversion Factor</label>
              <input
                type="number"
                step="0.0001"
                value={unitForm.conversionFactor || 1}
                onChange={e => setUnitForm({ ...unitForm, conversionFactor: Number(e.target.value) })}
                className="w-full p-2 border border-stone-300 rounded font-mono"
              />
            </div>
          </div>
          <div className="pt-3 border-t border-stone-200 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setModalType(null)}
              className="px-4 py-2 border border-stone-300 rounded"
            >
              Cancel
            </button>
            <button type="submit" className="px-4 py-2 bg-emerald-800 text-white rounded font-medium">
              Save Unit
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
