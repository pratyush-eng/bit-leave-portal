import { 
  connectToDatabase, 
  UserModel, 
  LeaveRequestModel, 
  DepartmentModel, 
  LeavePolicyModel, 
  AuditLogModel,
  LeaveBalanceModel,
  PermissionMatrixModel,
  SystemSettingsModel,
  SystemPrivilegeModel,
  getDatabaseName,
  getMaskedUri,
  getMongoUri
} from "../db";
import mongoose from "mongoose";

export default async function handler(req: any, res: any) {
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS,PATCH,DELETE,POST,PUT");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization, Cache-Control, Pragma"
  );
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0");
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Expires", "0");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  const dbName = getDatabaseName();
  const uri = getMongoUri();
  const maskedHost = getMaskedUri(uri);
  const serverTime = new Date().toISOString();
  const deployment = process.env.VERCEL ? "Vercel Serverless" : "Node/Express";

  try {
    await connectToDatabase();

    const [
      usersCount,
      leaveRequestsCount,
      departmentsCount,
      leavePoliciesCount,
      auditLogsCount,
      leaveBalancesCount,
      permissionMatrixCount
    ] = await Promise.all([
      UserModel.countDocuments().catch(() => 0),
      LeaveRequestModel.countDocuments().catch(() => 0),
      DepartmentModel.countDocuments().catch(() => 0),
      LeavePolicyModel.countDocuments().catch(() => 0),
      AuditLogModel.countDocuments().catch(() => 0),
      LeaveBalanceModel.countDocuments().catch(() => 0),
      PermissionMatrixModel.countDocuments().catch(() => 0),
    ]);

    return res.status(200).json({
      success: true,
      serverTime,
      mongoConnected: mongoose.connection.readyState === 1,
      database: dbName,
      host: maskedHost,
      deployment,
      collections: {
        users: usersCount,
        leaveRequests: leaveRequestsCount,
        departments: departmentsCount,
        leavePolicies: leavePoliciesCount,
        auditLogs: auditLogsCount,
        leaveBalances: leaveBalancesCount,
        permissionMatrix: permissionMatrixCount
      }
    });
  } catch (err: any) {
    return res.status(200).json({
      success: false,
      serverTime,
      mongoConnected: false,
      database: dbName,
      host: maskedHost,
      deployment,
      error: err?.message || "Failed to establish MongoDB Atlas connection",
      collections: {
        users: 0,
        leaveRequests: 0,
        departments: 0
      }
    });
  }
}
