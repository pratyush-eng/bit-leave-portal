import { 
  getFirestoreStatus, 
  inspectFirestoreCollection, 
  deleteDocFromFirestore, 
  deleteUserFromFirestore,
  syncAllLocalToFirestore, 
  saveDocToFirestore, 
  loadOrSeedFirestoreData 
} from './firestoreSync';
import { SystemSettings, PermissionMatrixEntry } from '../types';

export const NEON_DB_URL = "firebase-firestore://gen-lang-client-0697472948";

export async function connectMongoUri(_uri: string) {
  return { success: true, host: "Firebase Firestore Cluster" };
}

export async function getNeonStatus() {
  return await getFirestoreStatus();
}

export async function inspectNeonTable(tableName: string) {
  return await inspectFirestoreCollection(tableName);
}

export async function deleteNeonDoc(colName: string, idOrPayload?: any, emailExtra?: string) {
  if (colName === 'users') {
    return await deleteUserFromFirestore(idOrPayload, emailExtra);
  }
  return await deleteDocFromFirestore(colName, idOrPayload);
}

export async function syncDataToNeon(payload: {
  users?: any[];
  leaveRequests?: any[];
  departments?: any[];
  leavePolicies?: any[];
  auditLogs?: any[];
  leaveBalances?: any[];
  permissionMatrix?: PermissionMatrixEntry[];
  systemSettings?: SystemSettings;
}) {
  return await syncAllLocalToFirestore(payload);
}

export async function sendAuditLogToNeon(log: any) {
  return await saveDocToFirestore('auditLogs', log.id, log, true);
}

export async function saveSystemSettingsToNeon(settings: SystemSettings) {
  return await saveDocToFirestore('systemSettings', 'default', settings, false);
}

export async function savePermissionMatrixToNeon(permissionMatrix: PermissionMatrixEntry[] | PermissionMatrixEntry | any) {
  const pmArray = Array.isArray(permissionMatrix) ? permissionMatrix : [permissionMatrix];
  return await syncAllLocalToFirestore({ permissionMatrix: pmArray });
}

export async function fetchNeonData() {
  return await loadOrSeedFirestoreData();
}
