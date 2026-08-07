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
    const usersSnap = await getDocs(collection(db, 'users'));
    
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

    if (usersSnap.empty) {
      console.log('Seeding initial data into Firebase Firestore...');
      await seedCollection('users', MOCK_USERS, 'id');
      await seedCollection('leaveRequests', INITIAL_LEAVE_REQUESTS, 'id');
      await seedCollection('departments', INITIAL_DEPARTMENTS, 'id');
      await seedCollection('leavePolicies', INITIAL_LEAVE_POLICIES, 'type');
      await seedCollection('notifications', INITIAL_NOTIFICATIONS, 'id');
      await seedCollection('auditLogs', INITIAL_AUDIT_LOGS, 'id');

      return {
        users: MOCK_USERS,
        leaveRequests: INITIAL_LEAVE_REQUESTS,
        departments: INITIAL_DEPARTMENTS,
        leavePolicies: INITIAL_LEAVE_POLICIES,
        notifications: INITIAL_NOTIFICATIONS,
        auditLogs: INITIAL_AUDIT_LOGS,
        emailLogs: [],
        systemSettings,
      };
    } else {
      const users: User[] = usersSnap.docs.map(d => d.data() as User);
      const reqSnap = await getDocs(collection(db, 'leaveRequests'));
      const leaveRequests: LeaveRequest[] = reqSnap.docs.map(d => d.data() as LeaveRequest);
      const deptSnap = await getDocs(collection(db, 'departments'));
      const departments: Department[] = deptSnap.docs.map(d => d.data() as Department);
      const polSnap = await getDocs(collection(db, 'leavePolicies'));
      const leavePolicies: LeavePolicy[] = polSnap.docs.map(d => d.data() as LeavePolicy);
      const notSnap = await getDocs(collection(db, 'notifications'));
      const notifications: Notification[] = notSnap.docs.map(d => d.data() as Notification);
      const logSnap = await getDocs(collection(db, 'auditLogs'));
      const auditLogs: AuditLog[] = logSnap.docs.map(d => d.data() as AuditLog);
      
      let emailLogs: EmailLog[] = [];
      try {
        const mailSnap = await getDocs(collection(db, 'emailLogs'));
        emailLogs = mailSnap.docs.map(d => d.data() as EmailLog);
      } catch (mErr) {
        console.warn('Could not load emailLogs from Firestore:', mErr);
      }

      return {
        users: users.length ? users : MOCK_USERS,
        leaveRequests: leaveRequests.length ? leaveRequests : INITIAL_LEAVE_REQUESTS,
        departments: departments.length ? departments : INITIAL_DEPARTMENTS,
        leavePolicies: leavePolicies.length ? leavePolicies : INITIAL_LEAVE_POLICIES,
        notifications: notifications.length ? notifications : INITIAL_NOTIFICATIONS,
        auditLogs: auditLogs.length ? auditLogs : INITIAL_AUDIT_LOGS,
        emailLogs: emailLogs,
        systemSettings,
      };
    }
  } catch (error) {
    console.error('Firestore sync failed, falling back to local storage/mock data:', error);
    return {
      users: MOCK_USERS,
      leaveRequests: INITIAL_LEAVE_REQUESTS,
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
      if (!snapshot.empty) {
        const items = snapshot.docs.map(d => d.data() as T);
        callback(items);
      }
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
  }
}

export async function saveDocToFirestore(colName: string, id: string, data: any) {
  if (isQuotaExceeded) return;
  try {
    await setDoc(doc(db, colName, String(id)), data, { merge: true });
  } catch (err: any) {
    if (err?.code === 'resource-exhausted' || err?.message?.includes('Quota limit exceeded')) {
      isQuotaExceeded = true;
      console.warn(`Firestore quota limit reached saving ${colName}/${id}. Using local state.`);
    } else {
      console.error(`Error saving doc to ${colName}/${id}:`, err);
    }
  }
}

export async function deleteDocFromFirestore(colName: string, id: string) {
  if (isQuotaExceeded) return;
  try {
    await deleteDoc(doc(db, colName, String(id)));
  } catch (err: any) {
    if (err?.code === 'resource-exhausted' || err?.message?.includes('Quota limit exceeded')) {
      isQuotaExceeded = true;
      console.warn(`Firestore quota limit reached deleting ${colName}/${id}. Using local state.`);
    } else {
      console.error(`Error deleting doc from ${colName}/${id}:`, err);
    }
  }
}
