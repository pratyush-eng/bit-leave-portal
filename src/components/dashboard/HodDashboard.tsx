import React, { useState } from 'react';
import { useLeave } from '../../context/LeaveContext';
import { LeaveRequest } from '../../types';
import { MaterialChip } from '../common/MaterialChip';
import { TimelineStepper } from '../common/TimelineStepper';
import { 
  CheckSquare, 
  MessageSquare, 
  CheckCircle2, 
  XCircle, 
  UserCheck, 
  Users, 
  Calendar, 
  Building2,
  ChevronRight,
  Sparkles,
  Search,
  FileText,
  Printer
} from 'lucide-react';

interface HodDashboardProps {
  onSelectLeaveRequest: (id: string, printMode?: boolean) => void;
}

export const HodDashboard: React.FC<HodDashboardProps> = ({ onSelectLeaveRequest }) => {
  const { currentUser, leaveRequests, allUsers, departments, hodAction } = useLeave();

  const [activeTab, setActiveTab] = useState<'pending' | 'department_team' | 'department_leaves'>('pending');
  const [selectedRequest, setSelectedRequest] = useState<LeaveRequest | null>(null);
  const [remarks, setRemarks] = useState<string>('');
  const [deptLeaveSearch, setDeptLeaveSearch] = useState<string>('');

  const userDeptId = (currentUser.departmentId || '').toLowerCase().trim();
  const userDeptName = (currentUser.departmentName || '').toLowerCase().trim();
  const deptObj = departments.find(d => d.id === currentUser.departmentId || d.hodId === currentUser.id);

  // All department requests (robust matching on departmentId, departmentName, code or applicant self)
  const departmentRequests = leaveRequests.filter(r => {
    if (!r) return false;
    const reqDeptId = (r.departmentId || '').toLowerCase().trim();
    const reqDeptName = (r.departmentName || '').toLowerCase().trim();
    const matchId = reqDeptId && (reqDeptId === userDeptId || (deptObj && reqDeptId === deptObj.code.toLowerCase()));
    const matchName = reqDeptName && userDeptName && reqDeptName === userDeptName;
    const isSelf = r.applicantId === currentUser.id || (r.applicantEmail && currentUser.email && r.applicantEmail.toLowerCase().trim() === currentUser.email.toLowerCase().trim());

    return matchId || matchName || isSelf;
  });

  // Requests in HOD's department waiting for HOD recommendation
  const pendingRequests = departmentRequests.filter(
    r => r.status === 'PENDING_HOD' || r.status === 'PENDING'
  );

  // Department faculty/staff members
  const deptMembers = allUsers.filter(u => {
    if (!u) return false;
    const uDeptId = (u.departmentId || '').toLowerCase().trim();
    const uDeptName = (u.departmentName || '').toLowerCase().trim();
    return uDeptId === userDeptId || (uDeptName && uDeptName === userDeptName) || u.id === currentUser.id;
  });

  const handleRecommend = (req: LeaveRequest) => {
    if (!remarks.trim()) {
      alert('Please add endorsement remarks before recommending.');
      return;
    }
    hodAction(req.id, 'RECOMMENDED', remarks);
    setRemarks('');
    setSelectedRequest(null);
  };

  const handleReject = (req: LeaveRequest) => {
    if (!remarks.trim()) {
      alert('Please state reason for rejection.');
      return;
    }
    hodAction(req.id, 'REJECTED', remarks);
    setRemarks('');
    setSelectedRequest(null);
  };

  return (
    <div className="space-y-6">
      
      {/* Header Banner */}
      <div className="bg-[#3F51B5] rounded-xl p-6 text-white shadow-md flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-widest bg-white/20 text-white border border-white/20">
              Department Head Portal
            </span>
            <span className="text-xs text-indigo-100 font-medium">{currentUser.departmentName}</span>
          </div>
          <h2 className="text-xl font-medium tracking-tight">
            HOD Endorsement & Team Portal • {currentUser.name}
          </h2>
          <p className="text-xs text-indigo-100/90 mt-1 max-w-xl leading-relaxed">
            Endorse and forward department faculty & staff leave requests to Registrar, monitor coverage, and manage department balances.
          </p>
        </div>

        <div className="bg-white/10 p-4 rounded-xl border border-white/20 text-center min-w-[150px]">
          <p className="text-3xl font-light text-white">{pendingRequests.length}</p>
          <p className="text-[10px] font-bold uppercase tracking-widest text-indigo-100 mt-1">Pending Endorsements</p>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-3">
        <button
          onClick={() => setActiveTab('pending')}
          className={`px-5 py-2 rounded-lg text-xs font-medium uppercase tracking-wide transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === 'pending'
              ? 'bg-[#3F51B5] text-white shadow-sm'
              : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
          }`}
        >
          <CheckSquare className="w-4 h-4" />
          Pending Endorsements Queue ({pendingRequests.length})
        </button>

        <button
          onClick={() => setActiveTab('department_team')}
          className={`px-5 py-2 rounded-lg text-xs font-medium uppercase tracking-wide transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === 'department_team'
              ? 'bg-[#3F51B5] text-white shadow-sm'
              : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
          }`}
        >
          <Users className="w-4 h-4" />
          Department Members & Balances ({deptMembers.length})
        </button>

        <button
          onClick={() => setActiveTab('department_leaves')}
          className={`px-5 py-2 rounded-lg text-xs font-medium uppercase tracking-wide transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === 'department_leaves'
              ? 'bg-[#3F51B5] text-white shadow-sm'
              : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
          }`}
        >
          <FileText className="w-4 h-4" />
          Department Leave Applications ({departmentRequests.length})
        </button>
      </div>

      {/* Tab 1: Pending Requests Queue */}
      {activeTab === 'pending' && (
        <div className="space-y-4">
          {pendingRequests.length === 0 ? (
            <div className="bg-white p-12 rounded-xl border border-slate-100 text-center shadow-xs">
              <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-3" />
              <h3 className="text-sm font-semibold text-slate-800">All Department Endorsements Cleared</h3>
              <p className="text-xs text-slate-500 mt-1">
                There are currently no pending leave requests awaiting your recommendation.
              </p>
            </div>
          ) : (
            pendingRequests.map((req) => (
              <div 
                key={req.id}
                className="bg-white p-6 rounded-xl border border-slate-100 shadow-xs hover:border-slate-300 transition-all space-y-4"
              >
                {/* Applicant Info & Dates */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                  <div>
                    <span className="font-mono text-xs font-bold text-[#3F51B5] mr-2">{req.id}</span>
                    <span className="font-semibold text-sm text-slate-800">{req.applicantName}</span>
                    <span className="text-xs text-slate-500 ml-2">({req.applicantDesignation})</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <MaterialChip label={req.leaveType} variant="leaveType" leaveType={req.leaveType} />
                    <span className="text-xs font-semibold text-slate-800 bg-slate-50 border border-slate-200 px-3 py-1 rounded">
                      {req.totalDays} Day(s) • {req.startDate} to {req.endDate}
                    </span>
                  </div>
                </div>

                {/* Reason & Substitute Details */}
                <div className="bg-slate-50 p-4 rounded-lg border border-slate-200/80 text-xs text-slate-800 space-y-2">
                  <p><strong>Reason:</strong> "{req.reason}"</p>
                  
                  {req.classHandovers && req.classHandovers.length > 0 && (
                    <div className="border-t border-slate-200 pt-2 text-[11px] text-slate-700">
                      <p className="font-bold text-[#3F51B5] mb-1 uppercase tracking-wide text-[10px]">Arranged Substitute Lectures ({req.classHandovers.length}):</p>
                      <ul className="list-disc pl-4 space-y-0.5">
                        {req.classHandovers.map((h, i) => (
                          <li key={i}>
                            <strong>{h.courseCode}</strong> by {h.substituteStaffName} ({h.timeSlot})
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>

                {/* Multi-tier timeline preview */}
                <TimelineStepper request={req} />

                {/* Quick HOD Action Panel */}
                <div className="bg-indigo-50/50 p-4 rounded-lg border border-indigo-100 space-y-3">
                  <div className="flex items-center gap-2 text-slate-800 font-bold text-xs uppercase tracking-wide">
                    <MessageSquare className="w-4 h-4 text-[#3F51B5]" />
                    HOD Endorsement Remarks:
                  </div>

                  <textarea
                    rows={2}
                    placeholder="Enter endorsement remarks (e.g., 'Recommended. Alternate lectures covered effectively.')"
                    value={selectedRequest?.id === req.id ? remarks : ''}
                    onChange={(e) => {
                      setSelectedRequest(req);
                      setRemarks(e.target.value);
                    }}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded text-xs font-normal text-slate-900 focus:ring-2 focus:ring-[#3F51B5]"
                  />

                  <div className="flex items-center justify-between pt-1">
                    <button
                      onClick={() => onSelectLeaveRequest(req.id)}
                      className="text-xs text-[#3F51B5] font-semibold hover:underline"
                    >
                      View Complete Application Details →
                    </button>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleReject(req)}
                        className="px-4 py-2 text-xs font-medium text-rose-700 bg-rose-50 border border-rose-200 hover:bg-rose-100 rounded transition-colors flex items-center gap-1 uppercase tracking-wide cursor-pointer"
                      >
                        <XCircle className="w-3.5 h-3.5" /> Reject
                      </button>

                      <button
                        onClick={() => handleRecommend(req)}
                        className="px-5 py-2 text-xs font-medium text-white bg-[#3F51B5] hover:bg-[#303F9F] rounded shadow-sm transition-all active:scale-95 flex items-center gap-1 uppercase tracking-wide cursor-pointer"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" /> Recommend to Registrar
                      </button>
                    </div>
                  </div>
                </div>

              </div>
            ))
          )}
        </div>
      )}

      {/* Tab 2: Department Members & Balances */}
      {activeTab === 'department_team' && (
        <div className="bg-white rounded-xl border border-slate-100 shadow-xs overflow-hidden">
          <div className="p-6 bg-slate-50/50 border-b border-slate-100 flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500">
              Department Members ({deptMembers.length})
            </h3>
            <span className="text-xs text-slate-500">Department: {currentUser.departmentName}</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-50 text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                <tr>
                  <th className="px-6 py-4">Member Name</th>
                  <th className="px-6 py-4">Designation</th>
                  <th className="px-6 py-4">Emp Code</th>
                  <th className="px-6 py-4">Casual (CL) Used</th>
                  <th className="px-6 py-4">Sick (SL) Used</th>
                  <th className="px-6 py-4">Earned (EL) Used</th>
                  <th className="px-6 py-4 text-right">Role</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs font-medium text-slate-700">
                {deptMembers.map((m) => (
                  <tr key={m.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-6 py-4 font-semibold text-slate-900 flex items-center gap-2">
                      <img 
                        src={m.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(m.name)}`} 
                        alt={m.name} 
                        className="w-7 h-7 rounded-full object-cover border"
                      />
                      {m.name}
                    </td>
                    <td className="px-6 py-4 text-slate-600">{m.designation}</td>
                    <td className="px-6 py-4 font-mono text-slate-500">{m.employeeCode}</td>
                    <td className="px-6 py-4 font-semibold text-blue-700">
                      {m.leaveBalances.CASUAL.used} / {m.leaveBalances.CASUAL.total}
                    </td>
                    <td className="px-6 py-4 font-semibold text-rose-700">
                      {m.leaveBalances.SICK.used} / {m.leaveBalances.SICK.total}
                    </td>
                    <td className="px-6 py-4 font-semibold text-emerald-700">
                      {m.leaveBalances.EARNED.used} / {m.leaveBalances.EARNED.total}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <MaterialChip label={m.role} variant="role" role={m.role} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 3: Department Applied Leave Applications */}
      {activeTab === 'department_leaves' && (
        <div className="bg-white rounded-xl border border-slate-100 shadow-xs overflow-hidden p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
            <div>
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide flex items-center gap-2">
                <FileText className="w-4 h-4 text-[#3F51B5]" />
                All Department Leave Applications ({currentUser.departmentName || currentUser.departmentId})
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Complete institutional records for faculty and staff leave requests in your department.
              </p>
            </div>

            <div className="relative min-w-[240px]">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Filter applicant name, ID, type..."
                value={deptLeaveSearch}
                onChange={(e) => setDeptLeaveSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-[#3F51B5] focus:outline-none"
              />
            </div>
          </div>

          {departmentRequests.length === 0 ? (
            <div className="p-12 text-center text-slate-400 text-xs bg-slate-50 rounded-xl border border-slate-100">
              No leave requests submitted in this department yet.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-slate-50 text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                  <tr>
                    <th className="px-4 py-3">Ref ID</th>
                    <th className="px-4 py-3">Applicant Name</th>
                    <th className="px-4 py-3">Leave Type</th>
                    <th className="px-4 py-3">Period</th>
                    <th className="px-4 py-3">Days</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs font-medium text-slate-700">
                  {departmentRequests
                    .filter(r => {
                      if (!deptLeaveSearch.trim()) return true;
                      const q = deptLeaveSearch.toLowerCase();
                      return (
                        r.id.toLowerCase().includes(q) ||
                        r.applicantName.toLowerCase().includes(q) ||
                        r.leaveType.toLowerCase().includes(q) ||
                        r.status.toLowerCase().includes(q)
                      );
                    })
                    .map((r) => (
                      <tr 
                        key={r.id} 
                        className="hover:bg-slate-50/80 transition-colors cursor-pointer"
                        onClick={() => onSelectLeaveRequest(r.id)}
                      >
                        <td className="px-4 py-3 font-mono font-bold text-[#3F51B5]">{r.id}</td>
                        <td className="px-4 py-3">
                          <div className="font-semibold text-slate-900">{r.applicantName}</div>
                          <div className="text-[10px] text-slate-500">{r.applicantDesignation}</div>
                        </td>
                        <td className="px-4 py-3">
                          <MaterialChip label={r.leaveType} variant="leaveType" leaveType={r.leaveType} />
                        </td>
                        <td className="px-4 py-3 text-slate-600">{r.startDate} to {r.endDate}</td>
                        <td className="px-4 py-3 font-bold text-slate-800">{r.totalDays}</td>
                        <td className="px-4 py-3">
                          <MaterialChip label={r.status} variant="status" status={r.status} />
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                            <button
                              type="button"
                              onClick={() => onSelectLeaveRequest(r.id, true)}
                              className="px-2.5 py-1 text-[11px] font-bold text-slate-700 hover:text-[#3F51B5] bg-slate-100 hover:bg-slate-200 rounded-lg flex items-center gap-1 transition-colors cursor-pointer"
                            >
                              <Printer className="w-3 h-3" />
                              Print
                            </button>
                            <button
                              type="button"
                              onClick={() => onSelectLeaveRequest(r.id, false)}
                              className="px-2.5 py-1 text-[11px] font-bold text-white bg-[#3F51B5] hover:bg-[#303F9F] rounded-lg transition-colors cursor-pointer shadow-xs"
                            >
                              View Dossier
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

    </div>
  );
};
