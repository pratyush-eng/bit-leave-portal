import { neon } from '@neondatabase/serverless';

export const NEON_DB_URL = "postgresql://neondb_owner:npg_2nbd1fBtRchx@ep-floral-term-au00qpec-pooler.c-10.us-east-1.aws.neon.tech/bit_leave_portal?sslmode=require";

// Direct client instance for fallback when backend /api routes are unavailable (e.g., GitHub Pages)
const sqlClient = neon(NEON_DB_URL);

async function ensureClientTables() {
  try {
    await sqlClient`
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
    await sqlClient`
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
    await sqlClient`
      CREATE TABLE IF NOT EXISTS departments (
        id TEXT PRIMARY KEY,
        code TEXT,
        name TEXT,
        hod_id TEXT,
        hod_name TEXT,
        total_faculty INT
      )
    `;
    await sqlClient`
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

    try {
      await sqlClient`ALTER TABLE leave_policies ADD COLUMN IF NOT EXISTS requires_document BOOLEAN DEFAULT false;`;
      await sqlClient`
        ALTER TABLE leave_policies 
        ALTER COLUMN requires_document TYPE BOOLEAN 
        USING (CASE WHEN requires_document::text IN ('1', 'true', 't', 'TRUE') THEN true ELSE false END);
      `;
    } catch (_e) {
      try {
        await sqlClient`ALTER TABLE leave_policies DROP COLUMN IF EXISTS requires_document CASCADE;`;
        await sqlClient`ALTER TABLE leave_policies ADD COLUMN requires_document BOOLEAN DEFAULT false;`;
      } catch (_err) {
        console.warn("[Migration Leave Policies Error]", _err);
      }
    }
    await sqlClient`
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
    console.warn('[Neon Client Ensure Tables]', err);
  }
}

/**
 * Safely parse response if JSON, returning null if HTML (e.g. 404 page on GitHub Pages)
 */
async function safeJsonFetch(url: string, options?: RequestInit) {
  try {
    const res = await fetch(url, options);
    const contentType = res.headers.get('content-type');
    if (res.ok && contentType && contentType.includes('application/json')) {
      return await res.json();
    }
  } catch {
    // Network or API unavailable
  }
  return null;
}

/**
 * Ping Neon connection - try /api endpoint first, fallback to direct browser query
 */
export async function getNeonStatus() {
  const backendData = await safeJsonFetch('/api/neon/status');
  if (backendData && backendData.connected) {
    return backendData;
  }

  // Fallback: Direct Browser Connection to Neon DB over HTTP
  try {
    await ensureClientTables();
    const tablesResult = await sqlClient`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `;
    const tables = tablesResult.map((t: any) => t.table_name);

    let userCount = 0;
    let requestCount = 0;
    let deptCount = 0;
    let auditLogCount = 0;

    if (tables.includes('users')) {
      const u = await sqlClient`SELECT COUNT(*)::int as count FROM users`;
      userCount = u[0]?.count || 0;
    }
    if (tables.includes('leave_requests')) {
      const r = await sqlClient`SELECT COUNT(*)::int as count FROM leave_requests`;
      requestCount = r[0]?.count || 0;
    }
    if (tables.includes('departments')) {
      const d = await sqlClient`SELECT COUNT(*)::int as count FROM departments`;
      deptCount = d[0]?.count || 0;
    }
    if (tables.includes('audit_logs')) {
      const l = await sqlClient`SELECT COUNT(*)::int as count FROM audit_logs`;
      auditLogCount = l[0]?.count || 0;
    }

    return {
      connected: true,
      database: 'bit_leave_portal',
      host: 'ep-floral-term-au00qpec-pooler.c-10.us-east-1.aws.neon.tech',
      tables,
      counts: {
        users: userCount,
        leaveRequests: requestCount,
        departments: deptCount,
        auditLogs: auditLogCount,
      },
      mode: 'direct_browser',
    };
  } catch (err: any) {
    return {
      connected: false,
      error: err?.message || 'Failed to connect directly to Neon PostgreSQL database.',
    };
  }
}

/**
 * Inspect table - try /api endpoint first, fallback to direct browser query
 */
