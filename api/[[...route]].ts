import { createApp } from "../server";

let appPromise: Promise<any> | null = null;

async function getApp() {
  if (!appPromise) {
    appPromise = createApp();
  }

  return appPromise;
}

export default async function handler(req: any, res: any) {
  try {
    const app = await getApp();
    return app(req, res);
  } catch (error: any) {
    console.error("[Vercel API] Failed to initialize application:", error);

    return res.status(500).json({
      success: false,
      error: "API initialization failed"
    });
  }
}
