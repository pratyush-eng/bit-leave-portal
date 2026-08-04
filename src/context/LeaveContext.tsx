import React, { createContext, useContext, useState, useEffect } from 'react';
import { loadOrSeedFirestoreData, saveDocToFirestore, deleteDocFromFirestore } from '../lib/firestoreSync';
import { 
  User, 
  LeaveRequest, 
  Notification, 
  AuditLog, 
  LeavePolicy, 
  Department, 
  Role, 
  LeaveType,
  GranularPermission,
  ToastNotification,
  SystemSettings
} from '../types';
import { 
  MOCK_USERS, 
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
  granularPermissions: GranularPermission[];
  unreadNotificationCount: number;
  isAuthenticated: boolean;
  toasts: ToastNotification[];
  systemSettings: SystemSettings;

  updateSystemSettings: (newSettings: Partial<SystemSettings>) => void;
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
  createNewLeaveType: (policyData: LeavePolicy) => void;
  updateLeavePolicy: (policy: LeavePolicy) => void;
  
  markNotificationRead: (id: string) => void;
  markAllNotificationsRead: () => void;
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
  AUTH: 'academia_leave_auth_v1',
  SETTINGS: 'academia_system_settings_v1'
};

export const LeaveProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [systemSettings, setSystemSettings] = useState<SystemSettings>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.SETTINGS);
    return saved ? JSON.parse(saved) : { enableDemoAccounts: true, enableRoleSwitcher: true };
  });

  const [allUsers, setAllUsers] = useState<User[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.USERS);
    return saved ? JSON.parse(saved) : MOCK_USERS;
  });

  const [currentUserId, setCurrentUserId] = useState<string>(() => {
    return localStorage.getItem(STORAGE_KEYS.CURRENT_USER_ID) || 'usr_1';
  });

  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.AUTH);
    return saved !== null ? JSON.parse(saved) : false;
  });

  const [departments, setDepartments] = useState<Department[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.DEPARTMENTS);
    return saved ? JSON.parse(saved) : INITIAL_DEPARTMENTS;
  });

  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.REQUESTS);
    return saved ? JSON.parse(saved) : INITIAL_LEAVE_REQUESTS;
  });

  const [notifications, setNotifications] = useState<Notification[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.NOTIFICATIONS);
    return saved ? JSON.parse(saved) : INITIAL_NOTIFICATIONS;
  });

  const [auditLogs, setAuditLogs] = useState<AuditLog[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.LOGS);
    return saved ? JSON.parse(saved) : INITIAL_AUDIT_LOGS;
  });

  const [leavePolicies, setLeavePolicies] = useState<LeavePolicy[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.POLICIES);
    return saved ? JSON.parse(saved) : INITIAL_LEAVE_POLICIES;
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

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  const clearToasts = () => {
    setToasts([]);
  };

  const currentUser = allUsers.find(u => u.id === currentUserId) || allUsers[0];

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

  // Sync state to local storage and Firestore
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(allUsers));
    allUsers.forEach(u => saveDocToFirestore('users', u.id, u));
  }, [allUsers]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.REQUESTS, JSON.stringify(leaveRequests));
    leaveRequests.forEach(r => saveDocToFirestore('leaveRequests', r.id, r));
  }, [leaveRequests]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.NOTIFICATIONS, JSON.stringify(notifications));
    notifications.forEach(n => saveDocToFirestore('notifications', n.id, n));
  }, [notifications]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.LOGS, JSON.stringify(auditLogs));
    auditLogs.forEach(l => saveDocToFirestore('auditLogs', l.id, l));
  }, [auditLogs]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.POLICIES, JSON.stringify(leavePolicies));
    leavePolicies.forEach(p => saveDocToFirestore('leavePolicies', p.type, p));
  }, [leavePolicies]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.DEPARTMENTS, JSON.stringify(departments));
    departments.forEach(d => saveDocToFirestore('departments', d.id, d));
  }, [departments]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.CURRENT_USER_ID, currentUserId);
  }, [currentUserId]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.AUTH, JSON.stringify(isAuthenticated));
  }, [isAuthenticated]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(systemSettings));
    saveDocToFirestore('settings', 'global', systemSettings);
  }, [systemSettings]);

  const updateSystemSettings = (newSettings: Partial<SystemSettings>) => {
    setSystemSettings(prev => {
      const updated = { ...prev, ...newSettings };
      addAuditLog(
        currentUser, 
        'SETTINGS_UPDATED', 
        `Updated system configuration: Demo Accounts=${updated.enableDemoAccounts ? 'ENABLED' : 'DISABLED'}, Role Switcher=${updated.enableRoleSwitcher ? 'ENABLED' : 'DISABLED'}.`
      );
      addToast({
        title: 'System Settings Saved ⚙️',
        message: 'Institutional system privileges and configuration updated.',
        type: 'SUCCESS'
      });
      return updated;
    });
  };

  // Load or seed initial data from Firebase Firestore on boot
  useEffect(() => {
    let mounted = true;
    loadOrSeedFirestoreData().then((data) => {
      if (!mounted) return;
      if (data.users.length) setAllUsers(data.users);
      if (data.leaveRequests.length) setLeaveRequests(data.leaveRequests);
      if (data.departments.length) setDepartments(data.departments);
      if (data.leavePolicies.length) setLeavePolicies(data.leavePolicies);
      if (data.notifications.length) setNotifications(data.notifications);
      if (data.auditLogs.length) setAuditLogs(data.auditLogs);
    });
    return () => {
      mounted = false;
    };
  }, []);

  const login = (email: string, password?: string): { success: boolean; message?: string } => {
    const matched = allUsers.find(u => u.email.toLowerCase().trim() === email.toLowerCase().trim());
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
        message: 'Incorrect password entered. (Demo default password is "password123").' 
      };
    }
    setCurrentUserId(matched.id);
    setIsAuthenticated(true);
    addAuditLog(matched, 'USER_LOGIN', `User ${matched.name} (${matched.role}) logged in successfully.`);
    return { success: true };
  };

  const logout = () => {
    addAuditLog(currentUser, 'USER_LOGOUT', `User ${currentUser.name} logged out.`);
    setIsAuthenticated(false);
  };

  const switchUser = (userId: string) => {
    const target = allUsers.find(u => u.id === userId);
    if (target) {
      setCurrentUserId(userId);
      addAuditLog(target, 'USER_SWITCH', `Switched session view to user ${target.name} (${target.role})`);
    }
  };

  const registerUser = (userData: Omit<User, 'id' | 'leaveBalances'>): { success: boolean; message: string } => {
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
    setAllUsers(prev => prev.map(u => u.id === userId ? { ...u, accountStatus: status } : u));
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

    // Department Admin Restriction: Department Admins cannot manage/reassign users outside their assigned department
    if (currentUser && currentUser.role === 'ADMIN' && currentUser.role !== 'SUPER_ADMIN') {
      const adminDeptId = currentUser.departmentId;
      if (adminDeptId) {
        if (target.departmentId !== adminDeptId || (updatedData.departmentId && updatedData.departmentId !== adminDeptId)) {
          return {
            success: false,
            message: `Department Admin Restriction: As an administrator of department "${currentUser.departmentName || adminDeptId}", you can only manage user accounts within your assigned department.`
          };
        }
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
    addAuditLog(currentUser, 'ADMIN_RESET_PASSWORD', `Admin reset password for user ${target.name} (${target.email}, ${target.role}).`);

    addToast({
      title: 'Password Reset by Admin 🔑',
      message: `Password for ${target.name} (${target.role}) has been updated successfully.`,
      type: 'SUCCESS'
    });

    return { success: true, message: `Successfully reset password for ${target.name}.` };
  };

  const deleteUser = (userId: string): { success: boolean; message: string } => {
    if (userId === currentUserId) {
      return { success: false, message: 'Cannot delete your own currently active account.' };
    }
    const target = allUsers.find(u => u.id === userId);
    if (!target) return { success: false, message: 'User not found.' };

    setAllUsers(prev => prev.filter(u => u.id !== userId));
    deleteDocFromFirestore('users', userId);
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
      actorId: actor.id,
      actorName: actor.name,
      actorRole: actor.role,
      action,
      details,
      timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
      ipAddress: '172.16.' + Math.floor(Math.random() * 50 + 1) + '.' + Math.floor(Math.random() * 200 + 1)
    };
    setAuditLogs(prev => [newLog, ...prev]);
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
    const newRequest: LeaveRequest = {
      id: newId,
      applicantId: currentUser.id,
      applicantName: currentUser.name,
      applicantEmail: currentUser.email,
      applicantDesignation: currentUser.designation,
      applicantRole: currentUser.role,
      departmentId: currentUser.departmentId,
      departmentName: currentUser.departmentName,
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

    setLeaveRequests(prev => [newRequest, ...prev]);

    // Update pending count in user's leave balances
    setAllUsers(prev => prev.map(u => {
      if (u.id === currentUser.id) {
        const typeKey = data.leaveType;
        const currentBal = u.leaveBalances[typeKey];
        return {
          ...u,
          leaveBalances: {
            ...u.leaveBalances,
            [typeKey]: {
              ...currentBal,
              pending: currentBal.pending + data.totalDays
            }
          }
        };
      }
      return u;
    }));

    // Find Department HOD
    const deptInfo = INITIAL_DEPARTMENTS.find(d => d.id === currentUser.departmentId);
    const hodUser = allUsers.find(u => u.id === deptInfo?.hodId || (u.departmentId === currentUser.departmentId && u.role === 'HOD'));

    if (hodUser) {
      addNotification(
        hodUser.id,
        'New Leave Application',
        `${currentUser.name} (${currentUser.designation}) applied for ${data.totalDays} day(s) ${data.leaveType} leave (${data.startDate} to ${data.endDate}).`,
        'LEAVE_SUBMITTED',
        newId
      );
    }

    addAuditLog(currentUser, 'LEAVE_APPLIED', `Submitted ${data.leaveType} leave request ${newId} for ${data.totalDays} day(s).`);

    addToast({
      title: 'Leave Application Submitted',
      message: `Application #${newId} for ${data.leaveType} leave (${data.totalDays} day(s)) submitted. Status: Pending HOD Endorsement.`,
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

        // If recommended, notify Registrar(s)
        if (isRec) {
          const registrars = allUsers.filter(u => u.role === 'REGISTRAR');
          registrars.forEach(reg => {
            addNotification(
              reg.id,
              'Leave Approval Required',
              `HOD ${currentUser.name} endorsed leave ${req.id} for ${req.applicantName} (${req.departmentName}). Pending Registrar sanction.`,
              'HOD_ENDORSED',
              req.id
            );
          });
        }

        // If rejected by HOD, release pending leave balance count
        if (!isRec) {
          setAllUsers(uList => uList.map(u => {
            if (u.id === req.applicantId) {
              const currentBal = u.leaveBalances[req.leaveType];
              return {
                ...u,
                leaveBalances: {
                  ...u.leaveBalances,
                  [req.leaveType]: {
                    ...currentBal,
                    pending: Math.max(0, currentBal.pending - req.totalDays)
                  }
                }
              };
            }
            return u;
          }));
        }

        addAuditLog(currentUser, isRec ? 'HOD_RECOMMENDED' : 'HOD_REJECTED', `${isRec ? 'Recommended' : 'Rejected'} leave application ${req.id} for ${req.applicantName}.`);

        return {
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
        const deptInfo = INITIAL_DEPARTMENTS.find(d => d.id === req.departmentId);
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

        // Deduct/update leave balance for applicant
        setAllUsers(uList => uList.map(u => {
          if (u.id === req.applicantId) {
            const currentBal = u.leaveBalances[req.leaveType];
            return {
              ...u,
              leaveBalances: {
                ...u.leaveBalances,
                [req.leaveType]: {
                  ...currentBal,
                  pending: Math.max(0, currentBal.pending - req.totalDays),
                  used: isApproved ? currentBal.used + req.totalDays : currentBal.used
                }
              }
            };
          }
          return u;
        }));

        addAuditLog(currentUser, isApproved ? 'REGISTRAR_APPROVED' : 'REGISTRAR_REJECTED', `${isApproved ? 'Sanctioned' : 'Rejected'} leave application ${req.id} for ${req.applicantName}.`);

        addToast({
          title: isApproved ? 'Leave Sanctioned & Approved! 🎓' : 'Leave Application Rejected',
          message: isApproved 
            ? `Leave request #${req.id} for ${req.applicantName} was officially sanctioned.` 
            : `Leave request #${req.id} for ${req.applicantName} was rejected by Registrar.`,
          type: isApproved ? 'SUCCESS' : 'ERROR',
          leaveId: req.id,
          status: isApproved ? 'APPROVED' : 'REJECTED'
        });

        return {
          ...req,
          status: isApproved ? 'APPROVED' : 'REJECTED',
          registrarApproval: {
            actionBy: currentUser.id,
            actionByName: `${currentUser.name} (Registrar)`,
            actionDate: new Date().toISOString().replace('T', ' ').substring(0, 16),
            status: action,
            comments
          }
        };
      }
      return req;
    }));
  };

  const cancelLeave = (leaveId: string) => {
    setLeaveRequests(prev => prev.map(req => {
      if (req.id === leaveId && (req.status === 'PENDING_HOD' || req.status === 'PENDING_REGISTRAR')) {
        // Release pending balance
        setAllUsers(uList => uList.map(u => {
          if (u.id === req.applicantId) {
            const currentBal = u.leaveBalances[req.leaveType];
            return {
              ...u,
              leaveBalances: {
                ...u.leaveBalances,
                [req.leaveType]: {
                  ...currentBal,
                  pending: Math.max(0, currentBal.pending - req.totalDays)
                }
              }
            };
          }
          return u;
        }));

        addAuditLog(currentUser, 'LEAVE_CANCELLED', `Cancelled leave application ${req.id}.`);

        addToast({
          title: 'Leave Application Withdrawn',
          message: `Leave application #${req.id} has been cancelled and pending days released.`,
          type: 'WARNING',
          leaveId: req.id,
          status: 'CANCELLED'
        });

        return { ...req, status: 'CANCELLED' };
      }
      return req;
    }));
  };

  const updateUserRoleAndPermissions = (userId: string, role: Role, permissions: string[]) => {
    setAllUsers(prev => prev.map(u => {
      if (u.id === userId) {
        return { ...u, role, assignedPermissions: permissions };
      }
      return u;
    }));
    addAuditLog(currentUser, 'ROLE_UPDATED', `Updated role to ${role} and permissions for user ${userId}.`);
  };

  const adjustUserLeaveBalance = (userId: string, leaveType: LeaveType, total: number, used: number) => {
    setAllUsers(prev => prev.map(u => {
      if (u.id === userId) {
        const cur = u.leaveBalances[leaveType];
        return {
          ...u,
          leaveBalances: {
            ...u.leaveBalances,
            [leaveType]: {
              ...cur,
              total,
              used
            }
          }
        };
      }
      return u;
    }));
    addAuditLog(currentUser, 'BALANCE_ADJUSTED', `Adjusted ${leaveType} balance for user ${userId} (Total: ${total}, Used: ${used}).`);
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
    addAuditLog(currentUser, 'USER_CREATED', `Created new user ${newUser.name} (${newUser.role}) in ${newUser.departmentName}. Status: ${newUser.accountStatus}`);
    return {
      success: true,
      message: `Successfully created account for ${newUser.name} (${cleanEmail}).`
    };
  };

  const createNewDepartment = (deptData: Omit<Department, 'totalFaculty'>) => {
    const newDept: Department = {
      ...deptData,
      totalFaculty: 0
    };
    setDepartments(prev => [...prev, newDept]);
    addAuditLog(currentUser, 'DEPARTMENT_CREATED', `Created new department ${newDept.name} (${newDept.code}).`);
  };

  const createNewLeaveType = (policyData: LeavePolicy) => {
    setLeavePolicies(prev => {
      const exists = prev.some(p => p.type === policyData.type);
      if (exists) {
        return prev.map(p => p.type === policyData.type ? policyData : p);
      }
      return [...prev, policyData];
    });

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
  };

  const updateLeavePolicy = (updatedPolicy: LeavePolicy) => {
    setLeavePolicies(prev => prev.map(p => p.type === updatedPolicy.type ? updatedPolicy : p));
    addAuditLog(currentUser, 'POLICY_UPDATED', `Updated policy for ${updatedPolicy.label}. Annual Quota set to ${updatedPolicy.annualQuota}.`);
  };

  const markNotificationRead = (id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  };

  const markAllNotificationsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
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
    
    setAllUsers(MOCK_USERS);
    setCurrentUserId('usr_1');
    setIsAuthenticated(false);
    setDepartments(INITIAL_DEPARTMENTS);
    setLeaveRequests(INITIAL_LEAVE_REQUESTS);
    setNotifications(INITIAL_NOTIFICATIONS);
    setAuditLogs(INITIAL_AUDIT_LOGS);
    setLeavePolicies(INITIAL_LEAVE_POLICIES);
  };

  const userNotifications = notifications.filter(n => n.userId === currentUser.id);
  const unreadNotificationCount = userNotifications.filter(n => !n.read).length;

  return (
    <LeaveContext.Provider
      value={{
        currentUser,
        allUsers,
        departments,
        leavePolicies,
        leaveRequests,
        notifications: userNotifications,
        auditLogs,
        granularPermissions: GRANULAR_PERMISSIONS,
        unreadNotificationCount,
        isAuthenticated,
        toasts,
        systemSettings,

        updateSystemSettings,
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
        createNewLeaveType,
        updateLeavePolicy,
        markNotificationRead,
        markAllNotificationsRead,
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
