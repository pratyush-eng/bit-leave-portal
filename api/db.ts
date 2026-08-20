import mongoose from "mongoose";

// MongoDB URI normalization and resolution
const DEFAULT_ATLAS_URI = "mongodb+srv://Vercel-Admin-bit-leave-portal:wRlmn19FXsBSByBq@bit-leave-portal.rqoqqmo.mongodb.net/bit_leave_portal?appName=bit-leave-portal";

let customMongoUriOverride: string | null = null;

export function setCustomMongoUri(uri: string) {
  if (uri && uri.trim()) {
    customMongoUriOverride = uri.trim();
    cachedConnection = null;
    connectionPromise = null;
  }
}

export function getMongoUri(): string {
  if (customMongoUriOverride) {
    return customMongoUriOverride;
  }
  const envUri = process.env.MONGODB_URI || process.env.MONGO_URI || process.env.DATABASE_URL || DEFAULT_ATLAS_URI;
  return envUri ? envUri.trim() : DEFAULT_ATLAS_URI;
}

// Schemas
export const UserSchema = new mongoose.Schema({
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

export const LeaveRequestSchema = new mongoose.Schema({
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

export const DepartmentSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  code: { type: String, default: "" },
  name: { type: String, default: "" },
  hodId: { type: String, default: null },
  hodName: { type: String, default: null },
  totalFaculty: { type: Number, default: 0 },
}, { timestamps: true });

export const LeavePolicySchema = new mongoose.Schema({
  type: { type: String, required: true, unique: true },
  label: { type: String, default: "" },
  annualQuota: { type: Number, default: 12 },
  minDaysNotice: { type: Number, default: 0 },
  requiresDocument: { type: Boolean, default: false },
  color: { type: String, default: "#2563eb" },
  description: { type: String, default: "" },
}, { timestamps: true });

export const AuditLogSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  timestamp: { type: String, default: "" },
  actorId: { type: String, default: "sys" },
  actorName: { type: String, default: "System" },
  actorRole: { type: String, default: "SUPER_ADMIN" },
  action: { type: String, default: "ACTION" },
  details: { type: String, default: "" },
  ipAddress: { type: String, default: null },
}, { timestamps: true });

export const LeaveBalanceSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  userId: { type: String, required: true },
  leaveType: { type: String, required: true },
  totalQuota: { type: Number, default: 0 },
  usedDays: { type: Number, default: 0 },
  pendingDays: { type: Number, default: 0 },
  updatedAt: { type: String, default: "" },
}, { timestamps: true });

export const PermissionMatrixSchema = new mongoose.Schema({
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

export const SystemSettingsSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true, default: "default" },
  enableDemoAccounts: { type: Boolean, default: false },
  enableRoleSwitcher: { type: Boolean, default: false },
  enableSelfRegistration: { type: Boolean, default: false },
  institutionName: { type: String, default: "BIT Leave Portal" },
  institutionLogoUrl: { type: String, default: "https://bitmesra.ac.in/SiteLogo/bit-newlogo.png" },
  emailSettings: { type: mongoose.Schema.Types.Mixed, default: {} },
  updatedAt: { type: String, default: "" },
  updatedBy: { type: String, default: "SUPER_ADMIN" },
}, { timestamps: true });

export const SystemPrivilegeSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true, default: "default" },
  privilegeName: { type: String, default: "System Privileges & Feature Toggles" },
  enableDemoAccounts: { type: Boolean, default: false },
  enableRoleSwitcher: { type: Boolean, default: false },
  enableSelfRegistration: { type: Boolean, default: false },
  institutionName: { type: String, default: "BIT Leave Portal" },
  institutionLogoUrl: { type: String, default: "https://bitmesra.ac.in/SiteLogo/bit-newlogo.png" },
  emailSettings: { type: mongoose.Schema.Types.Mixed, default: {} },
  customToggles: { type: mongoose.Schema.Types.Mixed, default: {} },
  updatedAt: { type: String, default: "" },
  updatedBy: { type: String, default: "SUPER_ADMIN" },
}, { timestamps: true });

export const ThemeSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  name: { type: String, default: "Default Theme" },
  isDefault: { type: Boolean, default: false },
  settings: { type: mongoose.Schema.Types.Mixed, default: {} },
  updatedAt: { type: String, default: "" },
  updatedBy: { type: String, default: "SUPER_ADMIN" },
}, { timestamps: true });

export const UserModel: any = mongoose.models.User || mongoose.model("User", UserSchema, "users");
export const LeaveRequestModel: any = mongoose.models.LeaveRequest || mongoose.model("LeaveRequest", LeaveRequestSchema, "leave_requests");
export const DepartmentModel: any = mongoose.models.Department || mongoose.model("Department", DepartmentSchema, "departments");
export const LeavePolicyModel: any = mongoose.models.LeavePolicy || mongoose.model("LeavePolicy", LeavePolicySchema, "leave_policies");
export const AuditLogModel: any = mongoose.models.AuditLog || mongoose.model("AuditLog", AuditLogSchema, "audit_logs");
export const LeaveBalanceModel: any = mongoose.models.LeaveBalance || mongoose.model("LeaveBalance", LeaveBalanceSchema, "leave_balances");
export const PermissionMatrixModel: any = mongoose.models.PermissionMatrix || mongoose.model("PermissionMatrix", PermissionMatrixSchema, "permission_matrix");
export const SystemSettingsModel: any = mongoose.models.SystemSettings || mongoose.model("SystemSettings", SystemSettingsSchema, "system_settings");
export const SystemPrivilegeModel: any = mongoose.models.SystemPrivilege || mongoose.model("SystemPrivilege", SystemPrivilegeSchema, "system_privileges");
export const ThemeModel: any = mongoose.models.Theme || mongoose.model("Theme", ThemeSchema, "themes");

let cachedConnection: typeof mongoose | null = null;
let connectionPromise: Promise<typeof mongoose> | null = null;

export function getDatabaseName(): string {
  return process.env.MONGODB_DB_NAME || "bit_leave_portal";
}

export function getMaskedUri(uri?: string): string {
  try {
    const target = uri || getMongoUri();
    return target.replace(/\/\/(.+)@/, (_match, p1) => {
      const parts = p1.split(":");
      const user = parts[0] || "user";
      return `//${user}:****@`;
    });
  } catch {
    return "MongoDB Atlas Cluster";
  }
}

export async function connectToDatabase(customUri?: string): Promise<typeof mongoose> {
  if (customUri && customUri.trim()) {
    setCustomMongoUri(customUri.trim());
  }

  if (cachedConnection && mongoose.connection.readyState === 1) {
    return cachedConnection;
  }

  if (connectionPromise) {
    return connectionPromise;
  }

  const uri = getMongoUri();
  const dbName = getDatabaseName();

  mongoose.set("bufferCommands", false);
  mongoose.set("strictQuery", false);

  connectionPromise = mongoose.connect(uri, {
    dbName,
    serverSelectionTimeoutMS: 7000,
    connectTimeoutMS: 7000,
    socketTimeoutMS: 8000,
    maxPoolSize: 10,
    minPoolSize: 0,
    maxIdleTimeMS: 5000,
  }).then((m) => {
    cachedConnection = m;
    return m;
  }).catch((err) => {
    cachedConnection = null;
    connectionPromise = null;
    throw err;
  });

  return connectionPromise;
}
