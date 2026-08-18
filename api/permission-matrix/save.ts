import { connectToDatabase, PermissionMatrixModel } from "../db";

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
    const { permissionMatrix, permissions, userId, role } = req.body || {};

    if (userId) {
      await PermissionMatrixModel.findOneAndUpdate(
        { $or: [{ userId }, { id: userId }] },
        {
          id: userId,
          userId,
          role: role || "ADMIN",
          permissions: permissions || [],
          updatedAt: new Date().toISOString(),
          updatedBy: "SUPER_ADMIN",
        },
        { upsert: true, new: true }
      );
    } else if (Array.isArray(permissionMatrix)) {
      for (const pm of permissionMatrix) {
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
            updatedBy: pm.updatedBy || "SUPER_ADMIN",
          },
          { upsert: true, new: true }
        );
      }
    }

    return res.status(200).json({ success: true, message: "Permission matrix saved successfully" });
  } catch (err: any) {
    return res.status(200).json({ success: false, error: err?.message || "Failed to save permission matrix" });
  }
}
