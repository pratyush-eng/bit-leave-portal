import { 
  MOCK_USERS, 
  INITIAL_LEAVE_REQUESTS, 
  INITIAL_NOTIFICATIONS, 
  INITIAL_AUDIT_LOGS, 
  INITIAL_LEAVE_POLICIES, 
  INITIAL_DEPARTMENTS 
} from '../data/mockData';
import { User, LeaveRequest, Notification, AuditLog, LeavePolicy, Department, SystemSettings, EmailLog, PermissionMatrixEntry } from '../types';
import { fetchNeonData, syncDataToNeon, deleteNeonDoc, sendAuditLogToNeon } from './neonClient';

export type DbOpType = 'INSERT' | 'UPDATE' | 'DELETE' | 'RESET' | 'SYNC' | 'IDLE';

export interface SyncStatus {
  isSyncing: boolean;
  message: string;
  opType: DbOpType;
  lastSyncedAt?: Date;
  activeCount: number;
}

type SyncListener = (status: SyncStatus) => void;

let syncListeners: SyncListener[] = [];
let activeOpCount = 0;
let currentOpMessage = '';
let currentOpType: DbOpType = 'IDLE';
let lastSyncedAt: Date | undefined = undefined;

function dispatchSyncStatus(status: SyncStatus) {
  queueMicrotask(() => {
    syncListeners.forEach(l => {
      try {
        l(status);
      } catch (err) {
        console.warn('[SyncListener Error]', err);
      }
    });
  });
}

export function subscribeToSyncStatus(listener: SyncListener) {
  syncListeners.push(listener);
  const initialStatus: SyncStatus = {
    isSyncing: activeOpCount > 0,
    message: activeOpCount > 0 ? currentOpMessage : 'PostgreSQL Database Synced',
    opType: currentOpType,
    lastSyncedAt,
    activeCount: activeOpCount
  };
  queueMicrotask(() => {
    try {
      listener(initialStatus);
    } catch (_err) {}
  });
  return () => {
    syncListeners = syncListeners.filter(l => l !== listener);
  };
}

export function notifySyncStart(msg: string, opType: DbOpType = 'UPDATE') {
  activeOpCount++;
  currentOpMessage = msg;
  currentOpType = opType;
  dispatchSyncStatus({
    isSyncing: true,
    message: currentOpMessage,
    opType: currentOpType,
    lastSyncedAt,
    activeCount: activeOpCount
  });
}

export function notifySyncEnd() {
  activeOpCount = Math.max(0, activeOpCount - 1);
  if (activeOpCount === 0) {
    currentOpType = 'IDLE';
    currentOpMessage = 'PostgreSQL Data Saved & Synced';
    lastSyncedAt = new Date();
  }
  dispatchSyncStatus({
    isSyncing: activeOpCount > 0,
    message: activeOpCount > 0 ? currentOpMessage : 'PostgreSQL Data Saved & Synced',
    opType: currentOpType,
    lastSyncedAt,
    activeCount: activeOpCount
  });
}

export async function loadOrSeedFirestoreData(): Promise<{
  users: User[];
  leaveRequests: LeaveRequest[];
  departments: Department[];
  leavePolicies: LeavePolicy[];
  notifications: Notification[];
  auditLogs: AuditLog[];
  emailLogs?: EmailLog[];
  systemSettings?: SystemSettings;
  permissionMatrix?: PermissionMatrixEntry[];
}> {
  try {
    const neonData = await fetchNeonData();
    if (neonData) {
      let savedSettings: SystemSettings | undefined;
      try {
        const saved = localStorage.getItem('academia_system_settings_v1');
        if (saved) savedSettings = JSON.parse(saved);
      } catch (_s) {}

      return {
        users: neonData.users || [],
        leaveRequests: neonData.leaveRequests || [],
        departments: neonData.departments || [],
        leavePolicies: neonData.leavePolicies || [],
        notifications: [],
        auditLogs: neonData.auditLogs || [],
        emailLogs: [],
        systemSettings: neonData.systemSettings || savedSettings,
        permissionMatrix: neonData.permissionMatrix || [],
      };
    }
  } catch (err) {
    console.warn('Error loading PostgreSQL data via helper:', err);
  }

  return {
    users: [],
    leaveRequests: [],
    departments: [],
    leavePolicies: [],
    notifications: [],
    auditLogs: [],
    permissionMatrix: [],
  };
}

