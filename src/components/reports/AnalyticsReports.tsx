import React, { useState, useEffect } from 'react';
import { useLeave } from '../../context/LeaveContext';
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
  Lock
} from 'lucide-react';

export const AnalyticsReports: React.FC = () => {
  const { currentUser, leaveRequests, departments, leavePolicies } = useLeave();

  const isDeptAdmin = currentUser?.role === 'ADMIN' && currentUser?.role !== 'SUPER_ADMIN';
  const isDeptRestricted = isDeptAdmin || (currentUser?.role !== 'SUPER_ADMIN' && currentUser?.role !== 'REGISTRAR');
  const userDeptId = currentUser?.departmentId;
  const userDeptObj = departments.find(d => d.id === userDeptId);

  const [departmentFilter, setDepartmentFilter] = useState<string>('ALL');
  const [leaveTypeFilter, setLeaveTypeFilter] = useState<string>('ALL');

  useEffect(() => {
    if (isDeptRestricted && userDeptId) {
      setDepartmentFilter(userDeptId);
    }
  }, [isDeptRestricted, userDeptId]);

  const effectiveDeptFilter = (isDeptRestricted && userDeptId) ? userDeptId : departmentFilter;

  // Requests scoped by department selection / restriction
  const scopedRequests = leaveRequests.filter(r => {
    if (effectiveDeptFilter !== 'ALL' && r.departmentId !== effectiveDeptFilter) return false;
    return true;
  });

  // Filtered requests (department + leave type)
  const filteredRequests = scopedRequests.filter(r => {
    if (leaveTypeFilter !== 'ALL' && r.leaveType !== leaveTypeFilter) return false;
    return true;
  });

  // Department-wise breakdown data for bar chart
  const displayedDepts = effectiveDeptFilter === 'ALL'
    ? departments
    : departments.filter(d => d.id === effectiveDeptFilter);

  const deptData = displayedDepts.map(d => {
    const dReqs = leaveRequests.filter(r => r.departmentId === d.id);
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
      `"${r.applicantName}"`,
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
    <div className="space-y-6">
      
      {/* Top Banner & Export Actions */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-indigo-600" />
            Analytical Leave Summary & Historical Reports
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            {isDeptRestricted 
              ? `Department analytics & reports restricted to ${userDeptObj ? userDeptObj.name : userDeptId}` 
              : 'Institutional metrics, department absence trends, and exportable data logs'}
          </p>
          {isDeptRestricted && (
            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-indigo-50 border border-indigo-200 text-indigo-900 rounded-full text-xs font-semibold mt-2">
              <Lock className="w-3.5 h-3.5 text-indigo-600" />
              Department Restricted View: <strong className="text-indigo-950">{userDeptObj ? userDeptObj.name : userDeptId} ({userDeptObj?.code || userDeptId})</strong>
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-3">
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
            <h3 className="text-sm font-bold text-slate-900">Historical Leave Sanction Logs</h3>
            <p className="text-xs text-slate-500">Filter and audit past leave entries</p>
          </div>

          {/* Table Filters */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1 bg-white px-2.5 py-1.5 rounded-xl border border-slate-300 text-xs">
              <span className="text-slate-400">Dept:</span>
              {isDeptRestricted ? (
                <span className="font-bold text-indigo-900 flex items-center gap-1">
                  <Lock className="w-3 h-3 text-indigo-600" />
                  {userDeptObj ? `${userDeptObj.name} (${userDeptObj.code})` : userDeptId}
                </span>
              ) : (
                <select
                  value={effectiveDeptFilter}
                  onChange={(e) => setDepartmentFilter(e.target.value)}
                  className="font-semibold text-slate-800 bg-transparent focus:outline-none"
                >
                  <option value="ALL">All Departments</option>
                  {departments.map(d => (
                    <option key={d.id} value={d.id}>{d.code} - {d.name}</option>
                  ))}
                </select>
              )}
            </div>

            <div className="flex items-center gap-1 bg-white px-2.5 py-1.5 rounded-xl border border-slate-300 text-xs">
              <span className="text-slate-400">Type:</span>
              <select
                value={leaveTypeFilter}
                onChange={(e) => setLeaveTypeFilter(e.target.value)}
                className="font-semibold text-slate-800 bg-transparent focus:outline-none"
              >
                <option value="ALL">All Categories</option>
                {leavePolicies.map(p => (
                  <option key={p.type} value={p.type}>{p.label}</option>
                ))}
              </select>
            </div>
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
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {filteredRequests.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-slate-400 text-xs font-semibold">
                    No leave record logs found for this department or filter criteria.
                  </td>
                </tr>
              ) : (
                filteredRequests.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 font-bold text-indigo-900">{r.id}</td>
                    <td className="px-4 py-3 font-semibold text-slate-900">{r.applicantName}</td>
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
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};

