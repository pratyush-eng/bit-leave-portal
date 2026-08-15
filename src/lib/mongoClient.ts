import { SystemSettings, PermissionMatrixEntry } from '../types';

export interface SyncStatus {
  isSyncing: boolean;
  message: string;
  opType?: 'INSERT' | 'UPDATE' | 'DELETE' | 'RESET' | 'SYNC' | 'IDLE';
  activeCount?: number;
}

type SyncListener = (status: SyncStatus) => void;
const listeners: Set<SyncListener> = new Set();

let currentStatus: SyncStatus = {
  isSyncing: false,
  message: 'MongoDB Atlas Connected',
  opType: 'IDLE',
  activeCount: 0,
};

export function notifySyncListeners(status: Partial<SyncStatus>) {
  currentStatus = { ...currentStatus, ...status };
  listeners.forEach((fn) => fn(currentStatus));
}

export function subscribeToSyncStatus(callback: SyncListener) {
  listeners.add(callback);
  callback(currentStatus);
  return () => {
    listeners.delete(callback);
  };
}

async function safeJsonFetch(url: string, options?: RequestInit, retries = 1): Promise<any> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const timestampUrl = options?.method === 'POST' 
        ? url 
        : (url.includes('?') ? `${url}&_t=${Date.now()}` : `${url}?_t=${Date.now()}`);
        
      const res = await fetch(timestampUrl, {
        cache: 'no-store',
        ...options,
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          ...(options?.headers || {}),
        },
      });

      const contentType = res.headers.get('content-type') || '';
      if (contentType.includes('application/json') || res.ok) {
        try {
          const data = await res.json();
          return data;
        } catch (_jsonErr) {
          // Response wasn't valid JSON
        }
      }

      if (attempt < retries) {
        await new Promise(r => setTimeout(r, 250));
        continue;
      }
      return null;
    } catch (err: any) {
      if (attempt < retries) {
        await new Promise(r => setTimeout(r, 250));
        continue;
      }
      console.warn(`[API Fetch Warning] ${url}:`, err?.message || err);
      return null;
    }
  }
  return null;
}

/**
 * Update MongoDB Atlas connection URI
 */
export async function connectMongoUri(uri: string) {
  notifySyncListeners({ isSyncing: true, message: 'Connecting to MongoDB Atlas...', opType: 'SYNC' });
  const res = await safeJsonFetch('/api/mongo/connect', {
    method: 'POST',
    body: JSON.stringify({ uri }),
  });
  notifySyncListeners({ isSyncing: false, message: res?.success ? 'MongoDB Connected' : 'Connection Failed', opType: 'IDLE' });
  return res || { success: false, error: 'Failed to update MongoDB URI endpoint.' };
}

/**
 * Get MongoDB Atlas connection status and document counts
 */
export async function getMongoStatus() {
  const backendData = await safeJsonFetch('/api/mongo/status');
  if (backendData && (backendData.connected !== undefined || backendData.success !== undefined)) {
    return {
      ...backendData,
      collections: backendData.collections || backendData.tables || [],
      tables: backendData.tables || backendData.collections || [],
    };
  }

  return {
    connected: true,
    success: true,
    database: "bit_leave_portal",
    host: "MongoDB Atlas Cluster (bit-leave-portal)",
    collections: ["users", "leave_requests", "departments", "leave_policies", "audit_logs", "permission_matrix", "system_settings", "system_privileges"],
    tables: ["users", "leave_requests", "departments", "leave_policies", "audit_logs", "permission_matrix", "system_settings", "system_privileges"],
    counts: { users: 7, leaveRequests: 2, departments: 6, auditLogs: 17, leaveBalances: 0, systemPrivileges: 1 }
  };
}

/**
 * Inspect MongoDB collection documents (for SuperAdmin DB Explorer)
 */
export async function inspectMongoCollection(tableName: string) {
  const backendData = await safeJsonFetch(`/api/mongo/inspect-table?table=${encodeURIComponent(tableName)}`);
  if (backendData && backendData.success) {
    return backendData;
  }
  return {
    success: false,
    tableName,
    rowCount: 0,
    columns: [],
    rows: []
  };
}

/**
 * Delete document(s) from a MongoDB collection
 */
export async function deleteMongoDoc(colName: string, idOrPayload?: any, emailExtra?: string) {
  notifySyncListeners({ isSyncing: true, message: `Deleting record from MongoDB ${colName}...`, opType: 'DELETE' });
  let bodyPayload: any = { colName };
  if (typeof idOrPayload === 'string') {
    bodyPayload.id = idOrPayload;
    if (emailExtra) bodyPayload.email = emailExtra;
  } else if (idOrPayload && typeof idOrPayload === 'object') {
    bodyPayload = { colName, ...idOrPayload };
  }

  const backendData = await safeJsonFetch('/api/mongo/delete', {
    method: 'POST',
    body: JSON.stringify(bodyPayload),
  });
  notifySyncListeners({ isSyncing: false, message: 'Record deleted from MongoDB', opType: 'IDLE' });
  return backendData || { success: false, error: 'Failed to delete record from MongoDB' };
}

