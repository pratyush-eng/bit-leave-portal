import React, { useState, useEffect } from 'react';
import { useLeave } from '../../context/LeaveContext';
import { LeaveRequest } from '../../types';
import { MaterialChip } from '../common/MaterialChip';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell
} from 'recharts';
import { 
  BarChart3, 
  FileSpreadsheet, 
  Printer, 
  PieChart as PieIcon, 
  Building2,
  Lock,
  Trash2,
  ShieldAlert,
  UserCheck,
  User as UserIcon
} from 'lucide-react';

export const AnalyticsReports: React.FC = () => {
  const { currentUser, leaveRequests, departments, allUsers, leavePolicies, clearSanctionLogs, purgeUnknownLeaveRequests, deleteLeaveRequest, systemSettings } = useLeave();

  const isSuperAdmin = currentUser?.role === 'SUPER_ADMIN';
  const isRegistrar = currentUser?.role === 'REGISTRAR';
  const isHod = currentUser?.role === 'HOD';
  const isDeptAdmin = currentUser?.role === 'ADMIN' && currentUser?.role !== 'SUPER_ADMIN';
  const isFacultyOrStaff = currentUser?.role === 'FACULTY' || currentUser?.role === 'STAFF';
  const isDeptRestricted = isDeptAdmin || isHod;
  
  const userDeptId = currentUser?.departmentId;
  const userDeptObj = departments.find(d => d.id === userDeptId);

  const [departmentFilter, setDepartmentFilter] = useState<string>('ALL');
  const [staffFilter, setStaffFilter] = useState<string>('ALL');
  const [leaveTypeFilter, setLeaveTypeFilter] = useState<string>('ALL');
  const [showClearModal, setShowClearModal] = useState<boolean>(false);
  const [deletingRequest, setDeletingRequest] = useState<LeaveRequest | null>(null);

  useEffect(() => {
    if ((isDeptRestricted || isFacultyOrStaff) && userDeptId) {
      setDepartmentFilter(userDeptId);
    }
  }, [isDeptRestricted, isFacultyOrStaff, userDeptId]);

  const effectiveDeptFilter = (isDeptRestricted || isFacultyOrStaff) && userDeptId ? userDeptId : departmentFilter;
  const effectiveStaffFilter = isFacultyOrStaff ? currentUser.id : staffFilter;

  // Selected target staff/faculty user
  const selectedStaffUser = effectiveStaffFilter === 'ALL' 
    ? null 
    : (allUsers.find(u => u.id === effectiveStaffFilter) || (isFacultyOrStaff ? currentUser : null));

  // Staff/Faculty matching logic
  const matchesStaff = (r: any) => {
    if (effectiveStaffFilter === 'ALL') return true;
    if (!r) return false;

    if (selectedStaffUser) {
      const cleanReqEmail = (r.applicantEmail || '').toLowerCase().trim();
      const cleanUserEmail = (selectedStaffUser.email || '').toLowerCase().trim();
      const cleanReqCode = (r.applicantEmployeeCode || '').toLowerCase().trim();
      const cleanUserCode = (selectedStaffUser.employeeCode || '').toLowerCase().trim();
      const cleanReqName = (r.applicantName || '').toLowerCase().trim();
      const cleanUserName = (selectedStaffUser.name || '').toLowerCase().trim();

      return (
        (r.applicantId && r.applicantId === selectedStaffUser.id) ||
        (cleanReqEmail && cleanUserEmail && cleanReqEmail === cleanUserEmail) ||
        (cleanReqCode && cleanUserCode && cleanReqCode === cleanUserCode) ||
        (cleanReqName && cleanUserName && cleanReqName === cleanUserName)
      );
    }

    return r.applicantId === effectiveStaffFilter;
  };

  // Requests scoped by department selection / restriction
  const deptScopedRequests = leaveRequests.filter(r => {
    if (effectiveDeptFilter !== 'ALL' && r.departmentId !== effectiveDeptFilter) return false;
    return true;
  });

  // Requests scoped staff/faculty-wise
  const scopedRequests = deptScopedRequests.filter(matchesStaff);

  // Filtered requests (department + staff/faculty + leave type)
  const filteredRequests = scopedRequests.filter(r => {
    if (leaveTypeFilter !== 'ALL' && r.leaveType !== leaveTypeFilter) return false;
    return true;
  });

  // Eligible Staff / Faculty members for dropdown filter
  const eligibleStaffUsers = allUsers.filter(u => {
    if (effectiveDeptFilter !== 'ALL') {
      return u.departmentId === effectiveDeptFilter || (userDeptObj && u.departmentId === userDeptObj.code);
    }
    return true;
  });

  // Department-wise breakdown data for bar chart
  const displayedDepts = effectiveDeptFilter === 'ALL'
    ? departments
    : departments.filter(d => d.id === effectiveDeptFilter);

  const deptData = displayedDepts.map(d => {
    const dReqs = scopedRequests.filter(r => r.departmentId === d.id);
    const approved = dReqs.filter(r => r.status === 'APPROVED').length;
    const pending = dReqs.filter(r => r.status === 'PENDING_HOD' || r.status === 'PENDING_REGISTRAR').length;
    const totalDays = dReqs.filter(r => r.status === 'APPROVED').reduce((acc, r) => acc + r.totalDays, 0);

    return {
      name: d.code,
      fullName: d.name,
      Approved: approved,
      Pending: pending,
      'Total Days Sanctioned': totalDays
    };
  });

  // Leave Type Breakdown data for Donut Chart
  const COLORS = ['#2563eb', '#e11d48', '#059669', '#7c3aed', '#d97706', '#db2777', '#0891b2'];
  const leaveTypeData = leavePolicies.map((pol, idx) => {
    const count = scopedRequests.filter(r => r.leaveType === pol.type && r.status === 'APPROVED').length;
    return {
      name: pol.label,
      value: count,
      color: COLORS[idx % COLORS.length]
    };
  }).filter(item => item.value > 0);

  // Export CSV Handler
  const resolveApplicantName = (r: LeaveRequest) => {
    if (r.applicantName && r.applicantName !== 'Unknown Applicant' && r.applicantName.trim() !== '') {
      return r.applicantName;
    }
    const matched = allUsers.find(u => 
      (r.applicantId && u.id === r.applicantId) ||
      (r.applicantEmail && u.email && u.email.toLowerCase().trim() === r.applicantEmail.toLowerCase().trim()) ||
      (r.applicantEmployeeCode && u.employeeCode && u.employeeCode.trim() === r.applicantEmployeeCode.trim())
    );
    if (matched?.name) return matched.name;
    if (r.applicantEmail && r.applicantEmail.includes('@')) {
      const handle = r.applicantEmail.split('@')[0].replace(/[\._-]/g, ' ');
      return handle.charAt(0).toUpperCase() + handle.slice(1);
    }
    return 'Faculty Member';
  };

  const handleExportCSV = () => {
    const headers = [
      'Application ID',
      'Applicant Name',
      'Department',
      'Designation',
      'Leave Type',
      'Start Date',
      'End Date',
      'Total Days',
      'Status',
      'Applied On'
    ];

    const rows = filteredRequests.map(r => [
      r.id,
      `"${resolveApplicantName(r)}"`,
      `"${r.departmentName}"`,
      `"${r.applicantDesignation}"`,
      r.leaveType,
      r.startDate,
      r.endDate,
      r.totalDays,
      r.status,
      r.appliedOn
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `leave_summary_report_${effectiveDeptFilter}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div id="printable-analytics-summary" className="space-y-6">
      
      {/* Official Print Header (Only visible on printed paper) */}
      <div className="hidden print:block border-b-2 border-slate-900 pb-4 mb-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-black text-slate-900 uppercase tracking-tight">
              {systemSettings?.institutionName || 'BIT Leave Portal'}
            </h1>
            <p className="text-xs font-bold text-slate-700">Official Leave Analytics & Historical Sanction Summary Report</p>
            <p className="text-[11px] text-slate-600 mt-1">
              <strong>Scope:</strong> {isDeptRestricted ? `Department Restricted (${userDeptObj ? userDeptObj.name : userDeptId})` : effectiveDeptFilter === 'ALL' ? 'Institutional Scope (All Departments)' : `Department: ${effectiveDeptFilter}`}
            </p>
          </div>
          <div className="text-right text-[11px] text-slate-600 space-y-0.5">
            <p><strong>Generated On:</strong> {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
            <p><strong>Generated By:</strong> {currentUser?.name} ({currentUser?.role})</p>
            <p><strong>Total Sanction Records:</strong> {filteredRequests.length}</p>
          </div>
        </div>
      </div>

      {/* Top Banner & Export Actions */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-indigo-600" />
            Analytical Leave Summary & Historical Reports
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            {isFacultyOrStaff
              ? `Personal leave analytics & sanction logs for ${currentUser.name}`
              : isDeptRestricted 
                ? `Department analytics & reports restricted to ${userDeptObj ? userDeptObj.name : userDeptId}` 
                : 'Institutional metrics, department absence trends, and exportable data logs'}
          </p>
          {isFacultyOrStaff ? (
            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-indigo-50 border border-indigo-200 text-indigo-900 rounded-full text-xs font-semibold mt-2">
              <UserCheck className="w-3.5 h-3.5 text-indigo-600" />
              Faculty / Staff Scope: <strong className="text-indigo-950">{currentUser.name} ({currentUser.employeeCode || 'Self'})</strong>
            </div>
          ) : isDeptRestricted ? (
            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-indigo-50 border border-indigo-200 text-indigo-900 rounded-full text-xs font-semibold mt-2">
              <Lock className="w-3.5 h-3.5 text-indigo-600" />
              Department Restricted View: <strong className="text-indigo-950">{userDeptObj ? userDeptObj.name : userDeptId} ({userDeptObj?.code || userDeptId})</strong>
            </div>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center gap-3 no-print">
          <button
            onClick={handleExportCSV}
            className="px-4 py-2 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-xs transition-all active:scale-95 flex items-center gap-2 cursor-pointer"
          >
            <FileSpreadsheet className="w-4 h-4" />
            Export CSV Report
          </button>
          
          <button
            onClick={() => window.print()}
            className="px-4 py-2 text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl transition-colors flex items-center gap-2 border border-slate-300 cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            Print Summary
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Applications</p>
          <p className="text-2xl font-black text-slate-900 mt-1">{scopedRequests.length}</p>
          <p className="text-[11px] text-slate-500 mt-1">
            {isDeptRestricted ? `Logged in ${userDeptObj?.code || userDeptId} department` : 'Logged across institution'}
          </p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
          <p className="text-[11px] font-bold text-emerald-600 uppercase tracking-wider">Sanctioned Leaves</p>
          <p className="text-2xl font-black text-emerald-700 mt-1">
            {scopedRequests.filter(r => r.status === 'APPROVED').length}
          </p>
          <p className="text-[11px] text-emerald-600 mt-1">Officially approved</p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
          <p className="text-[11px] font-bold text-amber-600 uppercase tracking-wider">Pending Sanction</p>
          <p className="text-2xl font-black text-amber-700 mt-1">
            {scopedRequests.filter(r => r.status === 'PENDING_HOD' || r.status === 'PENDING_REGISTRAR').length}
          </p>
          <p className="text-[11px] text-amber-600 mt-1">In approval pipeline</p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
          <p className="text-[11px] font-bold text-indigo-600 uppercase tracking-wider">Total Absence Days</p>
          <p className="text-2xl font-black text-indigo-950 mt-1">
            {scopedRequests.filter(r => r.status === 'APPROVED').reduce((acc, r) => acc + r.totalDays, 0)}
          </p>
          <p className="text-[11px] text-slate-500 mt-1">Days sanctioned overall</p>
        </div>
      </div>

      {/* Visual Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Department Comparison Bar Chart */}
        <div className="lg:col-span-2 bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Building2 className="w-4 h-4 text-indigo-600" />
              {isDeptRestricted ? `${userDeptObj?.name || userDeptId} Sanctions & Pipeline` : 'Department Leave Sanctions & Pipeline'}
            </h3>
            <span className="text-xs text-slate-400">
              {isDeptRestricted ? `Department: ${userDeptObj?.code || userDeptId}` : 'By Department'}
            </span>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={deptData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0f172a', borderRadius: '12px', color: '#fff', fontSize: '12px' }} 
                />
                <Bar dataKey="Approved" fill="#059669" radius={[6, 6, 0, 0]} />
                <Bar dataKey="Pending" fill="#d97706" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Leave Category Distribution Donut Chart */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <PieIcon className="w-4 h-4 text-indigo-600" />
            Category Utilization
          </h3>

          <div className="h-52 w-full flex items-center justify-center">
            {leaveTypeData.length === 0 ? (
              <p className="text-xs text-slate-400">No sanctioned leave data available</p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={leaveTypeData}
                    cx="50%"
                    cy="50%"
                    innerRadius={45}
                    outerRadius={75}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {leaveTypeData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#0f172a', borderRadius: '12px', color: '#fff', fontSize: '11px' }} 
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>

          <div className="space-y-1.5 pt-2 border-t border-slate-100">
            {leaveTypeData.map((item, idx) => (
              <div key={idx} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                  <span className="text-slate-700 truncate max-w-[150px]">{item.name}</span>
                </div>
                <span className="font-bold text-slate-900">{item.value} reqs</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Historical Data Log Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="p-5 border-b border-slate-200 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 bg-slate-50">
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              Historical Leave Sanction Logs
              {isSuperAdmin && (
                <span className="px-2 py-0.5 rounded-full bg-purple-100 text-purple-800 text-[10px] font-extrabold border border-purple-200">
                  Super Admin
                </span>
              )}
            </h3>
            <p className="text-xs text-slate-500">Filter and audit past leave entries</p>
          </div>

          {/* Table Filters & Super Admin Action */}
          <div className="flex flex-wrap items-center gap-2 no-print">
            <div className="flex items-center gap-1 bg-white px-2.5 py-1.5 rounded-xl border border-slate-300 text-xs">
              <span className="text-slate-400">Dept:</span>
              {(isDeptRestricted || isFacultyOrStaff) ? (
                <span className="font-bold text-indigo-900 flex items-center gap-1">
                  <Lock className="w-3 h-3 text-indigo-600" />
                  {userDeptObj ? `${userDeptObj.name} (${userDeptObj.code})` : userDeptId}
                </span>
              ) : (
                <select
                  value={effectiveDeptFilter}
                  onChange={(e) => {
                    setDepartmentFilter(e.target.value);
                    setStaffFilter('ALL');
                  }}
                  className="font-semibold text-slate-800 bg-transparent focus:outline-none"
                >
                  <option value="ALL">All Departments</option>
                  {departments.map((d, idx) => (
                    <option key={`dept-opt-${d.id}-${idx}`} value={d.id}>{d.code} - {d.name}</option>
                  ))}
                </select>
              )}
            </div>

            {/* Staff / Faculty Wise Filter */}
            {isFacultyOrStaff ? (
              <div className="flex items-center gap-1.5 bg-[#3F51B5]/10 border border-[#3F51B5]/20 px-3 py-1.5 rounded-xl text-xs text-[#3F51B5] font-bold">
                <UserCheck className="w-3.5 h-3.5" />
                <span>Scope: {currentUser.name} ({currentUser.employeeCode || 'Faculty/Staff'})</span>
              </div>
            ) : (
              <div className="flex items-center gap-1 bg-white px-2.5 py-1.5 rounded-xl border border-slate-300 text-xs">
                <span className="text-slate-400 font-medium">Faculty/Staff:</span>
                <select
                  value={staffFilter}
                  onChange={(e) => setStaffFilter(e.target.value)}
                  className="font-semibold text-slate-800 bg-transparent focus:outline-none max-w-[180px] truncate"
                >
                  <option value="ALL">All Faculty & Staff</option>
                  {eligibleStaffUsers.map((u, idx) => (
                    <option key={`staff-opt-${u.id}-${idx}`} value={u.id}>
                      {u.name} ({u.employeeCode || u.designation || u.role})
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="flex items-center gap-1 bg-white px-2.5 py-1.5 rounded-xl border border-slate-300 text-xs">
              <span className="text-slate-400">Type:</span>
              <select
                value={leaveTypeFilter}
                onChange={(e) => setLeaveTypeFilter(e.target.value)}
                className="font-semibold text-slate-800 bg-transparent focus:outline-none"
              >
                <option value="ALL">All Categories</option>
                {leavePolicies.map((p, idx) => (
                  <option key={`policy-opt-${p.type}-${idx}`} value={p.type}>{p.label}</option>
                ))}
              </select>
            </div>

            {/* Clear Leave Sanction Logs option - Super Admin Only */}
            {(isSuperAdmin || currentUser?.role === 'ADMIN') && (
              <button
                type="button"
                onClick={() => purgeUnknownLeaveRequests()}
                className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs active:scale-95 ml-1"
                title="Purge unknown or orphan leave requests from database"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Purge Unknown Data
              </button>
            )}
            {isSuperAdmin && (
              <button
                type="button"
                onClick={() => setShowClearModal(true)}
                disabled={leaveRequests.length === 0}
                className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 disabled:bg-slate-300 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer disabled:cursor-not-allowed shadow-2xs active:scale-95 ml-1"
                title="Super Admin Only: Permanently clear all historical leave sanction logs"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Clear Sanction Logs
              </button>
            )}
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-100 text-slate-600 font-bold uppercase tracking-wider text-[10px] border-b border-slate-200">
              <tr>
                <th className="px-4 py-3">Ref ID</th>
                <th className="px-4 py-3">Applicant</th>
                <th className="px-4 py-3">Department</th>
                <th className="px-4 py-3">Leave Type</th>
                <th className="px-4 py-3">Duration</th>
                <th className="px-4 py-3">Days</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Applied On</th>
                {(isSuperAdmin || isDeptAdmin) && (
                  <th className="px-4 py-3 text-right no-print">Action</th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {filteredRequests.length === 0 ? (
                <tr>
                  <td colSpan={(isSuperAdmin || isDeptAdmin) ? 9 : 8} className="px-4 py-8 text-center text-slate-400 text-xs font-semibold">
                    No leave record logs found for this department or filter criteria.
                  </td>
                </tr>
              ) : (
                filteredRequests.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 font-bold text-indigo-900">{r.id}</td>
                    <td className="px-4 py-3 font-semibold text-slate-900">{resolveApplicantName(r)}</td>
                    <td className="px-4 py-3">{r.departmentName}</td>
                    <td className="px-4 py-3">
                      <MaterialChip label={r.leaveType} variant="leaveType" leaveType={r.leaveType} />
                    </td>
                    <td className="px-4 py-3 text-slate-600">{r.startDate} to {r.endDate}</td>
                    <td className="px-4 py-3 font-bold text-slate-900">{r.totalDays}</td>
                    <td className="px-4 py-3">
                      <MaterialChip label={r.status} variant="status" status={r.status} />
                    </td>
                    <td className="px-4 py-3 text-slate-500">{r.appliedOn}</td>
                    {(isSuperAdmin || isDeptAdmin) && (
                      <td className="px-4 py-3 text-right no-print">
                        <button
                          type="button"
                          onClick={() => setDeletingRequest(r)}
                          className="px-2.5 py-1 text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-600 hover:text-white rounded-lg transition-all flex items-center gap-1 border border-rose-200 cursor-pointer ml-auto"
                          title={`Delete Leave Request ${r.id}`}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          Delete
                        </button>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Delete Individual Leave Request Confirmation Modal */}
      {deletingRequest && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 no-print">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-5 shadow-2xl border border-slate-200">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-2xl bg-rose-100 text-rose-700 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-slate-900">Delete Leave Request?</h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Are you sure you want to permanently delete leave request <strong className="text-slate-900">{deletingRequest.id}</strong> applied by <strong className="text-slate-900">{resolveApplicantName(deletingRequest)}</strong>?
                </p>
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-[11px] text-slate-600 space-y-1 mt-2">
                  <p><strong>Type:</strong> {deletingRequest.leaveType} ({deletingRequest.totalDays} {deletingRequest.totalDays === 1 ? 'day' : 'days'})</p>
                  <p><strong>Duration:</strong> {deletingRequest.startDate} to {deletingRequest.endDate}</p>
                  <p><strong>Department:</strong> {deletingRequest.departmentName}</p>
                  <p><strong>Status:</strong> {deletingRequest.status}</p>
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setDeletingRequest(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  deleteLeaveRequest(deletingRequest.id);
                  setDeletingRequest(null);
                }}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl transition-all shadow-xs active:scale-95 flex items-center gap-1.5 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Delete Request
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Clear Sanction Logs Confirmation Modal for Super Admin */}
      {showClearModal && isSuperAdmin && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 no-print">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-5 shadow-2xl border border-slate-200">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-700 flex items-center justify-center shrink-0">
                <ShieldAlert className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold text-slate-900">Clear Leave Sanction Logs?</h3>
                  <span className="px-2 py-0.5 rounded-full bg-purple-100 text-purple-800 text-[10px] font-extrabold border border-purple-200">
                    Super Admin
                  </span>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed pt-1">
                  Are you sure you want to permanently clear all <strong>{leaveRequests.length}</strong> historical leave sanction log records from the institutional database?
                </p>
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-[11px] text-rose-800 space-y-1 mt-2">
                  <p className="font-bold flex items-center gap-1">
                    <Trash2 className="w-3.5 h-3.5" /> Irreversible Administrative Action
                  </p>
                  <p className="text-rose-700 leading-normal">
                    This will permanently delete all leave applications, sanction histories, and status records across all departments.
                  </p>
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowClearModal(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  clearSanctionLogs();
                  setShowClearModal(false);
                }}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl transition-all shadow-xs active:scale-95 flex items-center gap-1.5 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Yes, Clear All Logs
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

