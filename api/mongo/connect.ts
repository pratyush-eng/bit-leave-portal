import { connectToDatabase, setCustomMongoUri, getMongoUri } from "../db";

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

  const uri = String(req.body?.uri || req.query?.uri || "").trim();

  if (!uri) {
    return res.status(200).json({
      success: false,
      error: "MongoDB connection URI is required."
    });
  }

  try {
    setCustomMongoUri(uri);
    await connectToDatabase(uri);

    return res.status(200).json({
      success: true,
      message: "Successfully connected to MongoDB Atlas cluster with new URI!",
      currentUri: getMongoUri()
    });
  } catch (err: any) {
    const errorMsg = typeof err === "object" ? (err?.message || JSON.stringify(err)) : String(err);
    return res.status(200).json({
      success: false,
      error: errorMsg || "Failed to establish connection to MongoDB Atlas with the provided URI."
    });
  }
}
