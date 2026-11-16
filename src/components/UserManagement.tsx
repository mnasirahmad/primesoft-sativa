import React, { useState } from 'react';
import { ERPDatabase, logAudit } from '../services/storage';
import { formatDateTime } from '../utils/formatters';
import { User, UserRole, AuditLog } from '../types/erp';
import { DataTable } from './common/DataTable';
import { Modal } from './common/Modal';
import { Users, Plus, Shield, ShieldAlert, History, Edit, Trash2 } from 'lucide-react';

interface UserManagementProps {
  db: ERPDatabase;
  setDb: React.Dispatch<React.SetStateAction<ERPDatabase>>;
}

export const UserManagement: React.FC<UserManagementProps> = ({ db, setDb }) => {
  const [activeTab, setActiveTab] = useState<'users' | 'audit'>('users');

  const [modalOpen, setModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [formData, setFormData] = useState<Partial<User>>({
    username: '',
    password: '',
    name: '',
    email: '',
    role: 'operator',
    department: 'Plant Operations',
    phone: '',
    isActive: true,
  });

  const handleOpenAdd = () => {
    setEditingUser(null);
    setFormData({
      username: '',
      password: '',
      name: '',
      email: '',
      role: 'operator',
      department: 'Store & Inventory',
      phone: '',
      isActive: true,
    });
    setModalOpen(true);
  };

  const handleOpenEdit = (user: User) => {
    setEditingUser(user);
    setFormData(user);
    setModalOpen(true);
  };

  const handleSaveUser = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanUsername = (formData.username || '').trim();
    if (!formData.name || !formData.email || !cleanUsername || !formData.password) return;

    const duplicateUsername = db.users.some(
      u => u.username.toLowerCase() === cleanUsername.toLowerCase() && u.id !== editingUser?.id
    );
    if (duplicateUsername) {
      alert('This login username is already in use. Choose another username.');
      return;
    }

    if (editingUser) {
      const updated = db.users.map(u =>
        u.id === editingUser.id ? { ...u, ...formData, username: cleanUsername } : u
      );
      let updatedDb = { ...db, users: updated as User[] };
      updatedDb = logAudit(updatedDb, 'User Management', 'update', `Updated user credentials for ${formData.name} (${cleanUsername})`);
      setDb(updatedDb);
    } else {
      const newUser: User = {
        id: `user-${Date.now()}`,
        username: cleanUsername,
        password: formData.password,
        name: formData.name || '',
        email: formData.email || '',
        role: (formData.role as UserRole) || 'operator',
        department: formData.department || 'Operations',
        phone: formData.phone || '',
        isActive: formData.isActive ?? true,
      };
      let updatedDb = { ...db, users: [...db.users, newUser] };
      updatedDb = logAudit(updatedDb, 'User Management', 'create', `Created user ${newUser.name} (${newUser.username}) with role ${newUser.role}`);
      setDb(updatedDb);
    }

    setModalOpen(false);
  };

  const handleDeleteUser = (user: User) => {
    if (user.id === 'user-admin') {
      alert('Cannot delete primary Administrator account.');
      return;
    }
    if (confirm(`Remove user ${user.name}?`)) {
      const updated = db.users.filter(u => u.id !== user.id);
      let updatedDb = { ...db, users: updated };
      updatedDb = logAudit(updatedDb, 'User Management', 'delete', `Deleted user account ${user.name}`);
      setDb(updatedDb);
    }
  };

  return (
    <div className="space-y-4">
      {/* Top Header Card */}
      <div className="bg-white rounded-xl border border-stone-200 p-5 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="bg-stone-50 p-2 rounded-xl border border-stone-200 shadow-2xs shrink-0">
            <img
              src="./assets/aistudio/sativa_b7dc1d13.webp"
              alt="Sativa Cosmetics"
              className="h-10 w-auto object-contain"
            />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider">
                Access Control & Governance
              </span>
              <span className="text-xs text-stone-400">·</span>
              <span className="text-xs text-stone-500">Role-Based Access Control (RBAC)</span>
            </div>
            <h1 className="text-lg font-bold text-stone-900 mt-0.5">
              User Management & Security Audit Trail
            </h1>
            <p className="text-xs text-stone-500">
              Admin, Manager, and Operator credentials, permission matrix, and real-time security audit logging
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 p-1 bg-stone-100 rounded-lg border border-stone-200">
            <button
              onClick={() => setActiveTab('users')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                activeTab === 'users' ? 'bg-white text-stone-900 shadow-2xs' : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              System Users ({db.users.length})
            </button>
            <button
              onClick={() => setActiveTab('audit')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                activeTab === 'audit' ? 'bg-white text-stone-900 shadow-2xs' : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              Security Audit Trail ({db.auditLogs.length})
            </button>
          </div>

          {activeTab === 'users' && (
            <button
              onClick={handleOpenAdd}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-emerald-800 hover:bg-emerald-700 rounded-lg shadow-2xs transition-colors cursor-pointer"
            >
              <Plus className="h-4 w-4" />
              <span>Add User</span>
            </button>
          )}
        </div>
      </div>

      {/* 1. Users Tab */}
      {activeTab === 'users' && (
        <div className="space-y-4">
          <DataTable<User>
            title="System Users Directory"
            data={db.users}
            columns={[
              {
                header: 'Full Name & Email',
                accessorKey: 'name',
                cell: r => (
                  <div>
                    <div className="font-bold text-stone-900">{r.name}</div>
                    <div className="text-[11px] text-stone-500">{r.email}</div>
                  </div>
                ),
              },
              {
                header: 'Login Username',
                accessorKey: 'username',
                cell: r => (
                  <span className="font-mono font-semibold text-emerald-900">{r.username}</span>
                ),
              },
              {
                header: 'Assigned Role',
                accessorKey: 'role',
                align: 'center',
                cell: r => (
                  <span
                    className={`px-2.5 py-0.5 rounded text-[10px] font-bold uppercase ${
                      r.role === 'admin'
                        ? 'bg-purple-100 text-purple-900 border border-purple-200'
                        : r.role === 'manager'
                        ? 'bg-emerald-100 text-emerald-900 border border-emerald-200'
                        : 'bg-stone-100 text-stone-800 border border-stone-200'
                    }`}
                  >
                    {r.role}
                  </span>
                ),
              },
              { header: 'Department', accessorKey: 'department' },
              { header: 'Phone', accessorKey: 'phone', className: 'font-mono' },
              {
                header: 'Status',
                accessorKey: 'isActive',
                align: 'center',
                cell: r => (
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                      r.isActive ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                    }`}
                  >
                    {r.isActive ? 'Active' : 'Disabled'}
                  </span>
                ),
              },
              {
                header: 'Actions',
                align: 'center',
                cell: r => (
                  <div className="flex items-center justify-center gap-1">
                    <button
                      onClick={() => handleOpenEdit(r)}
                      className="p-1 text-stone-500 hover:text-emerald-700 hover:bg-stone-100 rounded cursor-pointer"
                    >
                      <Edit className="h-3.5 w-3.5" />
                    </button>
                    {r.id !== 'user-admin' && (
                      <button
                        onClick={() => handleDeleteUser(r)}
                        className="p-1 text-stone-400 hover:text-rose-700 hover:bg-stone-100 rounded cursor-pointer"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                ),
              },
            ]}
          />

          {/* Role Permissions Matrix Card */}
          <div className="bg-white rounded-xl border border-stone-200 p-5 shadow-2xs space-y-3">
            <h3 className="text-xs font-bold text-stone-900 uppercase tracking-wider">
              Role Permission Matrix
            </h3>
            <div className="border border-stone-200 rounded-lg overflow-hidden text-xs">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-stone-100 text-stone-700 font-semibold border-b border-stone-200">
                    <th className="py-2 px-3">Module / Capability</th>
                    <th className="py-2 px-3 text-center">Admin</th>
                    <th className="py-2 px-3 text-center">Manager</th>
                    <th className="py-2 px-3 text-center">Operator</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100 text-stone-800">
                  {[
                    { mod: 'Master Profiles & Warehouses', admin: 'Full Access', mgr: 'View Only', op: 'View Only' },
                    { mod: 'Raw Materials & Chemical Inventory', admin: 'Full Access', mgr: 'Manage & Adjust', op: 'Receipts & Issues' },
                    { mod: 'Packaging Materials Inventory', admin: 'Full Access', mgr: 'Manage & Adjust', op: 'Receipts & Issues' },
                    { mod: 'Finished Products Catalog', admin: 'Full Access', mgr: 'Manage & View', op: 'View Only' },
                    { mod: 'Manufacturing Formulas (BOM)', admin: 'Create & Approve', mgr: 'Create & Test', op: 'View Approved' },
                    { mod: 'Production Execution & Completion', admin: 'Full Control', mgr: 'Supervise & Complete', op: 'Log Quantities' },
                    { mod: 'Quality Control Inspections & Release', admin: 'Full Control', mgr: 'Inspect & Approve', op: 'No Access' },
                    { mod: 'Purchases & Vendor Bills', admin: 'Full Control', mgr: 'Create & Verify', op: 'Enter Inward GRN' },
                    { mod: 'Sales & Customer Invoices', admin: 'Full Control', mgr: 'Create & Approve', op: 'Create Cash Invoice' },
                    { mod: 'Double-Entry Accounting & Ledger', admin: 'Full Access', mgr: 'Restricted', op: 'No Access' },
                    { mod: 'Financial Statements (P&L, Balance Sheet)', admin: 'Full Access', mgr: 'No Access', op: 'No Access' },
                    { mod: 'Database Backup & Restore', admin: 'Full Control', mgr: 'No Access', op: 'No Access' },
                  ].map((row, i) => (
                    <tr key={i} className="hover:bg-stone-50">
                      <td className="py-2 px-3 font-medium text-stone-900">{row.mod}</td>
                      <td className="py-2 px-3 text-center font-semibold text-purple-900">{row.admin}</td>
                      <td className="py-2 px-3 text-center font-medium text-emerald-900">{row.mgr}</td>
                      <td className="py-2 px-3 text-center text-stone-600">{row.op}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 2. Audit Trail Tab */}
      {activeTab === 'audit' && (
        <DataTable<AuditLog>
          title="Security & Transaction Audit Trail"
          data={db.auditLogs}
          searchPlaceholder="Search audit trail by user, module, action..."
          columns={[
            { header: 'Timestamp', accessorKey: 'timestamp', cell: r => formatDateTime(r.timestamp) },
            {
              header: 'User',
              accessorKey: 'userName',
              cell: r => (
                <div>
                  <div className="font-bold text-stone-900">{r.userName}</div>
                  <div className="text-[10px] uppercase font-mono text-stone-500">{r.role}</div>
                </div>
              ),
            },
            { header: 'Module', accessorKey: 'module', className: 'font-semibold text-emerald-900' },
            {
              header: 'Action',
              accessorKey: 'action',
              align: 'center',
              cell: r => (
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                    r.action === 'create'
                      ? 'bg-emerald-100 text-emerald-800'
                      : r.action === 'update'
                      ? 'bg-blue-100 text-blue-800'
                      : r.action === 'delete'
                      ? 'bg-rose-100 text-rose-800'
                      : r.action === 'approve'
                      ? 'bg-purple-100 text-purple-800'
                      : 'bg-stone-100 text-stone-800'
                  }`}
                >
                  {r.action}
                </span>
              ),
            },
            { header: 'Transaction Details', accessorKey: 'details', cell: r => <span className="text-stone-700">{r.details}</span> },
          ]}
        />
      )}

      {/* MODAL: Add / Edit User */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingUser ? 'Edit User Credentials' : 'Add New System User'}
        subtitle="Configure role permissions and department"
      >
        <form onSubmit={handleSaveUser} className="space-y-3 text-xs">
          <div>
            <label className="block font-medium text-stone-700 mb-1">Full Name *</label>
            <input
              type="text"
              required
              value={formData.name || ''}
              onChange={e => setFormData({ ...formData, name: e.target.value })}
              className="w-full p-2 border border-stone-300 rounded"
              placeholder="e.g. Asif Raza (Chemist)"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-medium text-stone-700 mb-1">Login Username *</label>
              <input
                type="text"
                required
                value={formData.username || ''}
                onChange={e => setFormData({ ...formData, username: e.target.value })}
                className="w-full p-2 border border-stone-300 rounded font-mono"
                placeholder="e.g. asif.chemist"
              />
            </div>
            <div>
              <label className="block font-medium text-stone-700 mb-1">Login Password *</label>
              <input
                type="password"
                required
                value={formData.password || ''}
                onChange={e => setFormData({ ...formData, password: e.target.value })}
                className="w-full p-2 border border-stone-300 rounded font-mono"
                placeholder="Enter password"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-medium text-stone-700 mb-1">Email Address *</label>
              <input
                type="email"
                required
                value={formData.email || ''}
                onChange={e => setFormData({ ...formData, email: e.target.value })}
                className="w-full p-2 border border-stone-300 rounded"
              />
            </div>
            <div>
              <label className="block font-medium text-stone-700 mb-1">Assigned Role *</label>
              <select
                value={formData.role || 'operator'}
                onChange={e => setFormData({ ...formData, role: e.target.value as any })}
                className="w-full p-2 border border-stone-300 rounded font-bold"
              >
                <option value="admin">Admin (Full System Access)</option>
                <option value="manager">Manager (Production & Approvals)</option>
                <option value="operator">Operator (Data Entry Only)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-medium text-stone-700 mb-1">Department</label>
              <input
                type="text"
                value={formData.department || ''}
                onChange={e => setFormData({ ...formData, department: e.target.value })}
                className="w-full p-2 border border-stone-300 rounded"
                placeholder="e.g. Quality Lab, Compounding"
              />
            </div>
            <div>
              <label className="block font-medium text-stone-700 mb-1">Contact Phone</label>
              <input
                type="text"
                value={formData.phone || ''}
                onChange={e => setFormData({ ...formData, phone: e.target.value })}
                className="w-full p-2 border border-stone-300 rounded font-mono"
              />
            </div>
          </div>

          <div className="flex items-center gap-2 pt-1">
            <input
              id="user-active-toggle"
              type="checkbox"
              checked={formData.isActive ?? true}
              disabled={editingUser?.id === 'user-admin'}
              onChange={e => setFormData({ ...formData, isActive: e.target.checked })}
              className="rounded border-stone-300 text-emerald-800 focus:ring-emerald-700"
            />
            <label htmlFor="user-active-toggle" className="font-medium text-stone-700">
              Account Active (Allow ERP Login)
            </label>
          </div>

          <div className="pt-3 border-t border-stone-200 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="px-4 py-2 border border-stone-300 rounded text-stone-700 hover:bg-stone-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-emerald-800 text-white rounded font-medium hover:bg-emerald-700"
            >
              Save User
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
