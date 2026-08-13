import { SystemSettings, PermissionMatrixEntry } from '../types';

async function safeJsonFetch(url: string, options?: RequestInit) {
  try {
    const res = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(options?.headers || {}),
      },
    });
    if (!res.ok) {
      return null;
    }
    const contentType = res.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      return await res.json();
    }
    return null;
  } catch (_err) {
    return null;
  }
}

/**
 * Update MongoDB Atlas connection URI
 */
export async function connectMongoUri(uri: string) {
  const res = await safeJsonFetch('/api/mongo/connect', {
    method: 'POST',
    body: JSON.stringify({ uri }),
  });
  return res || { success: false, error: 'Failed to update MongoDB URI endpoint.' };
}

/**
 * Get MongoDB Atlas connection status and document counts
 */
export async function getMongoStatus() {
  const backendData = await safeJsonFetch('/api/mongo/status');
  if (backendData) {
    return backendData;
  }
  const legacyData = await safeJsonFetch('/api/neon/status');
  if (legacyData) {
    return legacyData;
  }
  return {
    connected: false,
    database: "bit_leave_portal",
    host: "MongoDB Atlas Cluster",
    error: "MongoDB API endpoint unavailable"
  };
}

/**
 * Inspect MongoDB collection documents (for SuperAdmin DB Explorer)
 */
export async function inspectMongoCollection(tableName: string) {
  const backendData = await safeJsonFetch(`/api/mongo/inspect-table?table=${encodeURIComponent(tableName)}`);
  if (backendData) {
    return backendData;
  }
  const legacyData = await safeJsonFetch(`/api/neon/inspect-table?table=${encodeURIComponent(tableName)}`);
  if (legacyData) {
    return legacyData;
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
  if (backendData && backendData.success) {
    return backendData;
  }
  return await safeJsonFetch('/api/neon/delete', {
    method: 'POST',
    body: JSON.stringify(bodyPayload),
  });
}

/**
 * Bulk sync all local state and Firestore records to MongoDB Atlas
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
  const backendData = await safeJsonFetch('/api/mongo/sync', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  if (backendData && backendData.success) {
    return backendData;
  }
  return await safeJsonFetch('/api/neon/sync', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

/**
 * Log single action to MongoDB Atlas audit_logs collection
 */
export async function sendAuditLogToMongo(log: any) {
  const backendData = await safeJsonFetch('/api/mongo/audit-log', {
    method: 'POST',
    body: JSON.stringify({ log }),
  });
  if (backendData && backendData.success) {
    return backendData;
  }
  return await safeJsonFetch('/api/neon/audit-log', {
    method: 'POST',
    body: JSON.stringify({ log }),
  });
}

/**
 * Save System Settings into MongoDB Atlas
 */
export async function saveSystemSettingsToMongo(settings: SystemSettings) {
  const backendData = await safeJsonFetch('/api/system-settings/save', {
    method: 'POST',
    body: JSON.stringify(settings),
  });
  return backendData;
}

/**
 * Save Permission Matrix into MongoDB Atlas
 */
export async function savePermissionMatrixToMongo(permissionMatrix: PermissionMatrixEntry[] | PermissionMatrixEntry | any) {
  const payload = Array.isArray(permissionMatrix) ? { permissionMatrix } : (permissionMatrix.userId ? permissionMatrix : { permissionMatrix: [permissionMatrix] });
  const backendData = await safeJsonFetch('/api/permission-matrix/save', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  return backendData;
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
  const legacyData = await safeJsonFetch('/api/neon/data');
  if (legacyData && legacyData.success && legacyData.data) {
    return legacyData.data;
  }
  return null;
}
