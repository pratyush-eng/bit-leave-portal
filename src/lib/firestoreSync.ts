import { 
  collection, 
  doc, 
  getDocs, 
  getDoc, 
  setDoc, 
  deleteDoc, 
  writeBatch, 
  query, 
  limit,
  onSnapshot
} from 'firebase/firestore';
import { db, PROJECT_ID, DATABASE_ID } from './firebase';
import { 
  MOCK_USERS, 
  INITIAL_LEAVE_REQUESTS, 
  INITIAL_DEPARTMENTS, 
  INITIAL_LEAVE_POLICIES, 
  INITIAL_AUDIT_LOGS 
} from '../data/mockData';
import { User, LeaveRequest, Notification, AuditLog, LeavePolicy, Department, SystemSettings, EmailLog, PermissionMatrixEntry } from '../types';

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
    message: activeOpCount > 0 ? currentOpMessage : 'Firebase Firestore Synced',
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

let autoEndTimer: NodeJS.Timeout | null = null;

export function notifySyncStart(msg: string, opType: DbOpType = 'UPDATE') {
  activeOpCount++;
  currentOpMessage = msg;
  currentOpType = opType;

  if (autoEndTimer) {
    clearTimeout(autoEndTimer);
  }

  // Safety timer: Forcibly clear syncing toast after 3 seconds if notifySyncEnd wasn't reached
  autoEndTimer = setTimeout(() => {
    activeOpCount = 0;
    currentOpType = 'IDLE';
    currentOpMessage = 'Firebase Firestore Synced';
    lastSyncedAt = new Date();
    dispatchSyncStatus({
      isSyncing: false,
      message: 'Firebase Firestore Synced',
      opType: 'IDLE',
      lastSyncedAt,
      activeCount: 0
    });
  }, 3000);

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
    if (autoEndTimer) {
      clearTimeout(autoEndTimer);
      autoEndTimer = null;
    }
    currentOpType = 'IDLE';
    currentOpMessage = 'Firebase Firestore Saved & Synced';
    lastSyncedAt = new Date();
  }
  dispatchSyncStatus({
    isSyncing: activeOpCount > 0,
    message: activeOpCount > 0 ? currentOpMessage : 'Firebase Firestore Saved & Synced',
    opType: currentOpType,
    lastSyncedAt,
    activeCount: activeOpCount
  });
}

/**
 * Loads all collections from Firebase Firestore.
 * If collections are empty or missing records, seeds default institutional data into Firestore.
 * @param notifyToast whether to display the sync toast popup (defaults to false for background sync)
 */
