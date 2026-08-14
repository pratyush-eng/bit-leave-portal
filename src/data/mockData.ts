import { Department, LeavePolicy, User, LeaveRequest, Notification, AuditLog, GranularPermission } from '../types';

export const INITIAL_DEPARTMENTS: Department[] = [
  { id: 'CSE', name: 'Computer Science & Engineering', code: 'CSE', hodName: 'Dr. Sunita Verma', hodId: 'usr_2', totalFaculty: 24 },
  { id: 'ECE', name: 'Electronics & Communication', code: 'ECE', hodName: 'Dr. Ramesh Iyer', hodId: 'usr_8', totalFaculty: 18 },
  { id: 'MECH', name: 'Mechanical Engineering', code: 'MECH', hodName: 'Dr. Prakash Deshmukh', hodId: 'usr_9', totalFaculty: 20 },
  { id: 'PHYSICS', name: 'Physics & Applied Sciences', code: 'PHY', hodName: 'Dr. Shalini Gupta', hodId: 'usr_10', totalFaculty: 12 },
  { id: 'MATHS', name: 'Mathematics & Data Science', code: 'MATH', hodName: 'Dr. Tarun Mehta', hodId: 'usr_11', totalFaculty: 10 },
  { id: 'ADMIN', name: 'General Administration & Registrar Office', code: 'ADM', hodName: 'Dr. A. K. Kapoor', hodId: 'usr_3', totalFaculty: 15 },
];

export const INITIAL_LEAVE_POLICIES: LeavePolicy[] = [
  {
    type: 'CASUAL',
    label: 'Casual Leave (CL)',
    annualQuota: 12,
    requiresDocument: false,
    minDaysNotice: 1,
    color: '#2563eb', // Indigo / Blue
    description: 'Granted for unexpected personal matters. Maximum 3 consecutive days without prior sanction.'
  },
  {
    type: 'SICK',
    label: 'Sick / Medical Leave (SL)',
    annualQuota: 10,
    requiresDocument: true,
    minDaysNotice: 0,
    color: '#e11d48', // Rose / Red
    description: 'Granted on medical grounds. Medical certificate required if leave duration exceeds 3 days.'
  },
  {
    type: 'EARNED',
    label: 'Earned Leave (EL)',
    annualQuota: 30,
    requiresDocument: false,
    minDaysNotice: 7,
    color: '#059669', // Emerald / Green
    description: 'Accumulated based on service completed. Minimum 3 days application required in advance.'
  },
  {
    type: 'DUTY',
    label: 'On-Duty Leave (OD)',
    annualQuota: 15,
    requiresDocument: true,
    minDaysNotice: 2,
    color: '#7c3aed', // Violet
    description: 'Sanctioned for attending official conferences, academic evaluation, or institutional work.'
  },
  {
    type: 'STUDY',
    label: 'Study / Research Leave',
    annualQuota: 90,
    requiresDocument: true,
    minDaysNotice: 30,
    color: '#d97706', // Amber
    description: 'For pursuing higher research, fellowship, or sabbatical programs with approval.'
  },
  {
    type: 'MATERNITY_PATERNITY',
    label: 'Maternity / Paternity Leave',
    annualQuota: 180,
    requiresDocument: true,
    minDaysNotice: 15,
    color: '#db2777', // Pink
    description: 'Statutory leave granted for childbirth and care as per institutional norms.'
  },
  {
    type: 'SPECIAL_CASUAL',
    label: 'Special Casual Leave',
    annualQuota: 7,
    requiresDocument: true,
    minDaysNotice: 3,
    color: '#0891b2', // Cyan
    description: 'Granted for university exam duties, election work, or sports representation.'
  }
];

export const GRANULAR_PERMISSIONS: GranularPermission[] = [
  { id: 'PERM_APPROVE_OVERRIDE', name: 'Override HOD Endorsement', description: 'Allows direct approval of leave without waiting for HOD recommendation.', category: 'LEAVE_MANAGEMENT' },
  { id: 'PERM_ADJUST_BALANCE', name: 'Modify Leave Balances', description: 'Allows manual credit or deduction of leave quotas for employees.', category: 'LEAVE_MANAGEMENT' },
  { id: 'PERM_MANAGE_USERS', name: 'Manage User Profiles & Roles', description: 'Allows editing user role assignments, department mappings, and profiles.', category: 'USER_MANAGEMENT' },
  { id: 'PERM_EXPORT_REPORTS', name: 'Export Analytical Reports', description: 'Allows downloading CSV/PDF summary analytics and audit logs.', category: 'REPORTS' },
  { id: 'PERM_CONFIG_POLICIES', name: 'Configure Leave Policies', description: 'Allows changing annual quotas and notice requirements for leave types.', category: 'SYSTEM' },
];

