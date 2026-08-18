import React, { useState, useEffect, useRef } from 'react';
import { useLeave } from '../../context/LeaveContext';
import { Role } from '../../types';
import { BitLogo } from '../common/BitLogo';
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
  Database,
  RefreshCw,
  ArrowLeft,
  Send,
  Copy,
  Check
} from 'lucide-react';

export const LoginPage: React.FC = () => {
  const { login, registerUser, requestPasswordResetCode, validateAndResetPassword, departments, systemSettings } = useLeave();
  
  const [activeTab, setActiveTab] = useState<'login' | 'register' | 'forgot'>('login');
  const emailInputRef = useRef<HTMLInputElement>(null);
  
  // Login State
  const [email, setEmail] = useState<string>(() => 
    systemSettings.enableDemoAccounts ? 'rajesh.kumar@institution.edu' : ''
  );
  const [password, setPassword] = useState<string>(() => 
    systemSettings.enableDemoAccounts ? 'password123' : ''
  );
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState<boolean>(false);
  const [showDemoAccounts, setShowDemoAccounts] = useState<boolean>(true);

  // Forgot Password State
  const [forgotStep, setForgotStep] = useState<'request' | 'verify'>('request');
  const [forgotEmail, setForgotEmail] = useState<string>('');
  const [forgotEmpCode, setForgotEmpCode] = useState<string>('');
  const [forgotCode, setForgotCode] = useState<string>('');
  const [generatedSecurityCode, setGeneratedSecurityCode] = useState<string>('');
  const [dispatchedEmail, setDispatchedEmail] = useState<string>('');
  const [dispatchedUserName, setDispatchedUserName] = useState<string>('');
  const [forgotNewPassword, setForgotNewPassword] = useState<string>('');
  const [forgotConfirmPassword, setForgotConfirmPassword] = useState<string>('');
  const [forgotSuccessMsg, setForgotSuccessMsg] = useState<string | null>(null);
  const [forgotErrorMsg, setForgotErrorMsg] = useState<string | null>(null);
  const [isSendingCode, setIsSendingCode] = useState<boolean>(false);

  useEffect(() => {
    if (systemSettings.enableSelfRegistration === false && activeTab === 'register') {
      setActiveTab('login');
    }
  }, [systemSettings.enableSelfRegistration, activeTab]);

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

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    if (!email || !password) {
      setErrorMsg('Please enter both email address and password.');
      return;
    }
    setIsLoggingIn(true);
    try {
      const result = await login(email, password);
      if (!result.success) {
        setErrorMsg(result.message || 'Invalid user credentials. Please check your institutional account.');
      }
    } catch (_err) {
      setErrorMsg('Unable to reach institutional authentication service. Please try again.');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleRequestCode = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setForgotErrorMsg(null);
    setForgotSuccessMsg(null);

    const targetEmail = (forgotEmail || '').trim();
    if (!targetEmail) {
      setForgotErrorMsg('Please enter your registered institutional email address.');
      return;
    }

    setIsSendingCode(true);

    setTimeout(() => {
      try {
        const result = requestPasswordResetCode(targetEmail, forgotEmpCode ? forgotEmpCode.trim() : '');

        if (result && result.success && result.securityCode) {
          setGeneratedSecurityCode(result.securityCode);
          setDispatchedEmail(result.userEmail || targetEmail);
          setDispatchedUserName(result.userName || 'Portal User');
          setForgotStep('verify');
          setForgotCode('');
          setForgotNewPassword('');
          setForgotConfirmPassword('');
          setForgotErrorMsg(null);
        } else {
          setForgotErrorMsg(result?.message || 'Unable to send security code. Please check your email.');
        }
      } catch (error) {
        console.error('Error requesting reset code:', error);
        setForgotErrorMsg('An unexpected error occurred while requesting the security code. Please try again.');
      } finally {
        setIsSendingCode(false);
      }
    }, 200);
  };

  const handleVerifyAndReset = (e: React.FormEvent) => {
    e.preventDefault();
    setForgotErrorMsg(null);
    setForgotSuccessMsg(null);

    if (!forgotCode) {
      setForgotErrorMsg('Please enter the 6-digit security code sent to your email.');
      return;
    }

    if (forgotCode.trim() !== generatedSecurityCode.trim()) {
      setForgotErrorMsg('Invalid 6-digit security code. Please check your email notification and try again.');
      return;
    }

    if (!forgotNewPassword || forgotNewPassword.length < 6) {
      setForgotErrorMsg('New password must be at least 6 characters long.');
      return;
    }

    if (forgotNewPassword !== forgotConfirmPassword) {
      setForgotErrorMsg('New password and confirm password do not match.');
      return;
    }

    const result = validateAndResetPassword(
      dispatchedEmail,
      forgotEmpCode,
      forgotNewPassword,
      forgotCode,
      generatedSecurityCode
    );

    if (result.success) {
      setForgotSuccessMsg(result.message);
      setEmail(dispatchedEmail);
      setPassword(forgotNewPassword);
    } else {
      setForgotErrorMsg(result.message);
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
      title: 'Faculty Applicant',
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
      role: 'ADMIN',
      title: 'Department / User Admin',
      name: 'Meera Sharma',
      email: 'meera.sharma@institution.edu',
      dept: 'General Administration',
      color: 'bg-amber-50 border-amber-200 text-amber-900 hover:border-amber-400',
      badgeBg: 'bg-amber-600 text-white'
    },
    {
      role: 'STAFF',
      title: 'Technical Staff',
      name: 'Mr. Suresh Patil',
      email: 'suresh.patil@institution.edu',
      dept: 'Mechanical Engineering',
      color: 'bg-emerald-50 border-emerald-200 text-emerald-900 hover:border-emerald-400',
      badgeBg: 'bg-emerald-600 text-white'
    },
    {
      role: 'FACULTY',
      title: 'Assistant Professor',
      name: 'Dr. Ananya Sen',
      email: 'ananya.sen@institution.edu',
      dept: 'Electronics & Comm.',
      color: 'bg-cyan-50 border-cyan-200 text-cyan-900 hover:border-cyan-400',
      badgeBg: 'bg-cyan-600 text-white'
    },
    {
      role: 'SUPER_ADMIN',
      title: 'Webmaster Super Admin',
      name: 'Webmaster BIT Mesra',
      email: 'webmaster@bitmesra.ac.in',
      dept: 'IT & Systems Admin',
      color: 'bg-indigo-50 border-indigo-300 text-indigo-900 hover:border-indigo-500',
      badgeBg: 'bg-[#3F51B5] text-white',
      customPassword: 'password123'
    },
  ];

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col justify-center py-12 sm:px-6 lg:px-8 font-sans antialiased">
      
      <div className="sm:mx-auto sm:w-full sm:max-w-xl px-4">
        <div className="bg-white shadow-lg rounded-2xl border border-slate-200 overflow-hidden">
          
          {/* Header inside Login Box Card */}
          <div className="bg-[#3F51B5] text-white px-6 py-5 sm:px-8 flex items-center gap-3.5 border-b border-indigo-700">
            <div className="w-12 h-12 rounded-xl bg-white p-1 text-white flex items-center justify-center font-bold shrink-0 border border-white/30 shadow-sm overflow-hidden">
              {systemSettings?.institutionLogoUrl ? (
                <img 
                  src={systemSettings.institutionLogoUrl} 
                  alt="Logo" 
                  className="w-full h-full object-contain" 
                  onError={(e) => {
                    (e.target as HTMLElement).style.display = 'none';
                  }}
                />
              ) : (
                <BitLogo className="w-full h-full" />
              )}
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white leading-snug">
                {systemSettings?.institutionName || 'BIT Leave Portal'}
              </h1>
              <p className="text-xs text-blue-100 font-medium opacity-90 mt-0.5">
                Birla Institute of Technology, Mesra • Automated Portal
              </p>
            </div>
          </div>

          <div className="p-6 sm:p-8 space-y-6">
          
          {/* Tab Selector: Sign In vs Staff Self-Registration */}
          {systemSettings.enableSelfRegistration !== false && (
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
          )}

          {/* TAB 1: LOGIN WITH CREDENTIALS */}
          {activeTab === 'login' && (
            <div className="space-y-6">
              <form className="space-y-5" onSubmit={handleLoginSubmit}>
                {errorMsg && (
                  <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-xl font-medium flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                    <span>{typeof errorMsg === 'object' ? JSON.stringify(errorMsg) : String(errorMsg)}</span>
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
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                      Password
                    </label>
                  </div>
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
                </div>

                <button
                  type="submit"
                  disabled={isLoggingIn}
                  className="w-full flex justify-center items-center gap-2 py-3 px-4 border border-transparent rounded-xl shadow-md text-xs font-bold uppercase tracking-widest text-white bg-[#3F51B5] hover:bg-[#303F9F] focus:outline-hidden focus:ring-2 focus:ring-offset-2 focus:ring-[#3F51B5] transition-all cursor-pointer active:scale-98 disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  {isLoggingIn ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      Authenticating with Database...
                    </>
                  ) : (
                    <>
                      <LogIn className="w-4 h-4" />
                      Sign In to Dashboard
                    </>
                  )}
                </button>
              </form>

              {/* Collapsible Demo Accounts Guide */}
              {systemSettings.enableDemoAccounts && (
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
                              setPassword((qr as any).customPassword || 'password123');
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
              )}
            </div>
          )}

          {/* TAB 2: SELF-REGISTRATION FOR STAFF / FACULTY */}
          {activeTab === 'register' && systemSettings.enableSelfRegistration !== false && (
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
                  <span>{typeof regErrorMsg === 'object' ? JSON.stringify(regErrorMsg) : String(regErrorMsg)}</span>
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

          {/* TAB 3: FORGOT PASSWORD / ACCOUNT RECOVERY */}
          {activeTab === 'forgot' && (
            <div className="space-y-5 animate-in fade-in duration-200">
              <div className="bg-indigo-50/80 p-4 rounded-2xl border border-indigo-100 flex items-start gap-3">
                <div className="p-2.5 bg-[#3F51B5] text-white rounded-xl shrink-0 mt-0.5 shadow-2xs">
                  <KeyRound className="w-5 h-5" />
                </div>
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Account Password Recovery</h3>
                    <span className="text-[10px] font-bold px-2 py-0.5 bg-indigo-100 text-[#3F51B5] rounded-full">
                      {forgotStep === 'request' ? 'Step 1 of 2' : 'Step 2 of 2'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    {forgotStep === 'request'
                      ? 'Enter your registered institutional email to receive a 6-digit security code.'
                      : 'Enter the 6-digit security code dispatched to your email along with your new password.'}
                  </p>
                </div>
              </div>

              {forgotErrorMsg && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-xl font-medium flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <span>{typeof forgotErrorMsg === 'object' ? JSON.stringify(forgotErrorMsg) : String(forgotErrorMsg)}</span>
                </div>
              )}

              {forgotSuccessMsg ? (
                <div className="p-5 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-2xl space-y-4 text-center">
                  <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto shadow-2xs">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                  <div className="space-y-1">
                    <h4 className="text-sm font-bold text-emerald-950">Password Successfully Reset!</h4>
                    <p className="text-xs text-emerald-800 leading-relaxed">
                      Your identity was verified via the email security code and your new password has been applied. You can now log in directly.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setActiveTab('login');
                      setForgotSuccessMsg(null);
                      setForgotStep('request');
                    }}
                    className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition-all shadow-xs cursor-pointer flex items-center justify-center gap-2 active:scale-98"
                  >
                    <LogIn className="w-4 h-4" />
                    Proceed to Sign In Now
                  </button>
                </div>
              ) : forgotStep === 'request' ? (
                /* STEP 1: REQUEST SECURITY CODE */
                <form className="space-y-4" onSubmit={handleRequestCode}>
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                      Institutional Email Address *
                    </label>
                    <div className="relative rounded-xl shadow-2xs">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Mail className="h-4 w-4 text-slate-400" />
                      </div>
                      <input
                        type="email"
                        value={forgotEmail}
                        onChange={(e) => setForgotEmail(e.target.value)}
                        placeholder="e.g. rajesh.kumar@institution.edu"
                        required
                        className="block w-full pl-10 pr-3 py-2.5 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-[#3F51B5]"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                      Identity Validation: Employee ID or Phone (Optional)
                    </label>
                    <div className="relative rounded-xl shadow-2xs">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <ShieldCheck className="h-4 w-4 text-slate-400" />
                      </div>
                      <input
                        type="text"
                        value={forgotEmpCode}
                        onChange={(e) => setForgotEmpCode(e.target.value)}
                        placeholder="e.g. FAC-2026-101 or +91 9876543210"
                        className="block w-full pl-10 pr-3 py-2.5 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-[#3F51B5]"
                      />
                    </div>
                    <p className="text-[10px] text-slate-500 mt-1">Optional additional credential validation for instant code dispatch.</p>
                  </div>

                  <div className="pt-2 flex flex-col sm:flex-row items-center gap-2">
                    <button
                      type="submit"
                      disabled={isSendingCode}
                      className="w-full flex-1 flex justify-center items-center gap-2 py-3 px-4 border border-transparent rounded-xl shadow-md text-xs font-bold uppercase tracking-widest text-white bg-[#3F51B5] hover:bg-[#303F9F] focus:outline-hidden focus:ring-2 focus:ring-[#3F51B5] transition-all cursor-pointer disabled:opacity-60 active:scale-98"
                    >
                      {isSendingCode ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          Dispatching Code...
                        </>
                      ) : (
                        <>
                          <Send className="w-4 h-4" />
                          Send 6-Digit Security Code
                        </>
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveTab('login')}
                      className="w-full sm:w-auto px-4 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold uppercase tracking-wider cursor-pointer transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              ) : (
                /* STEP 2: VERIFY CODE & SET NEW PASSWORD */
                <form className="space-y-4" onSubmit={handleVerifyAndReset}>
                  {/* Email Security Code Banner */}
                  <div className="p-3.5 bg-blue-50/90 border border-blue-200 rounded-xl text-xs space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2 font-bold text-blue-950">
                        <Mail className="w-4 h-4 text-[#3F51B5] shrink-0" />
                        <span>Security Code Sent to Email</span>
                      </div>
                      <span className="text-[10px] font-mono font-bold bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full">
                        {dispatchedEmail}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-600 leading-relaxed">
                      A 6-digit security code has been dispatched to <strong>{dispatchedEmail}</strong> ({dispatchedUserName}). Please check your email inbox to retrieve your code.
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                      Enter 6-Digit Security Code *
                    </label>
                    <div className="relative rounded-xl shadow-2xs">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <KeyRound className="h-4 w-4 text-slate-400" />
                      </div>
                      <input
                        type="text"
                        maxLength={6}
                        value={forgotCode}
                        onChange={(e) => setForgotCode(e.target.value.replace(/\D/g, ''))}
                        placeholder="e.g. 849201"
                        required
                        className="block w-full pl-10 pr-3 py-2.5 bg-white border border-slate-300 rounded-xl text-sm font-mono tracking-widest text-slate-900 font-bold focus:outline-hidden focus:ring-2 focus:ring-[#3F51B5]"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                        New Password *
                      </label>
                      <div className="relative rounded-xl shadow-2xs">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <Lock className="h-4 w-4 text-slate-400" />
                        </div>
                        <input
                          type="password"
                          value={forgotNewPassword}
                          onChange={(e) => setForgotNewPassword(e.target.value)}
                          placeholder="••••••••"
                          required
                          className="block w-full pl-10 pr-3 py-2.5 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-[#3F51B5]"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                        Confirm New Password *
                      </label>
                      <div className="relative rounded-xl shadow-2xs">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <Lock className="h-4 w-4 text-slate-400" />
                        </div>
                        <input
                          type="password"
                          value={forgotConfirmPassword}
                          onChange={(e) => setForgotConfirmPassword(e.target.value)}
                          placeholder="••••••••"
                          required
                          className="block w-full pl-10 pr-3 py-2.5 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-[#3F51B5]"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="pt-2 space-y-2">
                    <button
                      type="submit"
                      className="w-full flex justify-center items-center gap-2 py-3 px-4 border border-transparent rounded-xl shadow-md text-xs font-bold uppercase tracking-widest text-white bg-[#3F51B5] hover:bg-[#303F9F] focus:outline-hidden focus:ring-2 focus:ring-[#3F51B5] transition-all cursor-pointer active:scale-98"
                    >
                      <ShieldCheck className="w-4 h-4" />
                      Verify Code & Reset Password
                    </button>

                    <div className="flex items-center justify-between text-xs pt-1">
                      <button
                        type="button"
                        onClick={() => handleRequestCode()}
                        className="text-[#3F51B5] font-bold hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        <RefreshCw className="w-3 h-3" />
                        Resend Security Code
                      </button>
                      <button
                        type="button"
                        onClick={() => setForgotStep('request')}
                        className="text-slate-500 font-medium hover:text-slate-800 flex items-center gap-1 cursor-pointer"
                      >
                        <ArrowLeft className="w-3 h-3" />
                        Change Email / Start Over
                      </button>
                    </div>
                  </div>
                </form>
              )}
            </div>
          )}

          {/* Modern Forgot Password / Account Recovery Card */}
          {activeTab === 'login' && (
            <div className="bg-gradient-to-r from-indigo-50/60 to-slate-50 p-4 rounded-2xl border border-indigo-100/90 shadow-2xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="space-y-0.5">
                <div className="flex items-center gap-1.5 text-slate-900 font-bold text-xs">
                  <KeyRound className="w-4 h-4 text-[#3F51B5]" />
                  Forgot Your Portal Password?
                </div>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  Request a 6-digit email security code to verify your identity and reset your portal password safely.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setActiveTab('forgot');
                  setForgotStep('request');
                  setForgotEmail(email);
                  setForgotErrorMsg(null);
                  setForgotSuccessMsg(null);
                }}
                className="px-3.5 py-2 bg-white hover:bg-indigo-50 text-[#3F51B5] border border-indigo-200 rounded-xl text-xs font-bold shadow-2xs transition-all flex items-center gap-1.5 shrink-0 cursor-pointer active:scale-95"
              >
                <KeyRound className="w-3.5 h-3.5" />
                Forgot Password
              </button>
            </div>
          )}

          </div>
        </div>
      </div>

    </div>
  );
};

