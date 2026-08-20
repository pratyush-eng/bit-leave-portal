export type Role = 'FACULTY' | 'STAFF' | 'HOD' | 'REGISTRAR' | 'ADMIN' | 'SUPER_ADMIN';

export type DepartmentId = string;

export interface Department {
  id: DepartmentId;
  name: string;
  code: string;
  hodName: string;
  hodId: string;
  totalFaculty: number;
}

export type LeaveType = string;

export interface LeavePolicy {
  type: LeaveType;
  label: string;
  annualQuota: number;
  requiresDocument: boolean;
  minDaysNotice: number;
  color: string;
  description: string;
}

export interface LeaveBalance {
  CASUAL?: { total: number; used: number; pending: number };
  SICK?: { total: number; used: number; pending: number };
  EARNED?: { total: number; used: number; pending: number };
  DUTY?: { total: number; used: number; pending: number };
  STUDY?: { total: number; used: number; pending: number };
  MATERNITY_PATERNITY?: { total: number; used: number; pending: number };
  SPECIAL_CASUAL?: { total: number; used: number; pending: number };
  [key: string]: { total: number; used: number; pending: number } | undefined;
}

export type LeaveStatus = 
  | 'PENDING_HOD' 
  | 'PENDING_REGISTRAR' 
  | 'APPROVED' 
  | 'REJECTED' 
  | 'CANCELLED'
  | 'RECOMMENDED'
  | 'PENDING';

export interface ClassHandover {
  courseCode: string;
  courseName: string;
  substituteStaffId: string;
  substituteStaffName: string;
  date: string;
  timeSlot: string;
}

export interface LeaveRequest {
  id: string;
  applicantId: string;
  applicantName: string;
  applicantEmail: string;
  applicantEmployeeCode?: string;
  applicantDesignation: string;
  applicantRole: Role;
  departmentId: DepartmentId;
  departmentName: string;
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
  classHandovers?: ClassHandover[];
  substituteArrangement?: string;
  alternativeArrangement?: string;
  emergencyContact?: string;
  
  status: LeaveStatus;
  appliedOn: string;
  
  hodApproval?: {
    actionBy: string;
    actionByName: string;
    actionDate: string;
    status: 'RECOMMENDED' | 'REJECTED' | 'APPROVED';
    comments: string;
  };

  registrarApproval?: {
    actionBy: string;
    actionByName: string;
    actionDate: string;
    status: 'APPROVED' | 'REJECTED';
    comments: string;
  };
}

export interface User {
  id: string;
  name: string;
  email: string;
  password?: string;
  role: Role;
  designation: string;
  departmentId: DepartmentId;
  departmentName: string;
  avatarUrl?: string;
  employeeCode: string;
  joiningDate: string;
  phone: string;
  leaveBalances: LeaveBalance;
  assignedPermissions?: string[]; // Granular permissions for admins/super admin
  accountStatus?: 'ACTIVE' | 'PENDING_APPROVAL' | 'REJECTED';
  registeredAt?: string;
}

export interface Notification {
  id: string;
  userId: string;
  recipientId?: string;
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  type: 'LEAVE_SUBMITTED' | 'HOD_ENDORSED' | 'REGISTRAR_APPROVED' | 'REJECTED' | 'SYSTEM_ALERT' | 'USER_REGISTRATION';
  relatedLeaveId?: string;
}

export interface AuditLog {
  id: string;
  actorId: string;
  actorName: string;
  actorRole: Role;
  action: string;
  details: string;
  timestamp: string;
  ipAddress?: string;
}

export interface GranularPermission {
  id: string;
  name: string;
  description: string;
  category: 'LEAVE_MANAGEMENT' | 'USER_MANAGEMENT' | 'REPORTS' | 'SYSTEM';
}

export interface PermissionMatrixEntry {
  id: string; // e.g. user_id
  userId: string;
  userName: string;
  userEmail: string;
  role: Role;
  departmentId: string;
  permissions: string[];
  updatedAt: string;
  updatedBy?: string;
}

export interface ToastNotification {
  id: string;
  title: string;
  message: string;
  type: 'SUCCESS' | 'ERROR' | 'INFO' | 'WARNING';
  leaveId?: string;
  status?: LeaveStatus;
  timestamp: string;
  read?: boolean;
}

export interface EmailSettings {
  enabled: boolean;
  smtpHost: string;
  smtpPort: number;
  smtpUsername: string;
  smtpPassword?: string;
  senderEmail: string;
  senderName: string;
  encryption: 'TLS' | 'SSL' | 'NONE';
  sendCopyAdmin: boolean;
  adminCcEmail?: string;
  apiEndpoint?: string;
}

export interface EmailLog {
  id: string;
  recipientEmail: string;
  recipientName: string;
  recipientRole: string;
  subject: string;
  bodyHtml: string;
  bodyText: string;
  status: 'SENT' | 'SIMULATED' | 'FAILED';
  timestamp: string;
  leaveRequestId?: string;
  triggerEvent: 'LEAVE_SUBMITTED' | 'HOD_RECOMMENDED' | 'HOD_REJECTED' | 'REGISTRAR_SANCTIONED' | 'REGISTRAR_REJECTED' | 'TEST_EMAIL';
}

export interface ThemeSettings {
  navBgColor: string;
  navTextColor: string;
  sidebarBgColor: string;
  sidebarTextColor: string;
  primaryColor: string;
  fontFamily: string;
  borderRadius: 'none' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | 'full';
  headerHeight: string;
  navShadow: 'none' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  sidebarShadow: 'none' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  cardShadow: 'none' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  loginPageSettings?: {
    backgroundColor: string;
    cardHeaderColor: string;
    cardTextColor: string;
    cardTitle: string;
  };
}

export interface SystemSettings {
  enableDemoAccounts: boolean;
  enableRoleSwitcher: boolean;
  enableSelfRegistration?: boolean;
  institutionName?: string;
  institutionLogoUrl?: string;
  emailSettings?: EmailSettings;
  themeSettings?: ThemeSettings;
}