export function subscribeToSystemSettings(_callback: (settings: SystemSettings) => void) {
  return () => {};
}

export function subscribeToCollection<T>(_colName: string, _callback: (items: T[]) => void) {
  return () => {};
}

export async function saveDocToFirestore(colName: string, id: string, data: any, isNewRecord: boolean = false) {
  const opType: DbOpType = isNewRecord ? 'INSERT' : 'UPDATE';
  notifySyncStart(
    isNewRecord ? `Inserting record into PostgreSQL (${colName})...` : `Updating record in PostgreSQL (${colName})...`,
    opType
  );
  try {
    if (colName === 'users') {
      await syncDataToNeon({ users: [data] });
    } else if (colName === 'leaveRequests') {
      await syncDataToNeon({ leaveRequests: [data] });
    } else if (colName === 'departments') {
      await syncDataToNeon({ departments: [data] });
    } else if (colName === 'leavePolicies') {
      await syncDataToNeon({ leavePolicies: [data] });
    } else if (colName === 'permission_matrix' || colName === 'permissionMatrix') {
      await syncDataToNeon({ permissionMatrix: [data] });
    } else if (colName === 'auditLogs') {
      await sendAuditLogToNeon(data);
    } else if (colName === 'settings') {
      try {
        localStorage.setItem('academia_system_settings_v1', JSON.stringify(data));
      } catch (_e) {}
    }
  } catch (err: any) {
    console.error(`Error saving doc to PostgreSQL ${colName}/${id}:`, err);
  } finally {
    notifySyncEnd();
  }
}

export async function deleteDocFromFirestore(colName: string, id: string) {
  notifySyncStart(`Deleting record from PostgreSQL (${colName})...`, 'DELETE');
  try {
    await deleteNeonDoc(colName, id);
  } catch (err: any) {
    console.error(`Error deleting doc from PostgreSQL ${colName}/${id}:`, err);
  } finally {
    notifySyncEnd();
  }
}

export async function deleteUserFromFirestore(userId: string, email?: string) {
  notifySyncStart(`Deleting user from PostgreSQL...`, 'DELETE');
  try {
    await deleteNeonDoc('users', userId, email);
  } catch (err: any) {
    console.error(`Error deleting user ${userId}/${email} from PostgreSQL:`, err);
  } finally {
    notifySyncEnd();
  }
}

export async function resetFirestoreData() {
  notifySyncStart('Resetting PostgreSQL database records...', 'RESET');
  try {
    await deleteNeonDoc('clearAllRequests', 'all');
  } catch (err) {
    console.warn('Error resetting PostgreSQL database:', err);
  } finally {
    notifySyncEnd();
  }
}

/**
 * Generates a full MySQL relational database DDL & DML script containing schema + INSERT records.
 */
