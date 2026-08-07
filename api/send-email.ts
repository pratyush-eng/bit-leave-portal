import nodemailer from "nodemailer";

export default async function handler(req: any, res: any) {
  // CORS Headers
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS,PATCH,DELETE,POST,PUT");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization"
  );

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  try {
    const { smtpConfig, to, toName, subject, html, text } = req.body || {};

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

    const transporter = nodemailer.createTransport({
      host,
      port,
      secure: encryption === "SSL",
      requireTLS: encryption === "TLS",
      auth: user && pass ? { user, pass } : undefined,
      tls: {
        rejectUnauthorized: false
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

    console.log(`[SMTP Vercel Handler] Dispatching to ${to} via ${host}:${port}...`);
    const info = await transporter.sendMail(mailOptions);

    return res.status(200).json({
      success: true,
      messageId: info.messageId,
      response: info.response,
      message: `Email successfully delivered to ${to} via SMTP server ${host}:${port}.`
    });

  } catch (err: any) {
    console.error("[SMTP Vercel Handler Error]", err);
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
}
