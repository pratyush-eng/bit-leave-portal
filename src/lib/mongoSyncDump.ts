import { User, LeaveRequest, Department, LeavePolicy, AuditLog } from '../types';

export function generateMySQLDump(data: {
  users: User[];
  leaveRequests: LeaveRequest[];
  departments: Department[];
  leavePolicies: LeavePolicy[];
  auditLogs: AuditLog[];
}): string {
  let dump = `-- MongoDB Atlas to MySQL Database Dump\n`;
  dump += `-- Generated on: ${new Date().toISOString()}\n\n`;
  
  dump += `-- Table: users\n`;
  for (const u of data.users || []) {
    const escName = (u.name || '').replace(/'/g, "''");
    const escEmail = (u.email || '').replace(/'/g, "''");
    dump += `INSERT INTO users (id, name, email, role, department_id) VALUES ('${u.id}', '${escName}', '${escEmail}', '${u.role}', '${u.departmentId}');\n`;
  }
  
  dump += `\n-- Table: leave_requests\n`;
  for (const r of data.leaveRequests || []) {
    const escReason = (r.reason || '').replace(/'/g, "''");
    dump += `INSERT INTO leave_requests (id, applicant_id, leave_type, start_date, end_date, total_days, status, reason) VALUES ('${r.id}', '${r.applicantId}', '${r.leaveType}', '${r.startDate}', '${r.endDate}', ${r.totalDays}, '${r.status}', '${escReason}');\n`;
  }
  return dump;
}

export function generateVercelPostgresDump(data: {
  users: User[];
  leaveRequests: LeaveRequest[];
  departments: Department[];
  leavePolicies: LeavePolicy[];
  auditLogs: AuditLog[];
}): string {
  let dump = `-- MongoDB Atlas to PostgreSQL / Vercel Postgres Dump\n`;
  dump += `-- Generated on: ${new Date().toISOString()}\n\n`;

  dump += `-- Table: users\n`;
  for (const u of data.users || []) {
    const escName = (u.name || '').replace(/'/g, "''");
    const escEmail = (u.email || '').replace(/'/g, "''");
    dump += `INSERT INTO users (id, name, email, role, department_id) VALUES ('${u.id}', '${escName}', '${escEmail}', '${u.role}', '${u.departmentId}') ON CONFLICT (id) DO NOTHING;\n`;
  }
  return dump;
}
