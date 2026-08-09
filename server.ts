import express from "express";
import path from "path";
import nodemailer from "nodemailer";
import { neon } from "@neondatabase/serverless";
import { createServer as createViteServer } from "vite";

const NEON_DB_URL = process.env.POSTGRES_URL || "postgresql://neondb_owner:npg_2nbd1fBtRchx@ep-floral-term-au00qpec-pooler.c-10.us-east-1.aws.neon.tech/bit_leave_portal?sslmode=require";

async function ensureNeonTables(sql: any) {
  try {
    await sql`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        role TEXT NOT NULL,
        designation TEXT,
        department_id TEXT,
        department_name TEXT,
        employee_code TEXT,
        joining_date TEXT,
        phone TEXT,
        avatar_url TEXT,
        account_status TEXT,
        leave_balances JSONB
      )
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS leave_requests (
        id TEXT PRIMARY KEY,
        applicant_id TEXT,
        applicant_name TEXT,
        applicant_email TEXT,
        applicant_designation TEXT,
        applicant_employee_code TEXT,
        department_id TEXT,
        department_name TEXT,
        leave_type TEXT,
        start_date TEXT,
        end_date TEXT,
        total_days NUMERIC,
        reason TEXT,
        contact_address TEXT,
        contact_phone TEXT,
        document_url TEXT,
        status TEXT,
        applied_on TEXT,
        hod_approval JSONB,
        registrar_approval JSONB,
        class_handovers JSONB
      )
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS departments (
        id TEXT PRIMARY KEY,
        code TEXT,
        name TEXT,
        hod_id TEXT,
        hod_name TEXT,
        total_faculty INT
      )
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS leave_policies (
        type TEXT PRIMARY KEY,
        label TEXT,
        annual_quota INT,
        min_days_notice INT,
        requires_document BOOLEAN,
        color TEXT,
        description TEXT
      )
    `;

    // Migration safeguard: ensure requires_document in Neon DB is BOOLEAN
    try {
      await sql`ALTER TABLE leave_policies ADD COLUMN IF NOT EXISTS requires_document BOOLEAN DEFAULT false;`;
      await sql`
        ALTER TABLE leave_policies 
        ALTER COLUMN requires_document TYPE BOOLEAN 
        USING (CASE WHEN requires_document::text IN ('1', 'true', 't', 'TRUE') THEN true ELSE false END);
      `;
    } catch (_e) {
      try {
        await sql`ALTER TABLE leave_policies DROP COLUMN IF EXISTS requires_document CASCADE;`;
        await sql`ALTER TABLE leave_policies ADD COLUMN requires_document BOOLEAN DEFAULT false;`;
      } catch (_err) {
        console.warn("[Migration Leave Policies Error]", _err);
      }
    }

    await sql`
      CREATE TABLE IF NOT EXISTS audit_logs (
        id TEXT PRIMARY KEY,
        timestamp TEXT,
        actor_id TEXT,
        actor_name TEXT,
        actor_role TEXT,
        action TEXT,
        details TEXT,
        ip_address TEXT
      )
    `;
  } catch (err) {
    console.warn("[Ensure Neon Tables Warning]", err);
  }
}

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
      await ensureNeonTables(sql);
      
      const tablesResult = await sql`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public'
      `;
      
      const tableNames = tablesResult.map((r: any) => r.table_name);
      
      let userCount = 0;
      let requestCount = 0;
      let deptCount = 0;
      let auditLogCount = 0;

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

      if (tableNames.includes("audit_logs")) {
        const logs = await sql`SELECT COUNT(*)::int as count FROM audit_logs`;
        auditLogCount = logs[0]?.count || 0;
      }

      return res.json({
        connected: true,
        database: "bit_leave_portal",
        host: "ep-floral-term-au00qpec-pooler.c-10.us-east-1.aws.neon.tech",
        tables: tableNames,
        counts: {
          users: userCount,
          leaveRequests: requestCount,
          departments: deptCount,
          auditLogs: auditLogCount
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

  // API Route: Bulk Sync Portal Data into Neon PostgreSQL
  app.post("/api/neon/sync", async (req, res) => {
    try {
      const sql = neon(NEON_DB_URL);
      await ensureNeonTables(sql);

      const { users = [], leaveRequests = [], departments = [], leavePolicies = [], auditLogs = [] } = req.body || {};

      let usersSynced = 0;
      let requestsSynced = 0;
      let deptsSynced = 0;
      let policiesSynced = 0;
      let auditLogsSynced = 0;

      // 1. Sync Audit Logs
      for (const a of auditLogs) {
        if (!a || !a.id) continue;
        await sql`
          INSERT INTO audit_logs (id, timestamp, actor_id, actor_name, actor_role, action, details, ip_address)
          VALUES (
            ${a.id},
            ${a.timestamp || new Date().toISOString()},
            ${a.actorId || 'sys'},
            ${a.actorName || 'System'},
            ${a.actorRole || 'SUPER_ADMIN'},
            ${a.action || 'ACTION'},
            ${a.details || ''},
            ${a.ipAddress || null}
          )
          ON CONFLICT (id) DO UPDATE SET
            timestamp = EXCLUDED.timestamp,
            actor_id = EXCLUDED.actor_id,
            actor_name = EXCLUDED.actor_name,
            actor_role = EXCLUDED.actor_role,
            action = EXCLUDED.action,
            details = EXCLUDED.details,
            ip_address = EXCLUDED.ip_address
        `;
        auditLogsSynced++;
      }

      // 2. Sync Users
      for (const u of users) {
        if (!u || !u.id) continue;
        await sql`
          INSERT INTO users (id, name, email, role, designation, department_id, department_name, employee_code, joining_date, phone, avatar_url, account_status, leave_balances)
          VALUES (
            ${u.id},
            ${u.name || ''},
            ${u.email || ''},
            ${u.role || 'FACULTY'},
            ${u.designation || null},
            ${u.departmentId || null},
            ${u.departmentName || null},
            ${u.employeeCode || null},
            ${u.joiningDate || null},
            ${u.phone || null},
            ${u.avatarUrl || null},
            ${u.accountStatus || 'ACTIVE'},
            ${JSON.stringify(u.leaveBalances || {})}
          )
          ON CONFLICT (id) DO UPDATE SET
            name = EXCLUDED.name,
            email = EXCLUDED.email,
            role = EXCLUDED.role,
            designation = EXCLUDED.designation,
            department_id = EXCLUDED.department_id,
            department_name = EXCLUDED.department_name,
            employee_code = EXCLUDED.employee_code,
            joining_date = EXCLUDED.joining_date,
            phone = EXCLUDED.phone,
            avatar_url = EXCLUDED.avatar_url,
            account_status = EXCLUDED.account_status,
            leave_balances = EXCLUDED.leave_balances
        `;
        usersSynced++;
      }

      // 3. Sync Leave Requests
      for (const r of leaveRequests) {
        if (!r || !r.id) continue;
        await sql`
          INSERT INTO leave_requests (id, applicant_id, applicant_name, applicant_email, applicant_designation, applicant_employee_code, department_id, department_name, leave_type, start_date, end_date, total_days, reason, contact_address, contact_phone, document_url, status, applied_on, hod_approval, registrar_approval, class_handovers)
          VALUES (
            ${r.id},
            ${r.applicantId || r.applicant_id || null},
            ${r.applicantName || r.applicant_name || null},
            ${r.applicantEmail || r.applicant_email || null},
            ${r.applicantDesignation || r.applicant_designation || null},
            ${r.applicantEmployeeCode || r.applicant_employee_code || null},
            ${r.departmentId || r.department_id || null},
            ${r.departmentName || r.department_name || null},
            ${r.leaveType || r.leave_type || null},
            ${r.startDate || r.start_date || null},
            ${r.endDate || r.end_date || null},
            ${r.totalDays ?? r.total_days ?? 1},
            ${r.reason || null},
            ${r.contactAddress || r.contact_address || null},
            ${r.contactPhone || r.contact_phone || null},
            ${r.documentUrl || r.document_url || null},
            ${r.status || 'PENDING_HOD'},
            ${r.appliedOn || r.applied_on || null},
            ${JSON.stringify(r.hodApproval || r.hod_approval || null)},
            ${JSON.stringify(r.registrarApproval || r.registrar_approval || null)},
            ${JSON.stringify(r.classHandovers || r.class_handovers || null)}
          )
          ON CONFLICT (id) DO UPDATE SET
            applicant_id = EXCLUDED.applicant_id,
            applicant_name = EXCLUDED.applicant_name,
            applicant_email = EXCLUDED.applicant_email,
            applicant_designation = EXCLUDED.applicant_designation,
            applicant_employee_code = EXCLUDED.applicant_employee_code,
            department_id = EXCLUDED.department_id,
            department_name = EXCLUDED.department_name,
            leave_type = EXCLUDED.leave_type,
            start_date = EXCLUDED.start_date,
            end_date = EXCLUDED.end_date,
            total_days = EXCLUDED.total_days,
            reason = EXCLUDED.reason,
            contact_address = EXCLUDED.contact_address,
            contact_phone = EXCLUDED.contact_phone,
            document_url = EXCLUDED.document_url,
            status = EXCLUDED.status,
            applied_on = EXCLUDED.applied_on,
            hod_approval = EXCLUDED.hod_approval,
            registrar_approval = EXCLUDED.registrar_approval,
            class_handovers = EXCLUDED.class_handovers
        `;
        requestsSynced++;
      }

      // 4. Sync Departments
      for (const d of departments) {
        if (!d || !d.id) continue;
        await sql`
          INSERT INTO departments (id, code, name, hod_id, hod_name, total_faculty)
          VALUES (
            ${d.id},
            ${d.code || d.id},
            ${d.name || ''},
            ${d.hodId || null},
            ${d.hodName || null},
            ${d.totalFaculty || 0}
          )
          ON CONFLICT (id) DO UPDATE SET
            code = EXCLUDED.code,
            name = EXCLUDED.name,
            hod_id = EXCLUDED.hod_id,
            hod_name = EXCLUDED.hod_name,
            total_faculty = EXCLUDED.total_faculty
        `;
        deptsSynced++;
      }

      // 5. Sync Leave Policies
      for (const p of leavePolicies) {
        if (!p || !p.type) continue;
        const reqDoc = Boolean(p.requiresDocument);
        await sql`
          INSERT INTO leave_policies (type, label, annual_quota, min_days_notice, requires_document, color, description)
          VALUES (
            ${p.type},
            ${p.label || p.type},
            ${Number(p.annualQuota) || 12},
            ${Number(p.minDaysNotice) || 0},
            ${reqDoc},
            ${p.color || '#2563eb'},
            ${p.description || null}
          )
          ON CONFLICT (type) DO UPDATE SET
            label = EXCLUDED.label,
            annual_quota = EXCLUDED.annual_quota,
            min_days_notice = EXCLUDED.min_days_notice,
            requires_document = EXCLUDED.requires_document,
            color = EXCLUDED.color,
            description = EXCLUDED.description
        `;
        policiesSynced++;
      }

      return res.json({
        success: true,
        message: "Successfully synchronized portal data into Neon PostgreSQL",
        counts: {
          auditLogs: auditLogsSynced,
          users: usersSynced,
          leaveRequests: requestsSynced,
          departments: deptsSynced,
          leavePolicies: policiesSynced
        }
      });
    } catch (err: any) {
      console.error("[Neon Sync Error]", err);
      return res.status(500).json({
        success: false,
        error: err?.message || "Failed to sync data to Neon DB"
      });
    }
  });

  // API Route: Insert single Audit Log directly into Neon PostgreSQL
  app.post("/api/neon/audit-log", async (req, res) => {
    try {
      const sql = neon(NEON_DB_URL);
      await ensureNeonTables(sql);
      const a = req.body;
      if (!a || !a.id) {
        return res.status(400).json({ success: false, error: "Missing log object or log.id" });
      }

      await sql`
        INSERT INTO audit_logs (id, timestamp, actor_id, actor_name, actor_role, action, details, ip_address)
        VALUES (
          ${a.id},
          ${a.timestamp || new Date().toISOString()},
          ${a.actorId || 'sys'},
          ${a.actorName || 'System'},
          ${a.actorRole || 'SUPER_ADMIN'},
          ${a.action || 'ACTION'},
          ${a.details || ''},
          ${a.ipAddress || null}
        )
        ON CONFLICT (id) DO UPDATE SET
          timestamp = EXCLUDED.timestamp,
          actor_id = EXCLUDED.actor_id,
          actor_name = EXCLUDED.actor_name,
          actor_role = EXCLUDED.actor_role,
          action = EXCLUDED.action,
          details = EXCLUDED.details,
          ip_address = EXCLUDED.ip_address
      `;

      return res.json({ success: true, message: "Audit log inserted into Neon DB", logId: a.id });
    } catch (err: any) {
      console.error("[Neon Single Audit Log Error]", err);
      return res.status(500).json({ success: false, error: err?.message });
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

  // API Route: Inspect Table & Data in Neon DB
  app.get("/api/neon/inspect-table", async (req, res) => {
    try {
      const sql = neon(NEON_DB_URL);
      const tableName = (req.query.table as string) || "users";

      // Verify table exists to prevent SQL injection
      const allowedTablesResult = await sql`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public'
      `;
      const allowedTables = allowedTablesResult.map((t: any) => t.table_name);

      if (!allowedTables.includes(tableName)) {
        return res.status(400).json({
          success: false,
          error: `Table '${tableName}' does not exist in public schema. Available tables: ${allowedTables.join(", ")}`
        });
      }

      // Fetch columns metadata
      const columnsResult = await sql`
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns
        WHERE table_name = ${tableName}
        ORDER BY column_name
      `;

      // Fetch top 100 rows safely
      let rows: any[] = [];
      if (tableName === "users") {
        rows = await sql`SELECT * FROM users LIMIT 100`;
      } else if (tableName === "leave_requests") {
        rows = await sql`SELECT * FROM leave_requests LIMIT 100`;
      } else if (tableName === "departments") {
        rows = await sql`SELECT * FROM departments LIMIT 100`;
      } else if (tableName === "leave_policies") {
        rows = await sql`SELECT * FROM leave_policies LIMIT 100`;
      } else if (tableName === "audit_logs") {
        rows = await sql`SELECT * FROM audit_logs LIMIT 100`;
      } else {
        // Fallback for any other custom table
        rows = await sql`SELECT * FROM information_schema.tables WHERE table_schema = 'public'`;
      }

      return res.json({
        success: true,
        table: tableName,
        availableTables: allowedTables,
        columns: columnsResult,
        totalRows: rows.length,
        rows
      });
    } catch (err: any) {
      console.error("[Neon Inspect Table Error]", err);
      return res.status(500).json({
        success: false,
        error: err?.message || "Failed to inspect Neon DB table"
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
