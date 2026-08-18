import { connectToDatabase, UserModel } from "../db";

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
    const { id, email } = req.body || {};

    const orConditions: any[] = [];
    if (id) orConditions.push({ id }, { _id: id });
    if (email) orConditions.push({ email: String(email).trim().toLowerCase() });

    if (orConditions.length === 0) {
      return res.status(400).json({ success: false, error: "User ID or email is required for deletion." });
    }

    const delRes = await UserModel.deleteMany({ $or: orConditions });

    return res.status(200).json({
      success: true,
      message: `Deleted ${delRes.deletedCount || 0} user record(s) from MongoDB Atlas.`,
      deletedCount: delRes.deletedCount || 0
    });
  } catch (err: any) {
    return res.status(200).json({ success: false, error: err?.message || "Failed to delete user from MongoDB Atlas." });
  }
}
