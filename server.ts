import express from "express";
import path from "path";
import nodemailer from "nodemailer";
import { neon } from "@neondatabase/serverless";
import { createServer as createViteServer } from "vite";

const NEON_DB_URL = process.env.POSTGRES_URL || "postgresql://neondb_owner:npg_2nbd1fBtRchx@ep-floral-term-au00qpec-pooler.c-10.us-east-1.aws.neon.tech/bit_leave_portal?sslmode=require";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: "10mb" }));

  // CORS Middleware for external domains (e.g. leave.bitmesra.ac.in)
  app.use((req, res, next) => {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization");
    if (req.method === "OPTIONS") {
      return res.sendStatus(200);
    }
    next();
  });

  // API Route: Neon DB Connection Health & Status
  app.get("/api/neon/status", async (req, res) => {
    try {
      const sql = neon(NEON_DB_URL);
      
      const tablesResult = await sql`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public'
      `;
      
      const tableNames = tablesResult.map((r: any) => r.table_name);
      
      let userCount = 0;
      let requestCount = 0;
      let deptCount = 0;

      if (tableNames.includes("users")) {
        const users = await sql`SELECT COUNT(*)::int as count FROM users`;
        userCount = users[0]?.count || 0;
      }

      if (tableNames.includes("leave_requests")) {
        const reqs = await sql`SELECT COUNT(*)::int as count FROM leave_requests`;
        requestCount = reqs[0]?.count || 0;
      }

      if (tableNames.includes("departments")) {
        const depts = await sql`SELECT COUNT(*)::int as count FROM departments`;
        deptCount = depts[0]?.count || 0;
      }

      return res.json({
        connected: true,
        database: "bit_leave_portal",
        host: "ep-floral-term-au00qpec-pooler.c-10.us-east-1.aws.neon.tech",
        tables: tableNames,
        counts: {
          users: userCount,
          leaveRequests: requestCount,
          departments: deptCount
        }
      });
    } catch (err: any) {
      console.error("[Neon Status Error]", err);
      return res.status(500).json({
        connected: false,
        error: err?.message || "Failed to connect to Neon PostgreSQL database"
      });
    }
  });

  // API Route: Fetch all data from Neon DB
  app.get("/api/neon/data", async (req, res) => {
    try {
      const sql = neon(NEON_DB_URL);

      const rawUsers = await sql`SELECT * FROM users`;
      const rawRequests = await sql`SELECT * FROM leave_requests`;
      const rawDepartments = await sql`SELECT * FROM departments`;
      const rawPolicies = await sql`SELECT * FROM leave_policies`;
      const rawAuditLogs = await sql`SELECT * FROM audit_logs`;

      // Map DB snake_case columns back to frontend camelCase
      const users = rawUsers.map((u: any) => ({
        id: u.id,
        name: u.name,
        email: u.email,
        role: u.role,
        designation: u.designation,
        departmentId: u.department_id,
        departmentName: u.department_name,
        employeeCode: u.employee_code,
        joiningDate: u.joining_date,
        phone: u.phone,
        avatarUrl: u.avatar_url,
        accountStatus: u.account_status,
        leaveBalances: typeof u.leave_balances === 'string' ? JSON.parse(u.leave_balances) : (u.leave_balances || {})
      }));

      const leaveRequests = rawRequests.map((r: any) => ({
        id: r.id,
        applicantId: r.applicant_id,
        applicantName: r.applicant_name,
        applicantEmail: r.applicant_email,
        applicantDesignation: r.applicant_designation,
        applicantEmployeeCode: r.applicant_employee_code,
        departmentId: r.department_id,
        departmentName: r.department_name,
        leaveType: r.leave_type,
        startDate: r.start_date,
        endDate: r.end_date,
        totalDays: r.total_days,
        reason: r.reason,
        contactAddress: r.contact_address,
        contactPhone: r.contact_phone,
        documentUrl: r.document_url,
        status: r.status,
        appliedOn: r.applied_on,
        hodApproval: typeof r.hod_approval === 'string' ? JSON.parse(r.hod_approval) : r.hod_approval,
        registrarApproval: typeof r.registrar_approval === 'string' ? JSON.parse(r.registrar_approval) : r.registrar_approval,
        classHandovers: typeof r.class_handovers === 'string' ? JSON.parse(r.class_handovers) : r.class_handovers
      }));

      const departments = rawDepartments.map((d: any) => ({
        id: d.id,
        code: d.code,
        name: d.name,
        hodId: d.hod_id,
        hodName: d.hod_name,
        totalFaculty: d.total_faculty
      }));

      const leavePolicies = rawPolicies.map((p: any) => ({
        type: p.type,
        label: p.label,
        annualQuota: p.annual_quota,
        minDaysNotice: p.min_days_notice,
        requiresDocument: p.requires_document,
        color: p.color,
        description: p.description
      }));

      const auditLogs = rawAuditLogs.map((a: any) => ({
        id: a.id,
        timestamp: a.timestamp,
        actorId: a.actor_id,
        actorName: a.actor_name,
        actorRole: a.actor_role,
        action: a.action,
        details: a.details,
        ipAddress: a.ip_address
      }));

      return res.json({
        success: true,
        data: {
          users,
          leaveRequests,
          departments,
          leavePolicies,
          auditLogs
        }
      });
    } catch (err: any) {
      console.error("[Neon Fetch Data Error]", err);
      return res.status(500).json({
        success: false,
        error: err?.message || "Failed to fetch data from Neon DB"
      });
    }
  });

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
