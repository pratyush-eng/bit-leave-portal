import {
  connectMongoUri,
  getMongoStatus,
  inspectMongoCollection,
  deleteMongoDoc,
  syncDataToMongo,
  sendAuditLogToMongo,
  saveSystemSettingsToMongo,
  savePermissionMatrixToMongo,
  fetchMongoData,
} from './mongoClient';

export const NEON_DB_URL = "mongodb+srv://bit_leave_admin:****@cluster0.a8qpl.mongodb.net/bit_leave_portal";

export {
  connectMongoUri,
  getMongoStatus as getNeonStatus,
  inspectMongoCollection as inspectNeonTable,
  deleteMongoDoc as deleteNeonDoc,
  syncDataToMongo as syncDataToNeon,
  sendAuditLogToMongo as sendAuditLogToNeon,
  saveSystemSettingsToMongo as saveSystemSettingsToNeon,
  savePermissionMatrixToMongo as savePermissionMatrixToNeon,
  fetchMongoData as fetchNeonData,
};