export async function loadOrSeedFirestoreData(notifyToast: boolean = false): Promise<{
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
  if (notifyToast) {
    notifySyncStart('Connecting & Loading Data from Firebase Firestore...', 'SYNC');
  }

  try {
    // Fetch users collection
    const usersSnap = await getDocs(collection(db, 'users'));
    let usersList: User[] = usersSnap.docs.map(d => ({ id: d.id, ...d.data() } as User));

    // Fetch leave requests
    const reqSnap = await getDocs(collection(db, 'leaveRequests'));
    let reqList: LeaveRequest[] = reqSnap.docs.map(d => ({ id: d.id, ...d.data() } as LeaveRequest));

    // Fetch departments
    const deptSnap = await getDocs(collection(db, 'departments'));
    let deptList: Department[] = deptSnap.docs.map(d => ({ id: d.id, ...d.data() } as Department));

    // Fetch policies
    const policySnap = await getDocs(collection(db, 'leavePolicies'));
    let policyList: LeavePolicy[] = policySnap.docs.map(d => ({ type: d.id, ...d.data() } as LeavePolicy));

    // Fetch audit logs
    const auditSnap = await getDocs(collection(db, 'auditLogs'));
    let auditList: AuditLog[] = auditSnap.docs.map(d => ({ id: d.id, ...d.data() } as AuditLog));

    // Fetch permission matrix
    const pmSnap = await getDocs(collection(db, 'permissionMatrix'));
    let pmList: PermissionMatrixEntry[] = pmSnap.docs.map(d => ({ userId: d.id, ...d.data() } as PermissionMatrixEntry));

    // Fetch system settings
    const settingsDoc = await getDoc(doc(db, 'systemSettings', 'default'));
    let settings: SystemSettings | undefined = settingsDoc.exists() ? (settingsDoc.data() as SystemSettings) : undefined;

    let needsBatchCommit = false;
    const batch = writeBatch(db);

    // 1. Ensure Departments exist
    if (deptList.length === 0) {
      console.log('[Firebase Firestore] Seeding default departments...');
      INITIAL_DEPARTMENTS.forEach(d => {
        batch.set(doc(db, 'departments', d.id), d, { merge: true });
      });
      deptList = [...INITIAL_DEPARTMENTS];
      needsBatchCommit = true;
    }

    // 2. Ensure Leave Policies exist
    if (policyList.length === 0) {
      console.log('[Firebase Firestore] Seeding default leave policies...');
      INITIAL_LEAVE_POLICIES.forEach(p => {
        batch.set(doc(db, 'leavePolicies', p.type), p, { merge: true });
      });
      policyList = [...INITIAL_LEAVE_POLICIES];
      needsBatchCommit = true;
    }

    // 3. Ensure all MOCK_USERS exist in Firestore
    const existingUserIds = new Set(usersList.map(u => u.id));
    const missingMockUsers = MOCK_USERS.filter(u => !existingUserIds.has(u.id));
    if (usersList.length === 0 || missingMockUsers.length > 0) {
      console.log(`[Firebase Firestore] Seeding ${missingMockUsers.length} missing mock users into Firestore...`);
      missingMockUsers.forEach(u => {
        batch.set(doc(db, 'users', u.id), u, { merge: true });
      });
      const mergedMap = new Map<string, User>();
      [...MOCK_USERS, ...usersList].forEach(u => mergedMap.set(u.id, u));
      usersList = Array.from(mergedMap.values());
      needsBatchCommit = true;
    }

    // 4. Ensure Leave Requests exist
    if (reqList.length === 0) {
      console.log('[Firebase Firestore] Seeding default leave requests...');
      INITIAL_LEAVE_REQUESTS.forEach(r => {
        batch.set(doc(db, 'leaveRequests', r.id), r, { merge: true });
      });
      reqList = [...INITIAL_LEAVE_REQUESTS];
      needsBatchCommit = true;
    }

    // 5. Ensure Audit Logs exist
    if (auditList.length === 0) {
      console.log('[Firebase Firestore] Seeding default audit logs...');
      INITIAL_AUDIT_LOGS.forEach(a => {
        batch.set(doc(db, 'auditLogs', a.id), a, { merge: true });
      });
      auditList = [...INITIAL_AUDIT_LOGS];
      needsBatchCommit = true;
    }

    // 6. Ensure System Settings exist
    if (!settings) {
      const defaultSettings: SystemSettings = {
        enableDemoAccounts: true,
        enableRoleSwitcher: true,
        enableSelfRegistration: true,
        institutionName: 'BIT Leave Portal',
        institutionLogoUrl: undefined,
        emailSettings: {
          enabled: true,
          smtpHost: 'smtp.gmail.com',
          smtpPort: 587,
          smtpUsername: 'notifications@bitmesra.ac.in',
          senderEmail: 'notifications@bitmesra.ac.in',
          senderName: 'BIT Leave Portal',
          encryption: 'TLS',
          sendCopyAdmin: true,
        }
      };
      batch.set(doc(db, 'systemSettings', 'default'), defaultSettings, { merge: true });
      settings = defaultSettings;
      needsBatchCommit = true;
    }

    if (needsBatchCommit) {
      if (notifyToast) {
        notifySyncStart('Seeding missing institutional tables into Firebase Firestore...', 'INSERT');
      }
      await batch.commit();
      console.log('[Firebase Firestore] Automatic seed & repair commit complete!');
    }

    return {
      users: usersList,
      leaveRequests: reqList,
      departments: deptList,
      leavePolicies: policyList,
      notifications: [],
      auditLogs: auditList.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()),
      emailLogs: [],
      systemSettings: settings,
      permissionMatrix: pmList
    };

  } catch (err: any) {
    console.error('[Firebase Firestore Load Error]', err);
    return {
      users: MOCK_USERS,
      leaveRequests: INITIAL_LEAVE_REQUESTS,
      departments: INITIAL_DEPARTMENTS,
      leavePolicies: INITIAL_LEAVE_POLICIES,
      notifications: [],
      auditLogs: INITIAL_AUDIT_LOGS,
      permissionMatrix: []
    };
  } finally {
    if (notifyToast) {
      notifySyncEnd();
    }
  }
}

