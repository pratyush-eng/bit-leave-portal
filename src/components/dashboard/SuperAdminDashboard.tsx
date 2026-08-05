import React, { useState, useEffect } from 'react';
import { useLeave } from '../../context/LeaveContext';
import { User, Role, EmailLog } from '../../types';
import { DEFAULT_EMAIL_SETTINGS } from '../../lib/emailTemplates';
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
  Edit3,
  Sliders,
  Image,
  Palette,
  Mail,
  Send,
  Server,
  Eye,
  FileText,
  SendHorizontal,
  Sparkles
} from 'lucide-react';

export const SuperAdminDashboard: React.FC = () => {
  const { 
    currentUser, 
    allUsers, 
    departments,
    leavePolicies,
    auditLogs, 
    emailLogs,
    granularPermissions, 
    updateUserRoleAndPermissions,
    createNewUser,
    updateUserStatus,
    exportDbJson,
    importDbJson,
    resetData,
    systemSettings,
    updateSystemSettings,
    sendTestEmail
  } = useLeave();

  const [activeTab, setActiveTab] = useState<'permissions' | 'user_creation' | 'pending' | 'settings' | 'email' | 'database' | 'audit_logs'>('permissions');
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

  // Branding state
  const [logoUrlInput, setLogoUrlInput] = useState<string>(systemSettings.institutionLogoUrl || '');
  const [institutionNameInput, setInstitutionNameInput] = useState<string>(systemSettings.institutionName || 'BIT Leave Portal');
  const [brandingSaveMsg, setBrandingSaveMsg] = useState<string | null>(null);

  // Email Configuration state
  const initialEmailConfig = systemSettings.emailSettings || DEFAULT_EMAIL_SETTINGS;
  const [emailEnabled, setEmailEnabled] = useState<boolean>(initialEmailConfig.enabled);
  const [smtpHost, setSmtpHost] = useState<string>(initialEmailConfig.smtpHost || 'mail.bitmesra.ac.in');
  const [smtpPort, setSmtpPort] = useState<number>(initialEmailConfig.smtpPort || 587);
  const [smtpUsername, setSmtpUsername] = useState<string>(initialEmailConfig.smtpUsername || 'leave-portal@bitmesra.ac.in');
  const [smtpPassword, setSmtpPassword] = useState<string>(initialEmailConfig.smtpPassword || '••••••••••••');
  const [senderEmail, setSenderEmail] = useState<string>(initialEmailConfig.senderEmail || 'leave-portal@bitmesra.ac.in');
  const [senderName, setSenderName] = useState<string>(initialEmailConfig.senderName || 'BIT Leave Portal System');
  const [encryption, setEncryption] = useState<'TLS' | 'SSL' | 'NONE'>(initialEmailConfig.encryption || 'TLS');
  const [sendCopyAdmin, setSendCopyAdmin] = useState<boolean>(initialEmailConfig.sendCopyAdmin ?? true);
  const [adminCcEmail, setAdminCcEmail] = useState<string>(initialEmailConfig.adminCcEmail || 'admin.leave@bitmesra.ac.in');
  const [emailSettingsSavedMsg, setEmailSettingsSavedMsg] = useState<string | null>(null);

  // Test Email state
  const [testEmailAddr, setTestEmailAddr] = useState<string>(currentUser.email || 'pratyush@bitmesra.ac.in');
  const [testEmailName, setTestEmailName] = useState<string>(currentUser.name || 'Super Admin');
  const [isSendingTestEmail, setIsSendingTestEmail] = useState<boolean>(false);
  const [testEmailResult, setTestEmailResult] = useState<{ success: boolean; message: string } | null>(null);

  // Email Log Modal state
  const [selectedEmailLog, setSelectedEmailLog] = useState<EmailLog | null>(null);
  const [emailLogSearch, setEmailLogSearch] = useState<string>('');

  useEffect(() => {
    if (systemSettings.institutionLogoUrl) {
      setLogoUrlInput(systemSettings.institutionLogoUrl);
    }
    if (systemSettings.institutionName) {
      setInstitutionNameInput(systemSettings.institutionName);
    }
    if (systemSettings.emailSettings) {
      setEmailEnabled(systemSettings.emailSettings.enabled);
      setSmtpHost(systemSettings.emailSettings.smtpHost);
      setSmtpPort(systemSettings.emailSettings.smtpPort);
      setSmtpUsername(systemSettings.emailSettings.smtpUsername);
      if (systemSettings.emailSettings.smtpPassword) setSmtpPassword(systemSettings.emailSettings.smtpPassword);
      setSenderEmail(systemSettings.emailSettings.senderEmail);
      setSenderName(systemSettings.emailSettings.senderName);
      setEncryption(systemSettings.emailSettings.encryption);
      setSendCopyAdmin(systemSettings.emailSettings.sendCopyAdmin);
      if (systemSettings.emailSettings.adminCcEmail) setAdminCcEmail(systemSettings.emailSettings.adminCcEmail);
    }
  }, [systemSettings]);

  const handleSaveEmailSettings = () => {
    updateSystemSettings({
      emailSettings: {
        enabled: emailEnabled,
        smtpHost,
        smtpPort: Number(smtpPort),
        smtpUsername,
        smtpPassword,
        senderEmail,
        senderName,
        encryption,
        sendCopyAdmin,
        adminCcEmail
      }
    });
    setEmailSettingsSavedMsg('SMTP gateway & automated email dispatch settings saved successfully!');
    setTimeout(() => setEmailSettingsSavedMsg(null), 4000);
  };

  const handleSendTestEmail = async () => {
    if (!testEmailAddr.trim()) return;
    setIsSendingTestEmail(true);
    setTestEmailResult(null);
    try {
      const res = await sendTestEmail(testEmailAddr.trim(), testEmailName.trim() || 'User');
      setTestEmailResult(res);
    } catch (err: any) {
      setTestEmailResult({
        success: false,
        message: err.message || 'Failed to dispatch test email.'
      });
    } finally {
      setIsSendingTestEmail(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      alert('File size exceeds 5MB limit. Please select a smaller logo image.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        // Resize logo to max 256x256 to ensure light Base64 size (<20KB)
        const maxDim = 256;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxDim) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          }
        } else {
          if (height > maxDim) {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const compressedDataUrl = canvas.toDataURL('image/png');
          setLogoUrlInput(compressedDataUrl);
        } else {
          setLogoUrlInput(event.target?.result as string);
        }
      };
      img.onerror = () => {
        setLogoUrlInput(event.target?.result as string);
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleSaveBranding = () => {
    updateSystemSettings({
      institutionLogoUrl: logoUrlInput.trim(),
      institutionName: institutionNameInput.trim() || 'BIT Leave Portal'
    });
    setBrandingSaveMsg('Institution branding & logo updated successfully!');
    setTimeout(() => setBrandingSaveMsg(null), 4000);
  };

  const handleResetBranding = () => {
    setLogoUrlInput('');
    setInstitutionNameInput('BIT Leave Portal');
    updateSystemSettings({
      institutionLogoUrl: '',
      institutionName: 'BIT Leave Portal'
    });
    setBrandingSaveMsg('Reset branding to default settings.');
    setTimeout(() => setBrandingSaveMsg(null), 4000);
  };

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
          onClick={() => setActiveTab('settings')}
          className={`px-4 py-2 rounded-lg text-xs font-medium uppercase tracking-wide transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === 'settings'
              ? 'bg-[#3F51B5] text-white shadow-sm'
              : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
          }`}
        >
          <Sliders className="w-4 h-4" />
          System Privileges & Toggles
        </button>

        <button
          onClick={() => setActiveTab('email')}
          className={`px-4 py-2 rounded-lg text-xs font-medium uppercase tracking-wide transition-all flex items-center gap-2 cursor-pointer relative ${
            activeTab === 'email'
              ? 'bg-[#3F51B5] text-white shadow-sm'
              : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
          }`}
        >
          <Mail className="w-4 h-4" />
          Email Gateway & Logs
          {emailLogs.length > 0 && (
            <span className="ml-1 px-1.5 py-0.5 rounded-full bg-indigo-500 text-white text-[10px] font-bold">
              {emailLogs.length}
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

      {/* Tab: System Privileges & Feature Toggles */}
      {activeTab === 'settings' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs p-6 space-y-6">
          <div className="border-b border-slate-200 pb-4">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Sliders className="w-5 h-5 text-[#3F51B5]" />
              Institutional System Controls & Feature Privileges
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Super Admin privilege controls to enable or disable public demo accounts, role switcher guides, and workflow simulation elements across the portal.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Control 1: Demo Accounts Quick Login */}
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-4 hover:border-indigo-200 transition-colors">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center font-bold">
                    <Users className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-900">Demo Accounts & Quick Login Cards</h4>
                    <p className="text-[11px] text-slate-500 mt-0.5">Sign-in Screen Autofill Cards</p>
                  </div>
                </div>

                <span className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider ${
                  systemSettings.enableDemoAccounts 
                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' 
                    : 'bg-rose-100 text-rose-800 border border-rose-200'
                }`}>
                  {systemSettings.enableDemoAccounts ? 'Enabled' : 'Disabled'}
                </span>
              </div>

              <p className="text-xs text-slate-600 leading-relaxed">
                When enabled, the sign-in screen renders interactive demo account cards (Faculty, HOD, Registrar, Admin, Super Admin) allowing one-click credential autofill for testing. Disabling this enforces standard email/password authentication.
              </p>

              <div className="pt-3 flex items-center justify-between border-t border-slate-200">
                <span className="text-xs font-semibold text-slate-700">Privilege Status:</span>
                <button
                  onClick={() => updateSystemSettings({ enableDemoAccounts: !systemSettings.enableDemoAccounts })}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer shadow-2xs active:scale-95 ${
                    systemSettings.enableDemoAccounts
                      ? 'bg-rose-600 hover:bg-rose-700 text-white'
                      : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                  }`}
                >
                  {systemSettings.enableDemoAccounts ? (
                    <>
                      <XCircle className="w-4 h-4" /> Disable Demo Accounts
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" /> Enable Demo Accounts
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Control 2: Interactive Role Switcher Guide */}
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-4 hover:border-indigo-200 transition-colors">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold">
                    <UserCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-900">Role Switcher & Workflow Guide</h4>
                    <p className="text-[11px] text-slate-500 mt-0.5">Top Header & Sidebar Persona Switcher</p>
                  </div>
                </div>

                <span className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider ${
                  systemSettings.enableRoleSwitcher 
                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' 
                    : 'bg-rose-100 text-rose-800 border border-rose-200'
                }`}>
                  {systemSettings.enableRoleSwitcher ? 'Enabled' : 'Disabled'}
                </span>
              </div>

              <p className="text-xs text-slate-600 leading-relaxed">
                When enabled, a quick Role Switcher badge appears in the main header bar and drawer navigation, enabling seamless user persona toggles. Disabling this removes the role switcher shortcut for non-super admin users.
              </p>

              <div className="pt-3 flex items-center justify-between border-t border-slate-200">
                <span className="text-xs font-semibold text-slate-700">Privilege Status:</span>
                <button
                  onClick={() => updateSystemSettings({ enableRoleSwitcher: !systemSettings.enableRoleSwitcher })}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer shadow-2xs active:scale-95 ${
                    systemSettings.enableRoleSwitcher
                      ? 'bg-rose-600 hover:bg-rose-700 text-white'
                      : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                  }`}
                >
                  {systemSettings.enableRoleSwitcher ? (
                    <>
                      <XCircle className="w-4 h-4" /> Disable Role Switcher
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" /> Enable Role Switcher
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Control 3: Institution Branding & Custom Logo */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-5 hover:border-indigo-200 transition-colors">
            <div className="flex items-start justify-between gap-3 border-b border-slate-200 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-100 text-[#3F51B5] flex items-center justify-center font-bold">
                  <Palette className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900">Portal Branding & Custom Logo</h4>
                  <p className="text-[11px] text-slate-500 mt-0.5">Customize Institution Name and Portal Icon / Logo across Login, Navigation & Header</p>
                </div>
              </div>
            </div>

            {brandingSaveMsg && (
              <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-3 rounded-xl text-xs font-semibold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                {brandingSaveMsg}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Institution Portal Name
                  </label>
                  <input
                    type="text"
                    value={institutionNameInput}
                    onChange={(e) => setInstitutionNameInput(e.target.value)}
                    placeholder="e.g. BIT Leave Portal"
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Custom Logo Image URL or Data URI
                  </label>
                  <input
                    type="text"
                    value={logoUrlInput}
                    onChange={(e) => setLogoUrlInput(e.target.value)}
                    placeholder="e.g. https://example.com/logo.png or upload image below"
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Upload Logo File (PNG / SVG / JPG)
                  </label>
                  <label className="flex items-center justify-center gap-2 px-4 py-2.5 bg-white border border-dashed border-slate-300 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-100 hover:border-slate-400 cursor-pointer transition-all">
                    <Upload className="w-4 h-4 text-slate-500" />
                    Upload Image File
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </label>
                  <p className="text-[10px] text-slate-400 mt-1">Recommended square dimension (e.g. 128x128px or 256x256px). Max 2MB.</p>
                </div>
              </div>

              {/* Live Preview Card */}
              <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-col justify-between space-y-4">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-3">Live Portal Branding Preview</p>
                  
                  {/* Login Header Mockup */}
                  <div className="bg-[#3F51B5] text-white p-4 rounded-xl flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-white/20 flex items-center justify-center font-bold text-white overflow-hidden shrink-0 border border-white/20">
                      {logoUrlInput ? (
                        <img 
                          src={logoUrlInput} 
                          alt="Preview" 
                          className="w-full h-full object-cover" 
                          onError={(e) => {
                            (e.target as HTMLElement).style.display = 'none';
                          }}
                        />
                      ) : (
                        <Image className="w-5 h-5 text-white" />
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-bold leading-tight">{institutionNameInput || 'BIT Leave Portal'}</p>
                      <p className="text-[10px] text-blue-100 opacity-90">Fully manage leave portal</p>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={handleResetBranding}
                    className="px-3 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-all cursor-pointer"
                  >
                    Reset Default
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveBranding}
                    className="px-4 py-2 bg-[#3F51B5] hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs active:scale-95 cursor-pointer flex items-center gap-1.5"
                  >
                    <CheckCircle2 className="w-4 h-4" /> Save Branding
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab: Email Gateway & Automated Workflow Settings */}
      {activeTab === 'email' && (
        <div className="space-y-6">
          
          {/* Workflow Explanation Banner */}
          <div className="bg-gradient-to-r from-indigo-900 via-indigo-800 to-blue-900 rounded-2xl p-6 text-white shadow-md space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center font-bold border border-white/20">
                  <Mail className="w-6 h-6 text-indigo-200" />
                </div>
                <div>
                  <h3 className="text-lg font-bold">Automated Email Notification Routing Workflow</h3>
                  <p className="text-xs text-indigo-200">
                    Configured for BIT Leave Portal multi-tier approval dispatching
                  </p>
                </div>
              </div>
              <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                emailEnabled ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/30' : 'bg-amber-500/20 text-amber-300 border border-amber-400/30'
              }`}>
                {emailEnabled ? 'Gateway Active (SMTP Live)' : 'Simulated Sandbox Mode'}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
              <div className="bg-white/10 backdrop-blur-xs rounded-xl p-4 border border-white/15 space-y-2">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-indigo-200">
                  <span className="w-5 h-5 rounded-full bg-indigo-500/40 flex items-center justify-center text-[10px] text-white">1</span>
                  Staff → HoD Email
                </div>
                <p className="text-xs text-indigo-100/90 leading-relaxed">
                  When any staff member submits a leave application, an immediate notification email is dispatched directly to the individual Department HoD (<code className="text-amber-200 font-mono text-[11px]">hodUser.email</code>).
                </p>
              </div>

              <div className="bg-white/10 backdrop-blur-xs rounded-xl p-4 border border-white/15 space-y-2">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-indigo-200">
                  <span className="w-5 h-5 rounded-full bg-indigo-500/40 flex items-center justify-center text-[10px] text-white">2</span>
                  HoD → Registrar / Staff
                </div>
                <p className="text-xs text-indigo-100/90 leading-relaxed">
                  When HoD endorses: Email is forwarded to the Registrar for final approval. If rejected by HoD: An email is sent back to the applicant notifying rejection reasons.
                </p>
              </div>

              <div className="bg-white/10 backdrop-blur-xs rounded-xl p-4 border border-white/15 space-y-2">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-indigo-200">
                  <span className="w-5 h-5 rounded-full bg-indigo-500/40 flex items-center justify-center text-[10px] text-white">3</span>
                  Registrar → Staff Final
                </div>
                <p className="text-xs text-indigo-100/90 leading-relaxed">
                  Upon Registrar sanction or rejection: An official Sanction Order email is automatically sent back to the applicant staff member confirming leave status.
                </p>
              </div>
            </div>
          </div>

          {/* Configuration Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* SMTP Server Configuration Form */}
            <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-2xs p-6 space-y-6">
              <div className="border-b border-slate-200 pb-4 flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                    <Server className="w-5 h-5 text-[#3F51B5]" />
                    Institutional SMTP Email Gateway Settings
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Configure institutional mail server credentials (e.g. mail.bitmesra.ac.in / Gmail / SendGrid)
                  </p>
                </div>
              </div>

              {emailSettingsSavedMsg && (
                <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-3.5 rounded-xl text-xs font-semibold flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  {emailSettingsSavedMsg}
                </div>
              )}

              {/* Master Switch */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-slate-900">Enable Automated Email Notifications</h4>
                  <p className="text-[11px] text-slate-500">Master switch for background email dispatching</p>
                </div>
                <button
                  type="button"
                  onClick={() => setEmailEnabled(!emailEnabled)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer ${
                    emailEnabled ? 'bg-indigo-600' : 'bg-slate-300'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      emailEnabled ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    SMTP Host Server
                  </label>
                  <input
                    type="text"
                    value={smtpHost}
                    onChange={(e) => setSmtpHost(e.target.value)}
                    placeholder="mail.bitmesra.ac.in"
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    SMTP Port
                  </label>
                  <input
                    type="number"
                    value={smtpPort}
                    onChange={(e) => setSmtpPort(Number(e.target.value))}
                    placeholder="587"
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Encryption Protocol
                  </label>
                  <select
                    value={encryption}
                    onChange={(e) => setEncryption(e.target.value as any)}
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="TLS">TLS (Recommended - Port 587)</option>
                    <option value="SSL">SSL (Port 465)</option>
                    <option value="NONE">None (Plaintext - Port 25)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Sender System Email
                  </label>
                  <input
                    type="email"
                    value={senderEmail}
                    onChange={(e) => setSenderEmail(e.target.value)}
                    placeholder="leave-portal@bitmesra.ac.in"
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Sender Display Name
                  </label>
                  <input
                    type="text"
                    value={senderName}
                    onChange={(e) => setSenderName(e.target.value)}
                    placeholder="BIT Leave Portal System"
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    SMTP Username / Account
                  </label>
                  <input
                    type="text"
                    value={smtpUsername}
                    onChange={(e) => setSmtpUsername(e.target.value)}
                    placeholder="leave-portal@bitmesra.ac.in"
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    SMTP Password
                  </label>
                  <input
                    type="password"
                    value={smtpPassword}
                    onChange={(e) => setSmtpPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Admin CC Audit Email
                  </label>
                  <input
                    type="email"
                    value={adminCcEmail}
                    onChange={(e) => setAdminCcEmail(e.target.value)}
                    placeholder="admin.leave@bitmesra.ac.in"
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-slate-200 flex justify-end">
                <button
                  type="button"
                  onClick={handleSaveEmailSettings}
                  className="px-5 py-2.5 bg-[#3F51B5] hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs active:scale-95 cursor-pointer flex items-center gap-2"
                >
                  <CheckCircle2 className="w-4 h-4" /> Save Email Settings
                </button>
              </div>
            </div>

            {/* Send Test Email Card */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs p-6 space-y-5 flex flex-col justify-between">
              <div className="space-y-4">
                <div className="border-b border-slate-200 pb-3">
                  <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <Send className="w-4 h-4 text-emerald-600" />
                    Send Test Email Verification
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Test instant SMTP connection & template rendering
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Recipient Email Address
                  </label>
                  <input
                    type="email"
                    value={testEmailAddr}
                    onChange={(e) => setTestEmailAddr(e.target.value)}
                    placeholder="recipient@bitmesra.ac.in"
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Recipient Display Name
                  </label>
                  <input
                    type="text"
                    value={testEmailName}
                    onChange={(e) => setTestEmailName(e.target.value)}
                    placeholder="Dr. Pratyush Kumar"
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <button
                  type="button"
                  onClick={handleSendTestEmail}
                  disabled={isSendingTestEmail}
                  className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs active:scale-95 cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isSendingTestEmail ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" /> Dispatching Test Email...
                    </>
                  ) : (
                    <>
                      <SendHorizontal className="w-4 h-4" /> Dispatch Test Email
                    </>
                  )}
                </button>

                {testEmailResult && (
                  <div className={`p-3.5 rounded-xl border text-xs font-medium space-y-1 ${
                    testEmailResult.success 
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-800' 
                      : 'bg-rose-50 border-rose-200 text-rose-800'
                  }`}>
                    <div className="flex items-center gap-1.5 font-bold">
                      {testEmailResult.success ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      ) : (
                        <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                      )}
                      {testEmailResult.success ? 'Email Dispatched Successfully' : 'Dispatch Failure'}
                    </div>
                    <p className="text-[11px] leading-relaxed">{testEmailResult.message}</p>
                  </div>
                )}
              </div>

              <div className="bg-slate-50 rounded-xl p-3 border border-slate-200 text-[11px] text-slate-500 space-y-1">
                <p className="font-bold text-slate-700 flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5 text-amber-500" /> Active System Status:
                </p>
                <p>SMTP Gateway: <span className="font-mono text-slate-800">{smtpHost}:{smtpPort}</span></p>
                <p>Mode: <span className="font-bold text-indigo-700">{emailEnabled ? 'LIVE TRANSMISSION' : 'SANDBOX LOGGING'}</span></p>
              </div>
            </div>
          </div>

          {/* Email Logs Section */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden space-y-3 p-5">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 border-b border-slate-200 pb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Mail className="w-4 h-4 text-[#3F51B5]" />
                  System Email Delivery Audit Trail ({emailLogs.length})
                </h3>
                <p className="text-xs text-slate-500">Live record of all email notifications generated by staff leave requests</p>
              </div>

              <div className="relative min-w-[260px]">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Filter emails by recipient or event..."
                  value={emailLogSearch}
                  onChange={(e) => setEmailLogSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 bg-white border border-slate-300 rounded-xl text-xs font-medium"
                />
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-700">
                <thead className="bg-slate-100 text-slate-600 font-bold uppercase tracking-wider text-[10px] border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3">Timestamp</th>
                    <th className="px-4 py-3">Trigger Event</th>
                    <th className="px-4 py-3">Recipient</th>
                    <th className="px-4 py-3">Role</th>
                    <th className="px-4 py-3">Subject</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {emailLogs
                    .filter(log => {
                      if (!emailLogSearch) return true;
                      const q = emailLogSearch.toLowerCase();
                      return log.recipientEmail.toLowerCase().includes(q) ||
                             log.recipientName.toLowerCase().includes(q) ||
                             log.subject.toLowerCase().includes(q) ||
                             log.triggerEvent.toLowerCase().includes(q);
                    })
                    .map((log) => {
                      const getEventBadge = (evt: string) => {
                        switch (evt) {
                          case 'LEAVE_SUBMITTED':
                            return <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 text-[10px] font-bold border border-blue-200">SUBMITTED (To HoD)</span>;
                          case 'HOD_RECOMMENDED':
                            return <span className="px-2 py-0.5 rounded-full bg-purple-100 text-purple-800 text-[10px] font-bold border border-purple-200">ENDORSED (To Reg)</span>;
                          case 'HOD_REJECTED':
                            return <span className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 text-[10px] font-bold border border-rose-200">HOD REJECTED</span>;
                          case 'REGISTRAR_SANCTIONED':
                            return <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold border border-emerald-200">SANCTIONED ORDER</span>;
                          case 'REGISTRAR_REJECTED':
                            return <span className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 text-[10px] font-bold border border-rose-200">REGISTRAR REJECTED</span>;
                          default:
                            return <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-800 text-[10px] font-bold border border-slate-200">TEST VERIFICATION</span>;
                        }
                      };

                      return (
                        <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                          <td className="px-4 py-3 font-mono text-[11px] text-slate-500 whitespace-nowrap">{log.timestamp}</td>
                          <td className="px-4 py-3 whitespace-nowrap">{getEventBadge(log.triggerEvent)}</td>
                          <td className="px-4 py-3">
                            <div className="font-bold text-slate-900">{log.recipientName}</div>
                            <div className="text-[11px] text-slate-500 font-mono">{log.recipientEmail}</div>
                          </td>
                          <td className="px-4 py-3">
                            <MaterialChip label={log.recipientRole} variant="role" role={log.recipientRole} />
                          </td>
                          <td className="px-4 py-3 font-medium text-slate-800 max-w-xs truncate">{log.subject}</td>
                          <td className="px-4 py-3">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                              log.status === 'SENT' 
                                ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' 
                                : 'bg-blue-100 text-blue-800 border border-blue-200'
                            }`}>
                              {log.status}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <button
                              type="button"
                              onClick={() => setSelectedEmailLog(log)}
                              className="px-2.5 py-1 bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 text-slate-700 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ml-auto"
                            >
                              <Eye className="w-3.5 h-3.5" /> Inspect HTML
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Render Email Log HTML Preview Modal */}
      {selectedEmailLog && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-3xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="bg-[#3F51B5] text-white p-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Mail className="w-5 h-5 text-indigo-200" />
                <h3 className="font-bold text-sm">Dispatched Email HTML Inspector • {selectedEmailLog.id}</h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedEmailLog(null)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <div className="p-4 bg-slate-50 border-b border-slate-200 text-xs space-y-1">
              <div><span className="font-bold text-slate-700">Subject:</span> <span className="font-semibold text-slate-900">{selectedEmailLog.subject}</span></div>
              <div><span className="font-bold text-slate-700">To:</span> {selectedEmailLog.recipientName} &lt;<span className="font-mono text-indigo-700">{selectedEmailLog.recipientEmail}</span>&gt;</div>
              <div><span className="font-bold text-slate-700">Sent At:</span> {selectedEmailLog.timestamp} | <span className="font-bold text-slate-700">Status:</span> {selectedEmailLog.status}</div>
            </div>

            <div className="p-6 overflow-y-auto flex-1 bg-slate-100 flex justify-center">
              <div 
                className="bg-white rounded-xl shadow-md p-6 max-w-2xl w-full text-slate-900 font-sans border border-slate-200"
                dangerouslySetInnerHTML={{ __html: selectedEmailLog.bodyHtml }}
              />
            </div>

            <div className="p-3 bg-slate-50 border-t border-slate-200 flex items-center justify-end">
              <button
                type="button"
                onClick={() => setSelectedEmailLog(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold rounded-xl cursor-pointer"
              >
                Close Preview
              </button>
            </div>
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