export const MOCK_USERS: User[] = [
  {
    id: 'usr_1',
    name: 'Prof. Rajesh Kumar',
    email: 'rajesh.kumar@institution.edu',
    role: 'FACULTY',
    designation: 'Associate Professor',
    departmentId: 'CSE',
    departmentName: 'Computer Science & Engineering',
    employeeCode: 'FAC-2018-042',
    joiningDate: '2018-07-15',
    phone: '+91 98765 43210',
    avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=250&q=80',
    leaveBalances: {
      CASUAL: { total: 12, used: 4, pending: 2 },
      SICK: { total: 10, used: 1, pending: 0 },
      EARNED: { total: 30, used: 5, pending: 0 },
      DUTY: { total: 15, used: 3, pending: 0 },
      STUDY: { total: 90, used: 0, pending: 0 },
      MATERNITY_PATERNITY: { total: 180, used: 0, pending: 0 },
      SPECIAL_CASUAL: { total: 7, used: 1, pending: 0 },
    }
  },
  {
    id: 'usr_2',
    name: 'Dr. Sunita Verma',
    email: 'sunita.verma@institution.edu',
    role: 'HOD',
    designation: 'Professor & Head of Department',
    departmentId: 'CSE',
    departmentName: 'Computer Science & Engineering',
    employeeCode: 'FAC-2012-009',
    joiningDate: '2012-01-10',
    phone: '+91 98112 33445',
    avatarUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=250&q=80',
    leaveBalances: {
      CASUAL: { total: 12, used: 2, pending: 0 },
      SICK: { total: 10, used: 0, pending: 0 },
      EARNED: { total: 30, used: 10, pending: 0 },
      DUTY: { total: 15, used: 6, pending: 0 },
      STUDY: { total: 90, used: 0, pending: 0 },
      MATERNITY_PATERNITY: { total: 180, used: 0, pending: 0 },
      SPECIAL_CASUAL: { total: 7, used: 2, pending: 0 },
    }
  },
  {
    id: 'usr_3',
    name: 'Dr. A. K. Kapoor',
    email: 'registrar@institution.edu',
    role: 'REGISTRAR',
    designation: 'University Registrar',
    departmentId: 'ADMIN',
    departmentName: 'General Administration',
    employeeCode: 'ADM-2008-001',
    joiningDate: '2008-03-01',
    phone: '+91 99000 11223',
    avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=250&q=80',
    leaveBalances: {
      CASUAL: { total: 12, used: 1, pending: 0 },
      SICK: { total: 10, used: 0, pending: 0 },
      EARNED: { total: 30, used: 12, pending: 0 },
      DUTY: { total: 15, used: 8, pending: 0 },
      STUDY: { total: 90, used: 0, pending: 0 },
      MATERNITY_PATERNITY: { total: 180, used: 0, pending: 0 },
      SPECIAL_CASUAL: { total: 7, used: 0, pending: 0 },
    }
  },
  {
    id: 'usr_4',
    name: 'Meera Sharma',
    email: 'meera.sharma@institution.edu',
    role: 'ADMIN',
    designation: 'Senior Administrative Officer & Dept Admin',
    departmentId: 'ADMIN',
    departmentName: 'General Administration',
    employeeCode: 'ADM-2015-018',
    joiningDate: '2015-09-20',
    phone: '+91 97654 32109',
    avatarUrl: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=250&q=80',
    assignedPermissions: ['PERM_ADJUST_BALANCE', 'PERM_MANAGE_USERS', 'PERM_EXPORT_REPORTS'],
    leaveBalances: {
      CASUAL: { total: 12, used: 3, pending: 0 },
      SICK: { total: 10, used: 2, pending: 0 },
      EARNED: { total: 30, used: 6, pending: 0 },
      DUTY: { total: 15, used: 0, pending: 0 },
      STUDY: { total: 90, used: 0, pending: 0 },
      MATERNITY_PATERNITY: { total: 180, used: 0, pending: 0 },
      SPECIAL_CASUAL: { total: 7, used: 0, pending: 0 },
    }
  },
  {
    id: 'usr_5',
    name: 'Prof. Vikramaditya Roy',
    email: 'dean.academic@institution.edu',
    role: 'SUPER_ADMIN',
    designation: 'Dean Academic Affairs & Super Admin',
    departmentId: 'CSE',
    departmentName: 'Computer Science & Engineering',
    employeeCode: 'EXEC-2005-002',
    joiningDate: '2005-06-01',
    phone: '+91 98888 77766',
    avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=250&q=80',
    assignedPermissions: ['PERM_APPROVE_OVERRIDE', 'PERM_ADJUST_BALANCE', 'PERM_MANAGE_USERS', 'PERM_EXPORT_REPORTS', 'PERM_CONFIG_POLICIES'],
    leaveBalances: {
      CASUAL: { total: 12, used: 0, pending: 0 },
      SICK: { total: 10, used: 0, pending: 0 },
      EARNED: { total: 30, used: 4, pending: 0 },
      DUTY: { total: 15, used: 10, pending: 0 },
      STUDY: { total: 90, used: 0, pending: 0 },
      MATERNITY_PATERNITY: { total: 180, used: 0, pending: 0 },
      SPECIAL_CASUAL: { total: 7, used: 1, pending: 0 },
    }
  },
  {
    id: 'usr_6',
    name: 'Dr. Ananya Sen',
    email: 'ananya.sen@institution.edu',
    role: 'FACULTY',
    designation: 'Assistant Professor',
    departmentId: 'ECE',
    departmentName: 'Electronics & Communication',
    employeeCode: 'FAC-2021-088',
    joiningDate: '2021-08-01',
    phone: '+91 91234 56789',
    avatarUrl: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=250&q=80',
    leaveBalances: {
      CASUAL: { total: 12, used: 5, pending: 0 },
      SICK: { total: 10, used: 3, pending: 0 },
      EARNED: { total: 30, used: 0, pending: 0 },
      DUTY: { total: 15, used: 4, pending: 0 },
      STUDY: { total: 90, used: 0, pending: 0 },
      MATERNITY_PATERNITY: { total: 180, used: 0, pending: 0 },
      SPECIAL_CASUAL: { total: 7, used: 0, pending: 0 },
    }
  },
  {
    id: 'usr_7',
    name: 'Mr. Suresh Patil',
    email: 'suresh.patil@institution.edu',
    role: 'STAFF',
    designation: 'Senior Technical Officer',
    departmentId: 'MECH',
    departmentName: 'Mechanical Engineering',
    employeeCode: 'STF-2016-015',
    joiningDate: '2016-11-10',
    phone: '+91 94321 87654',
    avatarUrl: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?auto=format&fit=crop&w=250&q=80',
    leaveBalances: {
      CASUAL: { total: 12, used: 6, pending: 0 },
      SICK: { total: 10, used: 4, pending: 0 },
      EARNED: { total: 30, used: 15, pending: 0 },
      DUTY: { total: 15, used: 1, pending: 0 },
      STUDY: { total: 90, used: 0, pending: 0 },
      MATERNITY_PATERNITY: { total: 180, used: 0, pending: 0 },
      SPECIAL_CASUAL: { total: 7, used: 0, pending: 0 },
    }
  },
  {
    id: 'usr_webmaster',
    name: 'Webmaster BIT Mesra',
    email: 'webmaster@bitmesra.ac.in',
    role: 'SUPER_ADMIN',
    designation: 'Portal Administrator & Webmaster',
    departmentId: 'CSE',
    departmentName: 'Computer Science & Engineering',
    employeeCode: 'BIT-ADM-001',
    joiningDate: '2010-01-01',
    phone: '+91 98888 77766',
    password: 'password123',
    avatarUrl: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=250&q=80',
    assignedPermissions: ['PERM_APPROVE_OVERRIDE', 'PERM_ADJUST_BALANCE', 'PERM_MANAGE_USERS', 'PERM_EXPORT_REPORTS', 'PERM_CONFIG_POLICIES'],
    leaveBalances: {
      CASUAL: { total: 12, used: 0, pending: 0 },
      SICK: { total: 10, used: 0, pending: 0 },
      EARNED: { total: 30, used: 0, pending: 0 },
      DUTY: { total: 15, used: 0, pending: 0 },
      STUDY: { total: 90, used: 0, pending: 0 },
      MATERNITY_PATERNITY: { total: 180, used: 0, pending: 0 },
      SPECIAL_CASUAL: { total: 7, used: 0, pending: 0 },
    }
  }
];

