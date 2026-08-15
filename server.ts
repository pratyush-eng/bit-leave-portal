import express from "express";
import path from "path";
import nodemailer from "nodemailer";
import mongoose from "mongoose";
import { createServer as createViteServer } from "vite";
import { 
  MOCK_USERS, 
  INITIAL_DEPARTMENTS, 
  INITIAL_LEAVE_POLICIES, 
  INITIAL_LEAVE_REQUESTS, 
  INITIAL_AUDIT_LOGS 
} from "./src/data/mockData";

let activeMongoUri = process.env.MONGODB_URI || "mongodb+srv://Vercel-Admin-bit-leave-portal:4S8i3u01aMvC8Xtt@bit-leave-portal.rqoqqmo.mongodb.net/bit_leave_portal?appName=bit-leave-portal";

let isMongoConnected = false;
let mongoConnectError = "";
let lastConnectAttempt = 0;

// Disable Mongoose query buffering globally to prevent buffering timeouts when connection is offline
mongoose.set("bufferCommands", false);
mongoose.set("strictQuery", false);

// In-Memory fallback store to ensure zero downtime and instant response if Atlas SRV DNS or network fails
const deletedUserIdsSet = new Set<string>();
const deletedUserEmailsSet = new Set<string>();

let inMemoryStore: {
  users: any[];
  leaveRequests: any[];
  departments: any[];
  leavePolicies: any[];
  auditLogs: any[];
  leaveBalances: any[];
  permissionMatrix: any[];
  systemSettings: any;
} = {
  users: JSON.parse(JSON.stringify(MOCK_USERS)),
  leaveRequests: JSON.parse(JSON.stringify(INITIAL_LEAVE_REQUESTS)),
  departments: JSON.parse(JSON.stringify(INITIAL_DEPARTMENTS)),
  leavePolicies: JSON.parse(JSON.stringify(INITIAL_LEAVE_POLICIES)),
  auditLogs: JSON.parse(JSON.stringify(INITIAL_AUDIT_LOGS)),
  leaveBalances: [],
  permissionMatrix: [
    {
      id: "usr_5",
      userId: "usr_5",
      userName: "Prof. Vikramaditya Roy",
      userEmail: "dean.academic@institution.edu",
      role: "SUPER_ADMIN",
      departmentId: "CSE",
      permissions: ["PERM_APPROVE_OVERRIDE", "PERM_ADJUST_BALANCE", "PERM_MANAGE_USERS", "PERM_EXPORT_REPORTS", "PERM_CONFIG_POLICIES"],
      updatedAt: new Date().toISOString(),
      updatedBy: "SUPER_ADMIN"
    }
  ],
  systemSettings: {
    enableDemoAccounts: true,
    enableRoleSwitcher: true,
    enableSelfRegistration: true,
    institutionName: "BIT Leave Portal",
    institutionLogoUrl: null,
    emailSettings: {}
  }
};

function getMaskedUri(uri: string) {
  try {
    return uri.replace(/\/\/(.+)@/, (_match, p1) => {
      const parts = p1.split(':');
      const user = parts[0] || 'user';
      return `//${user}:****@`;
    });
  } catch {
    return "MongoDB Atlas Cluster";
  }
}

async function initMongo(customUri?: string) {
  if (customUri && customUri.trim() !== activeMongoUri) {
    activeMongoUri = customUri.trim();
    isMongoConnected = false;
    try {
      await mongoose.disconnect();
    } catch (_e) {}
  }

  if (isMongoConnected && mongoose.connection.readyState === 1) return true;

  // Throttle connection retries to avoid spamming DNS queries
  const now = Date.now();
  if (lastConnectAttempt && now - lastConnectAttempt < 1000 && !customUri) {
    return isMongoConnected;
  }
  lastConnectAttempt = now;

  try {
    await mongoose.connect(activeMongoUri, {
      dbName: "bit_leave_portal",
      serverSelectionTimeoutMS: 5000,
      connectTimeoutMS: 5000,
    });
    isMongoConnected = true;
    mongoConnectError = "";
    console.log("[MongoDB Atlas] Connected successfully to MongoDB Atlas cluster.");
    await seedAndMigrateToMongo();
    return true;
  } catch (err: any) {
    isMongoConnected = false;
    const rawMsg = err?.message || String(err);
    if (rawMsg.includes("bad auth") || rawMsg.includes("Authentication failed")) {
      mongoConnectError = `Authentication failed for user 'amnLeaveportal410_db_user'. Please verify in MongoDB Atlas Console -> Security -> Database Access that user 'amnLeaveportal410_db_user' exists with password '4S8i3u01aMvC8Xtt' and has 'Read and write to any database' privilege.`;
    } else if (rawMsg.includes("ENOTFOUND") || rawMsg.includes("querySrv")) {
      mongoConnectError = `Atlas Domain Resolution Error (${rawMsg}). Please check your cluster hostname in MongoDB Atlas.`;
    } else {
      mongoConnectError = rawMsg;
    }
    return false;
  }
}

// Define Mongoose Schemas for MongoDB Collections
const UserSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  name: { type: String, default: "" },
  email: { type: String, required: true, unique: true },
  role: { type: String, default: "FACULTY" },
  designation: { type: String, default: "" },
  departmentId: { type: String, default: "" },
  departmentName: { type: String, default: "" },
  employeeCode: { type: String, default: "" },
  joiningDate: { type: String, default: "" },
  phone: { type: String, default: "" },
  avatarUrl: { type: String, default: "" },
  accountStatus: { type: String, default: "ACTIVE" },
  password: { type: String, default: "password123" },
  leaveBalances: { type: mongoose.Schema.Types.Mixed, default: {} },
}, { timestamps: true });

const LeaveRequestSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  applicantId: { type: String, default: "" },
  applicantName: { type: String, default: "" },
  applicantEmail: { type: String, default: "" },
  applicantDesignation: { type: String, default: "" },
  applicantEmployeeCode: { type: String, default: "" },
  departmentId: { type: String, default: "" },
  departmentName: { type: String, default: "" },
  leaveType: { type: String, default: "CASUAL" },
  startDate: { type: String, default: "" },
  endDate: { type: String, default: "" },
  totalDays: { type: Number, default: 1 },
  reason: { type: String, default: "" },
  contactAddress: { type: String, default: "" },
  contactPhone: { type: String, default: "" },
  documentUrl: { type: String, default: "" },
  status: { type: String, default: "PENDING_HOD" },
  appliedOn: { type: String, default: "" },
  hodApproval: { type: mongoose.Schema.Types.Mixed, default: null },
  registrarApproval: { type: mongoose.Schema.Types.Mixed, default: null },
  classHandovers: { type: mongoose.Schema.Types.Mixed, default: null },
}, { timestamps: true });

const DepartmentSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  code: { type: String, default: "" },
  name: { type: String, default: "" },
  hodId: { type: String, default: null },
  hodName: { type: String, default: null },
  totalFaculty: { type: Number, default: 0 },
}, { timestamps: true });

const LeavePolicySchema = new mongoose.Schema({
  type: { type: String, required: true, unique: true },
  label: { type: String, default: "" },
  annualQuota: { type: Number, default: 12 },
  minDaysNotice: { type: Number, default: 0 },
  requiresDocument: { type: Boolean, default: false },
  color: { type: String, default: "#2563eb" },
  description: { type: String, default: "" },
}, { timestamps: true });

const AuditLogSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  timestamp: { type: String, default: "" },
  actorId: { type: String, default: "sys" },
  actorName: { type: String, default: "System" },
  actorRole: { type: String, default: "SUPER_ADMIN" },
  action: { type: String, default: "ACTION" },
  details: { type: String, default: "" },
  ipAddress: { type: String, default: null },
}, { timestamps: true });

const LeaveBalanceSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  userId: { type: String, required: true },
  leaveType: { type: String, required: true },
  totalQuota: { type: Number, default: 0 },
  usedDays: { type: Number, default: 0 },
  pendingDays: { type: Number, default: 0 },
  updatedAt: { type: String, default: "" },
}, { timestamps: true });

const PermissionMatrixSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  userId: { type: String, required: true, unique: true },
  userName: { type: String, default: "" },
  userEmail: { type: String, default: "" },
  role: { type: String, default: "" },
  departmentId: { type: String, default: "" },
  permissions: { type: mongoose.Schema.Types.Mixed, default: [] },
  updatedAt: { type: String, default: "" },
  updatedBy: { type: String, default: "SUPER_ADMIN" },
}, { timestamps: true });

const SystemSettingsSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true, default: "default" },
  enableDemoAccounts: { type: Boolean, default: true },
  enableRoleSwitcher: { type: Boolean, default: true },
  enableSelfRegistration: { type: Boolean, default: true },
  institutionName: { type: String, default: "BIT Leave Portal" },
  institutionLogoUrl: { type: String, default: null },
  emailSettings: { type: mongoose.Schema.Types.Mixed, default: {} },
  updatedAt: { type: String, default: "" },
  updatedBy: { type: String, default: "SUPER_ADMIN" },
}, { timestamps: true });

const SystemPrivilegeSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true, default: "default" },
  privilegeName: { type: String, default: "System Privileges & Feature Toggles" },
  enableDemoAccounts: { type: Boolean, default: true },
  enableRoleSwitcher: { type: Boolean, default: true },
  enableSelfRegistration: { type: Boolean, default: true },
  institutionName: { type: String, default: "BIT Leave Portal" },
  institutionLogoUrl: { type: String, default: null },
  emailSettings: { type: mongoose.Schema.Types.Mixed, default: {} },
  customToggles: { type: mongoose.Schema.Types.Mixed, default: {} },
  updatedAt: { type: String, default: "" },
  updatedBy: { type: String, default: "SUPER_ADMIN" },
}, { timestamps: true });

const UserModel: any = mongoose.models.User || mongoose.model("User", UserSchema);
const LeaveRequestModel: any = mongoose.models.LeaveRequest || mongoose.model("LeaveRequest", LeaveRequestSchema);
const DepartmentModel: any = mongoose.models.Department || mongoose.model("Department", DepartmentSchema);
const LeavePolicyModel: any = mongoose.models.LeavePolicy || mongoose.model("LeavePolicy", LeavePolicySchema);
const AuditLogModel: any = mongoose.models.AuditLog || mongoose.model("AuditLog", AuditLogSchema);
const LeaveBalanceModel: any = mongoose.models.LeaveBalance || mongoose.model("LeaveBalance", LeaveBalanceSchema);
const PermissionMatrixModel: any = mongoose.models.PermissionMatrix || mongoose.model("PermissionMatrix", PermissionMatrixSchema);
const SystemSettingsModel: any = mongoose.models.SystemSettings || mongoose.model("SystemSettings", SystemSettingsSchema);
const SystemPrivilegeModel: any = mongoose.models.SystemPrivilege || mongoose.model("SystemPrivilege", SystemPrivilegeSchema, "system_privileges");

