import { 
  connectToDatabase, 
  UserModel, 
  LeaveRequestModel, 
  DepartmentModel, 
  LeavePolicyModel, 
  AuditLogModel,
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

  try {
    await connectToDatabase();

    const [
      usersCount,
      leaveRequestsCount,
      departmentsCount,
      leavePoliciesCount,
      auditLogsCount,
      latestLeaveRequest,
      latestAuditLog
    ] = await Promise.all([
      UserModel.countDocuments(),
      LeaveRequestModel.countDocuments(),
      DepartmentModel.countDocuments(),
      LeavePolicyModel.countDocuments(),
      AuditLogModel.countDocuments(),
      LeaveRequestModel.findOne().sort({ updatedAt: -1, createdAt: -1, _id: -1 }).lean(),
      AuditLogModel.findOne().sort({ timestamp: -1, createdAt: -1, _id: -1 }).lean(),
    ]);

    return res.status(200).json({
      success: true,
      serverTimestamp: new Date().toISOString(),
      database: {
        connected: true,
        engine: "MongoDB Atlas",
        dbName: mongoose.connection.db?.databaseName || "bit_leave_portal",
        host: mongoose.connection.host,
        readyState: mongoose.connection.readyState,
      },
      counts: {
        users: usersCount,
        leaveRequests: leaveRequestsCount,
        departments: departmentsCount,
        leavePolicies: leavePoliciesCount,
        auditLogs: auditLogsCount,
      },
      latestRecords: {
        latestLeaveRequest: latestLeaveRequest ? {
          id: latestLeaveRequest.id,
          applicantName: latestLeaveRequest.applicantName,
          applicantEmail: latestLeaveRequest.applicantEmail,
          leaveType: latestLeaveRequest.leaveType,
          status: latestLeaveRequest.status,
          appliedOn: latestLeaveRequest.appliedOn,
          updatedAt: (latestLeaveRequest as any).updatedAt || null,
        } : null,
        latestAuditLog: latestAuditLog ? {
          id: latestAuditLog.id,
          action: latestAuditLog.action,
          actorName: latestAuditLog.actorName,
          timestamp: latestAuditLog.timestamp,
        } : null,
      }
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      error: err?.message || "Failed to query MongoDB Atlas diagnostic",
      serverTimestamp: new Date().toISOString(),
      database: {
        connected: false,
        error: err?.message
      }
    });
  }
}