export function generateMySQLDump(data: {
  users: User[];
  leaveRequests: LeaveRequest[];
  departments: Department[];
  leavePolicies: LeavePolicy[];
  auditLogs: AuditLog[];
}): string {
  const escapeSql = (str: string | undefined | null) => {
    if (!str) return "''";
    return `'${String(str).replace(/'/g, "''").replace(/\\/g, "\\\\")}'`;
  };

  let sql = `-- ========================================================\n`;
  sql += `-- BIT Mesra Leave Portal - Complete MySQL Database Schema & Seed Data\n`;
  sql += `-- Generated on: ${new Date().toISOString()}\n`;
  sql += `-- Compatible with MySQL 8.0+, MariaDB, Vercel Postgres, PlanetScale, Railway\n`;
  sql += `-- ========================================================\n\n`;

  sql += `CREATE DATABASE IF NOT EXISTS bit_leave_portal;\n`;
  sql += `USE bit_leave_portal;\n\n`;

  // 1. Departments Table
  sql += `-- 1. Departments Table\n`;
  sql += `DROP TABLE IF EXISTS departments;\n`;
  sql += `CREATE TABLE departments (\n`;
  sql += `  id VARCHAR(50) PRIMARY KEY,\n`;
  sql += `  code VARCHAR(20) NOT NULL,\n`;
  sql += `  name VARCHAR(255) NOT NULL,\n`;
  sql += `  hod_id VARCHAR(50),\n`;
  sql += `  hod_name VARCHAR(255),\n`;
  sql += `  total_faculty INT DEFAULT 0\n`;
  sql += `) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;\n\n`;

  if (data.departments && data.departments.length > 0) {
    sql += `INSERT INTO departments (id, code, name, hod_id, hod_name, total_faculty) VALUES\n`;
    sql += data.departments.map(d => 
      `  (${escapeSql(d.id)}, ${escapeSql(d.code)}, ${escapeSql(d.name)}, ${escapeSql(d.hodId)}, ${escapeSql(d.hodName)}, ${d.totalFaculty || 0})`
    ).join(',\n') + `;\n\n`;
  }

  // 2. Leave Policies Table
  sql += `-- 2. Leave Policies Table\n`;
  sql += `DROP TABLE IF EXISTS leave_policies;\n`;
  sql += `CREATE TABLE leave_policies (\n`;
  sql += `  type VARCHAR(50) PRIMARY KEY,\n`;
  sql += `  label VARCHAR(100) NOT NULL,\n`;
  sql += `  annual_quota INT NOT NULL DEFAULT 12,\n`;
  sql += `  min_days_notice INT DEFAULT 0,\n`;
  sql += `  requires_document TINYINT(1) DEFAULT 0,\n`;
  sql += `  color VARCHAR(20) DEFAULT '#3F51B5',\n`;
  sql += `  description TEXT\n`;
  sql += `) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;\n\n`;

  if (data.leavePolicies && data.leavePolicies.length > 0) {
    sql += `INSERT INTO leave_policies (type, label, annual_quota, min_days_notice, requires_document, color, description) VALUES\n`;
    sql += data.leavePolicies.map(p => 
      `  (${escapeSql(p.type)}, ${escapeSql(p.label)}, ${p.annualQuota}, ${p.minDaysNotice}, ${p.requiresDocument ? 1 : 0}, ${escapeSql(p.color)}, ${escapeSql(p.description)})`
    ).join(',\n') + `;\n\n`;
  }

  // 3. Users Table
  sql += `-- 3. Users Table\n`;
  sql += `DROP TABLE IF EXISTS users;\n`;
  sql += `CREATE TABLE users (\n`;
  sql += `  id VARCHAR(50) PRIMARY KEY,\n`;
  sql += `  name VARCHAR(255) NOT NULL,\n`;
  sql += `  email VARCHAR(255) NOT NULL UNIQUE,\n`;
  sql += `  role VARCHAR(50) NOT NULL,\n`;
  sql += `  designation VARCHAR(150),\n`;
  sql += `  department_id VARCHAR(50),\n`;
  sql += `  department_name VARCHAR(255),\n`;
  sql += `  employee_code VARCHAR(50),\n`;
  sql += `  joining_date VARCHAR(50),\n`;
  sql += `  phone VARCHAR(50),\n`;
  sql += `  avatar_url TEXT,\n`;
  sql += `  account_status VARCHAR(50) DEFAULT 'ACTIVE',\n`;
  sql += `  leave_balances JSON\n`;
  sql += `) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;\n\n`;

  if (data.users && data.users.length > 0) {
    sql += `INSERT INTO users (id, name, email, role, designation, department_id, department_name, employee_code, joining_date, phone, avatar_url, account_status, leave_balances) VALUES\n`;
    sql += data.users.map(u => {
      const balancesJson = JSON.stringify(u.leaveBalances || {});
      return `  (${escapeSql(u.id)}, ${escapeSql(u.name)}, ${escapeSql(u.email)}, ${escapeSql(u.role)}, ${escapeSql(u.designation)}, ${escapeSql(u.departmentId)}, ${escapeSql(u.departmentName)}, ${escapeSql(u.employeeCode)}, ${escapeSql(u.joiningDate)}, ${escapeSql(u.phone)}, ${escapeSql(u.avatarUrl)}, ${escapeSql(u.accountStatus || 'ACTIVE')}, ${escapeSql(balancesJson)})`;
    }).join(',\n') + `;\n\n`;
  }

  // 4. Leave Requests Table
  sql += `-- 4. Leave Requests Table\n`;
  sql += `DROP TABLE IF EXISTS leave_requests;\n`;
  sql += `CREATE TABLE leave_requests (\n`;
  sql += `  id VARCHAR(50) PRIMARY KEY,\n`;
  sql += `  applicant_id VARCHAR(50) NOT NULL,\n`;
  sql += `  applicant_name VARCHAR(255) NOT NULL,\n`;
  sql += `  applicant_email VARCHAR(255),\n`;
  sql += `  applicant_designation VARCHAR(150),\n`;
  sql += `  applicant_employee_code VARCHAR(50),\n`;
  sql += `  department_id VARCHAR(50),\n`;
  sql += `  department_name VARCHAR(255),\n`;
  sql += `  leave_type VARCHAR(50) NOT NULL,\n`;
  sql += `  start_date VARCHAR(50) NOT NULL,\n`;
  sql += `  end_date VARCHAR(50) NOT NULL,\n`;
  sql += `  total_days INT NOT NULL,\n`;
  sql += `  reason TEXT,\n`;
  sql += `  contact_address VARCHAR(255),\n`;
  sql += `  contact_phone VARCHAR(50),\n`;
  sql += `  document_url TEXT,\n`;
  sql += `  status VARCHAR(50) NOT NULL,\n`;
  sql += `  applied_on VARCHAR(50),\n`;
  sql += `  hod_approval JSON,\n`;
  sql += `  registrar_approval JSON,\n`;
  sql += `  class_handovers JSON\n`;
  sql += `) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;\n\n`;

  if (data.leaveRequests && data.leaveRequests.length > 0) {
    sql += `INSERT INTO leave_requests (id, applicant_id, applicant_name, applicant_email, applicant_designation, applicant_employee_code, department_id, department_name, leave_type, start_date, end_date, total_days, reason, contact_address, contact_phone, document_url, status, applied_on, hod_approval, registrar_approval, class_handovers) VALUES\n`;
    sql += data.leaveRequests.map(r => {
      const hodJson = r.hodApproval ? JSON.stringify(r.hodApproval) : 'NULL';
      const hodVal = hodJson === 'NULL' ? 'NULL' : escapeSql(hodJson);
      const regJson = r.registrarApproval ? JSON.stringify(r.registrarApproval) : 'NULL';
      const regVal = regJson === 'NULL' ? 'NULL' : escapeSql(regJson);
      const handoversJson = r.classHandovers ? JSON.stringify(r.classHandovers) : 'NULL';
      const handoversVal = handoversJson === 'NULL' ? 'NULL' : escapeSql(handoversJson);

      const appIdent = r.applicantId || r.applicantEmail || 'UNKNOWN';
      return `  (${escapeSql(r.id)}, ${escapeSql(appIdent)}, ${escapeSql(r.applicantName)}, ${escapeSql(r.applicantEmail)}, ${escapeSql(r.applicantDesignation)}, ${escapeSql(r.applicantEmployeeCode)}, ${escapeSql(r.departmentId)}, ${escapeSql(r.departmentName)}, ${escapeSql(r.leaveType)}, ${escapeSql(r.startDate)}, ${escapeSql(r.endDate)}, ${r.totalDays}, ${escapeSql(r.reason)}, ${escapeSql(r.contactAddress)}, ${escapeSql(r.contactPhone)}, ${escapeSql(r.documentUrl)}, ${escapeSql(r.status)}, ${escapeSql(r.appliedOn)}, ${hodVal}, ${regVal}, ${handoversVal})`;
    }).join(',\n') + `;\n\n`;
  }

  // 5. Audit Logs Table
  sql += `-- 5. Audit Logs Table\n`;
  sql += `DROP TABLE IF EXISTS audit_logs;\n`;
  sql += `CREATE TABLE audit_logs (\n`;
  sql += `  id VARCHAR(50) PRIMARY KEY,\n`;
  sql += `  timestamp VARCHAR(50) NOT NULL,\n`;
  sql += `  actor_id VARCHAR(50),\n`;
  sql += `  actor_name VARCHAR(255),\n`;
  sql += `  actor_role VARCHAR(50),\n`;
  sql += `  action VARCHAR(255) NOT NULL,\n`;
  sql += `  details TEXT,\n`;
  sql += `  ip_address VARCHAR(50)\n`;
  sql += `) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;\n\n`;

  if (data.auditLogs && data.auditLogs.length > 0) {
    sql += `INSERT INTO audit_logs (id, timestamp, actor_id, actor_name, actor_role, action, details, ip_address) VALUES\n`;
    sql += data.auditLogs.map(a => 
      `  (${escapeSql(a.id)}, ${escapeSql(a.timestamp)}, ${escapeSql(a.actorId)}, ${escapeSql(a.actorName)}, ${escapeSql(a.actorRole)}, ${escapeSql(a.action)}, ${escapeSql(a.details)}, ${escapeSql(a.ipAddress)})`
    ).join(',\n') + `;\n\n`;
  }

  // 6. Leave Balances Table
  sql += `-- 6. Leave Balances Table\n`;
  sql += `DROP TABLE IF EXISTS leave_balances;\n`;
  sql += `CREATE TABLE leave_balances (\n`;
  sql += `  id VARCHAR(100) PRIMARY KEY,\n`;
  sql += `  user_id VARCHAR(50) NOT NULL,\n`;
  sql += `  leave_type VARCHAR(50) NOT NULL,\n`;
  sql += `  total_quota DECIMAL(10,2) DEFAULT 0,\n`;
  sql += `  used_days DECIMAL(10,2) DEFAULT 0,\n`;
  sql += `  pending_days DECIMAL(10,2) DEFAULT 0,\n`;
  sql += `  updated_at VARCHAR(50)\n`;
  sql += `) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;\n\n`;

  const balanceRows: string[] = [];
  data.users.forEach(u => {
    if (u.leaveBalances) {
      Object.entries(u.leaveBalances).forEach(([type, b]) => {
        balanceRows.push(`  (${escapeSql(`${u.id}_${type}`)}, ${escapeSql(u.id)}, ${escapeSql(type)}, ${b?.total || 0}, ${b?.used || 0}, ${b?.pending || 0}, ${escapeSql(new Date().toISOString())})`);
      });
    }
  });

  if (balanceRows.length > 0) {
    sql += `INSERT INTO leave_balances (id, user_id, leave_type, total_quota, used_days, pending_days, updated_at) VALUES\n`;
    sql += balanceRows.join(',\n') + `;\n\n`;
  }

  return sql;
}