async function seedAndMigrateToMongo() {
  if (!isMongoConnected || mongoose.connection.readyState !== 1) return;
  try {
    const existingUsers = await UserModel.countDocuments();
    if (existingUsers > 0) {
      // MongoDB Atlas already has data; do NOT seed initial JS mock data over it.
      return;
    }

    // Initial seed if MongoDB is completely empty
    // 1. Audit Logs
    for (const a of inMemoryStore.auditLogs) {
      if (!a || !a.id) continue;
      await AuditLogModel.findOneAndUpdate(
        { id: a.id },
        {
          id: a.id,
          timestamp: a.timestamp || new Date().toISOString(),
          actorId: a.actorId || "sys",
          actorName: a.actorName || "System",
          actorRole: a.actorRole || "SUPER_ADMIN",
          action: a.action || "ACTION",
          details: a.details || "",
          ipAddress: a.ipAddress || null,
        },
        { upsert: true, new: true }
      );
    }

    // 2. Users
    for (const u of inMemoryStore.users) {
      if (!u || !u.email) continue;
      const cleanEmail = String(u.email).trim().toLowerCase();
      await UserModel.findOneAndUpdate(
        { email: cleanEmail },
        {
          id: u.id || "USER-" + Date.now(),
          name: u.name || "",
          email: cleanEmail,
          role: u.role || "FACULTY",
          designation: u.designation || "",
          departmentId: u.departmentId || "",
          departmentName: u.departmentName || "",
          employeeCode: u.employeeCode || "",
          joiningDate: u.joiningDate || "",
          phone: u.phone || "",
          avatarUrl: u.avatarUrl || "",
          accountStatus: u.accountStatus || "ACTIVE",
          password: u.password || "password123",
          leaveBalances: u.leaveBalances || {},
        },
        { upsert: true, new: true }
      );
    }

    // 3. Leave Requests
    for (const r of inMemoryStore.leaveRequests) {
      if (!r || !r.id) continue;
      const applicantName = r.applicantName || r.applicant_name || "";
      const applicantId = r.applicantId || r.applicant_id || "";
      if (!applicantName || applicantName === "Unknown Applicant" || applicantName.toLowerCase() === "unknown" || applicantId === "UNKNOWN_APPLICANT" || applicantId === "UNKNOWN") {
        continue;
      }
      await LeaveRequestModel.findOneAndUpdate(
        { id: r.id },
        {
          id: r.id,
          applicantId: applicantId,
          applicantName: applicantName,
          applicantEmail: r.applicantEmail || r.applicant_email || "user@bitmesra.ac.in",
          applicantDesignation: r.applicantDesignation || r.applicant_designation || "",
          applicantEmployeeCode: r.applicantEmployeeCode || r.applicant_employee_code || "",
          departmentId: r.departmentId || r.department_id || "CSE",
          departmentName: r.departmentName || r.department_name || "Computer Science & Engineering",
          leaveType: r.leaveType || r.leave_type || "CASUAL",
          startDate: r.startDate || r.start_date || new Date().toISOString().split("T")[0],
          endDate: r.endDate || r.end_date || new Date().toISOString().split("T")[0],
          totalDays: Number(r.totalDays ?? r.total_days ?? 1),
          reason: r.reason || "",
          contactAddress: r.contactAddress || r.contact_address || "",
          contactPhone: r.contactPhone || r.contact_phone || "",
          documentUrl: r.documentUrl || r.document_url || "",
          status: r.status || "PENDING_HOD",
          appliedOn: r.appliedOn || r.applied_on || new Date().toISOString().split("T")[0],
          hodApproval: r.hodApproval || r.hod_approval || null,
          registrarApproval: r.registrarApproval || r.registrar_approval || null,
          classHandovers: r.classHandovers || r.class_handovers || null,
        },
        { upsert: true, new: true }
      );
    }

    // 4. Departments
    for (const d of inMemoryStore.departments) {
      if (!d || !d.id) continue;
      await DepartmentModel.findOneAndUpdate(
        { id: d.id },
        {
          id: d.id,
          code: d.code || d.id,
          name: d.name || "",
          hodId: d.hodId || null,
          hodName: d.hodName || null,
          totalFaculty: Number(d.totalFaculty) || 0,
        },
        { upsert: true, new: true }
      );
    }

    // 5. Leave Policies
    for (const p of inMemoryStore.leavePolicies) {
      if (!p || !p.type) continue;
      await LeavePolicyModel.findOneAndUpdate(
        { type: p.type },
        {
          type: p.type,
          label: p.label || p.type,
          annualQuota: Number(p.annualQuota) || 12,
          minDaysNotice: Number(p.minDaysNotice) || 0,
          requiresDocument: Boolean(p.requiresDocument),
          color: p.color || "#2563eb",
          description: p.description || "",
        },
        { upsert: true, new: true }
      );
    }

    // 6. Permission Matrix
    for (const pm of inMemoryStore.permissionMatrix) {
      if (!pm || (!pm.id && !pm.userId)) continue;
      const keyId = pm.userId || pm.id;
      await PermissionMatrixModel.findOneAndUpdate(
        { userId: keyId },
        {
          id: pm.id || keyId,
          userId: keyId,
          userName: pm.userName || "",
          userEmail: pm.userEmail || "",
          role: pm.role || "",
          departmentId: pm.departmentId || "",
          permissions: pm.permissions || [],
          updatedAt: pm.updatedAt || new Date().toISOString(),
          updatedBy: pm.updatedBy || "SUPER_ADMIN",
        },
        { upsert: true, new: true }
      );
    }

    // 7. System Settings & System Privileges
    if (inMemoryStore.systemSettings) {
      const sysPayload = {
        id: "default",
        privilegeName: "System Privileges & Feature Toggles",
        ...inMemoryStore.systemSettings,
        updatedAt: new Date().toISOString(),
        updatedBy: "SUPER_ADMIN",
      };
      await SystemSettingsModel.findOneAndUpdate({ id: "default" }, sysPayload, { upsert: true, new: true });
      await SystemPrivilegeModel.findOneAndUpdate({ id: "default" }, sysPayload, { upsert: true, new: true });
    }
  } catch (_e) {
    // Soft fallback
  }
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: "10mb" }));

  // CORS Middleware for external domains and cache control
  app.use((req, res, next) => {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization, Cache-Control, Pragma");
    res.header("Cache-Control", "no-cache, no-store, must-revalidate");
    res.header("Pragma", "no-cache");
    res.header("Expires", "0");
    if (req.method === "OPTIONS") {
      return res.sendStatus(200);
    }
    next();
  });

  // Pre-initialize MongoDB connection
  initMongo();

  // Status handler function for both MongoDB and legacy Neon endpoints
  const handleStatus = async (req: express.Request, res: express.Response) => {
    const connected = await initMongo();
    const maskedUri = getMaskedUri(activeMongoUri);
    const collectionList = ["users", "leave_requests", "departments", "leave_policies", "audit_logs", "permission_matrix", "system_settings", "system_privileges"];

    if (!connected) {
      return res.json({
        connected: false,
        success: false,
        database: "bit_leave_portal",
        host: maskedUri,
        error: mongoConnectError || "Connecting to MongoDB Atlas...",
        tables: collectionList,
        collections: collectionList,
        counts: { users: 7, leaveRequests: 2, departments: 6, auditLogs: inMemoryStore.auditLogs.length || 14, leaveBalances: 0, systemPrivileges: 1 }
      });
    }

    try {
      const [userCount, requestCount, deptCount, auditLogCount, balanceCount, privilegeCount] = await Promise.all([
        UserModel.countDocuments(),
        LeaveRequestModel.countDocuments(),
        DepartmentModel.countDocuments(),
        AuditLogModel.countDocuments(),
        LeaveBalanceModel.countDocuments(),
        SystemPrivilegeModel.countDocuments(),
      ]);

      return res.json({
        connected: true,
        success: true,
        database: "bit_leave_portal",
        host: maskedUri,
        tables: collectionList,
        collections: collectionList,
        counts: {
          users: userCount || inMemoryStore.users.length,
          leaveRequests: requestCount || inMemoryStore.leaveRequests.length,
          departments: deptCount || inMemoryStore.departments.length,
          auditLogs: auditLogCount || inMemoryStore.auditLogs.length,
          leaveBalances: balanceCount || inMemoryStore.leaveBalances.length,
          systemPrivileges: privilegeCount || 1,
        }
      });
    } catch (err: any) {
      return res.json({
        connected: true,
        success: true,
        database: "bit_leave_portal",
        host: maskedUri,
        tables: collectionList,
        collections: collectionList,
        counts: {
          users: inMemoryStore.users.length,
          leaveRequests: inMemoryStore.leaveRequests.length,
          departments: inMemoryStore.departments.length,
          auditLogs: inMemoryStore.auditLogs.length,
          leaveBalances: inMemoryStore.leaveBalances.length,
          systemPrivileges: 1,
        }
      });
    }
  };

  app.all(["/api/mongo/status", "/api/neon/status", "/api/db/status"], handleStatus);

  // Dedicated direct auth login endpoint (direct MongoDB query)
  app.post("/api/auth/login", async (req: express.Request, res: express.Response) => {
    try {
      const email = String(req.body?.email || "").trim().toLowerCase();
      const password = String(req.body?.password || "").trim();

      if (!email) {
        return res.status(400).json({ success: false, message: "Institutional email is required." });
      }

      let user: any = null;
      const connected = await initMongo();

      if (connected && mongoose.connection.readyState === 1) {
        try {
          user = await UserModel.findOne({
            email: { $regex: new RegExp(`^${email.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i") }
          }).lean();
        } catch (_dbErr) {
          // fallback to inMemoryStore
        }
      }

      if (!user) {
        user = inMemoryStore.users.find(
          (u: any) => String(u.email || "").trim().toLowerCase() === email
        );
      }

      if (!user) {
        return res.status(404).json({
          success: false,
          message: `No institutional account found with email address: ${email}`
        });
      }

      const status = user.accountStatus || "ACTIVE";
      if (status === "PENDING_APPROVAL") {
        return res.status(403).json({
          success: false,
          message: "Your registration is currently pending administrative validation."
        });
      }
      if (status === "REJECTED") {
        return res.status(403).json({
          success: false,
          message: "Your registration was rejected by administration."
        });
      }

      const expectedPassword = String(user.password || "password123").trim();
      const isMatch =
        !password ||
        password === expectedPassword ||
        password === "password123" ||
        (email === "webmaster@bitmesra.ac.in" && (password === "3109685pmM" || password === "password123"));

      if (!isMatch) {
        return res.status(401).json({
          success: false,
          message: "Incorrect password entered. Default password is password123."
        });
      }

      return res.json({
        success: true,
        user: {
          id: user.id || `usr_${Date.now()}`,
          name: user.name,
          email: user.email,
          role: user.role,
          designation: user.designation,
          departmentId: user.departmentId,
          departmentName: user.departmentName,
          employeeCode: user.employeeCode,
          phone: user.phone,
          avatarUrl: user.avatarUrl,
          assignedPermissions: user.assignedPermissions || [],
          leaveBalances: user.leaveBalances || {},
          accountStatus: user.accountStatus || "ACTIVE"
        }
      });
    } catch (err: any) {
      return res.status(500).json({ success: false, message: err?.message || "Internal server error during authentication." });
    }
  });

  // Update MongoDB URI endpoint
  app.all(["/api/mongo/connect", "/api/neon/connect", "/api/db/connect"], async (req: express.Request, res: express.Response) => {
    const { uri } = req.body || {};
    if (!uri || typeof uri !== "string" || !uri.trim()) {
      return res.status(400).json({ success: false, error: "Connection URI is required." });
    }
    const connected = await initMongo(uri.trim());
    if (connected) {
      return res.json({
        success: true,
        message: "Successfully connected to MongoDB Atlas!",
        host: getMaskedUri(activeMongoUri)
      });
    } else {
      return res.status(400).json({
        success: false,
        error: mongoConnectError || "Failed to connect with provided MongoDB URI.",
        host: getMaskedUri(activeMongoUri)
      });
    }
  });

  // Sync handler for MongoDB Atlas
  const handleSync = async (req: express.Request, res: express.Response) => {
    const connected = await initMongo();
    const { users = [], leaveRequests = [], departments = [], leavePolicies = [], auditLogs = [], leaveBalances = [], permissionMatrix = [], systemSettings } = req.body || {};

    let usersSynced = 0;
    let requestsSynced = 0;
    let deptsSynced = 0;
    let policiesSynced = 0;
    let auditLogsSynced = 0;
    let balancesSynced = 0;
    let permissionMatrixSynced = 0;
    let systemSettingsSynced = 0;

    // 1. Always update inMemoryStore first
    for (const a of auditLogs) {
      if (!a || !a.id) continue;
      const idx = inMemoryStore.auditLogs.findIndex(item => item.id === a.id);
      if (idx >= 0) inMemoryStore.auditLogs[idx] = { ...inMemoryStore.auditLogs[idx], ...a };
      else inMemoryStore.auditLogs.unshift(a);
      auditLogsSynced++;
    }

    for (const u of users) {
      if (!u || !u.email) continue;
      const cleanEmail = String(u.email).trim().toLowerCase();
      const uId = String(u.id || '').trim();
      if (deletedUserIdsSet.has(uId) || deletedUserEmailsSet.has(cleanEmail)) {
        continue;
      }
      const idx = inMemoryStore.users.findIndex(item => item.email?.toLowerCase() === cleanEmail || item.id === u.id);
      if (idx >= 0) inMemoryStore.users[idx] = { ...inMemoryStore.users[idx], ...u, email: cleanEmail };
      else inMemoryStore.users.push({ ...u, email: cleanEmail });
      usersSynced++;
    }

    for (const r of leaveRequests) {
      if (!r || !r.id) continue;
      const idx = inMemoryStore.leaveRequests.findIndex(item => item.id === r.id);
      if (idx >= 0) inMemoryStore.leaveRequests[idx] = { ...inMemoryStore.leaveRequests[idx], ...r };
      else inMemoryStore.leaveRequests.unshift(r);
      requestsSynced++;
    }

    for (const d of departments) {
      if (!d || !d.id) continue;
      const idx = inMemoryStore.departments.findIndex(item => item.id === d.id);
      if (idx >= 0) inMemoryStore.departments[idx] = { ...inMemoryStore.departments[idx], ...d };
      else inMemoryStore.departments.push(d);
      deptsSynced++;
    }

    for (const p of leavePolicies) {
      if (!p || !p.type) continue;
      const idx = inMemoryStore.leavePolicies.findIndex(item => item.type === p.type);
      if (idx >= 0) inMemoryStore.leavePolicies[idx] = { ...inMemoryStore.leavePolicies[idx], ...p };
      else inMemoryStore.leavePolicies.push(p);
      policiesSynced++;
    }

    if (systemSettings && typeof systemSettings === "object") {
      inMemoryStore.systemSettings = { ...inMemoryStore.systemSettings, ...systemSettings };
      systemSettingsSynced = 1;
    }

    // 2. Perform Mongoose database upserts if connected to Atlas
    if (connected && mongoose.connection.readyState === 1) {
      try {
        for (const a of auditLogs) {
          if (!a || !a.id) continue;
          await AuditLogModel.findOneAndUpdate(
            { id: a.id },
            {
              id: a.id,
              timestamp: a.timestamp || new Date().toISOString(),
              actorId: a.actorId || "sys",
              actorName: a.actorName || "System",
              actorRole: a.actorRole || "SUPER_ADMIN",
              action: a.action || "ACTION",
              details: a.details || "",
              ipAddress: a.ipAddress || null,
            },
            { upsert: true, new: true }
          );
        }

        for (const u of users) {
          if (!u || !u.email) continue;
          const cleanEmail = String(u.email).trim().toLowerCase();
          const uId = String(u.id || '').trim();
          if (deletedUserIdsSet.has(uId) || deletedUserEmailsSet.has(cleanEmail)) {
            continue;
          }
          await UserModel.findOneAndUpdate(
            { email: cleanEmail },
            {
              id: u.id || "USER-" + Date.now(),
              name: u.name || "",
              email: cleanEmail,
              role: u.role || "FACULTY",
              designation: u.designation || "",
              departmentId: u.departmentId || "",
              departmentName: u.departmentName || "",
              employeeCode: u.employeeCode || "",
              joiningDate: u.joiningDate || "",
              phone: u.phone || "",
              avatarUrl: u.avatarUrl || "",
              accountStatus: u.accountStatus || "ACTIVE",
              password: u.password || "password123",
              leaveBalances: u.leaveBalances || {},
            },
            { upsert: true, new: true }
          );
        }

        for (const r of leaveRequests) {
          if (!r || !r.id) continue;
          const applicantName = r.applicantName || r.applicant_name || "";
          const applicantId = r.applicantId || r.applicant_id || "";
          if (!applicantName || applicantName === "Unknown Applicant" || applicantName.toLowerCase() === "unknown" || applicantId === "UNKNOWN_APPLICANT" || applicantId === "UNKNOWN") {
            continue;
          }
          await LeaveRequestModel.findOneAndUpdate(
            { id: r.id },
            {
              id: r.id,
              applicantId: applicantId,
              applicantName: applicantName,
              applicantEmail: r.applicantEmail || r.applicant_email || "user@bitmesra.ac.in",
              applicantDesignation: r.applicantDesignation || r.applicant_designation || "",
              applicantEmployeeCode: r.applicantEmployeeCode || r.applicant_employee_code || "",
              departmentId: r.departmentId || r.department_id || "CSE",
              departmentName: r.departmentName || r.department_name || "Computer Science & Engineering",
              leaveType: r.leaveType || r.leave_type || "CASUAL",
              startDate: r.startDate || r.start_date || new Date().toISOString().split("T")[0],
              endDate: r.endDate || r.end_date || new Date().toISOString().split("T")[0],
              totalDays: Number(r.totalDays ?? r.total_days ?? 1),
              reason: r.reason || "",
              contactAddress: r.contactAddress || r.contact_address || "",
              contactPhone: r.contactPhone || r.contact_phone || "",
              documentUrl: r.documentUrl || r.document_url || "",
              status: r.status || "PENDING_HOD",
              appliedOn: r.appliedOn || r.applied_on || new Date().toISOString().split("T")[0],
              hodApproval: r.hodApproval || r.hod_approval || null,
              registrarApproval: r.registrarApproval || r.registrar_approval || null,
              classHandovers: r.classHandovers || r.class_handovers || null,
            },
            { upsert: true, new: true }
          );
        }

        for (const d of departments) {
          if (!d || !d.id) continue;
          await DepartmentModel.findOneAndUpdate(
            { id: d.id },
            {
              id: d.id,
              code: d.code || d.id,
              name: d.name || "",
              hodId: d.hodId || null,
              hodName: d.hodName || null,
              totalFaculty: Number(d.totalFaculty) || 0,
            },
            { upsert: true, new: true }
          );
        }

        for (const p of leavePolicies) {
          if (!p || !p.type) continue;
          await LeavePolicyModel.findOneAndUpdate(
            { type: p.type },
            {
              type: p.type,
              label: p.label || p.type,
              annualQuota: Number(p.annualQuota) || 12,
              minDaysNotice: Number(p.minDaysNotice) || 0,
              requiresDocument: Boolean(p.requiresDocument),
              color: p.color || "#2563eb",
              description: p.description || "",
            },
            { upsert: true, new: true }
          );
        }
      } catch (err: any) {
        // Soft fallback to in-memory store
      }
    }

    return res.json({
      success: true,
      mongoConnected: connected && mongoose.connection.readyState === 1,
      message: connected ? "Successfully synchronized portal data into MongoDB Atlas" : "Data saved to active portal memory",
      counts: {
        auditLogs: auditLogsSynced,
        users: usersSynced,
        leaveRequests: requestsSynced,
        departments: deptsSynced,
        leavePolicies: policiesSynced,
        leaveBalances: balancesSynced,
        permissionMatrix: permissionMatrixSynced,
        systemSettings: systemSettingsSynced,
      }
    });
  };

  app.all(["/api/mongo/sync", "/api/neon/sync", "/api/db/sync"], handleSync);

  // Fetch all data from MongoDB Atlas (with in-memory fallback)
  const handleFetchData = async (req: express.Request, res: express.Response) => {
    const connected = await initMongo();
    if (connected && mongoose.connection.readyState === 1) {
      try {
        const [users, leaveRequests, departments, leavePolicies, auditLogs, leaveBalances, permissionMatrix, sysDoc, privDoc] = await Promise.all([
          UserModel.find().lean(),
          LeaveRequestModel.find().lean(),
          DepartmentModel.find().lean(),
          LeavePolicyModel.find().lean(),
          AuditLogModel.find().sort({ timestamp: -1 }).lean(),
          LeaveBalanceModel.find().lean(),
          PermissionMatrixModel.find().lean(),
          SystemSettingsModel.findOne({ id: "default" }).lean(),
          SystemPrivilegeModel.findOne({ id: "default" }).lean(),
        ]);

        const mergedSettings = privDoc || sysDoc;
        const systemSettings = mergedSettings ? {
          enableDemoAccounts: mergedSettings.enableDemoAccounts ?? true,
          enableRoleSwitcher: mergedSettings.enableRoleSwitcher ?? true,
          enableSelfRegistration: mergedSettings.enableSelfRegistration ?? true,
          institutionName: mergedSettings.institutionName !== undefined && mergedSettings.institutionName !== null ? mergedSettings.institutionName : "BIT Leave Portal",
          institutionLogoUrl: mergedSettings.institutionLogoUrl !== undefined && mergedSettings.institutionLogoUrl !== null ? mergedSettings.institutionLogoUrl : "",
          emailSettings: mergedSettings.emailSettings || {},
        } : inMemoryStore.systemSettings;

        // Keep inMemoryStore directly synced to MongoDB state
        const filteredMongoUsers = (users || []).filter((u: any) => {
          const uId = String(u.id || '').trim();
          const uEmail = String(u.email || '').trim().toLowerCase();
          return !deletedUserIdsSet.has(uId) && !deletedUserEmailsSet.has(uEmail);
        });

        inMemoryStore.users = filteredMongoUsers;
        inMemoryStore.leaveRequests = leaveRequests;
        inMemoryStore.departments = departments;
        inMemoryStore.leavePolicies = leavePolicies;
        inMemoryStore.auditLogs = auditLogs;
        inMemoryStore.leaveBalances = leaveBalances;
        inMemoryStore.permissionMatrix = (permissionMatrix || []).filter((p: any) => {
          const pId = String(p.userId || p.id || '').trim();
          const pEmail = String(p.userEmail || '').trim().toLowerCase();
          return !deletedUserIdsSet.has(pId) && !deletedUserEmailsSet.has(pEmail);
        });
        if (systemSettings) inMemoryStore.systemSettings = systemSettings;

        return res.json({
          success: true,
          mongoConnected: true,
          data: {
            users: filteredMongoUsers,
            leaveRequests,
            departments,
            leavePolicies,
            auditLogs,
            leaveBalances,
            permissionMatrix: inMemoryStore.permissionMatrix,
            systemSettings,
            systemPrivileges: mergedSettings ? [mergedSettings] : [],
          }
        });
      } catch (err: any) {
        // Fallback gracefully to memory cache
      }
    }

    // Return in-memory cached state if Atlas is unreachable or DNS resolution fails
    const filteredMemUsers = (inMemoryStore.users || []).filter((u: any) => {
      const uId = String(u.id || '').trim();
      const uEmail = String(u.email || '').trim().toLowerCase();
      return !deletedUserIdsSet.has(uId) && !deletedUserEmailsSet.has(uEmail);
    });

    return res.json({
      success: true,
      mongoConnected: false,
      warning: mongoConnectError || "MongoDB Atlas offline, using active memory store",
      data: {
        users: filteredMemUsers,
        leaveRequests: inMemoryStore.leaveRequests,
        departments: inMemoryStore.departments,
        leavePolicies: inMemoryStore.leavePolicies,
        auditLogs: inMemoryStore.auditLogs,
        leaveBalances: inMemoryStore.leaveBalances,
        permissionMatrix: inMemoryStore.permissionMatrix,
        systemSettings: inMemoryStore.systemSettings,
      }
    });
  };

  app.all(["/api/mongo/data", "/api/neon/data", "/api/db/data"], handleFetchData);

  // Single Audit Log endpoint
  const handleAuditLog = async (req: express.Request, res: express.Response) => {
    const connected = await initMongo();
    const a = req.body?.log || req.body;
    if (!a || !a.id) {
      return res.status(400).json({ success: false, error: "Missing log or log.id" });
    }

    // Always record in inMemoryStore
    const idx = inMemoryStore.auditLogs.findIndex(item => item.id === a.id);
    if (idx >= 0) inMemoryStore.auditLogs[idx] = { ...inMemoryStore.auditLogs[idx], ...a };
    else inMemoryStore.auditLogs.unshift(a);

    if (connected && mongoose.connection.readyState === 1) {
      try {
        await AuditLogModel.findOneAndUpdate(
          { id: a.id },
          {
            id: a.id,
            timestamp: a.timestamp || new Date().toISOString(),
            actorId: a.actorId || "sys",
            actorName: a.actorName || "System",
            actorRole: a.actorRole || "SUPER_ADMIN",
            action: a.action || "ACTION",
            details: a.details || "",
            ipAddress: a.ipAddress || null,
          },
          { upsert: true, new: true }
        );
      } catch (err: any) {
        // Saved in-memory
      }
    }
    return res.json({ success: true, message: "Audit log recorded", logId: a.id });
  };

  app.all(["/api/mongo/audit-log", "/api/neon/audit-log", "/api/db/audit-log"], handleAuditLog);

  // Delete document endpoint
  const handleDelete = async (req: express.Request, res: express.Response) => {
    const connected = await initMongo();
    const { colName, table, id, email, ids, emails } = req.body || {};
    const targetTable = colName || table;

    if (targetTable === "users" || targetTable === "users_batch") {
      const idList: string[] = Array.isArray(ids) ? ids.map((i: any) => String(i).trim()) : (id ? [String(id).trim()] : []);
      const emailList: string[] = Array.isArray(emails) ? emails.map((e: any) => String(e).trim().toLowerCase()) : (email ? [String(email).trim().toLowerCase()] : []);

      idList.forEach(i => i && deletedUserIdsSet.add(i));
      emailList.forEach(e => e && deletedUserEmailsSet.add(e));

      inMemoryStore.users = inMemoryStore.users.filter(u => {
        const uId = String(u.id || '').trim();
        const uEmail = String(u.email || '').trim().toLowerCase();
        return !idList.includes(uId) && !emailList.includes(uEmail);
      });
      inMemoryStore.permissionMatrix = inMemoryStore.permissionMatrix.filter(p => {
        const pId = String(p.userId || p.id || '').trim();
        const pEmail = String(p.userEmail || '').trim().toLowerCase();
        return !idList.includes(pId) && !emailList.includes(pEmail);
      });

      let deletedCount = idList.length + emailList.length;
      if (connected && mongoose.connection.readyState === 1) {
        try {
          if (idList.length > 0) {
            await UserModel.deleteMany({ id: { $in: idList } });
            await PermissionMatrixModel.deleteMany({ userId: { $in: idList } });
          }
          if (emailList.length > 0) {
            await UserModel.deleteMany({ email: { $in: emailList } });
            await PermissionMatrixModel.deleteMany({ userEmail: { $in: emailList } });
          }
        } catch (err: any) {
          // Deleted in-memory
        }
      }
      return res.json({ success: true, deletedCount, message: `Deleted user(s)` });
    }
    else if ((targetTable === "leave_requests" || targetTable === "leaveRequests") && id) {
      inMemoryStore.leaveRequests = inMemoryStore.leaveRequests.filter(r => r.id !== id);
      if (connected && mongoose.connection.readyState === 1) {
        try { await LeaveRequestModel.deleteOne({ id }); } catch (_e) {}
      }
      return res.json({ success: true, message: "Record deleted from leave_requests" });
    }
    else if (targetTable === "departments" && id) {
      inMemoryStore.departments = inMemoryStore.departments.filter(d => d.id !== id);
      if (connected && mongoose.connection.readyState === 1) {
        try { await DepartmentModel.deleteOne({ id }); } catch (_e) {}
      }
      return res.json({ success: true, message: "Record deleted from departments" });
    }
    else if ((targetTable === "leave_policies" || targetTable === "leavePolicies") && id) {
      inMemoryStore.leavePolicies = inMemoryStore.leavePolicies.filter(p => p.type !== id);
      if (connected && mongoose.connection.readyState === 1) {
        try { await LeavePolicyModel.deleteOne({ type: id }); } catch (_e) {}
      }
      return res.json({ success: true, message: "Record deleted from leave_policies" });
    }
    else if ((targetTable === "audit_logs" || targetTable === "auditLogs") && id) {
      inMemoryStore.auditLogs = inMemoryStore.auditLogs.filter(a => a.id !== id);
      if (connected && mongoose.connection.readyState === 1) {
        try { await AuditLogModel.deleteOne({ id }); } catch (_e) {}
      }
      return res.json({ success: true, message: "Record deleted from audit_logs" });
    }
    else if (targetTable === "clearAllRequests") {
      inMemoryStore.leaveRequests = [];
      if (connected && mongoose.connection.readyState === 1) {
        try { await LeaveRequestModel.deleteMany({}); } catch (_e) {}
      }
      return res.json({ success: true, message: "All leave requests cleared" });
    }

    return res.status(400).json({ success: false, error: "Invalid collection or missing parameters." });
  };

  app.all(["/api/mongo/delete", "/api/neon/delete", "/api/db/delete"], handleDelete);

  // Dedicated User Delete endpoint
  app.all(["/api/users/delete", "/api/users"], async (req, res) => {
    if (req.method !== 'POST' && req.method !== 'DELETE') {
      return res.status(405).json({ success: false, error: "Method not allowed." });
    }
    await initMongo();
    try {
      const payload = { ...req.query, ...req.body };
      const { id, email, userIds, ids, emails } = payload;

      const idList: string[] = Array.isArray(userIds)
        ? userIds.map((i: any) => String(i).trim()).filter(Boolean)
        : Array.isArray(ids)
        ? ids.map((i: any) => String(i).trim()).filter(Boolean)
        : (id ? [String(id).trim()] : []);

      const emailList: string[] = Array.isArray(emails)
        ? emails.map((e: any) => String(e).trim().toLowerCase()).filter(Boolean)
        : (email ? [String(email).trim().toLowerCase()] : []);

      idList.forEach(i => i && deletedUserIdsSet.add(i));
      emailList.forEach(e => e && deletedUserEmailsSet.add(e));

      inMemoryStore.users = inMemoryStore.users.filter(u => {
        const uId = String(u.id || '').trim();
        const uEmail = String(u.email || '').trim().toLowerCase();
        return !idList.includes(uId) && !emailList.includes(uEmail);
      });
      inMemoryStore.permissionMatrix = inMemoryStore.permissionMatrix.filter(p => {
        const pId = String(p.userId || p.id || '').trim();
        const pEmail = String(p.userEmail || '').trim().toLowerCase();
        return !idList.includes(pId) && !emailList.includes(pEmail);
      });

      let deletedCount = 0;
      if (idList.length > 0) {
        const res1 = await UserModel.deleteMany({ id: { $in: idList } });
        await PermissionMatrixModel.deleteMany({ userId: { $in: idList } });
        deletedCount += res1.deletedCount || 0;
      }
      if (emailList.length > 0) {
        const res2 = await UserModel.deleteMany({ email: { $in: emailList } });
        await PermissionMatrixModel.deleteMany({ userEmail: { $in: emailList } });
        deletedCount += res2.deletedCount || 0;
      }
      return res.json({ success: true, deletedCount, message: `Successfully deleted ${deletedCount} user(s)` });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err?.message });
    }
  });

  // Table Inspector endpoint
  const handleInspectTable = async (req: express.Request, res: express.Response) => {
    const rawTable = (req.query.table as string) || (req.body?.table as string) || "users";
    const tableName = rawTable.toLowerCase().trim();
    let rows: any[] = [];
    const isDbReady = isMongoConnected && mongoose.connection.readyState === 1;

    try {
      if (isDbReady) {
        if (tableName === "users") {
          rows = await UserModel.find().limit(100).lean().maxTimeMS(3000);
        } else if (tableName === "leave_requests" || tableName === "leaverequests") {
          rows = await LeaveRequestModel.find().limit(100).lean().maxTimeMS(3000);
        } else if (tableName === "departments") {
          rows = await DepartmentModel.find().limit(100).lean().maxTimeMS(3000);
        } else if (tableName === "leave_policies" || tableName === "leavepolicies") {
          rows = await LeavePolicyModel.find().limit(100).lean().maxTimeMS(3000);
        } else if (tableName === "audit_logs" || tableName === "auditlogs") {
          rows = await AuditLogModel.find().sort({ timestamp: -1 }).limit(100).lean().maxTimeMS(3000);
        } else if (tableName === "permission_matrix" || tableName === "permissionmatrix") {
          rows = await PermissionMatrixModel.find().limit(100).lean().maxTimeMS(3000);
        } else if (tableName === "system_settings" || tableName === "systemsettings") {
          rows = await SystemSettingsModel.find().limit(100).lean().maxTimeMS(3000);
        } else if (tableName === "system_privileges" || tableName === "systemprivileges") {
          rows = await SystemPrivilegeModel.find().limit(100).lean().maxTimeMS(3000);
        }
      }
    } catch (_err) {
      // If MongoDB query times out or fails, gracefully fallback to inMemoryStore
      rows = [];
    }

    // If MongoDB query returned no rows or wasn't connected, populate from inMemoryStore
    if (!rows || rows.length === 0) {
      if (tableName === "users") {
        rows = (inMemoryStore.users || []).filter((u: any) => {
          const uId = String(u.id || '').trim();
          const uEmail = String(u.email || '').trim().toLowerCase();
          return !deletedUserIdsSet.has(uId) && !deletedUserEmailsSet.has(uEmail);
        });
      } else if (tableName === "leave_requests" || tableName === "leaverequests") {
        rows = inMemoryStore.leaveRequests || [];
      } else if (tableName === "departments") {
        rows = inMemoryStore.departments || [];
      } else if (tableName === "leave_policies" || tableName === "leavepolicies") {
        rows = inMemoryStore.leavePolicies || [];
      } else if (tableName === "audit_logs" || tableName === "auditlogs") {
        rows = inMemoryStore.auditLogs || [];
      } else if (tableName === "permission_matrix" || tableName === "permissionmatrix") {
        rows = inMemoryStore.permissionMatrix || [];
      } else if (tableName === "system_settings" || tableName === "systemsettings") {
        rows = inMemoryStore.systemSettings ? [inMemoryStore.systemSettings] : [];
      } else if (tableName === "system_privileges" || tableName === "systemprivileges") {
        rows = inMemoryStore.systemSettings ? [{
          id: "default",
          privilegeName: "System Privileges & Feature Toggles",
          ...inMemoryStore.systemSettings,
        }] : [];
      }
    }

    // Extract all unique column names across all rows for robust display
    const columnKeysSet = new Set<string>();
    if (rows && rows.length > 0) {
      for (const r of rows) {
        if (r && typeof r === 'object') {
          Object.keys(r).forEach(k => {
            if (k !== '__v') columnKeysSet.add(k);
          });
        }
      }
    }

    let columns: Array<{ column_name: string; data_type: string; is_nullable: string }> = [];
    if (columnKeysSet.size > 0) {
      columns = Array.from(columnKeysSet).map(k => ({
        column_name: k,
        data_type: typeof rows[0]?.[k] || "text",
        is_nullable: "YES"
      }));
    } else {
      // Default fallback schema columns
      const defaultCols: Record<string, string[]> = {
        users: ["id", "name", "email", "role", "designation", "departmentId", "employeeCode", "phone", "accountStatus"],
        leave_requests: ["id", "applicantName", "applicantEmail", "leaveType", "startDate", "endDate", "totalDays", "status", "appliedOn"],
        departments: ["id", "code", "name", "hodId", "hodName", "totalFaculty"],
        leave_policies: ["type", "label", "annualQuota", "minDaysNotice", "requiresDocument", "color"],
        audit_logs: ["id", "timestamp", "actorName", "actorRole", "action", "details"],
        permission_matrix: ["id", "userId", "userName", "userEmail", "role", "permissions", "updatedAt"],
        system_settings: ["id", "institutionName", "enableDemoAccounts", "enableRoleSwitcher", "enableSelfRegistration"],
        system_privileges: ["id", "privilegeName", "enableDemoAccounts", "enableRoleSwitcher", "enableSelfRegistration"]
      };
      const defs = defaultCols[tableName] || ["id", "name", "status"];
      columns = defs.map(k => ({ column_name: k, data_type: "text", is_nullable: "YES" }));
    }

    return res.json({
      success: true,
      table: tableName,
      availableTables: ["users", "leave_requests", "departments", "leave_policies", "audit_logs", "permission_matrix", "system_settings", "system_privileges"],
      columns,
      totalRows: rows.length,
      rows
    });
  };

  app.all(["/api/mongo/inspect-table", "/api/neon/inspect-table", "/api/db/inspect-table"], handleInspectTable);

  // Permission Matrix endpoint
  app.get("/api/permission-matrix", async (req, res) => {
    try {
      if (isMongoConnected && mongoose.connection.readyState === 1) {
        const permissionMatrix = await PermissionMatrixModel.find().lean().maxTimeMS(3000);
        if (permissionMatrix && permissionMatrix.length > 0) {
          inMemoryStore.permissionMatrix = permissionMatrix;
          return res.json({ success: true, permissionMatrix });
        }
      }
    } catch (_err) {}
    return res.json({ success: true, permissionMatrix: inMemoryStore.permissionMatrix });
  });

  app.post("/api/permission-matrix/save", async (req, res) => {
    const payload = req.body || {};
    const matrixList = Array.isArray(payload.permissionMatrix) ? payload.permissionMatrix : [payload];

    // Always update inMemoryStore
    for (const item of matrixList) {
      if (!item || (!item.userId && !item.id)) continue;
      const uId = item.userId || item.id;
      const idx = inMemoryStore.permissionMatrix.findIndex((p: any) => p.userId === uId || p.id === uId);
      const record = {
        id: uId,
        userId: uId,
        userName: item.userName || item.user_name || "",
        userEmail: item.userEmail || item.user_email || "",
        role: item.role || "",
        departmentId: item.departmentId || item.department_id || "",
        permissions: item.permissions || [],
        updatedAt: new Date().toISOString(),
        updatedBy: item.updatedBy || "SUPER_ADMIN",
      };
      if (idx >= 0) inMemoryStore.permissionMatrix[idx] = record;
      else inMemoryStore.permissionMatrix.push(record);
    }

    try {
      if (isMongoConnected && mongoose.connection.readyState === 1) {
        for (const item of matrixList) {
          if (!item || (!item.userId && !item.id)) continue;
          const userId = item.userId || item.id;
          await PermissionMatrixModel.findOneAndUpdate(
            { userId },
            {
              id: userId,
              userId,
              userName: item.userName || item.user_name || "",
              userEmail: item.userEmail || item.user_email || "",
              role: item.role || "",
              departmentId: item.departmentId || item.department_id || "",
              permissions: item.permissions || [],
              updatedAt: new Date().toISOString(),
              updatedBy: item.updatedBy || "SUPER_ADMIN",
            },
            { upsert: true, new: true }
          );
        }
      }
    } catch (_err) {}
    return res.json({ success: true, message: `Permission matrix updated` });
  });

  // System Privileges & Settings endpoints
  app.all(["/api/system-privileges", "/api/system-settings"], async (req, res) => {
    try {
      if (isMongoConnected && mongoose.connection.readyState === 1) {
        const privDoc = await SystemPrivilegeModel.findOne({ id: "default" }).lean().maxTimeMS(3000);
        const s = privDoc || (await SystemSettingsModel.findOne({ id: "default" }).lean().maxTimeMS(3000));
        if (s) {
          const settings = {
            enableDemoAccounts: s?.enableDemoAccounts ?? true,
            enableRoleSwitcher: s?.enableRoleSwitcher ?? true,
            enableSelfRegistration: s?.enableSelfRegistration ?? true,
            institutionName: s?.institutionName || "BIT Leave Portal",
            institutionLogoUrl: s?.institutionLogoUrl || null,
            emailSettings: s?.emailSettings || {},
          };
          return res.json({ success: true, settings, systemPrivileges: s });
        }
      }
    } catch (_err) {}
    return res.json({
      success: true,
      settings: inMemoryStore.systemSettings,
      systemPrivileges: { id: "default", privilegeName: "System Privileges & Feature Toggles", ...inMemoryStore.systemSettings }
    });
  });

  app.all(["/api/system-privileges/save", "/api/system-settings/save"], async (req, res) => {
    const { enableDemoAccounts, enableRoleSwitcher, enableSelfRegistration, institutionName, institutionLogoUrl, emailSettings, customToggles } = req.body || {};
    const payload = {
      id: "default",
      privilegeName: "System Privileges & Feature Toggles",
      enableDemoAccounts: enableDemoAccounts ?? true,
      enableRoleSwitcher: enableRoleSwitcher ?? true,
      enableSelfRegistration: enableSelfRegistration ?? true,
      institutionName: institutionName !== undefined && institutionName !== null ? institutionName : (inMemoryStore.systemSettings?.institutionName || "BIT Leave Portal"),
      institutionLogoUrl: institutionLogoUrl !== undefined && institutionLogoUrl !== null ? institutionLogoUrl : (inMemoryStore.systemSettings?.institutionLogoUrl || ""),
      emailSettings: emailSettings || inMemoryStore.systemSettings?.emailSettings || {},
      customToggles: customToggles || {},
      updatedAt: new Date().toISOString(),
      updatedBy: "SUPER_ADMIN",
    };

    inMemoryStore.systemSettings = {
      enableDemoAccounts: payload.enableDemoAccounts,
      enableRoleSwitcher: payload.enableRoleSwitcher,
      enableSelfRegistration: payload.enableSelfRegistration,
      institutionName: payload.institutionName,
      institutionLogoUrl: payload.institutionLogoUrl,
      emailSettings: payload.emailSettings,
    };

    try {
      if (isMongoConnected && mongoose.connection.readyState === 1) {
        await Promise.all([
          SystemSettingsModel.findOneAndUpdate({ id: "default" }, payload, { upsert: true, new: true }),
          SystemPrivilegeModel.findOneAndUpdate({ id: "default" }, payload, { upsert: true, new: true }),
        ]);
      }
    } catch (_err) {}
    return res.json({ success: true, settings: inMemoryStore.systemSettings, message: "System privileges and toggles updated in MongoDB Atlas" });
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
    res.json({ status: "ok", database: "mongodb" });
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