export const INITIAL_LEAVE_REQUESTS: LeaveRequest[] = [
  {
    id: 'LV-2026-104',
    applicantId: 'usr_1',
    applicantName: 'Prof. Rajesh Kumar',
    applicantEmail: 'rajesh.kumar@institution.edu',
    applicantEmployeeCode: 'FAC-2018-042',
    applicantDesignation: 'Associate Professor',
    applicantRole: 'FACULTY',
    departmentId: 'CSE',
    departmentName: 'Computer Science & Engineering',
    leaveType: 'CASUAL',
    startDate: '2026-08-04',
    endDate: '2026-08-05',
    totalDays: 2,
    isHalfDay: false,
    reason: 'Attending family wedding ceremony in native town.',
    contactAddress: '104 Green Park Avenue, New Delhi',
    contactPhone: '+91 98765 43210',
    status: 'CANCELLED',
    appliedOn: '2026-07-29',
    classHandovers: [
      {
        courseCode: 'CS301',
        courseName: 'Data Structures & Algorithms',
        substituteStaffId: 'usr_2',
        substituteStaffName: 'Dr. Sunita Verma',
        date: '2026-08-04',
        timeSlot: '10:00 AM - 11:30 AM'
      },
      {
        courseCode: 'CS504',
        courseName: 'Machine Learning Lab',
        substituteStaffId: 'usr_5',
        substituteStaffName: 'Prof. Vikramaditya Roy',
        date: '2026-08-05',
        timeSlot: '02:00 PM - 04:00 PM'
      }
    ]
  },
  {
    id: 'LV-2026-102',
    applicantId: 'usr_7',
    applicantName: 'Mr. Suresh Patil',
    applicantEmail: 'suresh.patil@institution.edu',
    applicantEmployeeCode: 'STF-2016-015',
    applicantDesignation: 'Senior Technical Officer',
    applicantRole: 'STAFF',
    departmentId: 'MECH',
    departmentName: 'Mechanical Engineering',
    leaveType: 'SICK',
    startDate: '2026-07-20',
    endDate: '2026-07-22',
    totalDays: 3,
    isHalfDay: false,
    reason: 'Acute viral fever and doctor advised 3 days bed rest.',
    documentUrl: 'https://example.com/docs/medical_certificate.pdf',
    status: 'APPROVED',
    appliedOn: '2026-07-19',
    hodApproval: {
      actionBy: 'usr_9',
      actionByName: 'Dr. Prakash Deshmukh (MECH HOD)',
      actionDate: '2026-07-19 02:15 PM',
      status: 'RECOMMENDED',
      comments: 'Forwarded for approval with medical certificate attached.'
    },
    registrarApproval: {
      actionBy: 'usr_3',
      actionByName: 'Dr. A. K. Kapoor (Registrar)',
      actionDate: '2026-07-20 09:45 AM',
      status: 'APPROVED',
      comments: 'Sanctioned under Sick Leave rules.'
    }
  }
];