/**
 * Save single document to Firebase Firestore
 */
export async function saveDocToFirestore(colName: string, id: string, data: any, isNewRecord: boolean = false) {
  const opType: DbOpType = isNewRecord ? 'INSERT' : 'UPDATE';
  notifySyncStart(
    isNewRecord ? `Inserting document into Firebase Firestore (${colName})...` : `Updating document in Firebase Firestore (${colName})...`,
    opType
  );
  try {
    const docId = id || data.id || data.userId || data.type || 'doc_' + Date.now();
    await setDoc(doc(db, colName, docId), data, { merge: true });
  } catch (err: any) {
    console.error(`Error saving doc to Firebase Firestore ${colName}/${id}:`, err);
  } finally {
    notifySyncEnd();
  }
}

/**
 * Delete document from Firebase Firestore
 */
export async function deleteDocFromFirestore(colName: string, id: string) {
  notifySyncStart(`Deleting document from Firebase Firestore (${colName})...`, 'DELETE');
  try {
    await deleteDoc(doc(db, colName, id));
  } catch (err: any) {
    console.error(`Error deleting doc from Firebase Firestore ${colName}/${id}:`, err);
  } finally {
    notifySyncEnd();
  }
}

/**
 * Delete User document from Firebase Firestore
 */
export async function deleteUserFromFirestore(userId: string, email?: string) {
  notifySyncStart(`Deleting user record from Firebase Firestore...`, 'DELETE');
  try {
    if (userId) {
      await deleteDoc(doc(db, 'users', userId));
      await deleteDoc(doc(db, 'permissionMatrix', userId));
    }
    if (email) {
      const qSnap = await getDocs(collection(db, 'users'));
      qSnap.docs.forEach(async (dSnap) => {
        if (dSnap.data()?.email?.toLowerCase() === email.toLowerCase()) {
          await deleteDoc(doc(db, 'users', dSnap.id));
        }
      });
    }
  } catch (err: any) {
    console.error(`Error deleting user ${userId} from Firestore:`, err);
  } finally {
    notifySyncEnd();
  }
}

/**
 * Reset all leave requests in Firebase Firestore
 */
export async function resetFirestoreData() {
  notifySyncStart('Resetting leave applications in Firebase Firestore...', 'RESET');
  try {
    const reqSnap = await getDocs(collection(db, 'leaveRequests'));
    const batch = writeBatch(db);
    reqSnap.docs.forEach(d => {
      batch.delete(d.ref);
    });
    await batch.commit();
  } catch (err) {
    console.warn('Error resetting leave requests in Firestore:', err);
  } finally {
    notifySyncEnd();
  }
}

/**
 * Bulk transfer / sync state to Firebase Firestore
 */
