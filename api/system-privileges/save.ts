import { connectToDatabase, SystemSettingsModel, SystemPrivilegeModel } from "../db";

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
    const privileges = req.body || {};
    const effectiveId = privileges.id || "default";

    const updatedDoc = {
      id: effectiveId,
      privilegeName: privileges.privilegeName || "System Privileges & Feature Toggles",
      enableDemoAccounts: Boolean(privileges.enableDemoAccounts),
      enableRoleSwitcher: Boolean(privileges.enableRoleSwitcher),
      enableSelfRegistration: Boolean(privileges.enableSelfRegistration),
      institutionName: privileges.institutionName || "BIT Leave Portal",
      institutionLogoUrl: privileges.institutionLogoUrl || "https://bitmesra.ac.in/SiteLogo/bit-newlogo.png",
      emailSettings: privileges.emailSettings || {},
      customToggles: privileges.customToggles || {},
      updatedAt: new Date().toISOString(),
      updatedBy: privileges.updatedBy || "SUPER_ADMIN",
    };

    await Promise.all([
      SystemPrivilegeModel.findOneAndUpdate({ id: effectiveId }, updatedDoc, { upsert: true, new: true }),
      SystemSettingsModel.findOneAndUpdate({ id: effectiveId }, updatedDoc, { upsert: true, new: true }),
    ]);

    return res.status(200).json({ success: true, message: "System privileges successfully saved in MongoDB Atlas." });
  } catch (err: any) {
    return res.status(200).json({ success: false, error: err?.message || "Failed to save system privileges in MongoDB Atlas." });
  }
}
