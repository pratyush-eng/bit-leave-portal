import React, { useState } from 'react';
import { useLeave } from '../../context/LeaveContext';
import { User, Role } from '../../types';
import { MaterialChip } from '../common/MaterialChip';
import { EditUserModal } from './EditUserModal';
import { 
  ShieldCheck, 
  Key, 
  FileCode, 
  RefreshCw, 
  CheckSquare, 
  ShieldAlert, 
  Lock,
  Terminal,
  UserCheck,
  Search,
  UserPlus,
  Database,
  CheckCircle2,
  XCircle,
  Download,
  Upload,
  Copy,
  Check,
  Users,
  Building2,
  AlertTriangle,
  Edit3
} from 'lucide-react';

export const SuperAdminDashboard: React.FC = () => {
  const { 
    currentUser, 
    allUsers, 
    departments,
    leavePolicies,
    auditLogs, 
    granularPermissions, 
    updateUserRoleAndPermissions,
    createNewUser,
    updateUserStatus,
    exportDbJson,
    importDbJson,
    resetData 
  } = useLeave();

  const [activeTab, setActiveTab] = useState<'permissions' | 'user_creation' | 'pending' | 'database' | 'audit_logs'>('permissions');
  const [selectedUserId, setSelectedUserId] = useState<string>(allUsers[3]?.id || allUsers[0]?.id);
  const [logFilter, setLogFilter] = useState<string>('');
  const [selectedUserToEdit, setSelectedUserToEdit] = useState<User | null>(null);

  // Super Admin New User Form state
  const [newRole, setNewRole] = useState<Role>('FACULTY');
  const [newName, setNewName] = useState<string>('');
  const [newEmail, setNewEmail] = useState<string>('');
  const [newPassword, setNewPassword] = useState<string>('password123');
  const [newDeptId, setNewDeptId] = useState<string>('CSE');
  const [newDesignation, setNewDesignation] = useState<string>('Assistant Professor');
  const [newEmpCode, setNewEmpCode] = useState<string>('');
  const [newPhone, setNewPhone] = useState<string>('');
  const [userCreatedMsg, setUserCreatedMsg] = useState<string | null>(null);

  // DB Export/Import state
  const [dbJsonString, setDbJsonString] = useState<string>('');
  const [copiedDb, setCopiedDb] = useState<boolean>(false);
  const [importStatusMsg, setImportStatusMsg] = useState<string | null>(null);

  const targetUser = allUsers.find(u => u.id === selectedUserId) || allUsers[0];
  const currentAssigned = targetUser.assignedPermissions || [];

  const pendingUsers = allUsers.filter(u => u.accountStatus === 'PENDING_APPROVAL');

  const handleTogglePermission = (permId: string) => {
    let updated: string[];
    if (currentAssigned.includes(permId)) {
      updated = currentAssigned.filter(p => p !== permId);
    } else {
      updated = [...currentAssigned, permId];
    }
    updateUserRoleAndPermissions(targetUser.id, targetUser.role, updated);
  };

  const handleCreateUserBySuperAdmin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName || !newEmail) return;
    const dept = departments.find(d => d.id === newDeptId);
    const departmentName = dept ? dept.name : 'Computer Science & Engineering';

    const result = createNewUser({
      name: newName,
      email: newEmail,
      password: newPassword || 'password123',
      role: newRole,
      designation: newDesignation || newRole,
      departmentId: newDeptId,
      departmentName,
      employeeCode: newEmpCode || `SA-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`,
      joiningDate: new Date().toISOString().split('T')[0],
      phone: newPhone || '+91 98765 00000',
      accountStatus: 'ACTIVE',
      avatarUrl: `https://ui-avatars.com/api/?name=${encodeURIComponent(newName)}&background=1e3a8a&color=fff`
    });

    if (!result.success) {
      alert(result.message);
      return;
    }

    setUserCreatedMsg(`Successfully created new ${newRole} account for ${newName} (${newEmail}) with active database access.`);
    setNewName('');
    setNewEmail('');
    setNewEmpCode('');
    setNewPhone('');
    setTimeout(() => setUserCreatedMsg(null), 5000);
  };

  const handleExportDb = () => {
    const snapshot = exportDbJson();
    setDbJsonString(snapshot);
  };

  const handleCopyDb = () => {
    const snapshot = dbJsonString || exportDbJson();
    navigator.clipboard.writeText(snapshot);
    setCopiedDb(true);
    setTimeout(() => setCopiedDb(false), 2000);
  };

  const handleImportDb = () => {
    setImportStatusMsg(null);
    if (!dbJsonString.trim()) {
      setImportStatusMsg('Error: Please paste a valid database JSON snapshot string first.');
      return;
    }
    const success = importDbJson(dbJsonString);
    if (success) {
      setImportStatusMsg('Success: Database snapshot imported and restored successfully!');
    } else {
      setImportStatusMsg('Error: Invalid database JSON structure. Restore failed.');
    }
  };

  const filteredLogs = auditLogs.filter(l => {
    if (!logFilter) return true;
    return l.action.toLowerCase().includes(logFilter.toLowerCase()) || 
           l.actorName.toLowerCase().includes(logFilter.toLowerCase()) ||
           l.details.toLowerCase().includes(logFilter.toLowerCase());
  });

  return (
    <div className="space-y-6">
      
      {/* Header Banner */}
      <div className="bg-[#3F51B5] rounded-xl p-6 text-white shadow-md flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-widest bg-white/20 text-white border border-white/20">
              Super Admin Control Plane
            </span>
            <span className="text-xs text-indigo-100 font-medium">Global Executive Override & DB Management</span>
          </div>
          <h2 className="text-xl font-medium tracking-tight">
            Institutional Super Admin Portal • {currentUser.name}
          </h2>
          <p className="text-xs text-indigo-100/90 mt-1 max-w-xl leading-relaxed">
            Create any institutional user role, validate staff self-registrations, assign granular permissions, inspect database persistence, and audit system logs.
          </p>
        </div>

        <button
          onClick={() => {
            if (window.confirm('Reset institutional data to default sample state?')) {
              resetData();
            }
          }}
          className="px-4 py-2 bg-rose-700/80 hover:bg-rose-800 text-white rounded font-medium text-xs border border-rose-600 shadow-sm transition-all active:scale-95 flex items-center gap-2 shrink-0 uppercase tracking-wide cursor-pointer"
        >
          <RefreshCw className="w-4 h-4 text-white" />
          Factory Reset DB
        </button>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 pb-3">
        <button
          onClick={() => setActiveTab('permissions')}
          className={`px-4 py-2 rounded-lg text-xs font-medium uppercase tracking-wide transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === 'permissions'
              ? 'bg-[#3F51B5] text-white shadow-sm'
              : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
          }`}
        >
          <Key className="w-4 h-4" />
          Permission Matrix
        </button>

        <button
          onClick={() => setActiveTab('user_creation')}
          className={`px-4 py-2 rounded-lg text-xs font-medium uppercase tracking-wide transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === 'user_creation'
              ? 'bg-[#3F51B5] text-white shadow-sm'
              : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
          }`}
        >
          <UserPlus className="w-4 h-4" />
          Create Any User Role
        </button>

        <button
          onClick={() => setActiveTab('pending')}
          className={`px-4 py-2 rounded-lg text-xs font-medium uppercase tracking-wide transition-all flex items-center gap-2 cursor-pointer relative ${
            activeTab === 'pending'
              ? 'bg-[#3F51B5] text-white shadow-sm'
              : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
          }`}
        >
          <UserCheck className="w-4 h-4" />
          Pending Validations
          {pendingUsers.length > 0 && (
            <span className="ml-1 px-1.5 py-0.5 rounded-full bg-amber-500 text-white text-[10px] font-bold">
              {pendingUsers.length}
            </span>
          )}
        </button>

        <button
          onClick={() => {
            setActiveTab('database');
            handleExportDb();
          }}
          className={`px-4 py-2 rounded-lg text-xs font-medium uppercase tracking-wide transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === 'database'
              ? 'bg-[#3F51B5] text-white shadow-sm'
              : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
          }`}
        >
          <Database className="w-4 h-4" />
          Database Persistence
        </button>

        <button
          onClick={() => setActiveTab('audit_logs')}
          className={`px-4 py-2 rounded-lg text-xs font-medium uppercase tracking-wide transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === 'audit_logs'
              ? 'bg-[#3F51B5] text-white shadow-sm'
              : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
          }`}
        >
          <Terminal className="w-4 h-4" />
          Global Audit Logs ({auditLogs.length})
        </button>
      </div>

      {/* Tab 1: Granular Permission Matrix */}
      {activeTab === 'permissions' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* User Selector Column */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Select Admin / User Profile
            </h3>

            <div className="space-y-2 max-h-[450px] overflow-y-auto">
              {allUsers.map((u) => {
                const isSelected = u.id === targetUser.id;
                return (
                  <div
                    key={u.id}
                    onClick={() => setSelectedUserId(u.id)}
                    className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                      isSelected 
                        ? 'bg-amber-50 border-amber-400 text-amber-950 font-bold shadow-2xs' 
                        : 'bg-white border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <div>
                      <p className="text-xs font-bold text-slate-900">{u.name}</p>
                      <p className="text-[10px] text-slate-500">{u.designation} ({u.departmentId})</p>
                    </div>
                    <MaterialChip label={u.role} variant="role" role={u.role} />
                  </div>
                );
              })}
            </div>
          </div>

          {/* Permission Matrix Grid Column */}
          <div className="md:col-span-2 bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
            <div className="border-b pb-3 flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Assigned Permissions for {targetUser.name}
                </h3>
                <p className="text-xs text-slate-500">
                  Role: {targetUser.role} • Department: {targetUser.departmentName} ({targetUser.email})
                </p>
              </div>

              <div className="flex items-center gap-2">
                <MaterialChip label={targetUser.role} variant="role" role={targetUser.role} />
                <button
                  type="button"
                  onClick={() => setSelectedUserToEdit(targetUser)}
                  className="px-3 py-1.5 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-lg flex items-center gap-1 cursor-pointer transition-colors"
                >
                  <Edit3 className="w-3.5 h-3.5 text-slate-600" />
                  Modify / Delete Account
                </button>
              </div>
            </div>

            <div className="space-y-3">
              {granularPermissions.map((perm) => {
                const isGranted = currentAssigned.includes(perm.id);
                return (
                  <div
                    key={perm.id}
                    onClick={() => handleTogglePermission(perm.id)}
                    className={`p-4 rounded-xl border transition-all cursor-pointer flex items-start justify-between ${
                      isGranted 
                        ? 'bg-emerald-50/80 border-emerald-300' 
                        : 'bg-slate-50/60 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <div className="pr-4">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-900">{perm.name}</span>
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-200 text-slate-700">
                          {perm.category}
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 mt-1">{perm.description}</p>
                    </div>

                    <div className="shrink-0 mt-0.5">
                      <input
                        type="checkbox"
                        checked={isGranted}
                        onChange={() => {}} // handled by parent onClick
                        className="w-5 h-5 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500 cursor-pointer"
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Create Any User Role (Super Admin Privilege) */}
      {activeTab === 'user_creation' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-2xs max-w-3xl mx-auto space-y-6">
          <div className="border-b border-slate-200 pb-4">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <UserPlus className="w-4 h-4 text-[#3F51B5]" />
              Super Admin Multi-Role Account Creation
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Create and assign roles to any user (Faculty, Staff, HOD, Registrar, Admin, or Super Admin) with immediate active database status.
            </p>
          </div>

          {userCreatedMsg && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl font-semibold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{userCreatedMsg}</span>
            </div>
          )}

          <form onSubmit={handleCreateUserBySuperAdmin} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Institutional Role Assignment *
                </label>
                <select
                  value={newRole}
                  onChange={(e) => {
                    const r = e.target.value as Role;
                    setNewRole(r);
                    if (r === 'HOD') setNewDesignation('Head of Department');
                    else if (r === 'REGISTRAR') setNewDesignation('University Registrar');
                    else if (r === 'ADMIN') setNewDesignation('Administrative Officer');
                    else if (r === 'SUPER_ADMIN') setNewDesignation('Executive Dean');
                    else if (r === 'STAFF') setNewDesignation('Senior Technical Officer');
                    else setNewDesignation('Assistant Professor');
                  }}
                  className="block w-full px-3 py-2.5 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 font-bold focus:outline-hidden focus:ring-2 focus:ring-[#3F51B5]"
                >
                  <option value="FACULTY">FACULTY (Teaching Faculty)</option>
                  <option value="STAFF">STAFF (Technical / Admin Staff)</option>
                  <option value="HOD">HOD (Department Head)</option>
                  <option value="REGISTRAR">REGISTRAR (University Registrar)</option>
                  <option value="ADMIN">ADMIN (Department / User Admin)</option>
                  <option value="SUPER_ADMIN">SUPER_ADMIN (Institutional Super Admin)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Department *
                </label>
                <select
                  value={newDeptId}
                  onChange={(e) => setNewDeptId(e.target.value)}
                  className="block w-full px-3 py-2.5 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 font-medium focus:outline-hidden focus:ring-2 focus:ring-[#3F51B5]"
                >
                  {departments.map(d => (
                    <option key={d.id} value={d.id}>{d.name} ({d.code})</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Dr. Ramesh Gupta"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="block w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-[#3F51B5]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Institutional Email *
                </label>
                <input
                  type="email"
                  required
                  placeholder="e.g. ramesh.gupta@institution.edu"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  className="block w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-[#3F51B5]"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Account Login Password *
                </label>
                <input
                  type="password"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="block w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-[#3F51B5]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Designation / Title
                </label>
                <input
                  type="text"
                  value={newDesignation}
                  onChange={(e) => setNewDesignation(e.target.value)}
                  className="block w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-[#3F51B5]"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Employee ID / Code
                </label>
                <input
                  type="text"
                  placeholder="e.g. FAC-2026-991"
                  value={newEmpCode}
                  onChange={(e) => setNewEmpCode(e.target.value)}
                  className="block w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-mono text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-[#3F51B5]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Phone Number
                </label>
                <input
                  type="text"
                  placeholder="+91 98888 11111"
                  value={newPhone}
                  onChange={(e) => setNewPhone(e.target.value)}
                  className="block w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-[#3F51B5]"
                />
              </div>
            </div>

            <div className="pt-3">
              <button
                type="submit"
                className="w-full py-3 px-6 bg-[#3F51B5] hover:bg-[#303F9F] text-white rounded-xl font-bold text-xs uppercase tracking-widest shadow-md transition-all active:scale-98 flex items-center justify-center gap-2 cursor-pointer"
              >
                <UserPlus className="w-4 h-4" />
                Create {newRole} Account & Store in DB
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Tab 3: Pending Self-Registration Validations */}
      {activeTab === 'pending' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-2xs space-y-4">
          <div className="border-b border-slate-200 pb-3 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                Staff & Faculty Self-Registration Queue ({pendingUsers.length})
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Review and validate self-registered staff members before granting them access to institutional workflows.
              </p>
            </div>
            {pendingUsers.length === 0 && (
              <span className="px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 text-xs font-bold border border-emerald-200">
                All Validated
              </span>
            )}
          </div>

          {pendingUsers.length === 0 ? (
            <div className="py-12 text-center text-slate-500 space-y-2">
              <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto" />
              <p className="text-sm font-bold text-slate-700">No Pending Registration Requests</p>
              <p className="text-xs text-slate-400">All staff and faculty self-registrations have been reviewed and validated.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {pendingUsers.map((u) => (
                <div key={u.id} className="p-5 rounded-2xl border border-amber-300 bg-amber-50/30 shadow-2xs flex flex-col justify-between space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <MaterialChip label={u.role} variant="role" role={u.role} />
                      <span className="text-[10px] font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded-full uppercase tracking-wider">
                        Pending Validation
                      </span>
                    </div>

                    <div>
                      <h4 className="text-sm font-bold text-slate-900">{u.name}</h4>
                      <p className="text-xs text-slate-600">{u.designation} • {u.departmentName}</p>
                      <p className="text-xs font-mono text-slate-500 mt-1">{u.email}</p>
                    </div>

                    <div className="text-[11px] text-slate-500 pt-1 border-t border-slate-200/60 flex justify-between">
                      <span>Emp ID: <strong className="text-slate-700">{u.employeeCode}</strong></span>
                      <span>Registered: <strong className="text-slate-700">{u.registeredAt ? new Date(u.registeredAt).toLocaleDateString() : 'Today'}</strong></span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => updateUserStatus(u.id, 'ACTIVE')}
                      className="flex-1 py-2 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      Validate & Approve
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (window.confirm(`Reject self-registration for ${u.name}?`)) {
                          updateUserStatus(u.id, 'REJECTED');
                        }
                      }}
                      className="py-2 px-3 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
                    >
                      <XCircle className="w-4 h-4" />
                      Reject
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 4: Institutional Database Persistence Dashboard */}
      {activeTab === 'database' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-2xs space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <Database className="w-4 h-4 text-emerald-600" />
                Institutional Database & Storage Engine
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                All users, departments, policies, leave records, and audit logs are permanently stored in the browser-backed institutional database.
              </p>
            </div>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 text-xs font-bold border border-emerald-200">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              DB status: ACTIVE / SYNCHRONIZED
            </span>
          </div>

          {/* DB Stats Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-center">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Total Users</span>
              <span className="text-2xl font-black text-slate-900">{allUsers.length}</span>
            </div>
            <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-center">
              <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider block">Active Users</span>
              <span className="text-2xl font-black text-emerald-900">{allUsers.filter(u => u.accountStatus !== 'PENDING_APPROVAL' && u.accountStatus !== 'REJECTED').length}</span>
            </div>
            <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-center">
              <span className="text-[10px] font-bold text-amber-800 uppercase tracking-wider block">Pending Queue</span>
              <span className="text-2xl font-black text-amber-900">{pendingUsers.length}</span>
            </div>
            <div className="p-3.5 rounded-xl bg-indigo-50 border border-indigo-200 text-center">
              <span className="text-[10px] font-bold text-indigo-800 uppercase tracking-wider block">Departments</span>
              <span className="text-2xl font-black text-indigo-900">{departments.length}</span>
            </div>
            <div className="p-3.5 rounded-xl bg-purple-50 border border-purple-200 text-center">
              <span className="text-[10px] font-bold text-purple-800 uppercase tracking-wider block">Leave Policies</span>
              <span className="text-2xl font-black text-purple-900">{leavePolicies.length}</span>
            </div>
            <div className="p-3.5 rounded-xl bg-slate-100 border border-slate-300 text-center">
              <span className="text-[10px] font-bold text-slate-700 uppercase tracking-wider block">Audit Entries</span>
              <span className="text-2xl font-black text-slate-900">{auditLogs.length}</span>
            </div>
          </div>

          {/* Export / Import DB Section */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-700">
                Database JSON Snapshot (Export / Restore)
              </label>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleExportDb}
                  className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  Generate Snapshot
                </button>
                <button
                  type="button"
                  onClick={handleCopyDb}
                  className="px-3 py-1.5 rounded-lg bg-[#3F51B5] hover:bg-[#303F9F] text-white text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  {copiedDb ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  {copiedDb ? 'Copied JSON!' : 'Copy DB JSON'}
                </button>
              </div>
            </div>

            {importStatusMsg && (
              <div className={`p-3 rounded-xl text-xs font-medium ${
                importStatusMsg.startsWith('Success')
                  ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
                  : 'bg-rose-50 border border-rose-200 text-rose-800'
              }`}>
                {importStatusMsg}
              </div>
            )}

            <textarea
              rows={8}
              value={dbJsonString}
              onChange={(e) => setDbJsonString(e.target.value)}
              placeholder="Click 'Generate Snapshot' to view current institutional database JSON, or paste an exported DB JSON string here to restore..."
              className="w-full font-mono text-[11px] p-4 bg-slate-900 text-indigo-200 rounded-xl border border-slate-700 focus:outline-hidden focus:ring-2 focus:ring-[#3F51B5]"
            />

            <div className="flex justify-end">
              <button
                type="button"
                onClick={handleImportDb}
                className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold uppercase tracking-widest transition-all flex items-center gap-2 cursor-pointer shadow-md active:scale-98"
              >
                <Upload className="w-4 h-4" />
                Restore DB From JSON Snapshot
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tab 5: Global Security Audit Logs */}
      {activeTab === 'audit_logs' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden space-y-3">
          <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900">System Security & Action Logs</h3>
              <p className="text-xs text-slate-500">Real-time IP tracked audit trail</p>
            </div>

            <div className="relative min-w-[240px]">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search audit logs..."
                value={logFilter}
                onChange={(e) => setLogFilter(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 bg-white border border-slate-300 rounded-xl text-xs font-medium"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-100 text-slate-600 font-bold uppercase tracking-wider text-[10px] border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3">Timestamp</th>
                  <th className="px-4 py-3">Actor Name</th>
                  <th className="px-4 py-3">Role</th>
                  <th className="px-4 py-3">Action Event</th>
                  <th className="px-4 py-3">Event Details</th>
                  <th className="px-4 py-3 text-right">IP Address</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 font-mono text-[11px] text-slate-500 whitespace-nowrap">{log.timestamp}</td>
                    <td className="px-4 py-3 font-bold text-slate-900">{log.actorName}</td>
                    <td className="px-4 py-3">
                      <MaterialChip label={log.actorRole} variant="role" role={log.actorRole} />
                    </td>
                    <td className="px-4 py-3 font-bold text-indigo-900">{log.action}</td>
                    <td className="px-4 py-3 text-slate-700 max-w-md">{log.details}</td>
                    <td className="px-4 py-3 font-mono text-[11px] text-slate-400 text-right">{log.ipAddress || '172.16.0.1'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {selectedUserToEdit && (
        <EditUserModal
          user={selectedUserToEdit}
          onClose={() => setSelectedUserToEdit(null)}
        />
      )}

    </div>
  );
};
