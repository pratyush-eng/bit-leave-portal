import { connectToDatabase, AuditLogModel } from "../db";

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
    const { log } = req.body || {};

    if (log && log.action) {
      const logId = log.id || `log_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`;
      await AuditLogModel.findOneAndUpdate(
        { id: logId },
        {
          id: logId,
          timestamp: log.timestamp || new Date().toISOString(),
          actorId: log.actorId || "sys",
          actorName: log.actorName || "System",
          actorRole: log.actorRole || "SUPER_ADMIN",
          action: log.action || "ACTION",
          details: log.details || "",
          ipAddress: log.ipAddress || null,
        },
        { upsert: true, new: true }
      );
    }

    return res.status(200).json({ success: true, message: "Audit log recorded" });
  } catch (err: any) {
    return res.status(200).json({ success: false, error: err?.message || "Failed to record audit log" });
  }
}