export const INITIAL_NOTIFICATIONS: Notification[] = [
  {
    id: 'ntf_1',
    userId: 'usr_2',
    title: 'New Leave Request Received',
    message: 'Prof. Rajesh Kumar submitted a Casual Leave request (LV-2026-104) for 2 days (Aug 4 - Aug 5).',
    timestamp: '2026-07-29 09:30 AM',
    read: false,
    type: 'LEAVE_SUBMITTED',
    relatedLeaveId: 'LV-2026-104'
  },
  {
    id: 'ntf_2',
    userId: 'usr_3',
    title: 'HOD Recommendation Forwarded',
    message: 'Dr. Ramesh Iyer (HOD ECE) recommended Duty Leave application LV-2026-103 for Dr. Ananya Sen.',
    timestamp: '2026-07-29 11:32 AM',
    read: false,
    type: 'HOD_ENDORSED',
    relatedLeaveId: 'LV-2026-103'
  },
  {
    id: 'ntf_3',
    userId: 'usr_1',
    title: 'Leave Application Sanctioned',
    message: 'Your Earned Leave request LV-2026-101 (5 days) has been formally sanctioned by Registrar Dr. A. K. Kapoor.',
    timestamp: '2026-06-03 04:21 PM',
    read: true,
    type: 'REGISTRAR_APPROVED',
    relatedLeaveId: 'LV-2026-101'
  }
];

export const INITIAL_AUDIT_LOGS: AuditLog[] = [
  {
    id: 'log_1',
    actorId: 'usr_1',
    actorName: 'Prof. Rajesh Kumar',
    actorRole: 'FACULTY',
    action: 'LEAVE_APPLIED',
    details: 'Submitted Casual Leave application LV-2026-104 for 2 days with 2 substitute class arrangements.',
    timestamp: '2026-07-29 09:30:15',
    ipAddress: '172.16.24.102'
  },
  {
    id: 'log_2',
    actorId: 'usr_8',
    actorName: 'Dr. Ramesh Iyer',
    actorRole: 'HOD',
    action: 'HOD_RECOMMENDED',
    details: 'Endorsed Duty Leave request LV-2026-103 for Dr. Ananya Sen to Registrar office.',
    timestamp: '2026-07-29 11:30:00',
    ipAddress: '172.16.20.15'
  },
  {
    id: 'log_3',
    actorId: 'usr_5',
    actorName: 'Prof. Vikramaditya Roy',
    actorRole: 'SUPER_ADMIN',
    action: 'PERMISSION_GRANTED',
    details: 'Assigned "PERM_ADJUST_BALANCE" to Admin Meera Sharma.',
    timestamp: '2026-07-28 16:45:10',
    ipAddress: '172.16.10.1'
  }
];
