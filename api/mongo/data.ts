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
  // CORS & Strict Cache Control
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
  res.setHeader("Surrogate-Control", "no-store");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  try {
    await connectToDatabase();

    const [
      rawUsers, 
      rawLeaveRequests, 
      rawDepartments, 
      rawLeavePolicies, 
      rawAuditLogs, 
      rawLeaveBalances, 
      rawPermissionMatrix, 
      sysDoc, 
      privDoc
    ] = await Promise.all([
      UserModel.find().lean(),
      LeaveRequestModel.find().lean(),
      DepartmentModel.find().lean(),
      LeavePolicyModel.find().lean(),
      AuditLogModel.find().sort({ timestamp: -1 }).lean(),
      LeaveBalanceModel.find().lean(),
      PermissionMatrixModel.find().lean(),
      SystemSettingsModel.findOne({ id: "default" }).lean(),
      SystemPrivilegeModel.findOne({ id: "default" }).lean(),
    ]);

    const users = (rawUsers || []).map((u: any) => ({
      ...u,
      id: u.id || (u._id ? String(u._id) : `usr_${Date.now()}`),
      email: u.email ? String(u.email).trim().toLowerCase() : "",
      accountStatus: u.accountStatus || "ACTIVE",
      leaveBalances: u.leaveBalances || {},
    }));

    const leaveRequests = (rawLeaveRequests || []).map((r: any) => ({
      ...r,
      id: r.id || (r._id ? String(r._id) : `LV-${Date.now()}`),
      applicantId: r.applicantId || r.applicant_id || "",
      applicantName: r.applicantName || r.applicant_name || "",
      applicantEmail: r.applicantEmail || r.applicant_email || "",
      departmentId: r.departmentId || r.department_id || "",
      departmentName: r.departmentName || r.department_name || "",
      leaveType: r.leaveType || r.leave_type || "CASUAL",
      startDate: r.startDate || r.start_date || "",
      endDate: r.endDate || r.end_date || "",
      totalDays: Number(r.totalDays ?? r.total_days ?? 1),
      status: r.status || "PENDING_HOD",
      appliedOn: r.appliedOn || r.applied_on || "",
    }));

    const departments = (rawDepartments || []).map((d: any) => ({
      ...d,
      id: d.id || d.code || (d._id ? String(d._id) : ""),
      code: d.code || d.id || "",
      name: d.name || "",
    }));

    const leavePolicies = (rawLeavePolicies || []).map((p: any) => ({
      ...p,
      type: p.type || "",
      label: p.label || p.type || "",
      annualQuota: Number(p.annualQuota) || 12,
      minDaysNotice: Number(p.minDaysNotice) || 0,
      requiresDocument: Boolean(p.requiresDocument),
      color: p.color || "#2563eb",
      description: p.description || "",
    }));

    const auditLogs = (rawAuditLogs || []).map((a: any) => ({
      ...a,
      id: a.id || (a._id ? String(a._id) : `log_${Date.now()}`),
      timestamp: a.timestamp || new Date().toISOString(),
      action: a.action || "ACTION",
      actorName: a.actorName || "System",
      actorRole: a.actorRole || "SUPER_ADMIN",
    }));

    const effectiveSettings = privDoc || sysDoc || {
      id: "default",
      enableDemoAccounts: false,
      enableRoleSwitcher: false,
      enableSelfRegistration: false,
      institutionName: "BIT Leave Portal",
      institutionLogoUrl: "https://bitmesra.ac.in/SiteLogo/bit-newlogo.png",
      emailSettings: {},
      customToggles: {},
    };

    return res.status(200).json({
      success: true,
      mongoConnected: true,
      data: {
        users,
        leaveRequests,
        departments,
        leavePolicies,
        auditLogs,
        leaveBalances: rawLeaveBalances || [],
        permissionMatrix: rawPermissionMatrix || [],
        systemSettings: effectiveSettings,
      }
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      mongoConnected: false,
      error: err?.message || "Failed to query MongoDB Atlas",
      data: {
        users: [],
        leaveRequests: [],
        departments: [],
        leavePolicies: [],
        auditLogs: [],
        leaveBalances: [],
        permissionMatrix: [],
        systemSettings: null,
      }
    });
  }
}
