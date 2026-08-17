import { 
  connectToDatabase, 
  UserModel, 
  LeaveRequestModel, 
  DepartmentModel, 
  LeavePolicyModel, 
  AuditLogModel, 
  PermissionMatrixModel 
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

    const { colName, id, email, type, code } = req.body || {};
    let deletedCount = 0;

    if (colName === "users" || colName === "user") {
      const orConditions: any[] = [];
      if (id) orConditions.push({ id }, { _id: id });
      if (email) orConditions.push({ email: String(email).trim().toLowerCase() });
      if (orConditions.length > 0) {
        const delRes = await UserModel.deleteMany({ $or: orConditions });
        deletedCount = delRes.deletedCount || 0;
      }
    } else if (colName === "leaveRequests" || colName === "leave_requests" || colName === "clearAllRequests") {
      if (colName === "clearAllRequests" || id === "all") {
        const delRes = await LeaveRequestModel.deleteMany({});
        deletedCount = delRes.deletedCount || 0;
      } else if (id) {
        const delRes = await LeaveRequestModel.deleteMany({ $or: [{ id }, { _id: id }] });
        deletedCount = delRes.deletedCount || 0;
      }
    } else if (colName === "departments" || colName === "department") {
      const targetId = id || code;
      if (targetId) {
        const delRes = await DepartmentModel.deleteMany({ $or: [{ id: targetId }, { code: targetId }, { _id: targetId }] });
        deletedCount = delRes.deletedCount || 0;
      }
    } else if (colName === "leavePolicies" || colName === "leave_policies") {
      const targetType = type || id;
      if (targetType) {
        const delRes = await LeavePolicyModel.deleteMany({ $or: [{ type: targetType }, { id: targetType }] });
        deletedCount = delRes.deletedCount || 0;
      }
    } else if (colName === "permissionMatrix" || colName === "permission_matrix") {
      if (id) {
        const delRes = await PermissionMatrixModel.deleteMany({ $or: [{ id }, { userId: id }] });
        deletedCount = delRes.deletedCount || 0;
      }
    }

    return res.status(200).json({
      success: true,
      message: `Deleted record(s) from collection: ${colName}`,
      deletedCount
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      error: err?.message || "Failed to delete record from MongoDB Atlas"
    });
  }
}
