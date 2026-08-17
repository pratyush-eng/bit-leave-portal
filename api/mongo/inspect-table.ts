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
  SystemPrivilegeModel 
} from "../db";

export default async function handler(req: any, res: any) {
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS,PATCH,DELETE,POST,PUT");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization, Cache-Control, Pragma"
  );
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  try {
    await connectToDatabase();
    const tableName = String(req.query.table || req.body?.table || req.query.collection || req.body?.collection || "users");

    let rows: any[] = [];
    if (tableName === "users" || tableName === "user") {
      rows = await UserModel.find().lean();
    } else if (tableName === "leave_requests" || tableName === "leaveRequests" || tableName === "leaverequests") {
      rows = await LeaveRequestModel.find().lean();
    } else if (tableName === "departments" || tableName === "department") {
      rows = await DepartmentModel.find().lean();
    } else if (tableName === "leave_policies" || tableName === "leavePolicies" || tableName === "leavepolicies") {
      rows = await LeavePolicyModel.find().lean();
    } else if (tableName === "audit_logs" || tableName === "auditLogs" || tableName === "auditlogs") {
      rows = await AuditLogModel.find().sort({ timestamp: -1 }).lean();
    } else if (tableName === "leave_balances" || tableName === "leaveBalances") {
      rows = await LeaveBalanceModel.find().lean();
    } else if (tableName === "permission_matrix" || tableName === "permissionMatrix") {
      rows = await PermissionMatrixModel.find().lean();
    } else if (tableName === "system_settings" || tableName === "systemSettings") {
      rows = await SystemSettingsModel.find().lean();
    } else if (tableName === "system_privileges" || tableName === "systemPrivileges") {
      rows = await SystemPrivilegeModel.find().lean();
    }

    const columns = rows.length > 0 ? Object.keys(rows[0]) : [];

    return res.status(200).json({
      success: true,
      tableName,
      rowCount: rows.length,
      columns,
      rows
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      error: err?.message || "Failed to inspect MongoDB collection"
    });
  }
}
