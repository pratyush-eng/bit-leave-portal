import React, { useState, useEffect, useRef } from 'react';
import { useLeave } from '../../context/LeaveContext';
import { Role } from '../../types';
import { 
  Building2, 
  ShieldCheck, 
  UserCheck, 
  LogIn, 
  Sparkles, 
  ArrowRight, 
  KeyRound, 
  Mail, 
  CheckCircle2,
  Lock,
  GraduationCap,
  Briefcase,
  UserPlus,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  Database
} from 'lucide-react';

export const LoginPage: React.FC = () => {
  const { login, registerUser, departments, systemSettings } = useLeave();
  
  const [activeTab, setActiveTab] = useState<'login' | 'register'>('login');
  const emailInputRef = useRef<HTMLInputElement>(null);
  
  // Login State
  const [email, setEmail] = useState<string>(() => 
    systemSettings.enableDemoAccounts ? 'rajesh.kumar@institution.edu' : ''
  );
  const [password, setPassword] = useState<string>(() => 
    systemSettings.enableDemoAccounts ? 'password123' : ''
  );
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [showDemoAccounts, setShowDemoAccounts] = useState<boolean>(false);

  useEffect(() => {
    if (!systemSettings.enableDemoAccounts) {
      setEmail('');
      setPassword('');
      if (activeTab === 'login') {
        setTimeout(() => {
          emailInputRef.current?.focus();
        }, 50);
      }
    }
  }, [systemSettings.enableDemoAccounts]);

  useEffect(() => {
    if (activeTab === 'login') {
      setTimeout(() => {
        emailInputRef.current?.focus();
      }, 50);
    }
  }, [activeTab]);

  // Registration State
  const [regName, setRegName] = useState<string>('');
  const [regEmail, setRegEmail] = useState<string>('');
  const [regPassword, setRegPassword] = useState<string>('');
  const [regRole, setRegRole] = useState<'FACULTY' | 'STAFF'>('FACULTY');
  const [regDeptId, setRegDeptId] = useState<string>('CSE');
  const [regDesignation, setRegDesignation] = useState<string>('');
  const [regEmpCode, setRegEmpCode] = useState<string>('');
  const [regPhone, setRegPhone] = useState<string>('');
  const [regSuccessMsg, setRegSuccessMsg] = useState<string | null>(null);
  const [regErrorMsg, setRegErrorMsg] = useState<string | null>(null);

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    if (!email || !password) {
      setErrorMsg('Please enter both email address and password.');
      return;
    }
    const result = login(email, password);
    if (!result.success) {
      setErrorMsg(result.message || 'Invalid user credentials. Please check your institutional account.');
    }
  };

  const handleRegisterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setRegSuccessMsg(null);
    setRegErrorMsg(null);

    if (!regName || !regEmail || !regPassword) {
      setRegErrorMsg('Name, Email, and Password are required.');
      return;
    }

    const selectedDept = departments.find(d => d.id === regDeptId);
    const departmentName = selectedDept ? selectedDept.name : 'Computer Science & Engineering';

    const result = registerUser({
      name: regName,
      email: regEmail,
      password: regPassword,
      role: regRole as Role,
      designation: regDesignation || (regRole === 'FACULTY' ? 'Assistant Professor' : 'Technical Officer'),
      departmentId: regDeptId,
      departmentName,
      employeeCode: regEmpCode || `REG-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`,
      joiningDate: new Date().toISOString().split('T')[0],
      phone: regPhone || '+91 98765 00000',
      avatarUrl: `https://ui-avatars.com/api/?name=${encodeURIComponent(regName)}&background=1e3a8a&color=fff`
    });

    if (result.success) {
      setRegSuccessMsg(result.message);
      setRegName('');
      setRegEmail('');
      setRegPassword('');
      setRegDesignation('');
      setRegEmpCode('');
      setRegPhone('');
    } else {
      setRegErrorMsg(result.message);
    }
  };

  const quickRoles = [
    {
      role: 'FACULTY',
      title: 'Faculty / Staff Applicant',
      name: 'Prof. Rajesh Kumar',
      email: 'rajesh.kumar@institution.edu',
      dept: 'Computer Science & Engg.',
      color: 'bg-blue-50 border-blue-200 text-blue-900 hover:border-blue-400',
      badgeBg: 'bg-blue-600 text-white'
    },
    {
      role: 'HOD',
      title: 'Head of Department (HOD)',
      name: 'Dr. Sunita Verma',
      email: 'sunita.verma@institution.edu',
      dept: 'CSE Department HOD',
      color: 'bg-purple-50 border-purple-200 text-purple-900 hover:border-purple-400',
      badgeBg: 'bg-purple-600 text-white'
    },
    {
      role: 'REGISTRAR',
      title: 'University Registrar',
      name: 'Dr. A. K. Kapoor',
      email: 'registrar@institution.edu',
      dept: 'Sanction Authority',
      color: 'bg-indigo-50 border-indigo-200 text-indigo-900 hover:border-indigo-400',
      badgeBg: 'bg-[#3F51B5] text-white'
    },
    {
      role: 'ADMIN',
      title: 'Department / User Admin',
      name: 'Meera Sharma',
      email: 'meera.sharma@institution.edu',
      dept: 'General Administration',
      color: 'bg-amber-50 border-amber-200 text-amber-900 hover:border-amber-400',
      badgeBg: 'bg-amber-600 text-white'
    },
    {
      role: 'SUPER_ADMIN',
      title: 'Institutional Super Admin',
      name: 'Prof. Vikramaditya Roy',
      email: 'dean.academic@institution.edu',
      dept: 'Dean Academic Affairs',
      color: 'bg-slate-100 border-slate-300 text-slate-900 hover:border-slate-500',
      badgeBg: 'bg-slate-900 text-white'
    },
  ];

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col justify-center py-12 sm:px-6 lg:px-8 font-sans antialiased">
      
      <div className="sm:mx-auto sm:w-full sm:max-w-xl px-4">
        <div className="bg-white shadow-lg rounded-2xl border border-slate-200 overflow-hidden">
          
          {/* Blue Header inside Login Box Card */}
          <div className="bg-[#3F51B5] text-white px-6 py-5 sm:px-8 flex items-center gap-3.5 border-b border-indigo-700">
            <div className="w-11 h-11 rounded-xl bg-white/15 text-white flex items-center justify-center font-bold shrink-0 border border-white/20 shadow-xs overflow-hidden">
              {systemSettings?.institutionLogoUrl ? (
                <img 
                  src={systemSettings.institutionLogoUrl} 
                  alt="Logo" 
                  className="w-full h-full object-cover" 
                  onError={(e) => {
                    (e.target as HTMLElement).style.display = 'none';
                  }}
                />
              ) : (
                <GraduationCap className="w-6 h-6 text-white" />
              )}
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white leading-snug">
                {systemSettings?.institutionName || 'BIT Leave Portal'}
              </h1>
              <p className="text-xs text-blue-100 font-medium opacity-90 mt-0.5">
                Fully manage leave portal
              </p>
            </div>
          </div>

          <div className="p-6 sm:p-8 space-y-6">
          
          {/* Tab Selector: Sign In vs Staff Self-Registration */}
          <div className="flex border-b border-slate-200">
            <button
              type="button"
              onClick={() => {
                setActiveTab('login');
                setErrorMsg(null);
              }}
              className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider text-center border-b-2 transition-all cursor-pointer flex items-center justify-center gap-2 ${
                activeTab === 'login'
                  ? 'border-[#3F51B5] text-[#3F51B5] bg-indigo-50/50'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <LogIn className="w-4 h-4" />
              Institutional Sign In
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab('register');
                setRegErrorMsg(null);
                setRegSuccessMsg(null);
              }}
              className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider text-center border-b-2 transition-all cursor-pointer flex items-center justify-center gap-2 ${
                activeTab === 'register'
                  ? 'border-[#3F51B5] text-[#3F51B5] bg-indigo-50/50'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <UserPlus className="w-4 h-4" />
              Staff / Faculty Self-Registration
            </button>
          </div>

          {/* TAB 1: LOGIN WITH CREDENTIALS */}
          {activeTab === 'login' && (
            <div className="space-y-6">
              <form className="space-y-5" onSubmit={handleLoginSubmit}>
                {errorMsg && (
                  <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-xl font-medium flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                    <span>{errorMsg}</span>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                    Institutional Email Address
                  </label>
                  <div className="relative rounded-xl shadow-2xs">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Mail className="h-4 w-4 text-slate-400" />
                    </div>
                    <input
                      ref={emailInputRef}
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="e.g. rajesh.kumar@institution.edu"
                      required
                      autoFocus
                      className="block w-full pl-10 pr-3 py-2.5 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-[#3F51B5] focus:border-[#3F51B5]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                    Password
                  </label>
                  <div className="relative rounded-xl shadow-2xs">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Lock className="h-4 w-4 text-slate-400" />
                    </div>
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      required
                      className="block w-full pl-10 pr-3 py-2.5 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-[#3F51B5] focus:border-[#3F51B5]"
                    />
                  </div>
                  <p className="mt-1.5 text-[11px] text-slate-400">
                    Default demo password for all institutional accounts is <code className="text-slate-600 font-semibold">password123</code>.
                  </p>
                </div>

                <button
                  type="submit"
                  className="w-full flex justify-center items-center gap-2 py-3 px-4 border border-transparent rounded-xl shadow-md text-xs font-bold uppercase tracking-widest text-white bg-[#3F51B5] hover:bg-[#303F9F] focus:outline-hidden focus:ring-2 focus:ring-offset-2 focus:ring-[#3F51B5] transition-all cursor-pointer active:scale-98"
                >
                  <LogIn className="w-4 h-4" />
                  Sign In to Dashboard
                </button>
              </form>

              {/* Collapsible Demo Accounts Guide */}
              {systemSettings.enableDemoAccounts ? (
                <div className="border-t border-slate-200 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowDemoAccounts(!showDemoAccounts)}
                    className="w-full flex items-center justify-between text-xs font-bold text-slate-600 hover:text-slate-900 uppercase tracking-wider cursor-pointer"
                  >
                    <span className="flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-amber-500" />
                      Demo Accounts & Role Switcher Guide
                    </span>
                    {showDemoAccounts ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>

                  {showDemoAccounts && (
                    <div className="mt-3 space-y-3">
                      <p className="text-[11px] text-slate-500 font-medium">
                        Click any role card below to autofill email and password (<code className="font-mono text-slate-700">password123</code>):
                      </p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        {quickRoles.map((qr) => (
                          <button
                            key={qr.email}
                            type="button"
                            onClick={() => {
                              setEmail(qr.email);
                              setPassword('password123');
                              setErrorMsg(null);
                            }}
                            className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                              email === qr.email 
                                ? 'border-[#3F51B5] ring-2 ring-[#3F51B5]/20 bg-indigo-50/40 shadow-xs' 
                                : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${qr.badgeBg}`}>
                                {qr.role}
                              </span>
                              {email === qr.email && (
                                <CheckCircle2 className="w-4 h-4 text-[#3F51B5]" />
                              )}
                            </div>
                            <div className="mt-1.5">
                              <p className="text-xs font-bold text-slate-900">{qr.name}</p>
                              <p className="text-[10px] text-slate-500">{qr.dept}</p>
                              <p className="text-[10px] font-mono text-slate-400 mt-0.5 truncate">{qr.email}</p>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="border-t border-slate-200 pt-3 text-center">
                  <p className="text-[11px] text-slate-400 font-medium flex items-center justify-center gap-1">
                    🔒 Demo account quick login cards disabled by Super Admin policy.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: SELF-REGISTRATION FOR STAFF / FACULTY */}
          {activeTab === 'register' && (
            <form className="space-y-4" onSubmit={handleRegisterSubmit}>
              <div className="bg-indigo-50 border border-indigo-200 p-3.5 rounded-xl text-xs text-indigo-900 leading-relaxed">
                <span className="font-bold">Staff & Faculty Self-Registration:</span> New applicants can register below. All registrations are recorded in the database and require administrative validation by Admin or Super Admin before activation.
              </div>

              {regSuccessMsg && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl font-medium flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span>{regSuccessMsg}</span>
                </div>
              )}

              {regErrorMsg && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-xl font-medium flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <span>{regErrorMsg}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Dr. / Prof. / Mr. / Ms. Full Name"
                    value={regName}
                    onChange={(e) => setRegName(e.target.value)}
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
                    placeholder="name@institution.edu"
                    value={regEmail}
                    onChange={(e) => setRegEmail(e.target.value)}
                    className="block w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-[#3F51B5]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                    Choose Password *
                  </label>
                  <input
                    type="password"
                    required
                    placeholder="Set account password"
                    value={regPassword}
                    onChange={(e) => setRegPassword(e.target.value)}
                    className="block w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-[#3F51B5]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                    Applicant Role *
                  </label>
                  <select
                    value={regRole}
                    onChange={(e) => setRegRole(e.target.value as 'FACULTY' | 'STAFF')}
                    className="block w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 font-medium focus:outline-hidden focus:ring-2 focus:ring-[#3F51B5]"
                  >
                    <option value="FACULTY">FACULTY (Teaching Faculty)</option>
                    <option value="STAFF">STAFF (Technical / Admin Staff)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                    Department *
                  </label>
                  <select
                    value={regDeptId}
                    onChange={(e) => setRegDeptId(e.target.value)}
                    className="block w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 font-medium focus:outline-hidden focus:ring-2 focus:ring-[#3F51B5]"
                  >
                    {departments.map(d => (
                      <option key={d.id} value={d.id}>{d.name} ({d.code})</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                    Designation / Title
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Assistant Professor / Technical Officer"
                    value={regDesignation}
                    onChange={(e) => setRegDesignation(e.target.value)}
                    className="block w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-[#3F51B5]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                    Employee ID / Code
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. FAC-2026-104"
                    value={regEmpCode}
                    onChange={(e) => setRegEmpCode(e.target.value)}
                    className="block w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 font-mono focus:outline-hidden focus:ring-2 focus:ring-[#3F51B5]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                    Phone Number
                  </label>
                  <input
                    type="text"
                    placeholder="+91 98765 43210"
                    value={regPhone}
                    onChange={(e) => setRegPhone(e.target.value)}
                    className="block w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-[#3F51B5]"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full flex justify-center items-center gap-2 py-3 px-4 border border-transparent rounded-xl shadow-md text-xs font-bold uppercase tracking-widest text-white bg-[#3F51B5] hover:bg-[#303F9F] focus:outline-hidden focus:ring-2 focus:ring-offset-2 focus:ring-[#3F51B5] transition-all cursor-pointer active:scale-98"
              >
                <UserPlus className="w-4 h-4" />
                Submit Self-Registration for Validation
              </button>
            </form>
          )}

          {/* Footer Security Note */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs text-slate-500 space-y-1">
            <div className="flex items-center gap-1.5 text-slate-700 font-semibold">
              <Database className="w-4 h-4 text-emerald-600" />
              Persistent Database & RBAC Active
            </div>
            <p className="text-[11px] leading-relaxed text-slate-500">
              All user profiles, role assignments, leave policies, and self-registration validations are permanently stored in the institutional browser database.
            </p>
          </div>

          </div>
        </div>
      </div>

    </div>
  );
};

