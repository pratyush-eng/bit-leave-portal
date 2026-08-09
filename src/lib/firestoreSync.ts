import { collection, getDocs, setDoc, deleteDoc, doc, getDoc, writeBatch, onSnapshot } from 'firebase/firestore';
import { db } from './firebase';
import { 
  MOCK_USERS, 
  INITIAL_LEAVE_REQUESTS, 
  INITIAL_NOTIFICATIONS, 
  INITIAL_AUDIT_LOGS, 
  INITIAL_LEAVE_POLICIES, 
  INITIAL_DEPARTMENTS 
} from '../data/mockData';
import { User, LeaveRequest, Notification, AuditLog, LeavePolicy, Department, SystemSettings, EmailLog } from '../types';

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

export function subscribeToSyncStatus(listener: SyncListener) {
  syncListeners.push(listener);
  listener({
    isSyncing: activeOpCount > 0,
    message: activeOpCount > 0 ? currentOpMessage : 'Live Database Synced',
    opType: currentOpType,
    lastSyncedAt,
    activeCount: activeOpCount
  });
  return () => {
    syncListeners = syncListeners.filter(l => l !== listener);
  };
}

export function notifySyncStart(msg: string, opType: DbOpType = 'UPDATE') {
  activeOpCount++;
  currentOpMessage = msg;
  currentOpType = opType;
  const status: SyncStatus = {
    isSyncing: true,
    message: currentOpMessage,
    opType: currentOpType,
    lastSyncedAt,
    activeCount: activeOpCount
  };
  syncListeners.forEach(l => l(status));
}

export function notifySyncEnd() {
  activeOpCount = Math.max(0, activeOpCount - 1);
  if (activeOpCount === 0) {
    currentOpType = 'IDLE';
    currentOpMessage = 'Live Data Saved & Synced';
    lastSyncedAt = new Date();
  }
  const status: SyncStatus = {
    isSyncing: activeOpCount > 0,
    message: activeOpCount > 0 ? currentOpMessage : 'Live Data Saved & Synced',
    opType: currentOpType,
    lastSyncedAt,
    activeCount: activeOpCount
  };
  syncListeners.forEach(l => l(status));
}

