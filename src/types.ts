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
  CASUAL: { total: number; used: number; pending: number };
  SICK: { total: number; used: number; pending: number };
  EARNED: { total: number; used: number; pending: number };
  DUTY: { total: number; used: number; pending: number };
  STUDY: { total: number; used: number; pending: number };
  MATERNITY_PATERNITY: { total: number; used: number; pending: number };
  SPECIAL_CASUAL: { total: number; used: number; pending: number };
}

export type LeaveStatus = 
  | 'PENDING_HOD' 
  | 'PENDING_REGISTRAR' 
  | 'APPROVED' 
  | 'REJECTED' 
  | 'CANCELLED';

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
  
  status: LeaveStatus;
  appliedOn: string;
  
  hodApproval?: {
    actionBy: string;
    actionByName: string;
    actionDate: string;
    status: 'RECOMMENDED' | 'REJECTED';
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
