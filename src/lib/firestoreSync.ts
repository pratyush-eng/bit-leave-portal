import { collection, getDocs, setDoc, deleteDoc, doc, writeBatch } from 'firebase/firestore';
import { db } from './firebase';
import { 
  MOCK_USERS, 
  INITIAL_LEAVE_REQUESTS, 
  INITIAL_NOTIFICATIONS, 
  INITIAL_AUDIT_LOGS, 
  INITIAL_LEAVE_POLICIES, 
  INITIAL_DEPARTMENTS 
} from '../data/mockData';
import { User, LeaveRequest, Notification, AuditLog, LeavePolicy, Department } from '../types';

export async function loadOrSeedFirestoreData(): Promise<{
  users: User[];
  leaveRequests: LeaveRequest[];
  departments: Department[];
  leavePolicies: LeavePolicy[];
  notifications: Notification[];
  auditLogs: AuditLog[];
}> {
  try {
    const usersSnap = await getDocs(collection(db, 'users'));
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

      return {
        users: users.length ? users : MOCK_USERS,
        leaveRequests: leaveRequests.length ? leaveRequests : INITIAL_LEAVE_REQUESTS,
        departments: departments.length ? departments : INITIAL_DEPARTMENTS,
        leavePolicies: leavePolicies.length ? leavePolicies : INITIAL_LEAVE_POLICIES,
        notifications: notifications.length ? notifications : INITIAL_NOTIFICATIONS,
        auditLogs: auditLogs.length ? auditLogs : INITIAL_AUDIT_LOGS,
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

async function seedCollection(colName: string, items: any[], idField: string) {
  try {
    const batch = writeBatch(db);
    items.forEach((item) => {
      const docRef = doc(db, colName, String(item[idField]));
      batch.set(docRef, item);
    });
    await batch.commit();
  } catch (err) {
    console.error(`Failed seeding ${colName}:`, err);
  }
}

export async function saveDocToFirestore(colName: string, id: string, data: any) {
  try {
    await setDoc(doc(db, colName, String(id)), data, { merge: true });
  } catch (err) {
    console.error(`Error saving doc to ${colName}/${id}:`, err);
  }
}

export async function deleteDocFromFirestore(colName: string, id: string) {
  try {
    await deleteDoc(doc(db, colName, String(id)));
  } catch (err) {
    console.error(`Error deleting doc from ${colName}/${id}:`, err);
  }
}