async function getOrSeedCollection<T>(
  colName: string, 
  storageKey: string, 
  defaultItems: T[], 
  idField: string = 'id'
): Promise<T[]> {
  try {
    const snap = await getDocs(collection(db, colName));
    if (!snap.empty) {
      const items = snap.docs.map(d => d.data() as T);
      if (items.length > 0) return items;
    }
  } catch (err) {
    console.warn(`Error fetching ${colName} from Firestore:`, err);
  }

  // Collection is empty or failed to load in Firestore. Check localStorage fallback.
  let localItems: T[] = [];
  try {
    const saved = localStorage.getItem(storageKey);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) {
        localItems = parsed;
      }
    }
  } catch (e) {
    console.warn(`Error parsing localStorage for ${storageKey}:`, e);
  }

  const itemsToSeed = localItems.length > 0 ? localItems : defaultItems;
  if (itemsToSeed.length > 0) {
    await seedCollection(colName, itemsToSeed, idField);
  }

  return itemsToSeed;
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
}> {
  try {
    // Fetch global system settings (logo, institution name, feature toggles, email settings)
    let systemSettings: SystemSettings | undefined = undefined;
    try {
      const settingsSnap = await getDoc(doc(db, 'settings', 'global'));
      if (settingsSnap.exists()) {
        systemSettings = settingsSnap.data() as SystemSettings;
      }
    } catch (sErr) {
      console.warn('Could not load global settings from Firestore:', sErr);
    }

    const users = await getOrSeedCollection<User>('users', 'academia_leave_users_v1', MOCK_USERS, 'id');
    const rawRequests = await getOrSeedCollection<LeaveRequest>('leaveRequests', 'academia_leave_requests_v1', INITIAL_LEAVE_REQUESTS, 'id');
    const idsToRemove = ['LV-2026-100', 'LV-2026-101', 'LV-2026-103'];
    const leaveRequests = rawRequests.filter(r => !idsToRemove.includes(r.id));
    
    // Purge target IDs from Firestore if present
    for (const targetId of idsToRemove) {
      deleteDocFromFirestore('leaveRequests', targetId).catch(() => {});
    }
    const departments = await getOrSeedCollection<Department>('departments', 'academia_leave_departments_v1', INITIAL_DEPARTMENTS, 'id');
    const leavePolicies = await getOrSeedCollection<LeavePolicy>('leavePolicies', 'academia_leave_policies_v1', INITIAL_LEAVE_POLICIES, 'type');
    const notifications = await getOrSeedCollection<Notification>('notifications', 'academia_leave_notifications_v1', INITIAL_NOTIFICATIONS, 'id');
    const auditLogs = await getOrSeedCollection<AuditLog>('auditLogs', 'academia_leave_logs_v1', INITIAL_AUDIT_LOGS, 'id');
    
    let emailLogs: EmailLog[] = [];
    try {
      const mailSnap = await getDocs(collection(db, 'emailLogs'));
      if (!mailSnap.empty) {
        emailLogs = mailSnap.docs.map(d => d.data() as EmailLog);
      }
    } catch (mErr) {
      console.warn('Could not load emailLogs from Firestore:', mErr);
    }

    return {
      users,
      leaveRequests,
      departments,
      leavePolicies,
      notifications,
      auditLogs,
      emailLogs,
      systemSettings,
    };
  } catch (error) {
    console.error('Firestore sync failed, falling back to local storage/mock data:', error);
    let localRequests = INITIAL_LEAVE_REQUESTS;
    try {
      const saved = localStorage.getItem('academia_leave_requests_v1');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) localRequests = parsed;
      }
    } catch (_) {}

    return {
      users: MOCK_USERS,
      leaveRequests: localRequests,
      departments: INITIAL_DEPARTMENTS,
      leavePolicies: INITIAL_LEAVE_POLICIES,
      notifications: INITIAL_NOTIFICATIONS,
      auditLogs: INITIAL_AUDIT_LOGS,
    };
  }
}

export function subscribeToSystemSettings(callback: (settings: SystemSettings) => void) {
  try {
    return onSnapshot(doc(db, 'settings', 'global'), (snapshot) => {
      if (snapshot.exists()) {
        callback(snapshot.data() as SystemSettings);
      }
    }, (err) => {
      console.warn('Settings subscription error:', err);
    });
  } catch (err) {
    console.warn('Failed setting up settings subscription:', err);
    return () => {};
  }
}

export function subscribeToCollection<T>(colName: string, callback: (items: T[]) => void) {
  try {
    return onSnapshot(collection(db, colName), (snapshot) => {
      const items = snapshot.docs.map(d => d.data() as T);
      callback(items);
    }, (err) => {
      console.warn(`Realtime subscription error for ${colName}:`, err);
    });
  } catch (err) {
    console.warn(`Failed setting up realtime subscription for ${colName}:`, err);
    return () => {};
  }
}

let isQuotaExceeded = false;

async function seedCollection(colName: string, items: any[], idField: string) {
  if (isQuotaExceeded) return;
  notifySyncStart(`Seeding database collection (${colName})...`, 'INSERT');
  try {
    const batch = writeBatch(db);
    items.forEach((item) => {
      const docRef = doc(db, colName, String(item[idField]));
      batch.set(docRef, item);
    });
    await batch.commit();
  } catch (err: any) {
    if (err?.code === 'resource-exhausted' || err?.message?.includes('Quota limit exceeded')) {
      isQuotaExceeded = true;
      console.warn(`Firestore quota limit reached during seedCollection (${colName}). Falling back to local storage.`);
    } else {
      console.error(`Failed seeding ${colName}:`, err);
    }
  } finally {
    notifySyncEnd();
  }
}

