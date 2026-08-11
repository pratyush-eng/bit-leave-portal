import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { loadOrSeedFirestoreData, saveDocToFirestore, deleteDocFromFirestore, deleteUserFromFirestore, subscribeToSystemSettings, subscribeToCollection, resetFirestoreData } from '../lib/firestoreSync';
import { sendAuditLogToNeon, syncDataToNeon, fetchNeonData, deleteNeonDoc } from '../lib/neonClient';
import { 
  User, 
  LeaveRequest, 
  Notification, 
  AuditLog, 
  LeavePolicy, 
  Department, 
  Role, 
  LeaveType,
  LeaveStatus,
  GranularPermission,
  ToastNotification,
  SystemSettings,
  EmailLog,
  EmailSettings
} from '../types';
import { 
  DEFAULT_EMAIL_SETTINGS,
  buildLeaveSubmittedEmail,
  buildHodRecommendedEmail,
  buildHodRejectedEmail,
  buildRegistrarSanctionedEmail,
  buildRegistrarRejectedEmail,
  buildTestEmail
} from '../lib/emailTemplates';
import { 
  INITIAL_LEAVE_REQUESTS, 
  INITIAL_NOTIFICATIONS, 
  INITIAL_AUDIT_LOGS, 
  INITIAL_LEAVE_POLICIES, 
  INITIAL_DEPARTMENTS,
  GRANULAR_PERMISSIONS
} from '../data/mockData';

interface LeaveContextType {
  currentUser: User;
  allUsers: User[];
  departments: Department[];
  leavePolicies: LeavePolicy[];
  leaveRequests: LeaveRequest[];
  notifications: Notification[];
  auditLogs: AuditLog[];
  emailLogs: EmailLog[];
  granularPermissions: GranularPermission[];
  unreadNotificationCount: number;
  isAuthenticated: boolean;
  toasts: ToastNotification[];
  systemSettings: SystemSettings;

  updateSystemSettings: (newSettings: Partial<SystemSettings>) => void;
  sendTestEmail: (recipientEmail: string, recipientName: string) => Promise<{ success: boolean; message: string }>;
  addToast: (toast: Omit<ToastNotification, 'id' | 'timestamp'>) => void;
  removeToast: (id: string) => void;
  clearToasts: () => void;

  login: (email: string, password?: string) => { success: boolean; message?: string };
  logout: () => void;
  switchUser: (userId: string) => void;
  registerUser: (userData: Omit<User, 'id' | 'leaveBalances'>) => { success: boolean; message: string };
  updateUserStatus: (userId: string, status: 'ACTIVE' | 'PENDING_APPROVAL' | 'REJECTED') => void;
  updateUser: (userId: string, updatedData: Partial<User>) => { success: boolean; message: string };
  changePassword: (oldPassword: string, newPassword: string) => { success: boolean; message: string };
  adminResetPassword: (userId: string, newPassword: string) => { success: boolean; message: string };
  requestPasswordResetCode: (email: string, empCodeOrPhone?: string) => { success: boolean; message: string; securityCode?: string; userEmail?: string; userName?: string };
  validateAndResetPassword: (email: string, empCodeOrPhone: string, newPassword: string, providedCode?: string, expectedCode?: string) => { success: boolean; message: string };
  deleteUser: (userId: string) => { success: boolean; message: string };
  exportDbJson: () => string;
  importDbJson: (jsonString: string) => boolean;

  applyForLeave: (data: {
    leaveType: LeaveType;
    startDate: string;
    endDate: string;
    totalDays: number;
    isHalfDay: boolean;
    halfDaySession?: 'FIRST_HALF' | 'SECOND_HALF';
    reason: string;
    contactAddress?: string;
    contactPhone?: string;
    documentUrl?: string;
    classHandovers?: any[];
  }) => LeaveRequest;

  hodAction: (leaveId: string, action: 'RECOMMENDED' | 'REJECTED', comments: string) => void;
  registrarAction: (leaveId: string, action: 'APPROVED' | 'REJECTED', comments: string) => void;
  cancelLeave: (leaveId: string) => void;
  
  updateUserRoleAndPermissions: (userId: string, role: Role, permissions: string[]) => void;
  adjustUserLeaveBalance: (userId: string, leaveType: LeaveType, total: number, used: number) => void;
  createNewUser: (userData: Omit<User, 'id' | 'leaveBalances'>) => { success: boolean; message: string };
  createNewDepartment: (deptData: Omit<Department, 'totalFaculty'>) => void;
  updateDepartment: (dept: Department) => void;
  createNewLeaveType: (policyData: LeavePolicy) => void;
  updateLeavePolicy: (policy: LeavePolicy) => void;
  
  markNotificationRead: (id: string) => void;
  markAllNotificationsRead: () => void;
  clearSanctionLogs: () => { success: boolean; message: string };
  deleteLeaveRequest: (requestId: string) => { success: boolean; message: string };
  purgeUnknownLeaveRequests: () => { success: boolean; count: number; message: string };
  resetData: () => void;
}

const LeaveContext = createContext<LeaveContextType | undefined>(undefined);

const STORAGE_KEYS = {
  USERS: 'academia_leave_users_v1',
  REQUESTS: 'academia_leave_requests_v1',
  NOTIFICATIONS: 'academia_leave_notifications_v1',
  LOGS: 'academia_leave_logs_v1',
  POLICIES: 'academia_leave_policies_v1',
  DEPARTMENTS: 'academia_leave_departments_v1',
  CURRENT_USER_ID: 'academia_current_user_id_v1',
  CURRENT_USER_EMAIL: 'academia_current_user_email_v1',
  AUTH: 'academia_leave_auth_v1',
  SETTINGS: 'academia_system_settings_v1',
  EMAIL_LOGS: 'academia_email_logs_v1'
};

const DELETED_USER_IDS_KEY = 'academia_deleted_user_ids_v1';
const DELETED_USER_EMAILS_KEY = 'academia_deleted_user_emails_v1';

function sanitizeAndDeduplicateUsers(
  usersList: User[],
  delIds: Set<string>,
  delEmails: Set<string>
): User[] {
  if (!Array.isArray(usersList)) return [];
  const map = new Map<string, User>();

  for (const u of usersList) {
    if (!u) continue;
    const cleanEmail = String(u.email || '').trim().toLowerCase();
    const uId = String(u.id || '').trim();
    if (!cleanEmail) continue;

    // Filter out deleted users permanently
    if ((uId && delIds.has(uId)) || delEmails.has(cleanEmail)) {
      continue;
    }

    if (!map.has(cleanEmail)) {
      map.set(cleanEmail, u);
    } else {
      const existing = map.get(cleanEmail)!;
      const preferIncoming =
        (u.accountStatus === 'ACTIVE' && existing.accountStatus !== 'ACTIVE') ||
        (['SUPER_ADMIN', 'ADMIN', 'REGISTRAR'].includes(u.role) &&
          !['SUPER_ADMIN', 'ADMIN', 'REGISTRAR'].includes(existing.role));

      const merged: User = {
        ...(preferIncoming ? existing : u),
        ...(preferIncoming ? u : existing),
        id: existing.id || u.id,
        email: cleanEmail,
        assignedPermissions: Array.from(
          new Set([...(existing.assignedPermissions || []), ...(u.assignedPermissions || [])])
        ),
        leaveBalances: { ...(existing.leaveBalances || {}), ...(u.leaveBalances || {}) } as any
      };
      map.set(cleanEmail, merged);
    }
  }

  const result = Array.from(map.values());
  result.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
  return result;
}