/**
 * Generates a full PostgreSQL / Vercel Postgres DDL & DML script containing schema + INSERT records.
 */
export function generateVercelPostgresDump(data: {
  users: User[];
  leaveRequests: LeaveRequest[];
  departments: Department[];
  leavePolicies: LeavePolicy[];
  auditLogs: AuditLog[];
}): string {
  const escapeSql = (str: string | undefined | null) => {
    if (!str) return "''";
    return `'${String(str).replace(/'/g, "''").replace(/\\/g, "\\\\")}'`;
  };

  let sql = `-- ========================================================\n`;
  sql += `-- BIT Mesra Leave Portal - Vercel Postgres / PostgreSQL Database Dump\n`;
  sql += `-- Generated on: ${new Date().toISOString()}\n`;
  sql += `-- Direct compatibility: Vercel Postgres, Neon, Supabase, AWS RDS PostgreSQL, Heroku Postgres\n`;
  sql += `-- Instructions: Paste this entire script into Vercel Postgres SQL Editor or run:\n`;
  sql += `-- psql "$POSTGRES_URL" -f vercel_postgres_dump.sql\n`;
  sql += `-- ========================================================\n\n`;

  // 1. Departments Table
  sql += `-- 1. Departments Table\n`;
  sql += `DROP TABLE IF EXISTS departments CASCADE;\n`;
  sql += `CREATE TABLE departments (\n`;
  sql += `  id VARCHAR(50) PRIMARY KEY,\n`;
  sql += `  code VARCHAR(20) NOT NULL,\n`;
  sql += `  name VARCHAR(255) NOT NULL,\n`;
  sql += `  hod_id VARCHAR(50),\n`;
  sql += `  hod_name VARCHAR(255),\n`;
  sql += `  total_faculty INTEGER DEFAULT 0\n`;
  sql += `);\n\n`;

  if (data.departments && data.departments.length > 0) {
    sql += `INSERT INTO departments (id, code, name, hod_id, hod_name, total_faculty) VALUES\n`;
    sql += data.departments.map(d => 
      `  (${escapeSql(d.id)}, ${escapeSql(d.code)}, ${escapeSql(d.name)}, ${escapeSql(d.hodId)}, ${escapeSql(d.hodName)}, ${d.totalFaculty || 0})`
    ).join(',\n') + `;\n\n`;
  }

  // 2. Leave Policies Table
  sql += `-- 2. Leave Policies Table\n`;
  sql += `DROP TABLE IF EXISTS leave_policies CASCADE;\n`;
  sql += `CREATE TABLE leave_policies (\n`;
  sql += `  type VARCHAR(50) PRIMARY KEY,\n`;
  sql += `  label VARCHAR(100) NOT NULL,\n`;
  sql += `  annual_quota INTEGER NOT NULL DEFAULT 12,\n`;
  sql += `  min_days_notice INTEGER DEFAULT 0,\n`;
  sql += `  requires_document BOOLEAN DEFAULT FALSE,\n`;
  sql += `  color VARCHAR(20) DEFAULT '#3F51B5',\n`;
  sql += `  description TEXT\n`;
  sql += `);\n\n`;

  if (data.leavePolicies && data.leavePolicies.length > 0) {
    sql += `INSERT INTO leave_policies (type, label, annual_quota, min_days_notice, requires_document, color, description) VALUES\n`;
    sql += data.leavePolicies.map(p => 
      `  (${escapeSql(p.type)}, ${escapeSql(p.label)}, ${p.annualQuota}, ${p.minDaysNotice}, ${p.requiresDocument ? 'TRUE' : 'FALSE'}, ${escapeSql(p.color)}, ${escapeSql(p.description)})`
    ).join(',\n') + `;\n\n`;
  }

  // 3. Users Table
  sql += `-- 3. Users Table\n`;
  sql += `DROP TABLE IF EXISTS users CASCADE;\n`;
  sql += `CREATE TABLE users (\n`;
  sql += `  id VARCHAR(50) PRIMARY KEY,\n`;
  sql += `  name VARCHAR(255) NOT NULL,\n`;
  sql += `  email VARCHAR(255) NOT NULL UNIQUE,\n`;
  sql += `  role VARCHAR(50) NOT NULL,\n`;
  sql += `  designation VARCHAR(150),\n`;
  sql += `  department_id VARCHAR(50),\n`;
  sql += `  department_name VARCHAR(255),\n`;
  sql += `  employee_code VARCHAR(50),\n`;
  sql += `  joining_date VARCHAR(50),\n`;
  sql += `  phone VARCHAR(50),\n`;
  sql += `  avatar_url TEXT,\n`;
  sql += `  account_status VARCHAR(50) DEFAULT 'ACTIVE',\n`;
  sql += `  leave_balances JSONB DEFAULT '{}'::jsonb\n`;
  sql += `);\n\n`;

  if (data.users && data.users.length > 0) {
    sql += `INSERT INTO users (id, name, email, role, designation, department_id, department_name, employee_code, joining_date, phone, avatar_url, account_status, leave_balances) VALUES\n`;
    sql += data.users.map(u => {
      const balancesJson = JSON.stringify(u.leaveBalances || {});
      return `  (${escapeSql(u.id)}, ${escapeSql(u.name)}, ${escapeSql(u.email)}, ${escapeSql(u.role)}, ${escapeSql(u.designation)}, ${escapeSql(u.departmentId)}, ${escapeSql(u.departmentName)}, ${escapeSql(u.employeeCode)}, ${escapeSql(u.joiningDate)}, ${escapeSql(u.phone)}, ${escapeSql(u.avatarUrl)}, ${escapeSql(u.accountStatus || 'ACTIVE')}, ${escapeSql(balancesJson)}::jsonb)`;
    }).join(',\n') + `;\n\n`;
  }

  // 4. Leave Requests Table
  sql += `-- 4. Leave Requests Table\n`;
  sql += `DROP TABLE IF EXISTS leave_requests CASCADE;\n`;
  sql += `CREATE TABLE leave_requests (\n`;
  sql += `  id VARCHAR(50) PRIMARY KEY,\n`;
  sql += `  applicant_id VARCHAR(50) NOT NULL,\n`;
  sql += `  applicant_name VARCHAR(255) NOT NULL,\n`;
  sql += `  applicant_email VARCHAR(255),\n`;
  sql += `  applicant_designation VARCHAR(150),\n`;
  sql += `  applicant_employee_code VARCHAR(50),\n`;
  sql += `  department_id VARCHAR(50),\n`;
  sql += `  department_name VARCHAR(255),\n`;
  sql += `  leave_type VARCHAR(50) NOT NULL,\n`;
  sql += `  start_date VARCHAR(50) NOT NULL,\n`;
  sql += `  end_date VARCHAR(50) NOT NULL,\n`;
  sql += `  total_days INTEGER NOT NULL,\n`;
  sql += `  reason TEXT,\n`;
  sql += `  contact_address VARCHAR(255),\n`;
  sql += `  contact_phone VARCHAR(50),\n`;
  sql += `  document_url TEXT,\n`;
  sql += `  status VARCHAR(50) NOT NULL,\n`;
  sql += `  applied_on VARCHAR(50),\n`;
  sql += `  hod_approval JSONB,\n`;
  sql += `  registrar_approval JSONB,\n`;
  sql += `  class_handovers JSONB\n`;
  sql += `);\n\n`;

  if (data.leaveRequests && data.leaveRequests.length > 0) {
    sql += `INSERT INTO leave_requests (id, applicant_id, applicant_name, applicant_email, applicant_designation, applicant_employee_code, department_id, department_name, leave_type, start_date, end_date, total_days, reason, contact_address, contact_phone, document_url, status, applied_on, hod_approval, registrar_approval, class_handovers) VALUES\n`;
    sql += data.leaveRequests.map(r => {
      const hodJson = r.hodApproval ? JSON.stringify(r.hodApproval) : null;
      const hodVal = hodJson ? `${escapeSql(hodJson)}::jsonb` : 'NULL';
      const regJson = r.registrarApproval ? JSON.stringify(r.registrarApproval) : null;
      const regVal = regJson ? `${escapeSql(regJson)}::jsonb` : 'NULL';
      const handoversJson = r.classHandovers ? JSON.stringify(r.classHandovers) : null;
      const handoversVal = handoversJson ? `${escapeSql(handoversJson)}::jsonb` : 'NULL';

      const appIdent = r.applicantId || r.applicantEmail || 'UNKNOWN';
      return `  (${escapeSql(r.id)}, ${escapeSql(appIdent)}, ${escapeSql(r.applicantName)}, ${escapeSql(r.applicantEmail)}, ${escapeSql(r.applicantDesignation)}, ${escapeSql(r.applicantEmployeeCode)}, ${escapeSql(r.departmentId)}, ${escapeSql(r.departmentName)}, ${escapeSql(r.leaveType)}, ${escapeSql(r.startDate)}, ${escapeSql(r.endDate)}, ${r.totalDays}, ${escapeSql(r.reason)}, ${escapeSql(r.contactAddress)}, ${escapeSql(r.contactPhone)}, ${escapeSql(r.documentUrl)}, ${escapeSql(r.status)}, ${escapeSql(r.appliedOn)}, ${hodVal}, ${regVal}, ${handoversVal})`;
    }).join(',\n') + `;\n\n`;
  }

  // 5. Audit Logs Table
  sql += `-- 5. Audit Logs Table\n`;
  sql += `DROP TABLE IF EXISTS audit_logs CASCADE;\n`;
  sql += `CREATE TABLE audit_logs (\n`;
  sql += `  id VARCHAR(50) PRIMARY KEY,\n`;
  sql += `  timestamp VARCHAR(50) NOT NULL,\n`;
  sql += `  actor_id VARCHAR(50),\n`;
  sql += `  actor_name VARCHAR(255),\n`;
  sql += `  actor_role VARCHAR(50),\n`;
  sql += `  action VARCHAR(255) NOT NULL,\n`;
  sql += `  details TEXT,\n`;
  sql += `  ip_address VARCHAR(50)\n`;
  sql += `);\n\n`;

  if (data.auditLogs && data.auditLogs.length > 0) {
    sql += `INSERT INTO audit_logs (id, timestamp, actor_id, actor_name, actor_role, action, details, ip_address) VALUES\n`;
    sql += data.auditLogs.map(a => 
      `  (${escapeSql(a.id)}, ${escapeSql(a.timestamp)}, ${escapeSql(a.actorId)}, ${escapeSql(a.actorName)}, ${escapeSql(a.actorRole)}, ${escapeSql(a.action)}, ${escapeSql(a.details)}, ${escapeSql(a.ipAddress)})`
    ).join(',\n') + `;\n\n`;
  }

  // 6. Leave Balances Table
  sql += `-- 6. Leave Balances Table\n`;
  sql += `DROP TABLE IF EXISTS leave_balances CASCADE;\n`;
  sql += `CREATE TABLE leave_balances (\n`;
  sql += `  id VARCHAR(100) PRIMARY KEY,\n`;
  sql += `  user_id VARCHAR(50) NOT NULL,\n`;
  sql += `  leave_type VARCHAR(50) NOT NULL,\n`;
  sql += `  total_quota NUMERIC DEFAULT 0,\n`;
  sql += `  used_days NUMERIC DEFAULT 0,\n`;
  sql += `  pending_days NUMERIC DEFAULT 0,\n`;
  sql += `  updated_at VARCHAR(50)\n`;
  sql += `);\n\n`;

  const pgBalanceRows: string[] = [];
  data.users.forEach(u => {
    if (u.leaveBalances) {
      Object.entries(u.leaveBalances).forEach(([type, b]) => {
        pgBalanceRows.push(`  (${escapeSql(`${u.id}_${type}`)}, ${escapeSql(u.id)}, ${escapeSql(type)}, ${b?.total || 0}, ${b?.used || 0}, ${b?.pending || 0}, ${escapeSql(new Date().toISOString())})`);
      });
    }
  });

  if (pgBalanceRows.length > 0) {
    sql += `INSERT INTO leave_balances (id, user_id, leave_type, total_quota, used_days, pending_days, updated_at) VALUES\n`;
    sql += pgBalanceRows.join(',\n') + `;\n\n`;
  }

  // 7. System Settings & Privileges Table
  sql += `-- 7. System Settings & Privilege Toggles Table\n`;
  sql += `DROP TABLE IF EXISTS system_settings CASCADE;\n`;
  sql += `CREATE TABLE system_settings (\n`;
  sql += `  id VARCHAR(50) PRIMARY KEY DEFAULT 'default',\n`;
  sql += `  enable_demo_accounts BOOLEAN DEFAULT TRUE,\n`;
  sql += `  enable_role_switcher BOOLEAN DEFAULT TRUE,\n`;
  sql += `  enable_self_registration BOOLEAN DEFAULT TRUE,\n`;
  sql += `  institution_name VARCHAR(255) DEFAULT 'BIT Leave Portal',\n`;
  sql += `  institution_logo_url TEXT,\n`;
  sql += `  email_settings JSONB DEFAULT '{}'::jsonb,\n`;
  sql += `  updated_at VARCHAR(50),\n`;
  sql += `  updated_by VARCHAR(50)\n`;
  sql += `);\n\n`;

  sql += `INSERT INTO system_settings (id, enable_demo_accounts, enable_role_switcher, enable_self_registration, institution_name, institution_logo_url, email_settings, updated_at, updated_by)\n`;
  sql += `VALUES ('default', TRUE, TRUE, TRUE, 'BIT Leave Portal', NULL, '{}'::jsonb, ${escapeSql(new Date().toISOString())}, 'SUPER_ADMIN')\n`;
  sql += `ON CONFLICT (id) DO NOTHING;\n\n`;

  // 8. Permission Matrix Table
  sql += `-- 8. Permission Matrix Table\n`;
  sql += `DROP TABLE IF EXISTS permission_matrix CASCADE;\n`;
  sql += `CREATE TABLE permission_matrix (\n`;
  sql += `  user_id VARCHAR(50) PRIMARY KEY,\n`;
  sql += `  permissions JSONB DEFAULT '[]'::jsonb,\n`;
  sql += `  updated_at VARCHAR(50),\n`;
  sql += `  updated_by VARCHAR(50)\n`;
  sql += `);\n\n`;

  return sql;
}