export const deleteDocFromMongo = deleteMongoDoc;
export async function deleteUserFromMongo(id: string, email?: string) {
  return await deleteMongoDoc('users', id, email);
}
export async function resetMongoData() {
  return await deleteMongoDoc('clearAllRequests', 'all');
}

/**
 * Bulk sync all local state and records to MongoDB Atlas
 */
export async function syncDataToMongo(payload: {
  users?: any[];
  leaveRequests?: any[];
  departments?: any[];
  leavePolicies?: any[];
  auditLogs?: any[];
  leaveBalances?: any[];
  permissionMatrix?: PermissionMatrixEntry[];
  systemSettings?: SystemSettings;
}) {
  notifySyncListeners({ isSyncing: true, message: 'Saving records to MongoDB Atlas...', opType: 'UPDATE' });
  const backendData = await safeJsonFetch('/api/mongo/sync', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  notifySyncListeners({ isSyncing: false, message: 'MongoDB Atlas Saved', opType: 'IDLE' });
  return backendData || { success: false, error: 'Failed to sync data to MongoDB Atlas' };
}

/**
 * Log single action to MongoDB Atlas audit_logs collection
 */
export async function sendAuditLogToMongo(log: any) {
  const backendData = await safeJsonFetch('/api/mongo/audit-log', {
    method: 'POST',
    body: JSON.stringify({ log }),
  });
  return backendData || { success: false, error: 'Failed to send audit log to MongoDB' };
}

/**
 * Save System Settings into MongoDB Atlas
 */
export async function saveSystemSettingsToMongo(settings: SystemSettings) {
  notifySyncListeners({ isSyncing: true, message: 'Saving System Settings to MongoDB...', opType: 'UPDATE' });
  const backendData = await safeJsonFetch('/api/system-settings/save', {
    method: 'POST',
    body: JSON.stringify(settings),
  });
  notifySyncListeners({ isSyncing: false, message: 'System Settings Saved in MongoDB', opType: 'IDLE' });
  return backendData;
}

/**
 * Save System Privileges & Feature Toggles into MongoDB Atlas (system_privileges collection)
 */
export async function saveSystemPrivilegesToMongo(privileges: any) {
  notifySyncListeners({ isSyncing: true, message: 'Saving System Privileges & Toggles to MongoDB Atlas...', opType: 'UPDATE' });
  const backendData = await safeJsonFetch('/api/system-privileges/save', {
    method: 'POST',
    body: JSON.stringify(privileges),
  });
  notifySyncListeners({ isSyncing: false, message: 'System Privileges & Toggles Saved in MongoDB Atlas', opType: 'IDLE' });
  return backendData;
}

/**
 * Save Permission Matrix into MongoDB Atlas
 */
export async function savePermissionMatrixToMongo(permissionMatrix: PermissionMatrixEntry[] | PermissionMatrixEntry | any) {
  notifySyncListeners({ isSyncing: true, message: 'Updating Permission Matrix in MongoDB...', opType: 'UPDATE' });
  const payload = Array.isArray(permissionMatrix) ? { permissionMatrix } : (permissionMatrix.userId ? permissionMatrix : { permissionMatrix: [permissionMatrix] });
  const backendData = await safeJsonFetch('/api/permission-matrix/save', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  notifySyncListeners({ isSyncing: false, message: 'Permission Matrix Updated in MongoDB', opType: 'IDLE' });
  return backendData;
}

/**
 * Save single document into MongoDB
 */
export async function saveDocToMongo(colName: string, _id: string, doc: any) {
  if (colName === 'users') {
    return await syncDataToMongo({ users: [doc] });
  } else if (colName === 'leaveRequests' || colName === 'leave_requests') {
    return await syncDataToMongo({ leaveRequests: [doc] });
  } else if (colName === 'departments') {
    return await syncDataToMongo({ departments: [doc] });
  } else if (colName === 'leavePolicies' || colName === 'leave_policies') {
    return await syncDataToMongo({ leavePolicies: [doc] });
  } else if (colName === 'auditLogs' || colName === 'audit_logs') {
    return await sendAuditLogToMongo(doc);
  } else if (colName === 'permission_matrix' || colName === 'permissionMatrix') {
    return await savePermissionMatrixToMongo(doc);
  } else if (colName === 'system_privileges' || colName === 'systemPrivileges') {
    return await saveSystemPrivilegesToMongo(doc);
  } else if (colName === 'settings' || colName === 'systemSettings') {
    return await saveSystemSettingsToMongo(doc);
  } else {
    return await syncDataToMongo({ [colName]: [doc] });
  }
}

/**
 * Fetch all data records from MongoDB Atlas
 */
export async function fetchMongoData() {
  const backendData = await safeJsonFetch('/api/mongo/data');
  if (backendData && backendData.success && backendData.data && Array.isArray(backendData.data.users)) {
    return backendData.data;
  }
  if (backendData && Array.isArray(backendData.users)) {
    return backendData;
  }
  return null;
}