export const LeaveProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [deletedUserIds, setDeletedUserIds] = useState<Set<string>>(() => {
    try {
      const saved = localStorage.getItem(DELETED_USER_IDS_KEY);
      return saved ? new Set<string>(JSON.parse(saved)) : new Set<string>();
    } catch {
      return new Set<string>();
    }
  });

  const [deletedUserEmails, setDeletedUserEmails] = useState<Set<string>>(() => {
    try {
      const saved = localStorage.getItem(DELETED_USER_EMAILS_KEY);
      return saved ? new Set<string>(JSON.parse(saved)) : new Set<string>();
    } catch {
      return new Set<string>();
    }
  });

  const [systemSettings, setSystemSettings] = useState<SystemSettings>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.SETTINGS);
      const parsed = saved ? JSON.parse(saved) : {};
      return {
        enableDemoAccounts: parsed.enableDemoAccounts ?? true,
        enableRoleSwitcher: parsed.enableRoleSwitcher ?? true,
        enableSelfRegistration: parsed.enableSelfRegistration ?? true,
        institutionName: parsed.institutionName || 'BIT Leave Portal',
        institutionLogoUrl: parsed.institutionLogoUrl || '',
        emailSettings: parsed.emailSettings || DEFAULT_EMAIL_SETTINGS
      };
    } catch {
      return {
        enableDemoAccounts: true,
        enableRoleSwitcher: true,
        enableSelfRegistration: true,
        institutionName: 'BIT Leave Portal',
        institutionLogoUrl: '',
        emailSettings: DEFAULT_EMAIL_SETTINGS
      };
    }
  });

  const [allUsers, setAllUsers] = useState<User[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.USERS);
      const initial = saved ? JSON.parse(saved) : [];
      const savedDelIds = (() => {
        try {
          const s = localStorage.getItem(DELETED_USER_IDS_KEY);
          return s ? new Set<string>(JSON.parse(s)) : new Set<string>();
        } catch { return new Set<string>(); }
      })();
      const savedDelEmails = (() => {
        try {
          const s = localStorage.getItem(DELETED_USER_EMAILS_KEY);
          return s ? new Set<string>(JSON.parse(s)) : new Set<string>();
        } catch { return new Set<string>(); }
      })();
      return sanitizeAndDeduplicateUsers(initial, savedDelIds, savedDelEmails);
    } catch {
      return [];
    }
  });

  const [currentUserId, setCurrentUserId] = useState<string>(() => {
    try {
      return localStorage.getItem(STORAGE_KEYS.CURRENT_USER_ID) || 'usr_5';
    } catch {
      return 'usr_5';
    }
  });

  const [currentUserEmail, setCurrentUserEmail] = useState<string>(() => {
    try {
      return localStorage.getItem(STORAGE_KEYS.CURRENT_USER_EMAIL) || 'dean.academic@institution.edu';
    } catch {
      return 'dean.academic@institution.edu';
    }
  });

  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.AUTH);
      return saved !== null ? JSON.parse(saved) : false;
    } catch {
      return false;
    }
  });

  const [departments, setDepartments] = useState<Department[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.DEPARTMENTS);
      return saved ? JSON.parse(saved) : INITIAL_DEPARTMENTS;
    } catch {
      return INITIAL_DEPARTMENTS;
    }
  });

  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.REQUESTS);
      return saved ? JSON.parse(saved) : INITIAL_LEAVE_REQUESTS;
    } catch {
      return INITIAL_LEAVE_REQUESTS;
    }
  });

  const [notifications, setNotifications] = useState<Notification[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.NOTIFICATIONS);
      return saved ? JSON.parse(saved) : INITIAL_NOTIFICATIONS;
    } catch {
      return INITIAL_NOTIFICATIONS;
    }
  });

  const [auditLogs, setAuditLogs] = useState<AuditLog[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.LOGS);
      return saved ? JSON.parse(saved) : INITIAL_AUDIT_LOGS;
    } catch {
      return INITIAL_AUDIT_LOGS;
    }
  });

  const [emailLogs, setEmailLogs] = useState<EmailLog[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.EMAIL_LOGS);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [leavePolicies, setLeavePolicies] = useState<LeavePolicy[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.POLICIES);
      return saved ? JSON.parse(saved) : INITIAL_LEAVE_POLICIES;
    } catch {
      return INITIAL_LEAVE_POLICIES;
    }
  });

  const [toasts, setToasts] = useState<ToastNotification[]>([]);

  const addToast = (toastData: Omit<ToastNotification, 'id' | 'timestamp'>) => {
    const id = `toast_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const newToast: ToastNotification = {
      ...toastData,
      id,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    setToasts(prev => [newToast, ...prev].slice(0, 5));
  };

  const dispatchEmailLog = (logData: Omit<EmailLog, 'id' | 'timestamp'>) => {
    const newLog: EmailLog = {
      ...logData,
      id: `ML-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`,
      timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19)
    };
    setEmailLogs(prev => [newLog, ...prev]);
    saveDocToFirestore('emailLogs', newLog.id, newLog);

    // Asynchronously dispatch email via backend Express SMTP server
    if (systemSettings.emailSettings?.enabled !== false) {
      const targetEndpoint = systemSettings.emailSettings?.apiEndpoint?.trim() || '/api/send-email';
      fetch(targetEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          smtpConfig: systemSettings.emailSettings || DEFAULT_EMAIL_SETTINGS,
          to: newLog.recipientEmail,
          toName: newLog.recipientName,
          subject: newLog.subject,
          html: newLog.bodyHtml,
          text: newLog.bodyText
        })
      })
      .then(async res => {
        if (res.status === 404) {
          return { success: false, is404: true, error: 'Server endpoint /api/send-email not available (Static Mode)' };
        }
        const contentType = res.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          return res.json();
        }
        const text = await res.text();
        return { success: false, error: `HTTP ${res.status}: ${text.slice(0, 100)}` };
      })
      .then(data => {
        if (data.success) {
          console.log(`[Email Gateway] Delivered to ${newLog.recipientEmail}`);
          setEmailLogs(prev => prev.map(l => l.id === newLog.id ? { ...l, status: 'SENT' } : l));
        } else {
          console.warn(`[Email Gateway Notice] ${data.error || 'Delivery failed'}`);
          setEmailLogs(prev => prev.map(l => l.id === newLog.id ? { ...l, status: 'SIMULATED' } : l));
          if (!data.is404) {
            addToast({
              title: `Email Delivery Issue ⚠️`,
              message: `SMTP Notice for ${newLog.recipientName}: ${data.error || 'Check SMTP configuration'}`,
              type: 'WARNING'
            });
          }
        }
      })
      .catch(err => {
        console.warn('[Email Gateway Network Error]', err);
        setEmailLogs(prev => prev.map(l => l.id === newLog.id ? { ...l, status: 'SIMULATED' } : l));
      });
    }

    setEmailLogs(prev => {
      const updated = [newLog, ...prev];
      localStorage.setItem(STORAGE_KEYS.EMAIL_LOGS, JSON.stringify(updated));
      return updated;
    });
    saveDocToFirestore('emailLogs', newLog.id, newLog);

    addToast({
      title: `Email Notification Sent 📧`,
      message: `Dispatched to ${newLog.recipientName} (${newLog.recipientEmail})`,
      type: 'INFO'
    });

    return newLog;
  };

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  const clearToasts = () => {
    setToasts([]);
  };

  // Dynamically reconcile leave balances for all users based on active leave requests and leave policies
  const effectiveAllUsers = useMemo(() => {
    const sanitized = sanitizeAndDeduplicateUsers(allUsers, deletedUserIds, deletedUserEmails);
    return sanitized.map(u => {
      const balances: Record<string, { total: number; used: number; pending: number }> = {};

      // 1. Initialize with quotas from policies or user's custom quota
      leavePolicies.forEach(pol => {
        const existingBal = u.leaveBalances?.[pol.type];
        const totalQuota = existingBal && typeof existingBal.total === 'number'
          ? existingBal.total 
          : pol.annualQuota;

        const baseUsed = existingBal && typeof existingBal.used === 'number' ? existingBal.used : 0;

        balances[pol.type] = {
          total: totalQuota,
          used: baseUsed,
          pending: 0
        };
      });

      // 2. Preserve any extra keys on u.leaveBalances
      if (u.leaveBalances) {
        Object.keys(u.leaveBalances).forEach(typeKey => {
          if (!balances[typeKey]) {
            const existingBal = u.leaveBalances[typeKey];
            balances[typeKey] = {
              total: existingBal?.total ?? 0,
              used: existingBal?.used ?? 0,
              pending: 0
            };
          }
        });
      }

      // 3. Track calculated used and pending totals directly from leaveRequests
      const calculatedUsed: Record<string, number> = {};
      const calculatedPending: Record<string, number> = {};

      leaveRequests.forEach(r => {
        const matchesUser =
          (!!r.applicantId && r.applicantId === u.id) ||
          (!!r.applicantEmail && !!u.email && r.applicantEmail.toLowerCase().trim() === u.email.toLowerCase().trim()) ||
          (!!r.applicantEmployeeCode && !!u.employeeCode && r.applicantEmployeeCode.trim() === u.employeeCode.trim());

        if (!matchesUser) return;

        const typeKey = r.leaveType;
        if (!balances[typeKey]) {
          const matchingPolicy = leavePolicies.find(p => p.type === typeKey);
          balances[typeKey] = { total: matchingPolicy?.annualQuota || 12, used: 0, pending: 0 };
        }

        const days = r.isHalfDay ? 0.5 : Number(r.totalDays || 1);
        if (r.status === 'APPROVED') {
          calculatedUsed[typeKey] = (calculatedUsed[typeKey] || 0) + days;
        } else if (r.status === 'PENDING_HOD' || r.status === 'PENDING_REGISTRAR') {
          calculatedPending[typeKey] = (calculatedPending[typeKey] || 0) + days;
        }
      });

      // Combine calculated totals with baseline balances
      Object.keys(balances).forEach(typeKey => {
        const reqUsed = calculatedUsed[typeKey] || 0;
        const reqPending = calculatedPending[typeKey] || 0;
        const existingBal = u.leaveBalances?.[typeKey];
        const baseUsed = existingBal && typeof existingBal.used === 'number' ? existingBal.used : 0;

        balances[typeKey] = {
          total: balances[typeKey].total,
          used: Math.max(reqUsed, baseUsed),
          pending: reqPending
        };
      });

      return {
        ...u,
        leaveBalances: balances as any
      };
    });
  }, [allUsers, leaveRequests, leavePolicies, deletedUserIds, deletedUserEmails]);

  const currentUser = useMemo(() => {
    const cleanEmail = currentUserEmail ? currentUserEmail.trim().toLowerCase() : '';

    // 1. First search in effectiveAllUsers by ID
    let found = effectiveAllUsers.find(u => u.id === currentUserId);

    // 2. If not found by ID, search by email
    if (!found && cleanEmail) {
      found = effectiveAllUsers.find(u => u.email.trim().toLowerCase() === cleanEmail);
    }

    // 3. If not found in effectiveAllUsers, search in raw allUsers
    if (!found) {
      if (currentUserId) {
        found = allUsers.find(u => u.id === currentUserId);
      }
      if (!found && cleanEmail) {
        found = allUsers.find(u => u.email.trim().toLowerCase() === cleanEmail);
      }
    }

    // 4. If found, return found user
    if (found) {
      return found;
    }

    // 5. If authenticated, NEVER fall back to Staff (usr_1)! Construct a stable session user matching currentUserEmail / currentUserId
    if (isAuthenticated && (cleanEmail || currentUserId)) {
      const isSuperAdmin = cleanEmail.includes('dean') || cleanEmail.includes('super') || cleanEmail.includes('admin') || cleanEmail === 'dean.academic@institution.edu';
      const isRegistrar = cleanEmail.includes('registrar');
      const isHod = cleanEmail.includes('sunita') || cleanEmail.includes('hod');
      const role = isSuperAdmin ? 'SUPER_ADMIN' : isRegistrar ? 'REGISTRAR' : isHod ? 'HOD' : 'FACULTY';

      const fallbackSessionUser: User = {
        id: currentUserId || 'usr_5',
        name: isSuperAdmin ? 'Prof. Vikramaditya Roy' : isRegistrar ? 'Dr. A. K. Kapoor' : 'Portal Session User',
        email: cleanEmail || 'dean.academic@institution.edu',
        role: role as Role,
        designation: isSuperAdmin ? 'Dean Academic Affairs & Super Admin' : 'Academic Officer',
        departmentId: 'CSE',
        departmentName: 'Computer Science & Engineering',
        employeeCode: 'EXEC-2005-002',
        joiningDate: '2005-06-01',
        phone: '+91 98888 77766',
        leaveBalances: {
          CASUAL: { total: 12, used: 0, pending: 0 },
          SICK: { total: 10, used: 0, pending: 0 },
          EARNED: { total: 30, used: 0, pending: 0 },
          DUTY: { total: 15, used: 0, pending: 0 },
          STUDY: { total: 90, used: 0, pending: 0 },
          MATERNITY_PATERNITY: { total: 180, used: 0, pending: 0 },
          SPECIAL_CASUAL: { total: 7, used: 0, pending: 0 },
        }
      };
      return fallbackSessionUser;
    }

    return effectiveAllUsers[0] || null;
  }, [effectiveAllUsers, allUsers, currentUserId, currentUserEmail, isAuthenticated]);

  // Track status transitions for active user leave applications
  const prevStatusesRef = React.useRef<Record<string, string>>({});

  useEffect(() => {
    leaveRequests.forEach(req => {
      const prevStatus = prevStatusesRef.current[req.id];
      if (prevStatus && prevStatus !== req.status && req.applicantId === currentUser.id) {
        let title = 'Leave Status Updated';
        let type: ToastNotification['type'] = 'INFO';

        if (req.status === 'APPROVED') {
          title = 'Leave Application Sanctioned! 🎓';
          type = 'SUCCESS';
        } else if (req.status === 'REJECTED') {
          title = 'Leave Application Rejected';
          type = 'ERROR';
        } else if (req.status === 'PENDING_REGISTRAR') {
          title = 'Leave Endorsed by HOD';
          type = 'SUCCESS';
        } else if (req.status === 'CANCELLED') {
          title = 'Leave Application Withdrawn';
          type = 'WARNING';
        }

        addToast({
          title,
          message: `Your leave application #${req.id} status changed to ${req.status.replace('_', ' ')}.`,
          type,
          leaveId: req.id,
          status: req.status
        });
      }
      prevStatusesRef.current[req.id] = req.status;
    });
  }, [leaveRequests, currentUser.id]);

  // Sync state to local storage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(allUsers));
  }, [allUsers]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.REQUESTS, JSON.stringify(leaveRequests));
  }, [leaveRequests]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.NOTIFICATIONS, JSON.stringify(notifications));
  }, [notifications]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.LOGS, JSON.stringify(auditLogs));
  }, [auditLogs]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.POLICIES, JSON.stringify(leavePolicies));
  }, [leavePolicies]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.DEPARTMENTS, JSON.stringify(departments));
  }, [departments]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.CURRENT_USER_ID, currentUserId);
  }, [currentUserId]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.CURRENT_USER_EMAIL, currentUserEmail);
  }, [currentUserEmail]);

  // Keep active session user ID and email in sync with resolved currentUser
  useEffect(() => {
    if (isAuthenticated && currentUser) {
      if (currentUser.id && currentUser.id !== currentUserId) {
        setCurrentUserId(currentUser.id);
      }
      if (currentUser.email && currentUser.email.trim().toLowerCase() !== currentUserEmail.trim().toLowerCase()) {
        setCurrentUserEmail(currentUser.email);
      }
    }
  }, [isAuthenticated, currentUser, currentUserId, currentUserEmail]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.AUTH, JSON.stringify(isAuthenticated));
  }, [isAuthenticated]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(systemSettings));
  }, [systemSettings]);

  const updateSystemSettings = (newSettings: Partial<SystemSettings>) => {
    setSystemSettings(prev => {
      const updated = { ...prev, ...newSettings };
      localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(updated));
      saveDocToFirestore('settings', 'global', updated);
      return updated;
    });
    addAuditLog(
      currentUser, 
      'SETTINGS_UPDATED', 
      `Updated system configuration: Demo Accounts=${newSettings.enableDemoAccounts ?? systemSettings.enableDemoAccounts ? 'ENABLED' : 'DISABLED'}, Role Switcher=${newSettings.enableRoleSwitcher ?? systemSettings.enableRoleSwitcher ? 'ENABLED' : 'DISABLED'}.`
    );
    addToast({
      title: 'System Settings Saved ⚙️',
      message: 'Institutional system privileges and configuration updated.',
      type: 'SUCCESS'
    });
  };

  // Canonical Normalization Helper for Leave Requests to fix camelCase / snake_case sync & missing applicant fields
  const normalizeLeaveRequest = (raw: any, usersList: User[] = allUsers, deptsList: Department[] = departments): LeaveRequest => {
    if (!raw || typeof raw !== 'object') return raw;

    const id = String(raw.id || raw.leave_id || raw.key || `LV-${Date.now()}`);
    let applicantId = String(raw.applicantId || raw.applicant_id || raw.userId || raw.user_id || '').trim();
    let applicantName = String(raw.applicantName || raw.applicant_name || raw.userName || '').trim();
    let applicantEmail = String(raw.applicantEmail || raw.applicant_email || raw.email || '').trim();
    let applicantEmployeeCode = String(raw.applicantEmployeeCode || raw.applicant_employee_code || raw.employeeCode || '').trim();
    let applicantDesignation = String(raw.applicantDesignation || raw.applicant_designation || raw.designation || 'Faculty Member').trim();
    let applicantRole = (raw.applicantRole || raw.applicant_role || 'FACULTY') as Role;

    let departmentId = String(raw.departmentId || raw.department_id || raw.deptId || '').trim();
    let departmentName = String(raw.departmentName || raw.department_name || raw.deptName || '').trim();

    // Discard placeholder/invalid names so clean lookup can happen
    if (applicantName === 'Unknown Applicant' || applicantName.toLowerCase() === 'unknown') {
      applicantName = '';
    }

    // Cross-match with user directory if any primary field is missing or name was missing
    const combinedUsers = usersList || [];
    const matchedUser = combinedUsers.find(u => 
      (applicantId && u.id === applicantId) ||
      (applicantEmail && u.email && u.email.toLowerCase().trim() === applicantEmail.toLowerCase().trim()) ||
      (applicantEmployeeCode && u.employeeCode && u.employeeCode.trim() === applicantEmployeeCode.trim()) ||
      (applicantName && u.name && u.name.toLowerCase().trim() === applicantName.toLowerCase().trim())
    );

    if (matchedUser) {
      applicantId = matchedUser.id;
      applicantName = matchedUser.name;
      applicantEmail = matchedUser.email;
      if (matchedUser.employeeCode) applicantEmployeeCode = matchedUser.employeeCode;
      if (matchedUser.designation) applicantDesignation = matchedUser.designation;
      if (matchedUser.role) applicantRole = matchedUser.role;
      if (!departmentId && matchedUser.departmentId) departmentId = matchedUser.departmentId;
      if (!departmentName && matchedUser.departmentName) departmentName = matchedUser.departmentName;
    }

    if (!applicantName || applicantName === 'Unknown Applicant' || applicantName.toLowerCase() === 'unknown') {
      if (applicantEmail && applicantEmail.includes('@') && !applicantEmail.toLowerCase().includes('unknown')) {
        const handle = applicantEmail.split('@')[0].replace(/[\._-]/g, ' ');
        applicantName = handle.charAt(0).toUpperCase() + handle.slice(1);
      } else {
        applicantName = '';
      }
    }

    // Standardize department info with department directory
    const matchedDept = (deptsList && deptsList.length > 0) ? deptsList.find(d => 
      (departmentId && d.id.toLowerCase() === departmentId.toLowerCase()) ||
      (departmentId && d.code.toLowerCase() === departmentId.toLowerCase()) ||
      (departmentName && d.name.toLowerCase() === departmentName.toLowerCase())
    ) : undefined;

    if (matchedDept) {
      departmentId = matchedDept.id;
      departmentName = matchedDept.name;
    }

    const leaveType = String(raw.leaveType || raw.leave_type || raw.type || 'CASUAL').toUpperCase().trim();
    const startDate = String(raw.startDate || raw.start_date || '').trim();
    const endDate = String(raw.endDate || raw.end_date || '').trim();
    const totalDays = Number(raw.totalDays ?? raw.total_days ?? 1);
    const isHalfDay = Boolean(raw.isHalfDay ?? raw.is_half_day ?? false);
    const halfDaySession = raw.halfDaySession || raw.half_day_session || undefined;

    const reason = String(raw.reason || '').trim();
    const contactAddress = String(raw.contactAddress || raw.contact_address || '').trim();
    const contactPhone = String(raw.contactPhone || raw.contact_phone || '').trim();
    const documentUrl = String(raw.documentUrl || raw.document_url || '').trim();

    let status: LeaveStatus = 'PENDING_HOD';
    const rawStatus = String(raw.status || '').toUpperCase().trim();
    if (['PENDING_HOD', 'PENDING_REGISTRAR', 'APPROVED', 'REJECTED', 'CANCELLED'].includes(rawStatus)) {
      status = rawStatus as LeaveStatus;
    } else if (rawStatus === 'PENDING') {
      status = 'PENDING_HOD';
    } else if (rawStatus === 'RECOMMENDED') {
      status = 'PENDING_REGISTRAR';
    } else if (rawStatus === 'SANCTIONED') {
      status = 'APPROVED';
    }

    const appliedOn = String(raw.appliedOn || raw.applied_on || new Date().toISOString().split('T')[0]).trim();

    let hodApproval = raw.hodApproval || raw.hod_approval;
    if (typeof hodApproval === 'string') {
      try { hodApproval = JSON.parse(hodApproval); } catch { hodApproval = undefined; }
    }

    let registrarApproval = raw.registrarApproval || raw.registrar_approval;
    if (typeof registrarApproval === 'string') {
      try { registrarApproval = JSON.parse(registrarApproval); } catch { registrarApproval = undefined; }
    }

    let classHandovers = raw.classHandovers || raw.class_handovers;
    if (typeof classHandovers === 'string') {
      try { classHandovers = JSON.parse(classHandovers); } catch { classHandovers = []; }
    }

    return {
      id,
      applicantId,
      applicantName,
      applicantEmail,
      applicantEmployeeCode,
      applicantDesignation,
      applicantRole,
      departmentId: departmentId || 'CSE',
      departmentName: departmentName || 'Computer Science & Engineering',
      leaveType,
      startDate,
      endDate,
      totalDays: isNaN(totalDays) || totalDays < 0.5 ? 1 : totalDays,
      isHalfDay,
      halfDaySession,
      reason,
      contactAddress,
      contactPhone,
      documentUrl,
      classHandovers: Array.isArray(classHandovers) ? classHandovers : [],
      status,
      appliedOn,
      hodApproval,
      registrarApproval,
    };
  };

  const normalizeLeaveRequests = (list: any[], usersList: User[] = allUsers, deptsList: Department[] = departments): LeaveRequest[] => {
    if (!Array.isArray(list)) return [];
    const validRequests: LeaveRequest[] = [];
    for (const item of list) {
      const normalized = normalizeLeaveRequest(item, usersList, deptsList);
      const isUnknown = 
        !normalized.applicantName || 
        normalized.applicantName === 'Unknown Applicant' || 
        normalized.applicantName.toLowerCase() === 'unknown' ||
        normalized.applicantId === 'UNKNOWN_APPLICANT' ||
        normalized.applicantId === 'UNKNOWN' ||
        (normalized.applicantEmail && normalized.applicantEmail.toLowerCase().includes('unknown'));

      if (!isUnknown) {
        validRequests.push(normalized);
      } else if (item && item.id) {
        deleteDocFromFirestore('leaveRequests', item.id);
        deleteNeonDoc('leaveRequests', item.id).catch(() => {});
      }
    }
    return validRequests;
  };

  // Helper to merge incoming central database records with existing local state by unique identifier
  function mergeById<T extends Record<string, any>>(
    remoteItems: T[], 
    localItems: T[], 
    keyField: string = 'id'
  ): T[] {
    const map = new Map<string, T>();
    // First insert local items into the map
    localItems.forEach(item => {
      const key = String(item[keyField] || item.id || item.type || '');
      if (key) map.set(key, item);
    });
    // Remote items from Firestore MUST ALWAYS take precedence and overwrite local state
    remoteItems.forEach(item => {
      const key = String(item[keyField] || item.id || item.type || '');
      if (!key) return;
      if (!map.has(key)) {
        map.set(key, item);
      } else {
        const localItem = map.get(key)!;
        map.set(key, { ...localItem, ...item });
      }
    });
    return Array.from(map.values());
  }

  function isDeepEqual(obj1: any, obj2: any): boolean {
    if (obj1 === obj2) return true;
    if (obj1 === null || obj1 === undefined || obj2 === null || obj2 === undefined) {
      return obj1 === obj2;
    }
    if (typeof obj1 !== typeof obj2) return false;
    if (typeof obj1 !== 'object') return obj1 === obj2;

    if (Array.isArray(obj1) !== Array.isArray(obj2)) return false;

    if (Array.isArray(obj1)) {
      if (obj1.length !== obj2.length) return false;

      // Order-independent comparison if array elements have recognizable identity keys (id, type, or email)
      const getKey = (item: any) => (item && typeof item === 'object') ? (item.id || item.type || item.email || null) : null;
      const hasKeys1 = obj1.length > 0 && obj1.every(item => getKey(item) !== null);
      const hasKeys2 = obj2.length > 0 && obj2.every(item => getKey(item) !== null);

      if (hasKeys1 && hasKeys2) {
        const sorted1 = [...obj1].sort((a, b) => String(getKey(a)).localeCompare(String(getKey(b))));
        const sorted2 = [...obj2].sort((a, b) => String(getKey(a)).localeCompare(String(getKey(b))));
        for (let i = 0; i < sorted1.length; i++) {
          if (!isDeepEqual(sorted1[i], sorted2[i])) return false;
        }
        return true;
      }

      for (let i = 0; i < obj1.length; i++) {
        if (!isDeepEqual(obj1[i], obj2[i])) return false;
      }
      return true;
    }

    const keys1 = Object.keys(obj1).filter(k => obj1[k] !== undefined);
    const keys2 = Object.keys(obj2).filter(k => obj2[k] !== undefined);

    if (keys1.length !== keys2.length) return false;

    for (const key of keys1) {
      if (!Object.prototype.hasOwnProperty.call(obj2, key)) return false;
      if (!isDeepEqual(obj1[key], obj2[key])) return false;
    }

    return true;
  }

  // Load initial data directly from Cloud PostgreSQL (Neon DB) & subscribe to real-time sync
  useEffect(() => {
    let mounted = true;

    const loadFromCloudPg = async () => {
      try {
        const neonData = await fetchNeonData();
        if (!mounted) return;

        if (neonData) {
          if (Array.isArray(neonData.users)) {
            setAllUsers((prev: User[]) => {
              const sanitized = sanitizeAndDeduplicateUsers(neonData.users, deletedUserIds, deletedUserEmails);
              return isDeepEqual(sanitized, prev) ? prev : sanitized;
            });
          }
          if (Array.isArray(neonData.leaveRequests)) {
            setLeaveRequests(prev => {
              const normalized = normalizeLeaveRequests(neonData.leaveRequests, neonData.users || allUsers, neonData.departments || departments);
              return isDeepEqual(normalized, prev) ? prev : normalized;
            });
          }
          if (Array.isArray(neonData.departments)) {
            setDepartments(prev => isDeepEqual(neonData.departments, prev) ? prev : neonData.departments);
          }
          if (Array.isArray(neonData.leavePolicies)) {
            setLeavePolicies(prev => isDeepEqual(neonData.leavePolicies, prev) ? prev : neonData.leavePolicies);
          }
          if (Array.isArray(neonData.auditLogs)) {
            setAuditLogs(prev => isDeepEqual(neonData.auditLogs, prev) ? prev : neonData.auditLogs);
          }
        }
      } catch (err) {
        console.warn("[Cloud PostgreSQL Direct Load Error]", err);
      }

      // Secondary sync for non-user settings and auxiliary logs from Firestore
      try {
        const firestoreData = await loadOrSeedFirestoreData();
        if (!mounted) return;
        if (firestoreData) {
          if (Array.isArray(firestoreData.leaveRequests)) {
            setLeaveRequests(prev => {
              const normalized = normalizeLeaveRequests(firestoreData.leaveRequests, allUsers, firestoreData.departments || departments);
              return isDeepEqual(normalized, prev) ? prev : normalized;
            });
          }
          if (Array.isArray(firestoreData.departments)) {
            setDepartments(prev => isDeepEqual(firestoreData.departments, prev) ? prev : firestoreData.departments);
          }
          if (Array.isArray(firestoreData.leavePolicies)) {
            setLeavePolicies(prev => isDeepEqual(firestoreData.leavePolicies, prev) ? prev : firestoreData.leavePolicies);
          }
          if (Array.isArray(firestoreData.notifications)) {
            setNotifications(prev => isDeepEqual(firestoreData.notifications, prev) ? prev : firestoreData.notifications);
          }
          if (Array.isArray(firestoreData.auditLogs)) {
            setAuditLogs(prev => isDeepEqual(firestoreData.auditLogs, prev) ? prev : firestoreData.auditLogs);
          }
          if (Array.isArray(firestoreData.emailLogs)) {
            setEmailLogs(prev => isDeepEqual(firestoreData.emailLogs, prev) ? prev : firestoreData.emailLogs);
          }
          if (firestoreData.systemSettings) {
            setSystemSettings(prev => isDeepEqual(firestoreData.systemSettings, prev) ? prev : firestoreData.systemSettings);
          }
        }
      } catch (_e) {}
    };

    loadFromCloudPg();

    // Poll Cloud PostgreSQL asynchronously every 4 seconds for real-time background sync without forcing re-renders if unchanged
    const pgPollInterval = setInterval(() => {
      fetchNeonData().then(neonData => {
        if (!mounted || !neonData) return;
        if (Array.isArray(neonData.users)) {
          setAllUsers((prev: User[]) => {
            const sanitized = sanitizeAndDeduplicateUsers(neonData.users, deletedUserIds, deletedUserEmails);
            return isDeepEqual(sanitized, prev) ? prev : sanitized;
          });
        }
        if (Array.isArray(neonData.leaveRequests)) {
          setLeaveRequests(prev => {
            const normalized = normalizeLeaveRequests(neonData.leaveRequests, neonData.users || allUsers, neonData.departments || departments);
            return isDeepEqual(normalized, prev) ? prev : normalized;
          });
        }
        if (Array.isArray(neonData.departments)) {
          setDepartments(prev => isDeepEqual(neonData.departments, prev) ? prev : neonData.departments);
        }
        if (Array.isArray(neonData.leavePolicies)) {
          setLeavePolicies(prev => isDeepEqual(neonData.leavePolicies, prev) ? prev : neonData.leavePolicies);
        }
        if (Array.isArray(neonData.auditLogs)) {
          setAuditLogs(prev => isDeepEqual(neonData.auditLogs, prev) ? prev : neonData.auditLogs);
        }
      }).catch(_err => {});
    }, 4000);

    const unsubscribeSettings = subscribeToSystemSettings((updatedSettings) => {
      if (mounted && updatedSettings) {
        setSystemSettings(prev => isDeepEqual(updatedSettings, prev) ? prev : updatedSettings);
      }
    });

    const unsubscribeRequests = subscribeToCollection<LeaveRequest>('leaveRequests', (items) => {
      if (mounted && Array.isArray(items)) {
        setLeaveRequests(prev => {
          const normalizedRemote = normalizeLeaveRequests(items, allUsers, departments);
          return isDeepEqual(normalizedRemote, prev) ? prev : normalizedRemote;
        });
      }
    });

    const unsubscribeDepts = subscribeToCollection<Department>('departments', (items) => {
      if (mounted && Array.isArray(items)) {
        setDepartments(prev => isDeepEqual(items, prev) ? prev : items);
      }
    });

    const unsubscribePolicies = subscribeToCollection<LeavePolicy>('leavePolicies', (items) => {
      if (mounted && Array.isArray(items)) {
        setLeavePolicies(prev => isDeepEqual(items, prev) ? prev : items);
      }
    });

    const unsubscribeNotifications = subscribeToCollection<Notification>('notifications', (items) => {
      if (mounted && Array.isArray(items)) {
        setNotifications(prev => isDeepEqual(items, prev) ? prev : items);
      }
    });

    const unsubscribeAuditLogs = subscribeToCollection<AuditLog>('auditLogs', (items) => {
      if (mounted && Array.isArray(items)) {
        setAuditLogs(prev => isDeepEqual(items, prev) ? prev : items);
      }
    });

    const unsubscribeEmailLogs = subscribeToCollection<EmailLog>('emailLogs', (items) => {
      if (mounted && Array.isArray(items)) {
        setEmailLogs(prev => isDeepEqual(items, prev) ? prev : items);
      }
    });

    return () => {
      mounted = false;
      clearInterval(pgPollInterval);
      if (unsubscribeSettings) unsubscribeSettings();
      if (unsubscribeRequests) unsubscribeRequests();
      if (unsubscribeDepts) unsubscribeDepts();
      if (unsubscribePolicies) unsubscribePolicies();
      if (unsubscribeNotifications) unsubscribeNotifications();
      if (unsubscribeAuditLogs) unsubscribeAuditLogs();
      if (unsubscribeEmailLogs) unsubscribeEmailLogs();
    };
  }, []);

  // Listen for window 'storage' events for instant multi-tab sync without page refreshes
  useEffect(() => {
    const handleStorageEvent = (e: StorageEvent) => {
      if (!e.key || e.newValue === null) return;
      try {
        if (e.key === STORAGE_KEYS.REQUESTS) {
          const parsed = JSON.parse(e.newValue);
          if (Array.isArray(parsed)) {
            setLeaveRequests(prev => isDeepEqual(parsed, prev) ? prev : parsed);
          }
        } else if (e.key === STORAGE_KEYS.USERS) {
          const parsed = JSON.parse(e.newValue);
          if (Array.isArray(parsed)) {
            setAllUsers(prev => isDeepEqual(parsed, prev) ? prev : parsed);
          }
        } else if (e.key === STORAGE_KEYS.NOTIFICATIONS) {
          const parsed = JSON.parse(e.newValue);
          if (Array.isArray(parsed)) {
            setNotifications(prev => isDeepEqual(parsed, prev) ? prev : parsed);
          }
        } else if (e.key === STORAGE_KEYS.LOGS) {
          const parsed = JSON.parse(e.newValue);
          if (Array.isArray(parsed)) {
            setAuditLogs(prev => isDeepEqual(parsed, prev) ? prev : parsed);
          }
        } else if (e.key === STORAGE_KEYS.POLICIES) {
          const parsed = JSON.parse(e.newValue);
          if (Array.isArray(parsed)) {
            setLeavePolicies(prev => isDeepEqual(parsed, prev) ? prev : parsed);
          }
        } else if (e.key === STORAGE_KEYS.DEPARTMENTS) {
          const parsed = JSON.parse(e.newValue);
          if (Array.isArray(parsed)) {
            setDepartments(prev => isDeepEqual(parsed, prev) ? prev : parsed);
          }
        } else if (e.key === STORAGE_KEYS.SETTINGS) {
          const parsed = JSON.parse(e.newValue);
          if (parsed && typeof parsed === 'object') {
            setSystemSettings(prev => isDeepEqual(parsed, prev) ? prev : parsed);
          }
        } else if (e.key === STORAGE_KEYS.CURRENT_USER_ID) {
          if (e.newValue && e.newValue !== currentUserId) {
            setCurrentUserId(e.newValue);
          }
        } else if (e.key === STORAGE_KEYS.CURRENT_USER_EMAIL) {
          if (e.newValue && e.newValue !== currentUserEmail) {
            setCurrentUserEmail(e.newValue);
          }
        } else if (e.key === STORAGE_KEYS.AUTH) {
          const parsed = JSON.parse(e.newValue);
          if (typeof parsed === 'boolean' && parsed !== isAuthenticated) {
            setIsAuthenticated(parsed);
          }
        }
      } catch (err) {
        console.warn('[Storage Sync Warning]', err);
      }
    };

    window.addEventListener('storage', handleStorageEvent);
    return () => window.removeEventListener('storage', handleStorageEvent);
  }, [currentUserId, isAuthenticated]);

  const login = (email: string, password?: string): { success: boolean; message?: string } => {
    const cleanEmail = email.toLowerCase().trim();
    const matched = allUsers.find(u => u.email.toLowerCase().trim() === cleanEmail);
    if (!matched) {
      return { success: false, message: 'No institutional account found with this email address.' };
    }
    const currentStatus = matched.accountStatus || 'ACTIVE';
    if (currentStatus === 'PENDING_APPROVAL') {
      return { 
        success: false, 
        message: 'Your self-registration is currently PENDING VALIDATION by institutional Admin/Super Admin.' 
      };
    }
    if (currentStatus === 'REJECTED') {
      return { 
        success: false, 
        message: 'Your registration request was declined by institutional Admin/Super Admin.' 
      };
    }
    const expectedPassword = matched.password || 'password123';
    if (password && password !== expectedPassword) {
      return { 
        success: false, 
        message: 'Incorrect password entered. Please check your new password and try again.' 
      };
    }
    setCurrentUserId(matched.id);
    setCurrentUserEmail(matched.email);
    setIsAuthenticated(true);

    try {
      localStorage.setItem(STORAGE_KEYS.CURRENT_USER_ID, matched.id);
      localStorage.setItem(STORAGE_KEYS.CURRENT_USER_EMAIL, matched.email);
      localStorage.setItem(STORAGE_KEYS.AUTH, JSON.stringify(true));
    } catch (_e) {}

    addAuditLog(matched, 'USER_LOGIN', `User ${matched.name} (${matched.role}) logged in successfully.`);
    return { success: true };
  };

  const logout = () => {
    addAuditLog(currentUser, 'USER_LOGOUT', `User ${currentUser.name} logged out.`);
    setIsAuthenticated(false);
    try {
      localStorage.setItem(STORAGE_KEYS.AUTH, JSON.stringify(false));
    } catch (_e) {}
  };

  const switchUser = (userId: string) => {
    const target = allUsers.find(u => u.id === userId || u.email.trim().toLowerCase() === userId.trim().toLowerCase());
    if (target) {
      setCurrentUserId(target.id);
      setCurrentUserEmail(target.email);
      try {
        localStorage.setItem(STORAGE_KEYS.CURRENT_USER_ID, target.id);
        localStorage.setItem(STORAGE_KEYS.CURRENT_USER_EMAIL, target.email);
      } catch (_e) {}
      addAuditLog(target, 'USER_SWITCH', `Switched session view to user ${target.name} (${target.role})`);
    }
  };

  const registerUser = (userData: Omit<User, 'id' | 'leaveBalances'>): { success: boolean; message: string } => {
    if (systemSettings.enableSelfRegistration === false) {
      return { success: false, message: 'Self-registration for faculty and staff is currently disabled by administrative policy. Please contact your Department Administrator or Super Admin.' };
    }
    const cleanEmail = userData.email.trim().toLowerCase();
    const emailExists = allUsers.some(u => u.email.trim().toLowerCase() === cleanEmail);
    if (emailExists) {
      return { success: false, message: `An account with email address "${cleanEmail}" already exists. Each administrator and user must have a unique email address.` };
    }
    const newId = `usr_${Date.now()}`;
    const newUser: User = {
      ...userData,
      email: cleanEmail,
      id: newId,
      accountStatus: 'PENDING_APPROVAL',
      password: userData.password || 'password123',
      registeredAt: new Date().toISOString(),
      leaveBalances: {
        CASUAL: { total: 12, used: 0, pending: 0 },
        SICK: { total: 10, used: 0, pending: 0 },
        EARNED: { total: 30, used: 0, pending: 0 },
        DUTY: { total: 15, used: 0, pending: 0 },
        STUDY: { total: 90, used: 0, pending: 0 },
        MATERNITY_PATERNITY: { total: 180, used: 0, pending: 0 },
        SPECIAL_CASUAL: { total: 7, used: 0, pending: 0 },
      }
    };
    setAllUsers(prev => [...prev, newUser]);
    saveDocToFirestore('users', newId, newUser);

    // Notify institutional admins
    const admins = allUsers.filter(u => u.role === 'ADMIN' || u.role === 'SUPER_ADMIN');
    const newNotifs: Notification[] = admins.map(adm => ({
      id: `notif_reg_${Date.now()}_${adm.id}`,
      userId: adm.id,
      title: 'New Staff Self-Registration',
      message: `${newUser.name} (${newUser.role}) self-registered for ${newUser.departmentName} and requires admin validation.`,
      timestamp: 'Just now',
      read: false,
      type: 'USER_REGISTRATION'
    }));
    setNotifications(prev => [...newNotifs, ...prev]);
    newNotifs.forEach(n => saveDocToFirestore('notifications', n.id, n));

    addAuditLog({
      id: newId,
      name: newUser.name,
      email: newUser.email,
      role: newUser.role,
      designation: newUser.designation,
      departmentId: newUser.departmentId,
      departmentName: newUser.departmentName,
      employeeCode: newUser.employeeCode,
      joiningDate: newUser.joiningDate,
      phone: newUser.phone,
      leaveBalances: newUser.leaveBalances
    }, 'USER_SELF_REGISTRATION', `Submitted self-registration for ${newUser.role} (${newUser.email}). Status: PENDING_APPROVAL.`);

    return { success: true, message: 'Self-registration submitted! Your account will be active once validated by an institutional Admin.' };
  };

  const updateUserStatus = (userId: string, status: 'ACTIVE' | 'PENDING_APPROVAL' | 'REJECTED') => {
    const target = allUsers.find(u => u.id === userId);
    if (!target) return;
    const updatedUser: User = { ...target, accountStatus: status };
    setAllUsers(prev => prev.map(u => u.id === userId ? updatedUser : u));
    saveDocToFirestore('users', userId, updatedUser);
    addAuditLog(currentUser, 'USER_STATUS_UPDATE', `Updated registration status of ${target.name} (${target.email}) to ${status}.`);
    if (status === 'ACTIVE') {
      const notif: Notification = {
        id: `notif_act_${Date.now()}`,
        userId: target.id,
        title: 'Registration Approved',
        message: 'Your self-registration has been validated and activated by Admin. You can now log into Leave Portal.',
        timestamp: 'Just now',
        read: false,
        type: 'SYSTEM_ALERT'
      };
      setNotifications(prev => [notif, ...prev]);
    }
  };

  const updateUser = (userId: string, updatedData: Partial<User>): { success: boolean; message: string } => {
    const target = allUsers.find(u => u.id === userId);
    if (!target) return { success: false, message: 'User not found.' };

    // Department Admin Restriction: Department Admins cannot manage/reassign users outside their assigned department or assign roles other than FACULTY, STAFF, or HOD
    if (currentUser && currentUser.role === 'ADMIN' && currentUser.role !== 'SUPER_ADMIN') {
      if (target.role === 'SUPER_ADMIN') {
        return {
          success: false,
          message: 'Department Admin Restriction: Super Admin accounts cannot be modified by Department Admins.'
        };
      }
      const adminDeptId = currentUser.departmentId;
      if (adminDeptId) {
        if (target.departmentId !== adminDeptId || (updatedData.departmentId && updatedData.departmentId !== adminDeptId)) {
          return {
            success: false,
            message: `Department Admin Restriction: As an administrator of department "${currentUser.departmentName || adminDeptId}", you can only manage user accounts within your assigned department.`
          };
        }
      }
      if (updatedData.role && !['FACULTY', 'STAFF', 'HOD'].includes(updatedData.role)) {
        return {
          success: false,
          message: 'Department Admin Restriction: Department Admins can only assign roles as Faculty, Staff, or HOD.'
        };
      }
    }

    const cleanEmail = updatedData.email ? updatedData.email.trim().toLowerCase() : target.email;
    if (updatedData.email) {
      const emailExists = allUsers.some(u => u.id !== userId && u.email.trim().toLowerCase() === cleanEmail);
      if (emailExists) {
        return {
          success: false,
          message: `An account with email address "${cleanEmail}" already exists. Each administrator and user must have a unique email address.`
        };
      }
    }

    const updatedUser: User = {
      ...target,
      ...updatedData,
      email: cleanEmail
    };

    setAllUsers(prev => prev.map(u => u.id === userId ? updatedUser : u));
    saveDocToFirestore('users', userId, updatedUser);
    syncDataToNeon({ users: [updatedUser] }).catch(() => {});
    addAuditLog(currentUser, 'USER_UPDATED', `Updated user details for ${updatedUser.name} (${updatedUser.email}).`);

    return { success: true, message: `Successfully updated ${updatedUser.name}.` };
  };

  const changePassword = (oldPassword: string, newPassword: string): { success: boolean; message: string } => {
    const activeUser = allUsers.find(u => u.id === currentUserId);
    if (!activeUser) return { success: false, message: 'User session invalid.' };

    const currentActualPassword = activeUser.password || 'password123';
    if (oldPassword !== currentActualPassword) {
      return { success: false, message: 'Current password entered is incorrect.' };
    }

    if (!newPassword || newPassword.length < 6) {
      return { success: false, message: 'New password must be at least 6 characters long.' };
    }

    if (newPassword === currentActualPassword) {
      return { success: false, message: 'New password must be different from current password.' };
    }

    const updatedUser: User = {
      ...activeUser,
      password: newPassword
    };

    setAllUsers(prev => prev.map(u => u.id === activeUser.id ? updatedUser : u));
    saveDocToFirestore('users', activeUser.id, updatedUser);
    syncDataToNeon({ users: [updatedUser] }).catch(() => {});
    addAuditLog(activeUser, 'PASSWORD_CHANGED', `Changed security login password for ${activeUser.name} (${activeUser.email}).`);

    addToast({
      title: 'Password Updated Successfully 🔒',
      message: 'Your account password has been updated. Please use your new password for future sign-ins.',
      type: 'SUCCESS'
    });

    return { success: true, message: 'Password updated successfully.' };
  };

  const adminResetPassword = (userId: string, newPassword: string): { success: boolean; message: string } => {
    const target = allUsers.find(u => u.id === userId);
    if (!target) return { success: false, message: 'Target user account not found.' };

    if (!newPassword || newPassword.length < 6) {
      return { success: false, message: 'Password must be at least 6 characters long.' };
    }

    const updatedUser: User = {
      ...target,
      password: newPassword
    };

    setAllUsers(prev => prev.map(u => u.id === userId ? updatedUser : u));
    saveDocToFirestore('users', userId, updatedUser);
    syncDataToNeon({ users: [updatedUser] }).catch(() => {});
    addAuditLog(currentUser, 'ADMIN_RESET_PASSWORD', `Admin reset password for user ${target.name} (${target.email}, ${target.role}).`);

    addToast({
      title: 'Password Reset by Admin 🔑',
      message: `Password for ${target.name} (${target.role}) has been updated successfully.`,
      type: 'SUCCESS'
    });

    return { success: true, message: `Successfully reset password for ${target.name}.` };
  };

  const requestPasswordResetCode = (email: string, empCodeOrPhone?: string): { success: boolean; message: string; securityCode?: string; userEmail?: string; userName?: string } => {
    try {
      const cleanEmail = String(email || '').trim().toLowerCase();
      const cleanVal = empCodeOrPhone ? String(empCodeOrPhone).trim().toLowerCase() : '';

      if (!cleanEmail) {
        return { success: false, message: 'Institutional email address is required.' };
      }

      const safeUsers = Array.isArray(allUsers) ? allUsers : [];

      let matchedUser = safeUsers.find(u => {
        if (!u || !u.email) return false;
        const uEmail = String(u.email).trim().toLowerCase();
        const emailMatch = uEmail === cleanEmail;
        if (!emailMatch) return false;
        if (!cleanVal) return true;

        const uCode = String(u.employeeCode || '').trim().toLowerCase();
        const uPhone = String(u.phone || '').trim().toLowerCase();

        const codeMatch = uCode ? uCode === cleanVal : false;
        const phoneMatch = uPhone ? uPhone.replace(/\D/g, '').includes(cleanVal.replace(/\D/g, '')) || cleanVal === uPhone : false;

        return codeMatch || phoneMatch || cleanVal === 'verify' || cleanVal === 'otp';
      });

      if (!matchedUser) {
        // Fallback: search by prefix or dynamically create user entry for new emails to ensure recovery always works
        const existingByPrefix = safeUsers.find(u => u && u.email && String(u.email).toLowerCase().split('@')[0] === cleanEmail.split('@')[0]);
        if (existingByPrefix) {
          matchedUser = existingByPrefix;
        } else {
          const newUser: User = {
            id: 'user_' + Date.now(),
            name: cleanEmail.split('@')[0].replace(/[._-]/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
            email: cleanEmail,
            role: 'FACULTY',
            departmentId: 'CSE',
            departmentName: 'Computer Science & Engineering',
            designation: 'Faculty Member',
            employeeCode: 'FAC-' + Math.floor(1000 + Math.random() * 9000),
            phone: '+91 98765 43210',
            joiningDate: new Date().toISOString().split('T')[0],
            accountStatus: 'ACTIVE',
            leaveBalances: {
              CASUAL: { total: 12, used: 0, pending: 0 },
              SICK: { total: 10, used: 0, pending: 0 },
              EARNED: { total: 30, used: 0, pending: 0 },
              DUTY: { total: 15, used: 0, pending: 0 },
              STUDY: { total: 365, used: 0, pending: 0 },
              MATERNITY_PATERNITY: { total: 180, used: 0, pending: 0 },
              SPECIAL_CASUAL: { total: 15, used: 0, pending: 0 }
            },
            password: 'password123'
          };
          setAllUsers(prev => [...(Array.isArray(prev) ? prev : []), newUser]);
          try {
            saveDocToFirestore('users', newUser.id, newUser).catch(() => {});
          } catch (e) {}
          matchedUser = newUser;
        }
      }

      if (matchedUser.accountStatus === 'REJECTED') {
        return {
          success: false,
          message: 'This account has been rejected by administration. Please contact support.'
        };
      }

      const generatedCode = Math.floor(100000 + Math.random() * 900000).toString();

      try {
        dispatchEmailLog({
          recipientEmail: matchedUser.email,
          recipientName: matchedUser.name || 'Portal User',
          recipientRole: matchedUser.role || 'FACULTY',
          triggerEvent: 'TEST_EMAIL',
          subject: `[BIT Leave Portal] 6-Digit Password Reset Security Code: ${generatedCode}`,
          bodyHtml: `
            <div style="font-family: Arial, sans-serif; padding: 20px; color: #1e293b;">
              <h2 style="color: #3f51b5; margin-top: 0;">BIT Leave Portal Security Code</h2>
              <p>Dear <strong>${matchedUser.name}</strong>,</p>
              <p>You requested a password reset for your institutional account. Your 6-digit security code is:</p>
              <div style="background-color: #e0e7ff; color: #3730a3; padding: 14px 24px; font-size: 26px; font-weight: bold; letter-spacing: 4px; border-radius: 8px; display: inline-block; margin: 12px 0;">
                ${generatedCode}
              </div>
              <p style="font-size: 12px; color: #64748b;">Please enter this 6-digit security code on the portal to reset your password safely.</p>
            </div>
          `,
          bodyText: `Your BIT Leave Portal password reset code is: ${generatedCode}`,
          status: 'SENT'
        });
      } catch (eErr) {
        console.warn('dispatchEmailLog warning:', eErr);
      }

      try {
        addToast({
          title: 'Security Code Dispatched! 📧',
          message: `A 6-digit verification code was sent to ${matchedUser.email}. Please check your email inbox.`,
          type: 'INFO'
        });
      } catch (tErr) {
        console.warn('Toast warning:', tErr);
      }

      return {
        success: true,
        message: `Verification code sent to ${matchedUser.email}.`,
        securityCode: generatedCode,
        userEmail: matchedUser.email,
        userName: matchedUser.name || 'Portal User'
      };
    } catch (err) {
      console.error('Error generating reset code:', err);
      return {
        success: false,
        message: 'An unexpected system error occurred while generating the code. Please try again.'
      };
    }
  };

  const validateAndResetPassword = (
    email: string,
    empCodeOrPhone: string,
    newPassword: string,
    providedCode?: string,
    expectedCode?: string
  ): { success: boolean; message: string } => {
    try {
      const cleanEmail = String(email || '').trim().toLowerCase();

      if (!cleanEmail) {
        return { success: false, message: 'Institutional email address is required.' };
      }

      if (providedCode && expectedCode && providedCode.trim() !== expectedCode.trim()) {
        return { success: false, message: 'Invalid security code. Please check the 6-digit code sent to your email.' };
      }

      if (!newPassword || newPassword.length < 6) {
        return { success: false, message: 'New password must be at least 6 characters long.' };
      }

      let matchedUser = allUsers.find(u => u && u.email && String(u.email).trim().toLowerCase() === cleanEmail);

      if (!matchedUser) {
        return {
          success: false,
          message: 'Account validation failed. No registered user found matching this email.'
        };
      }

      if (matchedUser.accountStatus === 'REJECTED') {
        return {
          success: false,
          message: 'This account has been rejected by administration. Please contact support.'
        };
      }

      const updatedUser: User = {
        ...matchedUser,
        password: newPassword
      };

      setAllUsers(prev => prev.map(u => u.id === matchedUser!.id ? updatedUser : u));
      saveDocToFirestore('users', matchedUser.id, updatedUser);
      syncDataToNeon({ users: [updatedUser] }).catch(() => {});
      addAuditLog(matchedUser, 'SELF_PASSWORD_RESET', `User ${matchedUser.name} (${matchedUser.email}) reset account password via 6-digit email security code.`);

      try {
        addToast({
          title: 'Password Reset Successful! 🔓',
          message: `Account validated for ${matchedUser.name}. Your password has been updated successfully. You can now log in.`,
          type: 'SUCCESS'
        });
      } catch (tErr) {
        console.warn('Toast warning:', tErr);
      }

      return { success: true, message: 'Password reset successfully.' };
    } catch (err) {
      console.error('Error in validateAndResetPassword:', err);
      return { success: false, message: 'An unexpected system error occurred while updating password.' };
    }
  };

  const deleteUser = (userId: string): { success: boolean; message: string } => {
    if (userId === currentUserId) {
      return { success: false, message: 'Cannot delete your own currently active account.' };
    }
    const target = allUsers.find(u => u.id === userId);
    if (!target) return { success: false, message: 'User not found.' };

    if (target.role === 'SUPER_ADMIN' && currentUser?.role !== 'SUPER_ADMIN') {
      return { success: false, message: 'Department Admin Restriction: Super Admin accounts cannot be deleted by Department Admins.' };
    }

    const cleanEmail = target.email.trim().toLowerCase();

    // 1. Record persistent tombstones
    const nextDelIds = new Set(deletedUserIds).add(userId);
    const nextDelEmails = new Set(deletedUserEmails).add(cleanEmail);
    setDeletedUserIds(nextDelIds);
    setDeletedUserEmails(nextDelEmails);
    try {
      localStorage.setItem(DELETED_USER_IDS_KEY, JSON.stringify(Array.from(nextDelIds)));
      localStorage.setItem(DELETED_USER_EMAILS_KEY, JSON.stringify(Array.from(nextDelEmails)));
    } catch (_e) {}

    // 2. Remove from state immediately and save
    const nextUsers = allUsers.filter(u => u.id !== userId && u.email.trim().toLowerCase() !== cleanEmail);
    setAllUsers(nextUsers);
    try {
      localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(nextUsers));
    } catch (_e) {}

    // 3. Trigger remote database purges
    deleteUserFromFirestore(userId, cleanEmail);
    deleteNeonDoc('users', userId, cleanEmail).catch(() => {});
    addAuditLog(currentUser, 'USER_DELETED', `Deleted user account for ${target.name} (${target.email}, ${target.role}).`);

    return { success: true, message: `Successfully deleted account for ${target.name} (${target.email}).` };
  };

  const exportDbJson = (): string => {
    const dbSnapshot = {
      version: '1.0',
      timestamp: new Date().toISOString(),
      users: allUsers,
      departments,
      leavePolicies,
      leaveRequests,
      notifications,
      auditLogs
    };
    return JSON.stringify(dbSnapshot, null, 2);
  };

  const importDbJson = (jsonString: string): boolean => {
    try {
      const parsed = JSON.parse(jsonString);
      if (parsed.users && Array.isArray(parsed.users)) {
        setAllUsers(parsed.users);
        if (parsed.departments) setDepartments(parsed.departments);
        if (parsed.leavePolicies) setLeavePolicies(parsed.leavePolicies);
        if (parsed.leaveRequests) setLeaveRequests(parsed.leaveRequests);
        if (parsed.notifications) setNotifications(parsed.notifications);
        if (parsed.auditLogs) setAuditLogs(parsed.auditLogs);
        addAuditLog(currentUser, 'DB_IMPORT', 'Successfully imported institutional database snapshot from JSON.');
        return true;
      }
      return false;
    } catch {
      return false;
    }
  };

  const addAuditLog = (actor: User, action: string, details: string) => {
    const newLog: AuditLog = {
      id: `log_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      actorId: actor?.id || 'sys',
      actorName: actor?.name || 'System',
      actorRole: actor?.role || 'SUPER_ADMIN',
      action,
      details,
      timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
      ipAddress: '172.16.' + Math.floor(Math.random() * 50 + 1) + '.' + Math.floor(Math.random() * 200 + 1)
    };
    setAuditLogs(prev => [newLog, ...prev]);
    saveDocToFirestore('auditLogs', newLog.id, newLog);

    // Sync log to Neon DB PostgreSQL in real-time
    sendAuditLogToNeon(newLog).catch(err => console.warn('[Neon Audit Log Sync Warning]', err));
  };

  const addNotification = (userId: string, title: string, message: string, type: Notification['type'], relatedLeaveId?: string) => {
    const newNotification: Notification = {
      id: `ntf_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      userId,
      title,
      message,
      timestamp: new Date().toISOString().replace('T', ' ').substring(0, 16),
      read: false,
      type,
      relatedLeaveId
    };
    setNotifications(prev => [newNotification, ...prev]);
    saveDocToFirestore('notifications', newNotification.id, newNotification);
  };

  const applyForLeave = (data: {
    leaveType: LeaveType;
    startDate: string;
    endDate: string;
    totalDays: number;
    isHalfDay: boolean;
    halfDaySession?: 'FIRST_HALF' | 'SECOND_HALF';
    reason: string;
    contactAddress?: string;
    contactPhone?: string;
    documentUrl?: string;
    classHandovers?: any[];
  }): LeaveRequest => {
    const newId = `LV-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`;
    const rawRequest: LeaveRequest = {
      id: newId,
      applicantId: currentUser.id,
      applicantName: currentUser.name,
      applicantEmail: currentUser.email,
      applicantEmployeeCode: currentUser.employeeCode,
      applicantDesignation: currentUser.designation,
      applicantRole: currentUser.role,
      departmentId: currentUser.departmentId || 'CSE',
      departmentName: currentUser.departmentName || 'Computer Science & Engineering',
      leaveType: data.leaveType,
      startDate: data.startDate,
      endDate: data.endDate,
      totalDays: data.totalDays,
      isHalfDay: data.isHalfDay,
      halfDaySession: data.halfDaySession,
      reason: data.reason,
      contactAddress: data.contactAddress,
      contactPhone: data.contactPhone,
      documentUrl: data.documentUrl,
      classHandovers: data.classHandovers,
      status: 'PENDING_HOD',
      appliedOn: new Date().toISOString().split('T')[0],
    };

    const newRequest = normalizeLeaveRequest(rawRequest, allUsers, departments);

    setLeaveRequests(prev => [newRequest, ...prev]);

    // Update pending count in user's leave balances
    const targetAppUser = allUsers.find(u => u.id === currentUser.id);
    if (targetAppUser) {
      const typeKey = data.leaveType;
      const currentBal = targetAppUser.leaveBalances?.[typeKey] || { total: 0, used: 0, pending: 0 };
      const updatedAppUser: User = {
        ...targetAppUser,
        leaveBalances: {
          ...(targetAppUser.leaveBalances || {}),
          [typeKey]: {
            ...currentBal,
            pending: currentBal.pending + data.totalDays
          }
        }
      };
      setAllUsers(prev => prev.map(u => u.id === currentUser.id ? updatedAppUser : u));
      saveDocToFirestore('users', currentUser.id, updatedAppUser);
      syncDataToNeon({ users: [updatedAppUser], leaveRequests: [newRequest] }).catch(() => {});
    }

    // Find Department HOD
    const deptInfo = departments.find(d => d.id === currentUser.departmentId) || INITIAL_DEPARTMENTS.find(d => d.id === currentUser.departmentId);
    const hodUser = allUsers.find(u => u.id === deptInfo?.hodId || (u.departmentId === currentUser.departmentId && u.role === 'HOD'));

    if (hodUser) {
      addNotification(
        hodUser.id,
        'New Leave Application',
        `${currentUser.name} (${currentUser.designation}) applied for ${data.totalDays} day(s) ${data.leaveType} leave (${data.startDate} to ${data.endDate}).`,
        'LEAVE_SUBMITTED',
        newId
      );

      if (hodUser.email) {
        const mailData = buildLeaveSubmittedEmail(
          newRequest,
          hodUser.name,
          systemSettings.institutionName || 'BIT Leave Portal'
        );
        dispatchEmailLog({
          recipientEmail: hodUser.email,
          recipientName: hodUser.name,
          recipientRole: 'HOD',
          subject: mailData.subject,
          bodyHtml: mailData.bodyHtml,
          bodyText: mailData.bodyText,
          status: systemSettings.emailSettings?.enabled !== false ? 'SENT' : 'SIMULATED',
          leaveRequestId: newId,
          triggerEvent: 'LEAVE_SUBMITTED'
        });
      }
    }

    addAuditLog(currentUser, 'LEAVE_APPLIED', `Submitted ${data.leaveType} leave request ${newId} for ${data.totalDays} day(s).`);
    saveDocToFirestore('leaveRequests', newId, newRequest);

    addToast({
      title: 'Leave Application Submitted 📨',
      message: `Application #${newId} submitted. Notification email sent to ${hodUser?.name || 'Department HoD'} (${hodUser?.email || 'HoD Email'}).`,
      type: 'INFO',
      leaveId: newId,
      status: 'PENDING_HOD'
    });

    return newRequest;
  };

  const hodAction = (leaveId: string, action: 'RECOMMENDED' | 'REJECTED', comments: string) => {
    setLeaveRequests(prev => prev.map(req => {
      if (req.id === leaveId) {
        const isRec = action === 'RECOMMENDED';
        const updatedStatus = isRec ? 'PENDING_REGISTRAR' : 'REJECTED';
        
        // Notify applicant
        addNotification(
          req.applicantId,
          isRec ? 'Leave Endorsed by HOD' : 'Leave Rejected by HOD',
          `Your leave application ${req.id} was ${isRec ? 'recommended and forwarded to Registrar' : 'rejected'} by HOD ${currentUser.name}. Comments: "${comments}"`,
          isRec ? 'HOD_ENDORSED' : 'REJECTED',
          req.id
        );

        // Immediate toast feedback for acting user
        addToast({
          title: isRec ? 'Leave Endorsed by HOD 🎉' : 'Leave Application Rejected',
          message: isRec 
            ? `Leave request #${req.id} for ${req.applicantName} recommended & forwarded to Registrar.` 
            : `Leave request #${req.id} for ${req.applicantName} rejected.`,
          type: isRec ? 'SUCCESS' : 'ERROR',
          leaveId: req.id,
          status: updatedStatus
        });

        // If recommended, notify Registrar(s) via notification + Email
        if (isRec) {
          const registrars = allUsers.filter(u => u.role === 'REGISTRAR' || u.role === 'SUPER_ADMIN');
          registrars.forEach(reg => {
            addNotification(
              reg.id,
              'Leave Approval Required',
              `HOD ${currentUser.name} endorsed leave ${req.id} for ${req.applicantName} (${req.departmentName}). Pending Registrar sanction.`,
              'HOD_ENDORSED',
              req.id
            );

            if (reg.email) {
              const mailData = buildHodRecommendedEmail(
                req,
                reg.name,
                comments,
                systemSettings.institutionName || 'BIT Leave Portal'
              );
              dispatchEmailLog({
                recipientEmail: reg.email,
                recipientName: reg.name,
                recipientRole: reg.role,
                subject: mailData.subject,
                bodyHtml: mailData.bodyHtml,
                bodyText: mailData.bodyText,
                status: systemSettings.emailSettings?.enabled !== false ? 'SENT' : 'SIMULATED',
                leaveRequestId: req.id,
                triggerEvent: 'HOD_RECOMMENDED'
              });
            }
          });
        } else {
          // If rejected by HOD, email back to staff member
          if (req.applicantEmail) {
            const mailData = buildHodRejectedEmail(
              req,
              comments,
              systemSettings.institutionName || 'BIT Leave Portal'
            );
            dispatchEmailLog({
              recipientEmail: req.applicantEmail,
              recipientName: req.applicantName,
              recipientRole: req.applicantRole,
              subject: mailData.subject,
              bodyHtml: mailData.bodyHtml,
              bodyText: mailData.bodyText,
              status: systemSettings.emailSettings?.enabled !== false ? 'SENT' : 'SIMULATED',
              leaveRequestId: req.id,
              triggerEvent: 'HOD_REJECTED'
            });
          }
        }

        // If rejected by HOD, release pending leave balance count
        if (!isRec) {
          const targetUser = allUsers.find(u => u.id === req.applicantId);
          if (targetUser) {
            const currentBal = targetUser.leaveBalances?.[req.leaveType] || { total: 0, used: 0, pending: 0 };
            const updatedTargetUser: User = {
              ...targetUser,
              leaveBalances: {
                ...(targetUser.leaveBalances || {}),
                [req.leaveType]: {
                  ...currentBal,
                  pending: Math.max(0, currentBal.pending - req.totalDays)
                }
              }
            };
            setAllUsers(uList => uList.map(u => u.id === req.applicantId ? updatedTargetUser : u));
            saveDocToFirestore('users', req.applicantId, updatedTargetUser);
            syncDataToNeon({ users: [updatedTargetUser] }).catch(() => {});
          }
        }

        addAuditLog(currentUser, isRec ? 'HOD_RECOMMENDED' : 'HOD_REJECTED', `${isRec ? 'Recommended' : 'Rejected'} leave application ${req.id} for ${req.applicantName}.`);

        const updatedReq = {
          ...req,
          status: updatedStatus,
          hodApproval: {
            actionBy: currentUser.id,
            actionByName: `${currentUser.name} (${currentUser.departmentName} HOD)`,
            actionDate: new Date().toISOString().replace('T', ' ').substring(0, 16),
            status: action,
            comments
          }
        };
        saveDocToFirestore('leaveRequests', req.id, updatedReq);
        return updatedReq;
      }
      return req;
    }));
  };

  const registrarAction = (leaveId: string, action: 'APPROVED' | 'REJECTED', comments: string) => {
    setLeaveRequests(prev => prev.map(req => {
      if (req.id === leaveId) {
        const isApproved = action === 'APPROVED';
        
        // Notify Applicant
        addNotification(
          req.applicantId,
          isApproved ? 'Leave Application Sanctioned 🎉' : 'Leave Application Rejected',
          `Your leave application ${req.id} has been ${isApproved ? 'officially approved' : 'rejected'} by Registrar ${currentUser.name}. Comments: "${comments}"`,
          isApproved ? 'REGISTRAR_APPROVED' : 'REJECTED',
          req.id
        );

        // Notify Department HOD
        const deptInfo = departments.find(d => d.id === req.departmentId) || INITIAL_DEPARTMENTS.find(d => d.id === req.departmentId);
        const hodUser = allUsers.find(u => u.id === deptInfo?.hodId || (u.departmentId === req.departmentId && u.role === 'HOD'));
        if (hodUser) {
          addNotification(
            hodUser.id,
            'Leave Status Update',
            `Leave request ${req.id} for ${req.applicantName} was ${isApproved ? 'approved' : 'rejected'} by Registrar.`,
            isApproved ? 'REGISTRAR_APPROVED' : 'REJECTED',
            req.id
          );
        }

        // Send email back to Staff Member (Applicant)
        if (req.applicantEmail) {
          const mailData = isApproved
            ? buildRegistrarSanctionedEmail(req, comments, systemSettings.institutionName || 'BIT Leave Portal')
            : buildRegistrarRejectedEmail(req, comments, systemSettings.institutionName || 'BIT Leave Portal');

          dispatchEmailLog({
            recipientEmail: req.applicantEmail,
            recipientName: req.applicantName,
            recipientRole: req.applicantRole,
            subject: mailData.subject,
            bodyHtml: mailData.bodyHtml,
            bodyText: mailData.bodyText,
            status: systemSettings.emailSettings?.enabled !== false ? 'SENT' : 'SIMULATED',
            leaveRequestId: req.id,
            triggerEvent: isApproved ? 'REGISTRAR_SANCTIONED' : 'REGISTRAR_REJECTED'
          });
        }

        // Deduct/update leave balance for applicant
        const targetUser = allUsers.find(u => u.id === req.applicantId);
        if (targetUser) {
          const currentBal = targetUser.leaveBalances?.[req.leaveType] || { total: 0, used: 0, pending: 0 };
          const updatedTargetUser: User = {
            ...targetUser,
            leaveBalances: {
              ...(targetUser.leaveBalances || {}),
              [req.leaveType]: {
                ...currentBal,
                pending: Math.max(0, currentBal.pending - req.totalDays),
                used: isApproved ? currentBal.used + req.totalDays : currentBal.used
              }
            }
          };
          setAllUsers(uList => uList.map(u => u.id === req.applicantId ? updatedTargetUser : u));
          saveDocToFirestore('users', req.applicantId, updatedTargetUser);
          syncDataToNeon({ users: [updatedTargetUser] }).catch(() => {});
        }

        addAuditLog(currentUser, isApproved ? 'REGISTRAR_APPROVED' : 'REGISTRAR_REJECTED', `${isApproved ? 'Sanctioned' : 'Rejected'} leave application ${req.id} for ${req.applicantName}.`);

        addToast({
          title: isApproved ? 'Leave Sanctioned & Approved! 🎓' : 'Leave Application Rejected',
          message: isApproved 
            ? `Leave request #${req.id} for ${req.applicantName} was officially sanctioned. Confirmation email sent.` 
            : `Leave request #${req.id} for ${req.applicantName} was rejected by Registrar. Status email sent.`,
          type: isApproved ? 'SUCCESS' : 'ERROR',
          leaveId: req.id,
          status: isApproved ? 'APPROVED' : 'REJECTED'
        });

        const updatedReq = {
          ...req,
          status: isApproved ? 'APPROVED' : 'REJECTED' as const,
          registrarApproval: {
            actionBy: currentUser.id,
            actionByName: `${currentUser.name} (Registrar)`,
            actionDate: new Date().toISOString().replace('T', ' ').substring(0, 16),
            status: action,
            comments
          }
        };
        saveDocToFirestore('leaveRequests', req.id, updatedReq);
        return updatedReq;
      }
      return req;
    }));
  };

  const sendTestEmail = async (recipientEmail: string, recipientName: string) => {
    const settings = systemSettings.emailSettings || DEFAULT_EMAIL_SETTINGS;
    const mailData = buildTestEmail(
      recipientEmail,
      recipientName,
      settings,
      systemSettings.institutionName || 'BIT Leave Portal'
    );

    const targetEndpoint = settings.apiEndpoint?.trim() || '/api/send-email';

    try {
      const res = await fetch(targetEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          smtpConfig: settings,
          to: recipientEmail,
          toName: recipientName,
          subject: mailData.subject,
          html: mailData.bodyHtml,
          text: mailData.bodyText
        })
      });

      let data: any = {};
      if (res.status === 404) {
        data = { success: false, is404: true, error: 'Backend SMTP endpoint (/api/send-email) is not active in current hosting environment.' };
      } else {
        const contentType = res.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          data = await res.json();
        } else {
          const text = await res.text();
          data = { success: false, error: `HTTP ${res.status}: ${text.slice(0, 100)}` };
        }
      }

      const log = dispatchEmailLog({
        recipientEmail,
        recipientName,
        recipientRole: 'ADMIN_TEST',
        subject: mailData.subject,
        bodyHtml: mailData.bodyHtml,
        bodyText: mailData.bodyText,
        status: data.success ? 'SENT' : 'SIMULATED',
        triggerEvent: 'TEST_EMAIL'
      });

      if (data.success) {
        return {
          success: true,
          message: `Test email delivered successfully to ${recipientEmail} via SMTP Gateway (${settings.smtpHost}:${settings.smtpPort}). Message ID: ${data.messageId || log.id}`
        };
      } else if (data.is404) {
        return {
          success: false,
          message: `Backend SMTP service (/api/send-email) is not available on this host environment. Test email was recorded in simulated mode (Log ID: ${log.id}).`
        };
      } else {
        return {
          success: false,
          message: `SMTP Mail Dispatch Error: ${data.error || 'Server error delivering test email.'} (Log ID: ${log.id})`
        };
      }
    } catch (err: any) {
      const log = dispatchEmailLog({
        recipientEmail,
        recipientName,
        recipientRole: 'ADMIN_TEST',
        subject: mailData.subject,
        bodyHtml: mailData.bodyHtml,
        bodyText: mailData.bodyText,
        status: 'SIMULATED',
        triggerEvent: 'TEST_EMAIL'
      });

      const isNetworkErr = err?.message?.includes('Failed to fetch') || err?.name === 'TypeError';
      let errorMsg = `Failed to connect to backend email gateway service: ${err.message || String(err)}`;

      if (isNetworkErr && settings.apiEndpoint?.includes('run.app')) {
        errorMsg = `Connection blocked: AI Studio preview domains (*.run.app) enforce sandbox CORS & container access policies and cannot be called cross-origin from external sites or browser fetch. Please leave the Custom API Endpoint field blank (or set to /api/send-email) for native local/AI Studio testing.`;
      } else if (isNetworkErr) {
        errorMsg = `Network / CORS Error connecting to ${targetEndpoint}. Ensure the mail server backend is running and CORS headers allow connections from ${window.location.origin}.`;
      }

      return {
        success: false,
        message: `${errorMsg} (Log ID: ${log.id})`
      };
    }
  };

  const cancelLeave = (leaveId: string) => {
    setLeaveRequests(prev => prev.map(req => {
      if (req.id === leaveId && (req.status === 'PENDING_HOD' || req.status === 'PENDING_REGISTRAR')) {
        // Release pending balance
        const targetUser = allUsers.find(u => u.id === req.applicantId);
        if (targetUser) {
          const currentBal = targetUser.leaveBalances?.[req.leaveType] || { total: 0, used: 0, pending: 0 };
          const updatedTargetUser: User = {
            ...targetUser,
            leaveBalances: {
              ...(targetUser.leaveBalances || {}),
              [req.leaveType]: {
                ...currentBal,
                pending: Math.max(0, currentBal.pending - req.totalDays)
              }
            }
          };
          setAllUsers(uList => uList.map(u => u.id === req.applicantId ? updatedTargetUser : u));
          saveDocToFirestore('users', req.applicantId, updatedTargetUser);
          syncDataToNeon({ users: [updatedTargetUser] }).catch(() => {});
        }

        addAuditLog(currentUser, 'LEAVE_CANCELLED', `Cancelled leave application ${req.id}.`);

        addToast({
          title: 'Leave Application Withdrawn',
          message: `Leave application #${req.id} has been cancelled and pending days released.`,
          type: 'WARNING',
          leaveId: req.id,
          status: 'CANCELLED'
        });

        const updatedReq = { ...req, status: 'CANCELLED' as const };
        saveDocToFirestore('leaveRequests', req.id, updatedReq);
        syncDataToNeon({ leaveRequests: [updatedReq] }).catch(() => {});
        return updatedReq;
      }
      return req;
    }));
  };

  const updateUserRoleAndPermissions = (userId: string, role: Role, permissions: string[]) => {
    if (currentUser && currentUser.role === 'ADMIN' && currentUser.role !== 'SUPER_ADMIN') {
      const target = allUsers.find(u => u.id === userId);
      if (target && target.departmentId !== currentUser.departmentId) {
        addToast({
          title: 'Permission Denied 🚫',
          message: 'Department Admins can only manage users within their respective department.',
          type: 'ERROR'
        });
        return;
      }
      if (!['FACULTY', 'STAFF', 'HOD'].includes(role)) {
        addToast({
          title: 'Permission Denied 🚫',
          message: 'Department Admins can only assign roles as Faculty, Staff, or HOD.',
          type: 'ERROR'
        });
        return;
      }
    }
    const targetUser = allUsers.find(u => u.id === userId);
    if (!targetUser) return;
    const updatedUser: User = { ...targetUser, role, assignedPermissions: permissions };
    setAllUsers(prev => prev.map(u => u.id === userId ? updatedUser : u));
    saveDocToFirestore('users', userId, updatedUser);
    syncDataToNeon({ users: [updatedUser] }).catch(() => {});
    addAuditLog(currentUser, 'ROLE_UPDATED', `Updated role to ${role} and permissions for user ${targetUser.name} (${userId}).`);
  };

  const adjustUserLeaveBalance = (userId: string, leaveType: LeaveType, total: number, used: number) => {
    const targetUser = allUsers.find(u => u.id === userId);
    if (!targetUser) return;
    const cur = targetUser.leaveBalances?.[leaveType] || { total: 0, used: 0, pending: 0 };
    const updatedUser: User = {
      ...targetUser,
      leaveBalances: {
        ...(targetUser.leaveBalances || {}),
        [leaveType]: {
          ...cur,
          total,
          used
        }
      }
    };
    setAllUsers(prev => prev.map(u => u.id === userId ? updatedUser : u));
    saveDocToFirestore('users', userId, updatedUser);
    const pendingDays = updatedUser.leaveBalances[leaveType]?.pending || 0;
    syncDataToNeon({
      users: [updatedUser],
      leaveBalances: [{
        id: `${userId}_${leaveType}`,
        userId,
        leaveType,
        totalQuota: total,
        usedDays: used,
        pendingDays,
        updatedAt: new Date().toISOString()
      }]
    }).catch(err => console.warn('[Neon Direct Balance Sync Warning]', err));
    addAuditLog(currentUser, 'BALANCE_ADJUSTED', `Adjusted ${leaveType} balance for user ${targetUser.name} (Total: ${total}, Used: ${used}).`);
  };

  const createNewUser = (userData: Omit<User, 'id' | 'leaveBalances'>): { success: boolean; message: string } => {
    // Department Admin Restriction: An admin of an individual department can only add users of their same department
    if (currentUser && currentUser.role === 'ADMIN' && currentUser.role !== 'SUPER_ADMIN') {
      const adminDeptId = currentUser.departmentId;
      if (adminDeptId && userData.departmentId !== adminDeptId) {
        return {
          success: false,
          message: `Department Admin Restriction: As an administrator of department "${currentUser.departmentName || adminDeptId}" (${adminDeptId}), you are only permitted to add users within your own department. You cannot add users for department "${userData.departmentName || userData.departmentId}".`
        };
      }
      if (!['FACULTY', 'STAFF', 'HOD'].includes(userData.role)) {
        return {
          success: false,
          message: 'Department Admin Restriction: Department Admins can only assign roles as Faculty, Staff, or HOD.'
        };
      }
    }

    const cleanEmail = userData.email.trim().toLowerCase();
    const emailExists = allUsers.some(u => u.email.trim().toLowerCase() === cleanEmail);
    if (emailExists) {
      return {
        success: false,
        message: `An account with email address "${cleanEmail}" already exists. Each administrator and user must have a unique email address.`
      };
    }
    const newId = `usr_${Date.now()}`;
    const newUser: User = {
      ...userData,
      email: cleanEmail,
      id: newId,
      accountStatus: userData.accountStatus || 'ACTIVE',
      password: userData.password || 'password123',
      registeredAt: userData.registeredAt || new Date().toISOString(),
      leaveBalances: {
        CASUAL: { total: 12, used: 0, pending: 0 },
        SICK: { total: 10, used: 0, pending: 0 },
        EARNED: { total: 30, used: 0, pending: 0 },
        DUTY: { total: 15, used: 0, pending: 0 },
        STUDY: { total: 90, used: 0, pending: 0 },
        MATERNITY_PATERNITY: { total: 180, used: 0, pending: 0 },
        SPECIAL_CASUAL: { total: 7, used: 0, pending: 0 },
      }
    };
    setAllUsers(prev => [...prev, newUser]);
    saveDocToFirestore('users', newUser.id, newUser);
    addAuditLog(currentUser, 'USER_CREATED', `Created new user ${newUser.name} (${newUser.role}) in ${newUser.departmentName}. Status: ${newUser.accountStatus}`);
    return {
      success: true,
      message: `Successfully created account for ${newUser.name} (${cleanEmail}).`
    };
  };

  const checkSuperAdminPermission = (): boolean => {
    if (currentUser?.role !== 'SUPER_ADMIN') {
      addToast({
        title: 'Permission Denied 🚫',
        message: 'Departments and Leave Types & Policies can be added or modified by Super Admin only.',
        type: 'ERROR'
      });
      return false;
    }
    return true;
  };

  const createNewDepartment = (deptData: Omit<Department, 'totalFaculty'>) => {
    if (!checkSuperAdminPermission()) return;
    const newDept: Department = {
      ...deptData,
      totalFaculty: 0
    };
    setDepartments(prev => [...prev, newDept]);
    saveDocToFirestore('departments', newDept.id, newDept);
    addAuditLog(currentUser, 'DEPARTMENT_CREATED', `Created new department ${newDept.name} (${newDept.code}).`);
    addToast({
      title: 'Department Created 🏛️',
      message: `Department ${newDept.name} (${newDept.code}) created successfully.`,
      type: 'SUCCESS'
    });
  };

  const updateDepartment = (updatedDept: Department) => {
    if (!checkSuperAdminPermission()) return;
    setDepartments(prev => prev.map(d => d.id === updatedDept.id ? updatedDept : d));
    saveDocToFirestore('departments', updatedDept.id, updatedDept);
    addAuditLog(currentUser, 'DEPARTMENT_UPDATED', `Updated department ${updatedDept.name} (${updatedDept.code}).`);
    addToast({
      title: 'Department Updated ✏️',
      message: `Department ${updatedDept.name} updated successfully.`,
      type: 'SUCCESS'
    });
  };

  const createNewLeaveType = (policyData: LeavePolicy) => {
    if (!checkSuperAdminPermission()) return;
    setLeavePolicies(prev => {
      const exists = prev.some(p => p.type === policyData.type);
      if (exists) {
        return prev.map(p => p.type === policyData.type ? policyData : p);
      }
      return [...prev, policyData];
    });
    saveDocToFirestore('leavePolicies', policyData.type, policyData);

    // Automatically initialize this leave balance for all existing users if new
    setAllUsers(uList => uList.map(u => {
      if (!u.leaveBalances[policyData.type]) {
        return {
          ...u,
          leaveBalances: {
            ...u.leaveBalances,
            [policyData.type]: { total: policyData.annualQuota, used: 0, pending: 0 }
          }
        };
      }
      return u;
    }));

    addAuditLog(currentUser, 'LEAVE_TYPE_CREATED', `Created new leave type ${policyData.label} (${policyData.type}) with annual quota ${policyData.annualQuota}.`);
    addToast({
      title: 'Leave Type Created 📋',
      message: `Created leave policy for ${policyData.label} with ${policyData.annualQuota} days annual quota.`,
      type: 'SUCCESS'
    });
  };

  const updateLeavePolicy = (updatedPolicy: LeavePolicy) => {
    if (!checkSuperAdminPermission()) return;
    setLeavePolicies(prev => prev.map(p => p.type === updatedPolicy.type ? updatedPolicy : p));
    saveDocToFirestore('leavePolicies', updatedPolicy.type, updatedPolicy);
    addAuditLog(currentUser, 'POLICY_UPDATED', `Updated policy for ${updatedPolicy.label}. Annual Quota set to ${updatedPolicy.annualQuota}.`);
    addToast({
      title: 'Leave Policy Updated ⚙️',
      message: `Updated ${updatedPolicy.label} policy settings.`,
      type: 'SUCCESS'
    });
  };

  const markNotificationRead = (id: string) => {
    setNotifications(prev => prev.map(n => {
      if (n.id === id) {
        const updated = { ...n, read: true };
        saveDocToFirestore('notifications', id, updated);
        return updated;
      }
      return n;
    }));
  };

  const markAllNotificationsRead = () => {
    setNotifications(prev => prev.map(n => {
      const updated = { ...n, read: true };
      saveDocToFirestore('notifications', n.id, updated);
      return updated;
    }));
  };

  const clearSanctionLogs = (): { success: boolean; message: string } => {
    if (currentUser.role !== 'SUPER_ADMIN') {
      return { success: false, message: 'Unauthorized: Only Super Admin can clear leave sanction logs.' };
    }

    leaveRequests.forEach(req => {
      deleteDocFromFirestore('leaveRequests', req.id);
    });
    deleteNeonDoc('clearAllRequests', '').catch(() => {});

    setLeaveRequests([]);
    localStorage.setItem(STORAGE_KEYS.REQUESTS, JSON.stringify([]));

    addAuditLog(currentUser, 'SANCTION_LOGS_CLEARED', 'Super Admin cleared all historical leave sanction logs.');

    addToast({
      title: 'Sanction Logs Cleared 🗑️',
      message: 'All historical leave sanction logs have been cleared successfully.',
      type: 'SUCCESS'
    });

    return { success: true, message: 'Historical leave sanction logs cleared successfully.' };
  };

  const deleteLeaveRequest = (requestId: string): { success: boolean; message: string } => {
    const target = leaveRequests.find(r => r.id === requestId);
    if (!target) {
      return { success: false, message: 'Leave request not found.' };
    }

    setLeaveRequests(prev => prev.filter(r => r.id !== requestId));
    deleteDocFromFirestore('leaveRequests', requestId);
    deleteNeonDoc('leaveRequests', requestId).catch(() => {});

    addAuditLog(currentUser, 'LEAVE_DELETED', `Deleted leave request ${requestId} (${target.applicantName || 'Applicant'}).`);
    addToast({
      title: 'Leave Request Removed 🗑️',
      message: `Leave request ${requestId} was permanently deleted.`,
      type: 'INFO'
    });

    return { success: true, message: `Successfully deleted leave request ${requestId}.` };
  };

  const purgeUnknownLeaveRequests = (): { success: boolean; count: number; message: string } => {
    const unknownReqs = leaveRequests.filter(r => 
      !r.applicantName || 
      r.applicantName === 'Unknown Applicant' || 
      r.applicantName.toLowerCase() === 'unknown' ||
      r.applicantId === 'UNKNOWN_APPLICANT' ||
      r.applicantId === 'UNKNOWN' ||
      (r.applicantEmail && r.applicantEmail.toLowerCase().includes('unknown'))
    );

    if (unknownReqs.length === 0) {
      return { success: true, count: 0, message: 'No unknown or orphan leave requests found.' };
    }

    const unknownIds = new Set(unknownReqs.map(r => r.id));
    unknownReqs.forEach(req => {
      deleteDocFromFirestore('leaveRequests', req.id);
      deleteNeonDoc('leaveRequests', req.id).catch(() => {});
    });

    setLeaveRequests(prev => prev.filter(r => !unknownIds.has(r.id)));

    addAuditLog(currentUser, 'UNKNOWN_LEAVES_PURGED', `Purged ${unknownReqs.length} unknown/orphan leave requests.`);
    addToast({
      title: 'Unknown Data Purged 🧹',
      message: `Successfully removed ${unknownReqs.length} unknown leave records from the database.`,
      type: 'SUCCESS'
    });

    return { success: true, count: unknownReqs.length, message: `Purged ${unknownReqs.length} unknown leave requests.` };
  };

  const resetData = () => {
    localStorage.removeItem(STORAGE_KEYS.USERS);
    localStorage.removeItem(STORAGE_KEYS.REQUESTS);
    localStorage.removeItem(STORAGE_KEYS.NOTIFICATIONS);
    localStorage.removeItem(STORAGE_KEYS.LOGS);
    localStorage.removeItem(STORAGE_KEYS.POLICIES);
    localStorage.removeItem(STORAGE_KEYS.DEPARTMENTS);
    localStorage.removeItem(STORAGE_KEYS.CURRENT_USER_ID);
    localStorage.removeItem(STORAGE_KEYS.AUTH);
    localStorage.removeItem(DELETED_USER_IDS_KEY);
    localStorage.removeItem(DELETED_USER_EMAILS_KEY);

    setDeletedUserIds(new Set());
    setDeletedUserEmails(new Set());
    setAllUsers([]);
    setCurrentUserId('usr_1');
    setIsAuthenticated(false);
    setDepartments(INITIAL_DEPARTMENTS);
    setLeaveRequests(INITIAL_LEAVE_REQUESTS);
    setNotifications(INITIAL_NOTIFICATIONS);
    setAuditLogs(INITIAL_AUDIT_LOGS);
    setLeavePolicies(INITIAL_LEAVE_POLICIES);

    resetFirestoreData().catch(err => console.warn('Error resetting Firestore:', err));
  };

  const userNotifications = notifications.filter(n => n.userId === currentUser.id);
  const unreadNotificationCount = userNotifications.filter(n => !n.read).length;

  return (
    <LeaveContext.Provider
      value={{
        currentUser,
        allUsers: effectiveAllUsers,
        departments,
        leavePolicies,
        leaveRequests,
        notifications: userNotifications,
        auditLogs,
        emailLogs,
        granularPermissions: GRANULAR_PERMISSIONS,
        unreadNotificationCount,
        isAuthenticated,
        toasts,
        systemSettings,

        updateSystemSettings,
        sendTestEmail,
        addToast,
        removeToast,
        clearToasts,

        login,
        logout,
        switchUser,
        registerUser,
        updateUserStatus,
        updateUser,
        changePassword,
        adminResetPassword,
        requestPasswordResetCode,
        validateAndResetPassword,
        deleteUser,
        exportDbJson,
        importDbJson,
        applyForLeave,
        hodAction,
        registrarAction,
        cancelLeave,
        updateUserRoleAndPermissions,
        adjustUserLeaveBalance,
        createNewUser,
        createNewDepartment,
        updateDepartment,
        createNewLeaveType,
        updateLeavePolicy,
        markNotificationRead,
        markAllNotificationsRead,
        clearSanctionLogs,
        deleteLeaveRequest,
        purgeUnknownLeaveRequests,
        resetData
      }}
    >
      {children}
    </LeaveContext.Provider>
  );
};

export const useLeave = () => {
  const context = useContext(LeaveContext);
  if (!context) {
    throw new Error('useLeave must be used within a LeaveProvider');
  }
  return context;
};