export async function saveDocToFirestore(colName: string, id: string, data: any, isNewRecord: boolean = false) {
  if (isQuotaExceeded) return;
  const opType: DbOpType = isNewRecord ? 'INSERT' : 'UPDATE';
  notifySyncStart(
    isNewRecord ? `Inserting record into live database (${colName})...` : `Updating record in live database (${colName})...`,
    opType
  );
  try {
    await setDoc(doc(db, colName, String(id)), data, { merge: true });
  } catch (err: any) {
    if (err?.code === 'resource-exhausted' || err?.message?.includes('Quota limit exceeded')) {
      isQuotaExceeded = true;
      console.warn(`Firestore quota limit reached saving ${colName}/${id}. Using local state.`);
    } else {
      console.error(`Error saving doc to ${colName}/${id}:`, err);
    }
  } finally {
    notifySyncEnd();
  }
}

export async function deleteDocFromFirestore(colName: string, id: string) {
  if (isQuotaExceeded) return;
  notifySyncStart(`Deleting record from live database (${colName})...`, 'DELETE');
  try {
    await deleteDoc(doc(db, colName, String(id)));
  } catch (err: any) {
    if (err?.code === 'resource-exhausted' || err?.message?.includes('Quota limit exceeded')) {
      isQuotaExceeded = true;
      console.warn(`Firestore quota limit reached deleting ${colName}/${id}. Using local state.`);
    } else {
      console.error(`Error deleting doc from ${colName}/${id}:`, err);
    }
  } finally {
    notifySyncEnd();
  }
}

export async function resetFirestoreData() {
  if (isQuotaExceeded) return;
  notifySyncStart('Resetting institutional database records...', 'RESET');
  try {
    const collectionsToClear = ['users', 'leaveRequests', 'departments', 'leavePolicies', 'notifications', 'auditLogs', 'emailLogs'];
    for (const col of collectionsToClear) {
      const snap = await getDocs(collection(db, col));
      if (!snap.empty) {
        const batch = writeBatch(db);
        snap.docs.forEach(d => batch.delete(d.ref));
        await batch.commit();
      }
    }
    await seedCollection('users', MOCK_USERS, 'id');
    await seedCollection('leaveRequests', INITIAL_LEAVE_REQUESTS, 'id');
    await seedCollection('departments', INITIAL_DEPARTMENTS, 'id');
    await seedCollection('leavePolicies', INITIAL_LEAVE_POLICIES, 'type');
    await seedCollection('notifications', INITIAL_NOTIFICATIONS, 'id');
    await seedCollection('auditLogs', INITIAL_AUDIT_LOGS, 'id');
  } catch (err) {
    console.warn('Error resetting Firestore database:', err);
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

      return `  (${escapeSql(r.id)}, ${escapeSql(r.applicantId)}, ${escapeSql(r.applicantName)}, ${escapeSql(r.applicantEmail)}, ${escapeSql(r.applicantDesignation)}, ${escapeSql(r.applicantEmployeeCode)}, ${escapeSql(r.departmentId)}, ${escapeSql(r.departmentName)}, ${escapeSql(r.leaveType)}, ${escapeSql(r.startDate)}, ${escapeSql(r.endDate)}, ${r.totalDays}, ${escapeSql(r.reason)}, ${escapeSql(r.contactAddress)}, ${escapeSql(r.contactPhone)}, ${escapeSql(r.documentUrl)}, ${escapeSql(r.status)}, ${escapeSql(r.appliedOn)}, ${hodVal}, ${regVal}, ${handoversVal})`;
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

      return `  (${escapeSql(r.id)}, ${escapeSql(r.applicantId)}, ${escapeSql(r.applicantName)}, ${escapeSql(r.applicantEmail)}, ${escapeSql(r.applicantDesignation)}, ${escapeSql(r.applicantEmployeeCode)}, ${escapeSql(r.departmentId)}, ${escapeSql(r.departmentName)}, ${escapeSql(r.leaveType)}, ${escapeSql(r.startDate)}, ${escapeSql(r.endDate)}, ${r.totalDays}, ${escapeSql(r.reason)}, ${escapeSql(r.contactAddress)}, ${escapeSql(r.contactPhone)}, ${escapeSql(r.documentUrl)}, ${escapeSql(r.status)}, ${escapeSql(r.appliedOn)}, ${hodVal}, ${regVal}, ${handoversVal})`;
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

  return sql;
}


