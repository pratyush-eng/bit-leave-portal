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
  getMongoUri
} from "../db";

function getMaskedUri(uri: string) {
  try {
    return uri.replace(/\/\/(.+)@/, (_match, p1) => {
      const parts = p1.split(':');
      const user = parts[0] || 'user';
      return `//${user}:****@`;
    });
  } catch {
    return "MongoDB Atlas Cluster";
  }
}

export default async function handler(req: any, res: any) {
  try {
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

    const uri = getMongoUri();

    try {
      await connectToDatabase();

      const [
        usersCount,
        leaveRequestsCount,
        departmentsCount,
        leavePoliciesCount,
        auditLogsCount,
        leaveBalancesCount,
        permissionMatrixCount,
        privDoc
      ] = await Promise.all([
        UserModel.countDocuments().catch(() => 0),
        LeaveRequestModel.countDocuments().catch(() => 0),
        DepartmentModel.countDocuments().catch(() => 0),
        LeavePolicyModel.countDocuments().catch(() => 0),
        AuditLogModel.countDocuments().catch(() => 0),
        LeaveBalanceModel.countDocuments().catch(() => 0),
        PermissionMatrixModel.countDocuments().catch(() => 0),
        SystemPrivilegeModel.findOne({ id: "default" }).lean().catch(() => null),
      ]);

      return res.status(200).json({
        connected: true,
        success: true,
        database: "bit_leave_portal",
        host: getMaskedUri(uri),
        uriSource: "process.env.MONGODB_URI",
        tables: ["users", "leave_requests", "departments", "leave_policies", "audit_logs", "permission_matrix", "system_settings", "system_privileges"],
        collections: ["users", "leave_requests", "departments", "leave_policies", "audit_logs", "permission_matrix", "system_settings", "system_privileges"],
        counts: {
          users: usersCount,
          leaveRequests: leaveRequestsCount,
          departments: departmentsCount,
          auditLogs: auditLogsCount,
          leaveBalances: leaveBalancesCount,
          systemPrivileges: privDoc ? 1 : 0,
        }
      });
    } catch (connErr: any) {
      return res.status(200).json({
        connected: false,
        success: false,
        database: "bit_leave_portal",
        host: getMaskedUri(uri),
        error: connErr?.message || "MongoDB Atlas connection failed",
        tables: ["users", "leave_requests", "departments", "leave_policies", "audit_logs", "permission_matrix", "system_settings", "system_privileges"],
        collections: ["users", "leave_requests", "departments", "leave_policies", "audit_logs", "permission_matrix", "system_settings", "system_privileges"],
        counts: {
          users: 0,
          leaveRequests: 0,
          departments: 0,
          auditLogs: 0,
          leaveBalances: 0,
          systemPrivileges: 0,
        }
      });
    }
  } catch (fatalErr: any) {
    return res.status(200).json({
      connected: false,
      success: false,
      error: fatalErr?.message || "Internal server error",
      tables: [],
      collections: [],
      counts: {}
    });
  }
}