export async function syncAllLocalToFirestore(payload: {
  users?: User[];
  leaveRequests?: LeaveRequest[];
  departments?: Department[];
  leavePolicies?: LeavePolicy[];
  auditLogs?: AuditLog[];
  permissionMatrix?: PermissionMatrixEntry[];
  systemSettings?: SystemSettings;
}) {
  notifySyncStart('Transferring & Syncing All Records to Firebase Firestore...', 'SYNC');
  let count = 0;
  try {
    const batch = writeBatch(db);

    if (payload.users) {
      payload.users.forEach(u => {
        if (u && u.id) {
          batch.set(doc(db, 'users', u.id), u, { merge: true });
          count++;
        }
      });
    }

    if (payload.leaveRequests) {
      payload.leaveRequests.forEach(r => {
        if (r && r.id) {
          batch.set(doc(db, 'leaveRequests', r.id), r, { merge: true });
          count++;
        }
      });
    }

    if (payload.departments) {
      payload.departments.forEach(d => {
        if (d && d.id) {
          batch.set(doc(db, 'departments', d.id), d, { merge: true });
          count++;
        }
      });
    }

    if (payload.leavePolicies) {
      payload.leavePolicies.forEach(p => {
        if (p && p.type) {
          batch.set(doc(db, 'leavePolicies', p.type), p, { merge: true });
          count++;
        }
      });
    }

    if (payload.auditLogs) {
      payload.auditLogs.forEach(a => {
        if (a && a.id) {
          batch.set(doc(db, 'auditLogs', a.id), a, { merge: true });
          count++;
        }
      });
    }

    if (payload.permissionMatrix) {
      payload.permissionMatrix.forEach(pm => {
        const pmId = pm.userId || pm.id;
        if (pmId) {
          batch.set(doc(db, 'permissionMatrix', pmId), pm, { merge: true });
          count++;
        }
      });
    }

    if (payload.systemSettings) {
      batch.set(doc(db, 'systemSettings', 'default'), payload.systemSettings, { merge: true });
      count++;
    }

    await batch.commit();
    return { success: true, count, message: `Successfully transferred ${count} records to Firebase Firestore.` };
  } catch (err: any) {
    console.error('[Firebase Bulk Sync Error]', err);
    return { success: false, error: err?.message || 'Failed to sync to Firebase Firestore.' };
  } finally {
    notifySyncEnd();
  }
}

/**
 * Returns connection diagnostic status and record counts for Firebase Firestore
 */
export async function getFirestoreStatus() {
  try {
    const [uSnap, rSnap, dSnap, aSnap, pSnap, pmSnap] = await Promise.all([
      getDocs(collection(db, 'users')),
      getDocs(collection(db, 'leaveRequests')),
      getDocs(collection(db, 'departments')),
      getDocs(collection(db, 'auditLogs')),
      getDocs(collection(db, 'leavePolicies')),
      getDocs(collection(db, 'permissionMatrix')),
    ]);

    return {
      connected: true,
      database: DATABASE_ID,
      projectId: PROJECT_ID,
      host: `Firebase Firestore (${PROJECT_ID})`,
      collections: ['users', 'leaveRequests', 'departments', 'leavePolicies', 'auditLogs', 'permissionMatrix', 'systemSettings'],
      counts: {
        users: uSnap.size,
        leaveRequests: rSnap.size,
        departments: dSnap.size,
        auditLogs: aSnap.size,
        leavePolicies: pSnap.size,
        permissionMatrix: pmSnap.size
      }
    };
  } catch (err: any) {
    return {
      connected: false,
      database: DATABASE_ID,
      projectId: PROJECT_ID,
      host: `Firebase Firestore (${PROJECT_ID})`,
      error: err?.message || 'Failed to connect to Firebase Firestore'
    };
  }
}

/**
 * Inspect document contents of a Firestore collection for the SuperAdmin Data Explorer
 */
export async function inspectFirestoreCollection(colName: string) {
  try {
    const qSnap = await getDocs(query(collection(db, colName), limit(100)));
    const rows = qSnap.docs.map(d => ({ _id: d.id, ...d.data() }));
    const columns = rows.length > 0 ? Object.keys(rows[0]).map(k => ({
      column_name: k,
      data_type: typeof rows[0][k],
      is_nullable: 'YES'
    })) : [];

    return {
      success: true,
      colName,
      columns,
      totalRows: rows.length,
      rows
    };
  } catch (err: any) {
    return {
      success: false,
      colName,
      error: err?.message || 'Failed to fetch collection documents'
    };
  }
}

export function subscribeToSystemSettings(callback: (settings: SystemSettings) => void) {
  return onSnapshot(doc(db, 'systemSettings', 'default'), (snap) => {
    if (snap.exists()) {
      callback(snap.data() as SystemSettings);
    }
  });
}

export function subscribeToCollection<T>(colName: string, callback: (items: T[]) => void) {
  return onSnapshot(collection(db, colName), (snap) => {
    const list = snap.docs.map(d => ({ id: d.id, ...d.data() } as T));
    callback(list);
  });
}

// Keep SQL exports for backup/export tools in SuperAdmin
export { generateMySQLDump, generateVercelPostgresDump } from './firestoreSyncDump';
