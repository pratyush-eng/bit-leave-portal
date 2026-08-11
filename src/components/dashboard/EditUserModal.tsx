import React, { useState } from 'react';
import { User, Role, DepartmentId } from '../../types';
import { useLeave } from '../../context/LeaveContext';
import { X, Save, Trash2, ShieldAlert, Mail, User as UserIcon, Building2, Briefcase, Phone, Hash, KeyRound, Eye, EyeOff } from 'lucide-react';

interface EditUserModalProps {
  user: User;
  onClose: () => void;
  onDeleteSuccess?: () => void;
}

export const EditUserModal: React.FC<EditUserModalProps> = ({
  user,
  onClose,
  onDeleteSuccess
}) => {
  const { departments, updateUser, deleteUser, currentUser } = useLeave();
  const isProtectedSuperAdmin = user.role === 'SUPER_ADMIN' && currentUser?.role !== 'SUPER_ADMIN';

  const [name, setName] = useState(user.name);
  const [email, setEmail] = useState(user.email);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [role, setRole] = useState<Role>(user.role);
  const [designation, setDesignation] = useState(user.designation);
  const [departmentId, setDepartmentId] = useState<DepartmentId>(user.departmentId);
  const [employeeCode, setEmployeeCode] = useState(user.employeeCode);
  const [phone, setPhone] = useState(user.phone || '');
  const [accountStatus, setAccountStatus] = useState<'ACTIVE' | 'PENDING_APPROVAL' | 'REJECTED'>(
    user.accountStatus || 'ACTIVE'
  );
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (isProtectedSuperAdmin) {
      setErrorMsg("Department Admins cannot modify Institutional Super Admin accounts.");
      return;
    }

    const selectedDept = departments.find(d => d.id === departmentId);
    const departmentName = selectedDept ? selectedDept.name : user.departmentName;

    const updatedData: Partial<User> = {
      name: name.trim(),
      email: email.trim(),
      role,
      designation: designation.trim(),
      departmentId,
      departmentName,
      employeeCode: employeeCode.trim(),
      phone: phone.trim(),
      accountStatus
    };

    if (password.trim()) {
      updatedData.password = password.trim();
    }

    const result = updateUser(user.id, updatedData);

    if (!result.success) {
      setErrorMsg(result.message);
      return;
    }

    onClose();
  };

  const handleDelete = (e?: React.MouseEvent) => {
    if (e) e.preventDefault();
    if (isProtectedSuperAdmin) {
      setErrorMsg("Department Admins cannot delete Institutional Super Admin accounts.");
      setShowConfirmDelete(false);
      return;
    }
    const result = deleteUser(user.id);
    if (!result.success) {
      setErrorMsg(result.message);
      setShowConfirmDelete(false);
      return;
    }
    if (onDeleteSuccess) onDeleteSuccess();
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-lg w-full shadow-xl border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="bg-slate-900 text-white p-5 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider bg-slate-800 text-slate-300 px-2 py-0.5 rounded">
              Account Management
            </span>
            <h3 className="text-lg font-bold mt-1">Modify Registered User</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSave} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
          {isProtectedSuperAdmin && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-2.5 text-amber-900 text-xs font-medium">
              <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">Super Admin Account Protected</p>
                <p>As a Department Admin, you cannot modify or delete Institutional Super Admin accounts.</p>
              </div>
            </div>
          )}

          {errorMsg && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-2.5 text-rose-800 text-xs">
              <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">Modification Failed</p>
                <p>{errorMsg}</p>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Full Name *
              </label>
              <div className="relative">
                <UserIcon className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:outline-hidden"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Unique Email Address *
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:outline-hidden font-mono"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Department * {currentUser?.role === 'ADMIN' && currentUser?.role !== 'SUPER_ADMIN' && <span className="text-[10px] text-amber-700 font-normal lowercase">(locked)</span>}
              </label>
              <div className="relative">
                <Building2 className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <select
                  value={departmentId}
                  onChange={(e) => setDepartmentId(e.target.value as DepartmentId)}
                  disabled={currentUser?.role === 'ADMIN' && currentUser?.role !== 'SUPER_ADMIN'}
                  className={`w-full pl-9 pr-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-blue-600 focus:outline-hidden font-medium ${
                    currentUser?.role === 'ADMIN' && currentUser?.role !== 'SUPER_ADMIN'
                      ? 'bg-slate-100 text-slate-600 cursor-not-allowed border-slate-300'
                      : 'bg-white border-slate-300'
                  }`}
                >
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name} ({d.id})
                    </option>
                  ))}
                  <option value="ADMIN">General Administration (ADMIN)</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Role / Access * {currentUser?.role === 'ADMIN' && currentUser?.role !== 'SUPER_ADMIN' && <span className="text-[10px] text-amber-700 font-normal lowercase">(restricted)</span>}
              </label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as Role)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:outline-hidden font-bold"
              >
                {currentUser?.role === 'ADMIN' && currentUser?.role !== 'SUPER_ADMIN' ? (
                  <>
                    <option value="FACULTY">FACULTY (Teaching Faculty)</option>
                    <option value="STAFF">STAFF (Non-Teaching Staff)</option>
                    <option value="HOD">HOD (Head of Dept)</option>
                  </>
                ) : (
                  <>
                    <option value="FACULTY">FACULTY (Teaching Faculty)</option>
                    <option value="STAFF">STAFF (Non-Teaching Staff)</option>
                    <option value="HOD">HOD (Head of Dept)</option>
                    <option value="REGISTRAR">REGISTRAR</option>
                    <option value="ADMIN">ADMIN (Department Admin)</option>
                    <option value="SUPER_ADMIN">SUPER_ADMIN (System Admin)</option>
                  </>
                )}
              </select>
              {currentUser?.role === 'ADMIN' && currentUser?.role !== 'SUPER_ADMIN' && (
                <p className="text-[10px] text-slate-500 font-medium mt-1">
                  Department Admins can assign roles as Faculty, Staff, and HOD of their respective department only.
                </p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Designation *
              </label>
              <div className="relative">
                <Briefcase className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="text"
                  required
                  value={designation}
                  onChange={(e) => setDesignation(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:outline-hidden"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Employee Code *
              </label>
              <div className="relative">
                <Hash className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="text"
                  required
                  value={employeeCode}
                  onChange={(e) => setEmployeeCode(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:outline-hidden font-mono"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Phone Number
              </label>
              <div className="relative">
                <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="e.g. +91 9876543210"
                  className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:outline-hidden"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Account Status *
              </label>
              <select
                value={accountStatus}
                onChange={(e) => setAccountStatus(e.target.value as 'ACTIVE' | 'PENDING_APPROVAL' | 'REJECTED')}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:outline-hidden font-bold"
              >
                <option value="ACTIVE">ACTIVE (Granted Access)</option>
                <option value="PENDING_APPROVAL">PENDING_APPROVAL (Awaiting Validation)</option>
                <option value="REJECTED">REJECTED / SUSPENDED</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Reset / Change Account Password
            </label>
            <div className="relative">
              <KeyRound className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter new password to reset (leave blank to keep current)"
                className="w-full pl-9 pr-10 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:outline-hidden font-mono"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                title={showPassword ? "Hide password" : "Show new password"}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              🔒 Existing passwords are hidden for security & privacy. Enter a new password above if you need to reset or update this user's login password.
            </p>
          </div>

          {/* Delete Confirmation or Normal Buttons */}
          <div className="border-t border-slate-200 pt-4 mt-6 flex items-center justify-between">
            {showConfirmDelete ? (
              <div className="flex items-center gap-2 w-full justify-between bg-rose-50 p-3 rounded-xl border border-rose-200">
                <span className="text-xs font-bold text-rose-800">
                  Confirm delete account?
                </span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setShowConfirmDelete(false)}
                    className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleDelete}
                    disabled={user.id === currentUser.id || isProtectedSuperAdmin}
                    className="px-3 py-1.5 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-lg cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Yes, Delete Forever
                  </button>
                </div>
              </div>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => setShowConfirmDelete(true)}
                  disabled={user.id === currentUser.id || isProtectedSuperAdmin}
                  className="px-3 py-2 text-xs font-bold text-rose-600 hover:bg-rose-50 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                  title={user.id === currentUser.id ? 'Cannot delete your own active account' : isProtectedSuperAdmin ? 'Super Admin accounts cannot be deleted by Department Admins' : 'Delete User'}
                >
                  <Trash2 className="w-4 h-4" />
                  Delete User
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-2 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isProtectedSuperAdmin}
                    className="px-5 py-2 text-xs font-bold text-white bg-[#3F51B5] hover:bg-indigo-700 rounded-lg shadow-xs transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Save className="w-4 h-4" />
                    Save Changes
                  </button>
                </div>
              </>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};
