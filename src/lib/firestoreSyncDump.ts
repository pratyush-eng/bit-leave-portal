import { User, LeaveRequest, Department, LeavePolicy, AuditLog } from '../types';

export function generateMySQLDump(data: {
  users: User[];
  leaveRequests: LeaveRequest[];
  departments: Department[];
  leavePolicies: LeavePolicy[];
  auditLogs: AuditLog[];
}): string {
  const escapeSql = (str: string | undefined | null) => {
    if (!str) return "''";
    return `'${String(str).replace(/'/g, "''").replace(/\\/g, "\\\\")}'`;
  };

  let sql = `-- ========================================================\n`;
  sql += `-- BIT Mesra Leave Portal - Complete MySQL Database Schema & Seed Data\n`;
  sql += `-- Generated on: ${new Date().toISOString()}\n`;
  sql += `-- ========================================================\n\n`;

  sql += `CREATE DATABASE IF NOT EXISTS bit_leave_portal;\n`;
  sql += `USE bit_leave_portal;\n\n`;

  // Departments
  sql += `DROP TABLE IF EXISTS departments;\n`;
  sql += `CREATE TABLE departments (id VARCHAR(50) PRIMARY KEY, code VARCHAR(20), name VARCHAR(255), hod_id VARCHAR(50), hod_name VARCHAR(255), total_faculty INT);\n\n`;

  if (data.departments?.length) {
    sql += `INSERT INTO departments (id, code, name, hod_id, hod_name, total_faculty) VALUES\n`;
    sql += data.departments.map(d => `  (${escapeSql(d.id)}, ${escapeSql(d.code)}, ${escapeSql(d.name)}, ${escapeSql(d.hodId)}, ${escapeSql(d.hodName)}, ${d.totalFaculty || 0})`).join(',\n') + `;\n\n`;
  }

  // Users
  sql += `DROP TABLE IF EXISTS users;\n`;
  sql += `CREATE TABLE users (id VARCHAR(50) PRIMARY KEY, name VARCHAR(255), email VARCHAR(255), role VARCHAR(50), designation VARCHAR(150), department_id VARCHAR(50), department_name VARCHAR(255));\n\n`;

  if (data.users?.length) {
    sql += `INSERT INTO users (id, name, email, role, designation, department_id, department_name) VALUES\n`;
    sql += data.users.map(u => `  (${escapeSql(u.id)}, ${escapeSql(u.name)}, ${escapeSql(u.email)}, ${escapeSql(u.role)}, ${escapeSql(u.designation)}, ${escapeSql(u.departmentId)}, ${escapeSql(u.departmentName)})`).join(',\n') + `;\n\n`;
  }

  return sql;
}

export function generateVercelPostgresDump(data: {
  users: User[];
  leaveRequests: LeaveRequest[];
  departments: Department[];
  leavePolicies: LeavePolicy[];
  auditLogs: AuditLog[];
}): string {
  const escapeSql = (str: string | undefined | null) => {
    if (!str) return "''";
    return `'${String(str).replace(/'/g, "''").replace(/\\/g, "\\\\")}'`;
  };

  let sql = `-- ========================================================\n`;
  sql += `-- BIT Mesra Leave Portal - Vercel Postgres / PostgreSQL Dump\n`;
  sql += `-- Generated on: ${new Date().toISOString()}\n`;
  sql += `-- ========================================================\n\n`;

  sql += `DROP TABLE IF EXISTS departments CASCADE;\n`;
  sql += `CREATE TABLE departments (id VARCHAR(50) PRIMARY KEY, code VARCHAR(20), name VARCHAR(255));\n\n`;

  if (data.departments?.length) {
    sql += `INSERT INTO departments (id, code, name) VALUES\n`;
    sql += data.departments.map(d => `  (${escapeSql(d.id)}, ${escapeSql(d.code)}, ${escapeSql(d.name)})`).join(',\n') + `;\n\n`;
  }

  return sql;
}
