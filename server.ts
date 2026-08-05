import express from "express";
import path from "path";
import nodemailer from "nodemailer";
import { createServer as createViteServer } from "vite";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: "10mb" }));

  // API Route: Send Email
  app.post("/api/send-email", async (req, res) => {
    try {
      const { smtpConfig, to, toName, subject, html, text } = req.body;

      if (!to) {
        return res.status(400).json({
          success: false,
          error: "Recipient email ('to') is required."
        });
      }

      const host = smtpConfig?.smtpHost || "mail.bitmesra.ac.in";
      const port = Number(smtpConfig?.smtpPort) || 587;
      const encryption = smtpConfig?.encryption || "TLS";
      const user = smtpConfig?.smtpUsername;
      const pass = smtpConfig?.smtpPassword;
      const senderEmail = smtpConfig?.senderEmail || "leave-portal@bitmesra.ac.in";
      const senderName = smtpConfig?.senderName || "BIT Leave Portal System";
      const ccEmail = smtpConfig?.sendCopyAdmin ? smtpConfig?.adminCcEmail : undefined;

      // Construct Nodemailer Transporter
      const transporter = nodemailer.createTransport({
        host,
        port,
        secure: encryption === "SSL", // true for 465, false for other ports
        requireTLS: encryption === "TLS",
        auth: user && pass ? { user, pass } : undefined,
        tls: {
          rejectUnauthorized: false // Prevents failure on internal/institutional self-signed certs
        },
        connectionTimeout: 12000,
        greetingTimeout: 12000,
        socketTimeout: 12000
      });

      const recipientFormatted = toName ? `"${toName}" <${to}>` : to;
      const senderFormatted = `"${senderName}" <${senderEmail}>`;

      const mailOptions: nodemailer.SendMailOptions = {
        from: senderFormatted,
        to: recipientFormatted,
        cc: ccEmail,
        subject: subject || "BIT Leave Portal Notification",
        html: html || undefined,
        text: text || undefined
      };

      console.log(`[SMTP] Attempting dispatch to ${to} via ${host}:${port} (Encryption: ${encryption})...`);

      const info = await transporter.sendMail(mailOptions);

      console.log(`[SMTP] Success! Message ID: ${info.messageId}`);

      return res.json({
        success: true,
        messageId: info.messageId,
        response: info.response,
        message: `Email successfully delivered to ${to} via SMTP server ${host}:${port}.`
      });

    } catch (err: any) {
      console.error("[SMTP Error]", err);

      let detailedMsg = err?.message || "Unknown SMTP dispatch error";
      if (err?.code === "ETIMEDOUT") {
        detailedMsg = `Connection timeout connecting to mail server (${req.body?.smtpConfig?.smtpHost}:${req.body?.smtpConfig?.smtpPort}). Ensure host and port are accessible over network.`;
      } else if (err?.code === "EAUTH") {
        detailedMsg = `Authentication failed for ${req.body?.smtpConfig?.smtpUsername}. Please verify SMTP username and password in Admin Email Settings.`;
      } else if (err?.code === "ESOCKET") {
        detailedMsg = `Socket error connecting to ${req.body?.smtpConfig?.smtpHost}:${req.body?.smtpConfig?.smtpPort}. Check encryption protocol (TLS/SSL).`;
      }

      return res.status(500).json({
        success: false,
        code: err?.code || "SMTP_DISPATCH_FAILED",
        error: detailedMsg,
        rawError: String(err)
      });
    }
  });

  // Health check
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // Vite middleware for development vs static serve for production
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Full-stack server running on http://localhost:${PORT}`);
  });
}

startServer();
