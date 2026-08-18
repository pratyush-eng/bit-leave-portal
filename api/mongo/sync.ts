import { 
  connectToDatabase, 
  UserModel, 
  LeaveRequestModel, 
  DepartmentModel, 
  LeavePolicyModel, 
  AuditLogModel, 
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

  if (req.method !== "POST" && req.method !== "PUT") {
    return res.status(405).json({ success: false, error: "Method Not Allowed" });
  }

  try {
    await connectToDatabase();

    const { 
      users = [], 
      leaveRequests = [], 
      departments = [], 
      leavePolicies = [], 
      auditLogs = [], 
      permissionMatrix = [], 
      systemSettings 
    } = req.body || {};

    let usersSynced = 0;
    let requestsSynced = 0;
    let deptsSynced = 0;
    let policiesSynced = 0;
    let auditLogsSynced = 0;
    let permissionMatrixSynced = 0;

    for (const a of auditLogs) {
      if (!a || !a.id) continue;
      await AuditLogModel.findOneAndUpdate(
        { id: a.id },
        {
          id: a.id,
          timestamp: a.timestamp || new Date().toISOString(),
          actorId: a.actorId || "sys",
          actorName: a.actorName || "System",
          actorRole: a.actorRole || "SUPER_ADMIN",
          action: a.action || "ACTION",
          details: a.details || "",
          ipAddress: a.ipAddress || null,
        },
        { upsert: true, new: true }
      );
      auditLogsSynced++;
    }

    for (const u of users) {
      if (!u || !u.email) continue;
      const cleanEmail = String(u.email).trim().toLowerCase();
      await UserModel.findOneAndUpdate(
        { email: cleanEmail },
        {
          id: u.id || "USER-" + Date.now(),
          name: u.name || "",
          email: cleanEmail,
          role: u.role || "FACULTY",
          designation: u.designation || "",
          departmentId: u.departmentId || "",
          departmentName: u.departmentName || "",
          employeeCode: u.employeeCode || "",
          joiningDate: u.joiningDate || "",
          phone: u.phone || "",
          avatarUrl: u.avatarUrl || "",
          accountStatus: u.accountStatus || "ACTIVE",
          password: u.password || "password123",
          leaveBalances: u.leaveBalances || {},
        },
        { upsert: true, new: true }
      );
      usersSynced++;
    }

    for (const r of leaveRequests) {
      if (!r || !r.id) continue;
      const applicantName = r.applicantName || r.applicant_name || "";
      const applicantId = r.applicantId || r.applicant_id || "";
      if (!applicantName || applicantName === "Unknown Applicant" || applicantName.toLowerCase() === "unknown" || applicantId === "UNKNOWN_APPLICANT" || applicantId === "UNKNOWN") {
        continue;
      }
      await LeaveRequestModel.findOneAndUpdate(
        { id: r.id },
        {
          id: r.id,
          applicantId: applicantId,
          applicantName: applicantName,
          applicantEmail: r.applicantEmail || r.applicant_email || "user@bitmesra.ac.in",
          applicantDesignation: r.applicantDesignation || r.applicant_designation || "",
          applicantEmployeeCode: r.applicantEmployeeCode || r.applicant_employee_code || "",
          departmentId: r.departmentId || r.department_id || "CSE",
          departmentName: r.departmentName || r.department_name || "Computer Science & Engineering",
          leaveType: r.leaveType || r.leave_type || "CASUAL",
          startDate: r.startDate || r.start_date || new Date().toISOString().split("T")[0],
          endDate: r.endDate || r.end_date || new Date().toISOString().split("T")[0],
          totalDays: Number(r.totalDays ?? r.total_days ?? 1),
          reason: r.reason || "",
          contactAddress: r.contactAddress || r.contact_address || "",
          contactPhone: r.contactPhone || r.contact_phone || "",
          documentUrl: r.documentUrl || r.document_url || "",
          status: r.status || "PENDING_HOD",
          appliedOn: r.appliedOn || r.applied_on || new Date().toISOString().split("T")[0],
          hodApproval: r.hodApproval || r.hod_approval || null,
          registrarApproval: r.registrarApproval || r.registrar_approval || null,
          classHandovers: r.classHandovers || r.class_handovers || null,
        },
        { upsert: true, new: true }
      );
      requestsSynced++;
    }

    for (const d of departments) {
      if (!d || !d.id) continue;
      await DepartmentModel.findOneAndUpdate(
        { id: d.id },
        {
          id: d.id,
          code: d.code || d.id,
          name: d.name || "",
          hodId: d.hodId || null,
          hodName: d.hodName || null,
          totalFaculty: Number(d.totalFaculty) || 0,
        },
        { upsert: true, new: true }
      );
      deptsSynced++;
    }

    for (const p of leavePolicies) {
      if (!p || !p.type) continue;
      await LeavePolicyModel.findOneAndUpdate(
        { type: p.type },
        {
          type: p.type,
          label: p.label || p.type,
          annualQuota: Number(p.annualQuota) || 12,
          minDaysNotice: Number(p.minDaysNotice) || 0,
          requiresDocument: Boolean(p.requiresDocument),
          color: p.color || "#2563eb",
          description: p.description || "",
        },
        { upsert: true, new: true }
      );
      policiesSynced++;
    }

    if (systemSettings) {
      await Promise.all([
        SystemPrivilegeModel.findOneAndUpdate({ id: "default" }, systemSettings, { upsert: true, new: true }),
        SystemSettingsModel.findOneAndUpdate({ id: "default" }, systemSettings, { upsert: true, new: true }),
      ]);
    }

    for (const pm of (Array.isArray(permissionMatrix) ? permissionMatrix : [permissionMatrix])) {
      if (!pm || (!pm.userId && !pm.id)) continue;
      const targetId = pm.userId || pm.id;
      await PermissionMatrixModel.findOneAndUpdate(
        { $or: [{ userId: targetId }, { id: targetId }] },
        {
          id: pm.id || targetId,
          userId: targetId,
          userName: pm.userName || "",
          userEmail: pm.userEmail || "",
          role: pm.role || "ADMIN",
          departmentId: pm.departmentId || "",
          permissions: pm.permissions || [],
          updatedAt: new Date().toISOString(),
          updatedBy: pm.updatedBy || "SUPER_ADMIN"
        },
        { upsert: true, new: true }
      );
      permissionMatrixSynced++;
    }

    return res.status(200).json({
      success: true,
      mongoConnected: true,
      message: "Successfully synchronized portal data into MongoDB Atlas",
      counts: {
        auditLogs: auditLogsSynced,
        users: usersSynced,
        leaveRequests: requestsSynced,
        departments: deptsSynced,
        leavePolicies: policiesSynced,
        permissionMatrix: permissionMatrixSynced,
      }
    });
  } catch (err: any) {
    return res.status(200).json({
      success: false,
      error: err?.message || "Failed to sync to MongoDB Atlas"
    });
  }
}
