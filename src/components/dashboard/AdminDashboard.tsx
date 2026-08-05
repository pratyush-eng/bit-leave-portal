import React, { useState } from 'react';
import { useLeave } from '../../context/LeaveContext';
import { User, Role, LeaveType, LeavePolicy, Department } from '../../types';
import { MaterialChip } from '../common/MaterialChip';
import { EditUserModal } from './EditUserModal';
import { 
  UserCog, 
  Settings, 
  Sliders, 
  Check, 
  Edit3, 
  Save, 
  X, 
  UserPlus, 
  BarChart3, 
  Building2,
  Sparkles,
  ShieldAlert,
  Plus,
  FolderPlus,
  FileSpreadsheet,
  CheckCircle2,
  Filter,
  Lock
} from 'lucide-react';

export const AdminDashboard: React.FC = () => {
  const { 
    allUsers, 
    departments, 
    leavePolicies, 
    updateUserRoleAndPermissions, 
    adjustUserLeaveBalance,
    createNewUser,
    createNewDepartment,
    updateDepartment,
    createNewLeaveType,
    updateLeavePolicy,
    updateUserStatus,
    currentUser
  } = useLeave();

  const [activeTab, setActiveTab] = useState<'users' | 'departments' | 'policies' | 'balances' | 'pending'>('users');
  
  const isDeptAdmin = currentUser?.role === 'ADMIN' && currentUser?.role !== 'SUPER_ADMIN';
  const userDeptId = currentUser?.departmentId;
  const userDeptObj = departments.find(d => d.id === userDeptId);

  // Department Filter & User Editing
  const [selectedDepartmentFilter, setSelectedDepartmentFilter] = useState<string>('ALL');
  const [selectedUserToEdit, setSelectedUserToEdit] = useState<User | null>(null);

  React.useEffect(() => {
    if (isDeptAdmin && userDeptId) {
      setSelectedDepartmentFilter(userDeptId);
    }
  }, [isDeptAdmin, userDeptId]);

  const effectiveDeptFilter = (isDeptAdmin && userDeptId) ? userDeptId : selectedDepartmentFilter;

  const displayedUsers = effectiveDeptFilter === 'ALL'
    ? allUsers
    : allUsers.filter(u => u.departmentId === effectiveDeptFilter);

  const pendingUsers = allUsers.filter(u => 
    u.accountStatus === 'PENDING_APPROVAL' && 
    (effectiveDeptFilter === 'ALL' || u.departmentId === effectiveDeptFilter)
  );

  // User editing state
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [selectedRole, setSelectedRole] = useState<Role>('FACULTY');
  
  // Balance editing state
  const [balanceUserId, setBalanceUserId] = useState<string | null>(null);
  const [selectedLeaveType, setSelectedLeaveType] = useState<LeaveType>('CASUAL');
  const [editTotalQuota, setEditTotalQuota] = useState<number>(12);
  const [editUsedDays, setEditUsedDays] = useState<number>(0);

  // Policy editing state
  const [editingPolicy, setEditingPolicy] = useState<LeavePolicy | null>(null);

  // Department editing state
  const [editingDept, setEditingDept] = useState<Department | null>(null);

  // Modals state
  const [showAddUserModal, setShowAddUserModal] = useState<boolean>(false);
  const [showAddDeptModal, setShowAddDeptModal] = useState<boolean>(false);
  const [showAddPolicyModal, setShowAddPolicyModal] = useState<boolean>(false);

  // New User form state
  const [newName, setNewName] = useState<string>('');
  const [newEmail, setNewEmail] = useState<string>('');
  const [newDesignation, setNewDesignation] = useState<string>('');
  const [newRole, setNewRole] = useState<Role>('FACULTY');
  const [newDeptId, setNewDeptId] = useState<string>(currentUser?.departmentId || 'CSE');
  const [newPhone, setNewPhone] = useState<string>('');
  const [newEmpCode, setNewEmpCode] = useState<string>('');

  const openAddUserModal = () => {
    if (isDeptAdmin && currentUser?.departmentId) {
      setNewDeptId(currentUser.departmentId);
    }
    setShowAddUserModal(true);
  };

  // New Department form state
  const [deptCode, setDeptCode] = useState<string>('');
  const [deptName, setDeptName] = useState<string>('');
  const [deptHodId, setDeptHodId] = useState<string>('');

  // New Leave Type form state
  const [policyCode, setPolicyCode] = useState<string>('');
  const [policyLabel, setPolicyLabel] = useState<string>('');
  const [policyQuota, setPolicyQuota] = useState<number>(12);
  const [policyNotice, setPolicyNotice] = useState<number>(1);
  const [policyReqDoc, setPolicyReqDoc] = useState<boolean>(false);
  const [policyColor, setPolicyColor] = useState<string>('#3F51B5');
  const [policyDesc, setPolicyDesc] = useState<string>('');

  const handleSaveRole = (userId: string) => {
    updateUserRoleAndPermissions(userId, selectedRole, []);
    setEditingUserId(null);
  };

  const handleSaveBalance = (userId: string) => {
    adjustUserLeaveBalance(userId, selectedLeaveType, editTotalQuota, editUsedDays);
    setBalanceUserId(null);
  };

  const handleSavePolicy = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingPolicy) {
      updateLeavePolicy(editingPolicy);
      setEditingPolicy(null);
    }
  };

  const handleUpdateDepartment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingDept) return;
    const hodUser = allUsers.find(u => u.id === deptHodId);
    updateDepartment({
      ...editingDept,
      name: deptName,
      code: deptCode.toUpperCase(),
      hodId: deptHodId,
      hodName: hodUser ? hodUser.name : 'Not Assigned'
    });
    setEditingDept(null);
  };

  const handleCreateUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName || !newEmail) {
      alert('Please fill required fields.');
      return;
    }

    const targetDeptId = isDeptAdmin && currentUser?.departmentId ? currentUser.departmentId : newDeptId;
    const dept = departments.find(d => d.id === targetDeptId);

    const result = createNewUser({
      name: newName,
      email: newEmail,
      role: newRole,
      designation: newDesignation || 'Assistant Professor',
      departmentId: targetDeptId,
      departmentName: dept ? dept.name : (currentUser?.departmentName || 'General Department'),
      employeeCode: newEmpCode || `FAC-2026-${Math.floor(100 + Math.random() * 900)}`,
      joiningDate: new Date().toISOString().split('T')[0],
      phone: newPhone || '+91 98765 00000',
      avatarUrl: `https://ui-avatars.com/api/?name=${encodeURIComponent(newName)}&background=1e3a8a&color=fff`
    });

    if (!result.success) {
      alert(result.message);
      return;
    }

    setShowAddUserModal(false);
    setNewName('');
    setNewEmail('');
  };

  const handleCreateDepartment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!deptCode || !deptName) {
      alert('Department Code and Name are required.');
      return;
    }

    const hodUser = allUsers.find(u => u.id === deptHodId);

    createNewDepartment({
      id: deptCode.toUpperCase().replace(/\s+/g, '_'),
      code: deptCode.toUpperCase(),
      name: deptName,
      hodId: deptHodId,
      hodName: hodUser ? hodUser.name : 'Not Assigned'
    });

    setShowAddDeptModal(false);
    setDeptCode('');
    setDeptName('');
    setDeptHodId('');
  };

  const handleCreateLeaveType = (e: React.FormEvent) => {
    e.preventDefault();
    if (!policyCode || !policyLabel) {
      alert('Leave Type Code and Label are required.');
      return;
    }

    createNewLeaveType({
      type: policyCode.toUpperCase().replace(/\s+/g, '_'),
      label: policyLabel,
      annualQuota: Number(policyQuota) || 10,
      minDaysNotice: Number(policyNotice) || 0,
      requiresDocument: policyReqDoc,
      color: policyColor,
      description: policyDesc || `${policyLabel} leave policy.`
    });

    setShowAddPolicyModal(false);
    setPolicyCode('');
    setPolicyLabel('');
    setPolicyQuota(12);
    setPolicyNotice(1);
    setPolicyReqDoc(false);
    setPolicyDesc('');
  };

  return (
    <div className="space-y-6 font-sans">
      
      {/* Header Banner */}
      <div className="bg-[#3F51B5] rounded-xl p-6 text-white shadow-md flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-widest bg-white/20 text-white border border-white/20">
              Administrative Control Center
            </span>
          </div>
          <h2 className="text-xl font-medium tracking-tight">
            User Roles, Department & Leave Management Portal
          </h2>
          <p className="text-xs text-indigo-100/90 mt-1 max-w-xl leading-relaxed">
            Create user profiles, establish departments, define custom leave types, and adjust quotas.
          </p>
        </div>

        <div className="flex flex-wrap gap-2 shrink-0">
          <button
            onClick={openAddUserModal}
            className="px-4 py-2 bg-white text-[#3F51B5] hover:bg-slate-50 rounded font-medium text-xs uppercase tracking-wide shadow-xs transition-all active:scale-95 flex items-center gap-1.5 cursor-pointer"
          >
            <UserPlus className="w-3.5 h-3.5 text-[#3F51B5]" />
            New User
          </button>
          
          {currentUser?.role === 'SUPER_ADMIN' && (
            <>
              <button
                onClick={() => setShowAddDeptModal(true)}
                className="px-4 py-2 bg-indigo-900/40 hover:bg-indigo-900/60 text-white border border-white/30 rounded font-medium text-xs uppercase tracking-wide transition-all active:scale-95 flex items-center gap-1.5 cursor-pointer"
              >
                <Building2 className="w-3.5 h-3.5" />
                New Department
              </button>

              <button
                onClick={() => setShowAddPolicyModal(true)}
                className="px-4 py-2 bg-indigo-900/40 hover:bg-indigo-900/60 text-white border border-white/30 rounded font-medium text-xs uppercase tracking-wide transition-all active:scale-95 flex items-center gap-1.5 cursor-pointer"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                New Leave Type
              </button>
            </>
          )}
        </div>
      </div>

      {/* Navigation Tabs Bar */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 pb-3">
        <button
          onClick={() => setActiveTab('users')}
          className={`px-4 py-2 rounded-lg text-xs font-medium uppercase tracking-wide transition-all flex items-center gap-1.5 cursor-pointer ${
            activeTab === 'users'
              ? 'bg-[#3F51B5] text-white shadow-xs'
              : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
          }`}
        >
          <UserCog className="w-4 h-4" />
          Users & Roles ({allUsers.length})
        </button>

        <button
          onClick={() => setActiveTab('departments')}
          className={`px-4 py-2 rounded-lg text-xs font-medium uppercase tracking-wide transition-all flex items-center gap-1.5 cursor-pointer ${
            activeTab === 'departments'
              ? 'bg-[#3F51B5] text-white shadow-xs'
              : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
          }`}
        >
          <Building2 className="w-4 h-4" />
          Departments ({departments.length})
        </button>

        <button
          onClick={() => setActiveTab('policies')}
          className={`px-4 py-2 rounded-lg text-xs font-medium uppercase tracking-wide transition-all flex items-center gap-1.5 cursor-pointer ${
            activeTab === 'policies'
              ? 'bg-[#3F51B5] text-white shadow-xs'
              : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
          }`}
        >
          <Settings className="w-4 h-4" />
          Leave Types & Policies ({leavePolicies.length})
        </button>

        <button
          onClick={() => setActiveTab('balances')}
          className={`px-4 py-2 rounded-lg text-xs font-medium uppercase tracking-wide transition-all flex items-center gap-1.5 cursor-pointer ${
            activeTab === 'balances'
              ? 'bg-[#3F51B5] text-white shadow-xs'
              : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
          }`}
        >
          <Sliders className="w-4 h-4" />
          Quota & Balance Adjuster
        </button>

        <button
          onClick={() => setActiveTab('pending')}
          className={`px-4 py-2 rounded-lg text-xs font-medium uppercase tracking-wide transition-all flex items-center gap-1.5 cursor-pointer relative ${
            activeTab === 'pending'
              ? 'bg-[#3F51B5] text-white shadow-xs'
              : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
          }`}
        >
          <CheckCircle2 className="w-4 h-4" />
          Pending Validations
          {pendingUsers.length > 0 && (
            <span className="ml-1 px-1.5 py-0.5 rounded-full bg-amber-500 text-white text-[10px] font-bold">
              {pendingUsers.length}
            </span>
          )}
        </button>
      </div>

      {/* TAB 1: USER PROFILES & ROLES */}
      {activeTab === 'users' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                Registered Users Directory ({displayedUsers.length})
              </h3>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Department Administrators can manage users, modify user profiles, or delete registered accounts within their scope.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {isDeptAdmin ? (
                <div className="flex items-center gap-1.5 bg-indigo-50 px-2.5 py-1.5 border border-indigo-200 rounded-lg shadow-2xs text-indigo-900">
                  <Lock className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                  <span className="text-[11px] font-bold uppercase tracking-wider">Department Scope:</span>
                  <span className="text-xs font-bold text-indigo-950">
                    {userDeptObj ? `${userDeptObj.name} (${userDeptObj.code})` : userDeptId}
                  </span>
                </div>
              ) : (
                <div className="flex items-center gap-1.5 bg-white px-2.5 py-1.5 border border-slate-300 rounded-lg shadow-2xs">
                  <Filter className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                  <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">Dept:</span>
                  <select
                    value={effectiveDeptFilter}
                    onChange={(e) => setSelectedDepartmentFilter(e.target.value)}
                    className="text-xs font-bold text-slate-800 bg-transparent focus:outline-hidden cursor-pointer"
                  >
                    <option value="ALL">All Departments ({allUsers.length})</option>
                    {departments.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name} ({allUsers.filter(u => u.departmentId === d.id).length})
                      </option>
                    ))}
                    <option value="ADMIN">General Administration (ADMIN)</option>
                  </select>
                </div>
              )}

              <button
                onClick={openAddUserModal}
                className="px-3 py-1.5 bg-[#3F51B5] hover:bg-indigo-700 text-white text-xs font-bold rounded-lg uppercase tracking-wider flex items-center gap-1 cursor-pointer transition-colors shadow-2xs"
              >
                <UserPlus className="w-3.5 h-3.5" /> Add User
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-100 text-slate-600 font-bold uppercase tracking-wider text-[10px] border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3">User Profile</th>
                  <th className="px-4 py-3">Department</th>
                  <th className="px-4 py-3">Employee Code</th>
                  <th className="px-4 py-3">Assigned Role</th>
                  <th className="px-4 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {displayedUsers.map((usr) => (
                  <tr key={usr.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <img 
                          src={usr.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(usr.name)}&background=1e3a8a&color=fff`} 
                          alt={usr.name}
                          className="w-8 h-8 rounded-full border border-slate-200"
                        />
                        <div>
                          <p className="font-bold text-slate-900">{usr.name}</p>
                          <p className="text-[11px] text-slate-500 font-mono">{usr.email}</p>
                        </div>
                      </div>
                    </td>

                    <td className="px-4 py-3 font-medium text-slate-800">
                      {usr.departmentName} ({usr.departmentId})
                    </td>

                    <td className="px-4 py-3 font-mono text-slate-600">
                      {usr.employeeCode}
                    </td>

                    <td className="px-4 py-3">
                      {editingUserId === usr.id ? (
                        <select
                          value={selectedRole}
                          onChange={(e) => setSelectedRole(e.target.value as Role)}
                          className="px-2 py-1 bg-white border border-slate-300 rounded text-xs font-bold"
                        >
                          <option value="FACULTY">FACULTY</option>
                          <option value="STAFF">STAFF</option>
                          <option value="HOD">HOD</option>
                          <option value="REGISTRAR">REGISTRAR</option>
                          <option value="ADMIN">ADMIN</option>
                          <option value="SUPER_ADMIN">SUPER_ADMIN</option>
                        </select>
                      ) : (
                        <MaterialChip label={usr.role} variant="role" role={usr.role} />
                      )}
                    </td>

                    <td className="px-4 py-3 text-right">
                      {editingUserId === usr.id ? (
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => handleSaveRole(usr.id)}
                            className="p-1.5 text-white bg-emerald-600 rounded hover:bg-emerald-700 cursor-pointer"
                            title="Save Role"
                          >
                            <Save className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setEditingUserId(null)}
                            className="p-1.5 text-slate-600 bg-slate-200 rounded hover:bg-slate-300 cursor-pointer"
                            title="Cancel"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => setSelectedUserToEdit(usr)}
                            className="px-2.5 py-1 text-[11px] font-bold text-slate-800 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded transition-colors flex items-center gap-1 cursor-pointer"
                          >
                            <Edit3 className="w-3.5 h-3.5 text-slate-600" />
                            Modify / Delete
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: DEPARTMENTS MANAGEMENT */}
      {activeTab === 'departments' && (
        <div className="space-y-4">
          {currentUser?.role !== 'SUPER_ADMIN' && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-center gap-2 text-xs text-amber-900 font-medium shadow-2xs">
              <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0" />
              <span>Institutional Restriction: Departments can be added or modified by Super Admin only. (View Only Mode)</span>
            </div>
          )}

          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                Institutional Department Directory
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Directory of academic and administrative departments and assigned Head of Departments (HODs).
              </p>
            </div>

            {currentUser?.role === 'SUPER_ADMIN' && (
              <button
                onClick={() => setShowAddDeptModal(true)}
                className="px-4 py-2 bg-[#3F51B5] hover:bg-[#303F9F] text-white font-medium text-xs rounded uppercase tracking-wide flex items-center gap-1.5 cursor-pointer"
              >
                <Building2 className="w-4 h-4" /> Create Department
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {departments.map((dept) => (
              <div key={dept.id} className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-3">
                <div className="flex items-start justify-between border-b border-slate-100 pb-3">
                  <div>
                    <span className="px-2 py-0.5 bg-indigo-50 text-[#3F51B5] border border-indigo-200 rounded font-mono text-[10px] font-bold">
                      {dept.code}
                    </span>
                    <h4 className="text-sm font-bold text-slate-900 mt-1">{dept.name}</h4>
                  </div>
                </div>

                <div className="space-y-1.5 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Head of Department (HOD):</span>
                    <span className="font-semibold text-slate-800">{dept.hodName}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Total Department Faculty:</span>
                    <span className="font-bold text-indigo-900">{dept.totalFaculty || allUsers.filter(u => u.departmentId === dept.id).length} Users</span>
                  </div>
                </div>

                {currentUser?.role === 'SUPER_ADMIN' && (
                  <div className="pt-2 flex justify-end border-t border-slate-100">
                    <button
                      onClick={() => {
                        setEditingDept(dept);
                        setDeptCode(dept.code);
                        setDeptName(dept.name);
                        setDeptHodId(dept.hodId || '');
                      }}
                      className="px-2.5 py-1 bg-slate-100 hover:bg-indigo-50 hover:text-[#3F51B5] text-slate-700 rounded text-[11px] font-semibold transition-all flex items-center gap-1 cursor-pointer"
                    >
                      <Edit3 className="w-3 h-3" /> Edit Department
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: LEAVE TYPES & POLICIES */}
      {activeTab === 'policies' && (
        <div className="space-y-4">
          {currentUser?.role !== 'SUPER_ADMIN' && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-center gap-2 text-xs text-amber-900 font-medium shadow-2xs">
              <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0" />
              <span>Institutional Restriction: Leave Types & Policies can be added or modified by Super Admin only. (View Only Mode)</span>
            </div>
          )}

          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                Institutional Leave Policies & Custom Leave Types
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Annual quotas, notice requirements, and mandatory document rules for leave categories.
              </p>
            </div>

            {currentUser?.role === 'SUPER_ADMIN' && (
              <button
                onClick={() => setShowAddPolicyModal(true)}
                className="px-4 py-2 bg-[#3F51B5] hover:bg-[#303F9F] text-white font-medium text-xs rounded uppercase tracking-wide flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-4 h-4" /> Create Leave Type
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {leavePolicies.map((pol) => (
              <div 
                key={pol.type} 
                className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-3 relative overflow-hidden"
              >
                <div className="w-1.5 absolute top-0 bottom-0 left-0" style={{ backgroundColor: pol.color }} />
                
                <div className="pl-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold font-mono uppercase tracking-wider text-slate-400">
                      TYPE: {pol.type}
                    </span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold text-white" style={{ backgroundColor: pol.color }}>
                      {pol.annualQuota} Days / Year
                    </span>
                  </div>
                  
                  <h4 className="text-sm font-bold text-slate-900 mt-1">{pol.label}</h4>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">{pol.description}</p>
                </div>

                <div className="pl-2 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-600">
                  <span>Notice required: <strong>{pol.minDaysNotice} day(s)</strong></span>
                  <span>Document: <strong>{pol.requiresDocument ? 'Mandatory' : 'Optional'}</strong></span>
                </div>

                {currentUser?.role === 'SUPER_ADMIN' && (
                  <div className="pl-2 pt-2 flex justify-end">
                    <button
                      onClick={() => setEditingPolicy(pol)}
                      className="px-2.5 py-1 bg-slate-100 hover:bg-indigo-50 hover:text-[#3F51B5] text-slate-700 rounded text-[11px] font-semibold transition-all flex items-center gap-1 cursor-pointer"
                    >
                      <Edit3 className="w-3 h-3" /> Edit Policy
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 4: QUOTA & BALANCE ADJUSTER */}
      {activeTab === 'balances' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                Manual Leave Quota Adjuster ({displayedUsers.length} Users)
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Adjust specific employee leave balances for casual, sick, duty, or custom leave types.
              </p>
            </div>

            {isDeptAdmin && (
              <div className="flex items-center gap-1.5 px-3 py-1 bg-indigo-50 border border-indigo-200 rounded-lg text-indigo-900 font-bold text-xs">
                <Lock className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                <span>Managing Department: <strong>{userDeptObj ? `${userDeptObj.name} (${userDeptObj.code})` : userDeptId}</strong></span>
              </div>
            )}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-100 text-slate-600 font-bold uppercase tracking-wider text-[10px] border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3">User</th>
                  <th className="px-4 py-3">Leave Type</th>
                  <th className="px-4 py-3">Total Quota</th>
                  <th className="px-4 py-3">Used Days</th>
                  <th className="px-4 py-3">Remaining Balance</th>
                  <th className="px-4 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {displayedUsers.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-slate-400 font-semibold text-xs">
                      No users found for this department scope.
                    </td>
                  </tr>
                ) : (
                  displayedUsers.map((usr) => {
                    const bal = usr.leaveBalances[selectedLeaveType] || { total: 0, used: 0, pending: 0 };
                    const remaining = Math.max(0, bal.total - bal.used);
                    const isEditingThis = balanceUserId === usr.id;

                  return (
                    <tr key={usr.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-4 py-3 font-semibold text-slate-900">
                        {usr.name} <span className="text-slate-400 font-normal">({usr.departmentId})</span>
                      </td>

                      <td className="px-4 py-3">
                        <select
                          value={selectedLeaveType}
                          onChange={(e) => setSelectedLeaveType(e.target.value)}
                          className="px-2 py-1 bg-white border border-slate-300 rounded text-xs font-medium"
                        >
                          {leavePolicies.map(p => (
                            <option key={p.type} value={p.type}>{p.label}</option>
                          ))}
                        </select>
                      </td>

                      <td className="px-4 py-3 font-bold">
                        {isEditingThis ? (
                          <input
                            type="number"
                            value={editTotalQuota}
                            onChange={(e) => setEditTotalQuota(Number(e.target.value))}
                            className="w-16 px-2 py-1 bg-white border rounded text-xs"
                          />
                        ) : (
                          `${bal.total} Days`
                        )}
                      </td>

                      <td className="px-4 py-3 font-medium text-slate-600">
                        {isEditingThis ? (
                          <input
                            type="number"
                            value={editUsedDays}
                            onChange={(e) => setEditUsedDays(Number(e.target.value))}
                            className="w-16 px-2 py-1 bg-white border rounded text-xs"
                          />
                        ) : (
                          `${bal.used} Days`
                        )}
                      </td>

                      <td className="px-4 py-3 font-bold text-emerald-700">
                        {remaining} Days
                      </td>

                      <td className="px-4 py-3 text-right">
                        {isEditingThis ? (
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => handleSaveBalance(usr.id)}
                              className="p-1.5 text-white bg-emerald-600 rounded hover:bg-emerald-700 cursor-pointer"
                              title="Save"
                            >
                              <Save className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => setBalanceUserId(null)}
                              className="p-1.5 text-slate-600 bg-slate-200 rounded hover:bg-slate-300 cursor-pointer"
                              title="Cancel"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => {
                              setBalanceUserId(usr.id);
                              setEditTotalQuota(bal.total);
                              setEditUsedDays(bal.used);
                            }}
                            className="px-2.5 py-1 text-[11px] font-semibold text-[#3F51B5] bg-indigo-50 border border-indigo-200 hover:bg-indigo-100 rounded transition-colors cursor-pointer"
                          >
                            Adjust Balance
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                }))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 5: PENDING REGISTRATIONS */}
      {activeTab === 'pending' && (
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs space-y-4">
          <div className="border-b border-slate-200 pb-3 flex items-center justify-between">
            <div>
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
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
                      <X className="w-4 h-4" />
                      Reject
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* MODAL 1: ADD USER MODAL */}
      {showAddUserModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-xl border border-slate-200">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <UserPlus className="w-4 h-4 text-[#3F51B5]" />
                Add New User Profile
              </h3>
              <button onClick={() => setShowAddUserModal(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="space-y-3 text-xs">
              {isDeptAdmin && (
                <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-xl text-xs text-indigo-900 flex items-start gap-2.5">
                  <ShieldAlert className="w-4 h-4 text-[#3F51B5] shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold">Department Scope Active</p>
                    <p className="text-[11px] text-indigo-800 leading-tight">
                      As a Department Admin for <strong>{currentUser?.departmentName || currentUser?.departmentId}</strong>, you can only create users within your own department. You cannot add users for other departments.
                    </p>
                  </div>
                </div>
              )}

              <div>
                <label className="font-bold text-slate-700 block mb-1">Full Name *</label>
                <input
                  type="text"
                  required
                  placeholder="Dr. Smita Bannerjee"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full px-3 py-2 border rounded-xl"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Email Address *</label>
                <input
                  type="email"
                  required
                  placeholder="smita.b@institution.edu"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  className="w-full px-3 py-2 border rounded-xl"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    Department {isDeptAdmin && <span className="text-[10px] text-amber-700 font-normal">(Locked to yours)</span>}
                  </label>
                  <select
                    value={isDeptAdmin ? (currentUser?.departmentId || newDeptId) : newDeptId}
                    onChange={(e) => setNewDeptId(e.target.value)}
                    disabled={isDeptAdmin}
                    className={`w-full px-3 py-2 border rounded-xl font-medium ${
                      isDeptAdmin ? 'bg-slate-100 text-slate-600 cursor-not-allowed border-slate-300' : 'bg-white'
                    }`}
                  >
                    {departments.map(d => (
                      <option key={d.id} value={d.id}>{d.name} ({d.id})</option>
                    ))}
                    <option value="ADMIN">General Administration (ADMIN)</option>
                  </select>
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Role</label>
                  <select
                    value={newRole}
                    onChange={(e) => setNewRole(e.target.value as Role)}
                    className="w-full px-3 py-2 border rounded-xl font-medium"
                  >
                    <option value="FACULTY">FACULTY</option>
                    <option value="STAFF">STAFF</option>
                    <option value="HOD">HOD</option>
                    <option value="REGISTRAR">REGISTRAR</option>
                    <option value="ADMIN">ADMIN</option>
                  </select>
                </div>
              </div>

              <div className="pt-3 border-t flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddUserModal(false)}
                  className="px-4 py-2 font-medium text-slate-600 bg-slate-100 rounded-lg cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 font-medium text-white bg-[#3F51B5] hover:bg-[#303F9F] rounded-lg shadow-xs cursor-pointer uppercase tracking-wider"
                >
                  Create User
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: ADD DEPARTMENT MODAL */}
      {showAddDeptModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl border border-slate-200">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Building2 className="w-4 h-4 text-[#3F51B5]" />
                Create New Department
              </h3>
              <button onClick={() => setShowAddDeptModal(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateDepartment} className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Department Code *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. CIVIL or AI_DS"
                  value={deptCode}
                  onChange={(e) => setDeptCode(e.target.value)}
                  className="w-full px-3 py-2 border rounded-xl uppercase"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Department Full Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Civil & Environmental Engineering"
                  value={deptName}
                  onChange={(e) => setDeptName(e.target.value)}
                  className="w-full px-3 py-2 border rounded-xl"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Assign Head of Department (HOD)</label>
                <select
                  value={deptHodId}
                  onChange={(e) => setDeptHodId(e.target.value)}
                  className="w-full px-3 py-2 border rounded-xl font-medium"
                >
                  <option value="">-- Assign Later / No HOD --</option>
                  {allUsers.map(u => (
                    <option key={u.id} value={u.id}>{u.name} ({u.role})</option>
                  ))}
                </select>
              </div>

              <div className="pt-3 border-t flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddDeptModal(false)}
                  className="px-4 py-2 font-medium text-slate-600 bg-slate-100 rounded-lg cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 font-medium text-white bg-[#3F51B5] hover:bg-[#303F9F] rounded-lg shadow-xs cursor-pointer uppercase tracking-wider"
                >
                  Create Department
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: ADD LEAVE TYPE MODAL */}
      {showAddPolicyModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl border border-slate-200">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <FileSpreadsheet className="w-4 h-4 text-[#3F51B5]" />
                Define Custom Leave Type
              </h3>
              <button onClick={() => setShowAddPolicyModal(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateLeaveType} className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Leave Code / Key *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. RESEARCH_LEAVE or SABBATICAL"
                  value={policyCode}
                  onChange={(e) => setPolicyCode(e.target.value)}
                  className="w-full px-3 py-2 border rounded-xl uppercase font-mono"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Leave Type Title / Label *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Academic Research & Sabbatical Leave"
                  value={policyLabel}
                  onChange={(e) => setPolicyLabel(e.target.value)}
                  className="w-full px-3 py-2 border rounded-xl"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Annual Quota (Days)</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={policyQuota}
                    onChange={(e) => setPolicyQuota(Number(e.target.value))}
                    className="w-full px-3 py-2 border rounded-xl"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Notice Required (Days)</label>
                  <input
                    type="number"
                    min="0"
                    value={policyNotice}
                    onChange={(e) => setPolicyNotice(Number(e.target.value))}
                    className="w-full px-3 py-2 border rounded-xl"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="reqDoc"
                  checked={policyReqDoc}
                  onChange={(e) => setPolicyReqDoc(e.target.checked)}
                  className="w-4 h-4 rounded text-[#3F51B5]"
                />
                <label htmlFor="reqDoc" className="text-xs font-semibold text-slate-700">
                  Mandatory Document / Certificate Upload Required
                </label>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Description / Guidelines</label>
                <textarea
                  rows={2}
                  placeholder="Details regarding eligibility and guidelines for this leave category..."
                  value={policyDesc}
                  onChange={(e) => setPolicyDesc(e.target.value)}
                  className="w-full px-3 py-2 border rounded-xl"
                />
              </div>

              <div className="pt-3 border-t flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddPolicyModal(false)}
                  className="px-4 py-2 font-medium text-slate-600 bg-slate-100 rounded-lg cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 font-medium text-white bg-[#3F51B5] hover:bg-[#303F9F] rounded-lg shadow-xs cursor-pointer uppercase tracking-wider"
                >
                  Save Leave Type
                </button>
              </div>
            </form>
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

      {/* Edit Leave Policy Modal */}
      {editingPolicy && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-lg overflow-hidden">
            <div className="bg-[#3F51B5] text-white p-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Edit3 className="w-5 h-5 text-indigo-200" />
                <h3 className="font-bold text-sm">Modify Policy Rules • {editingPolicy.label}</h3>
              </div>
              <button
                type="button"
                onClick={() => setEditingPolicy(null)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSavePolicy} className="p-6 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Leave Display Name</label>
                  <input
                    type="text"
                    required
                    value={editingPolicy.label}
                    onChange={(e) => setEditingPolicy({ ...editingPolicy, label: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Annual Quota (Days)</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={editingPolicy.annualQuota}
                    onChange={(e) => setEditingPolicy({ ...editingPolicy, annualQuota: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Min Notice Required (Days)</label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={editingPolicy.minDaysNotice}
                    onChange={(e) => setEditingPolicy({ ...editingPolicy, minDaysNotice: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Badge Color</label>
                  <input
                    type="color"
                    value={editingPolicy.color}
                    onChange={(e) => setEditingPolicy({ ...editingPolicy, color: e.target.value })}
                    className="w-full h-9 p-1 border border-slate-300 rounded-xl cursor-pointer"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Policy Description</label>
                <textarea
                  rows={2}
                  value={editingPolicy.description}
                  onChange={(e) => setEditingPolicy({ ...editingPolicy, description: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="editAdminPolicyReqDoc"
                  checked={editingPolicy.requiresDocument}
                  onChange={(e) => setEditingPolicy({ ...editingPolicy, requiresDocument: e.target.checked })}
                  className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500 cursor-pointer"
                />
                <label htmlFor="editAdminPolicyReqDoc" className="text-xs font-semibold text-slate-700 cursor-pointer">
                  Require Mandatory Supporting Document Upload
                </label>
              </div>

              <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingPolicy(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#3F51B5] hover:bg-[#303F9F] text-white text-xs font-bold rounded-xl cursor-pointer"
                >
                  Save Policy Modifications
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Department Modal */}
      {editingDept && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-md overflow-hidden">
            <div className="bg-[#3F51B5] text-white p-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Building2 className="w-5 h-5 text-indigo-200" />
                <h3 className="font-bold text-sm">Edit Department • {editingDept.code}</h3>
              </div>
              <button
                type="button"
                onClick={() => setEditingDept(null)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleUpdateDepartment} className="p-6 space-y-4 text-xs">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Department Code</label>
                <input
                  type="text"
                  required
                  value={deptCode}
                  onChange={(e) => setDeptCode(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-mono uppercase focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Department Full Name</label>
                <input
                  type="text"
                  required
                  value={deptName}
                  onChange={(e) => setDeptName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Head of Department (HOD)</label>
                <select
                  value={deptHodId}
                  onChange={(e) => setDeptHodId(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none bg-white"
                >
                  <option value="">-- Assign HOD (Optional) --</option>
                  {allUsers.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name} ({u.role} - {u.email})
                    </option>
                  ))}
                </select>
              </div>

              <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingDept(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#3F51B5] hover:bg-[#303F9F] text-white text-xs font-bold rounded-xl cursor-pointer"
                >
                  Save Department Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
