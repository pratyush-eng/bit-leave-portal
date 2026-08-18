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
    const settings = req.body || {};
    const effectiveId = settings.id || "default";

    const updatedDoc = {
      id: effectiveId,
      enableDemoAccounts: Boolean(settings.enableDemoAccounts),
      enableRoleSwitcher: Boolean(settings.enableRoleSwitcher),
      enableSelfRegistration: Boolean(settings.enableSelfRegistration),
      institutionName: settings.institutionName || "BIT Leave Portal",
      institutionLogoUrl: settings.institutionLogoUrl || "https://bitmesra.ac.in/SiteLogo/bit-newlogo.png",
      emailSettings: settings.emailSettings || {},
      customToggles: settings.customToggles || {},
      updatedAt: new Date().toISOString(),
      updatedBy: settings.updatedBy || "SUPER_ADMIN",
    };

    await Promise.all([
      SystemSettingsModel.findOneAndUpdate({ id: effectiveId }, updatedDoc, { upsert: true, new: true }),
      SystemPrivilegeModel.findOneAndUpdate({ id: effectiveId }, updatedDoc, { upsert: true, new: true }),
    ]);

    return res.status(200).json({ success: true, message: "System settings successfully updated in MongoDB Atlas." });
  } catch (err: any) {
    return res.status(200).json({ success: false, error: err?.message || "Failed to update system settings in MongoDB Atlas." });
  }
}