export async function inspectNeonTable(tableName: string) {
  const backendData = await safeJsonFetch(`/api/neon/inspect-table?table=${encodeURIComponent(tableName)}`);
  if (backendData && backendData.success) {
    return backendData;
  }

  // Fallback: Direct Browser Query
  try {
    await ensureClientTables();
    const allowedTablesResult = await sqlClient`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `;
    const allowedTables = allowedTablesResult.map((t: any) => t.table_name);

    if (!allowedTables.includes(tableName)) {
      return {
        success: false,
        error: `Table '${tableName}' does not exist in public schema.`
      };
    }

    const columnsResult = await sqlClient`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = ${tableName}
      ORDER BY column_name
    `;

    let rows: any[] = [];
    if (tableName === 'users') {
      rows = await sqlClient`SELECT * FROM users LIMIT 100`;
    } else if (tableName === 'leave_requests') {
      rows = await sqlClient`SELECT * FROM leave_requests LIMIT 100`;
    } else if (tableName === 'departments') {
      rows = await sqlClient`SELECT * FROM departments LIMIT 100`;
    } else if (tableName === 'leave_policies') {
      rows = await sqlClient`SELECT * FROM leave_policies LIMIT 100`;
    } else if (tableName === 'audit_logs') {
      rows = await sqlClient`SELECT * FROM audit_logs LIMIT 100`;
    }

    return {
      success: true,
      table: tableName,
      availableTables: allowedTables,
      columns: columnsResult,
      totalRows: rows.length,
      rows,
    };
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || 'Failed to inspect Neon DB table via client driver.',
    };
  }
}

/**
 * Sync portal data to Neon DB
 */
export async function syncDataToNeon(dataPayload: {
  users?: any[];
  leaveRequests?: any[];
  departments?: any[];
  leavePolicies?: any[];
  auditLogs?: any[];
}) {
  const backendData = await safeJsonFetch('/api/neon/sync', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(dataPayload)
  });

  if (backendData && backendData.success) {
    return backendData;
  }

  // Direct Client Sync Fallback
  try {
    await ensureClientTables();
    const { users = [], leaveRequests = [], departments = [], leavePolicies = [], auditLogs = [] } = dataPayload;

    let auditLogsSynced = 0;
    let usersSynced = 0;
    let requestsSynced = 0;
    let deptsSynced = 0;
    let policiesSynced = 0;

    for (const a of auditLogs) {
      if (!a || !a.id) continue;
      await sqlClient`
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

    for (const u of users) {
      if (!u || !u.id) continue;
      await sqlClient`
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

    for (const r of leaveRequests) {
      if (!r || !r.id) continue;
      await sqlClient`
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

    for (const d of departments) {
      if (!d || !d.id) continue;
      await sqlClient`
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

    for (const p of leavePolicies) {
      if (!p || !p.type) continue;
      await sqlClient`
        INSERT INTO leave_policies (type, label, annual_quota, min_days_notice, requires_document, color, description)
        VALUES (
          ${p.type},
          ${p.label || p.type},
          ${Number(p.annualQuota) || 12},
          ${Number(p.minDaysNotice) || 0},
          ${Boolean(p.requiresDocument)},
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

    return {
      success: true,
      message: 'Successfully synchronized portal data directly into Neon PostgreSQL.',
      counts: {
        auditLogs: auditLogsSynced,
        users: usersSynced,
        leaveRequests: requestsSynced,
        departments: deptsSynced,
        leavePolicies: policiesSynced,
      },
    };
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || 'Failed to sync data directly to Neon DB.',
    };
  }
}

/**
 * Insert single audit log
 */
export async function sendAuditLogToNeon(log: any) {
  const backendData = await safeJsonFetch('/api/neon/audit-log', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(log)
  });

  if (backendData && backendData.success) {
    return backendData;
  }

  // Fallback direct browser query
  try {
    await ensureClientTables();
    await sqlClient`
      INSERT INTO audit_logs (id, timestamp, actor_id, actor_name, actor_role, action, details, ip_address)
      VALUES (
        ${log.id},
        ${log.timestamp || new Date().toISOString()},
        ${log.actorId || 'sys'},
        ${log.actorName || 'System'},
        ${log.actorRole || 'SUPER_ADMIN'},
        ${log.action || 'ACTION'},
        ${log.details || ''},
        ${log.ipAddress || null}
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
    return { success: true, logId: log.id };
  } catch (err: any) {
    console.warn('[Direct Neon Log Error]', err);
    return { success: false, error: err?.message };
  }
}

/**
 * Fetch all records directly from Cloud PostgreSQL (Neon DB)
 */
export async function fetchNeonData() {
  const backendData = await safeJsonFetch('/api/neon/data');
  if (backendData && Array.isArray(backendData.users) && backendData.users.length > 0) {
    return backendData;
  }

  // Fallback direct browser query over HTTPS
  try {
    await ensureClientTables();
    const rawUsers = await sqlClient`SELECT * FROM users`;
    const rawRequests = await sqlClient`SELECT * FROM leave_requests`;
    const rawDepartments = await sqlClient`SELECT * FROM departments`;
    const rawPolicies = await sqlClient`SELECT * FROM leave_policies`;
    const rawAuditLogs = await sqlClient`SELECT * FROM audit_logs`;

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

    return { users, leaveRequests, departments, leavePolicies, auditLogs };
  } catch (err) {
    console.warn('[Fetch Neon Data Error]', err);
    return null;
  }
}

