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

  const userDeptId = (currentUser?.departmentId || '').toLowerCase().trim();
  const userDeptName = (currentUser?.departmentName || '').toLowerCase().trim();
  const deptObj = departments.find(d => d.id === currentUser?.departmentId || d.hodId === currentUser?.id);

  // All department requests (robust matching on departmentId, departmentName, code or applicant self)
  const departmentRequests = leaveRequests.filter(r => {
    if (!r) return false;
    const reqDeptId = (r.departmentId || '').toLowerCase().trim();
    const reqDeptName = (r.departmentName || '').toLowerCase().trim();
    const matchId = reqDeptId && (reqDeptId === userDeptId || (deptObj && reqDeptId === deptObj.code.toLowerCase()));
    const matchName = reqDeptName && userDeptName && reqDeptName === userDeptName;
    const isSelf = r.applicantId === currentUser?.id || (r.applicantEmail && currentUser?.email && r.applicantEmail.toLowerCase().trim() === currentUser.email.toLowerCase().trim());

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
    return uDeptId === userDeptId || (uDeptName && uDeptName === userDeptName) || u.id === currentUser?.id;
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
      
      {/* Welcome & Stats Banner */}
      <div className="bg-primary rounded-xl p-6 text-white shadow-md flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-widest bg-white/20 text-white">
              Executive View (HOD)
            </span>
            <span className="text-xs text-indigo-100 font-medium">BIT Mesra • {currentUser.departmentName}</span>
          </div>
          <h2 className="text-xl font-medium tracking-tight">
            Recommendation Dashboard
          </h2>
          <p className="text-xs text-indigo-100 mt-1">Review departmental leave applications and recommend them for final sanctioning.</p>
        </div>

        <div className="bg-white/10 px-6 py-3 rounded-lg border border-white/20 text-center min-w-[120px]">
          <p className="text-2xl font-light">{pendingRequests.length}</p>
          <p className="text-[10px] font-bold uppercase tracking-widest opacity-80">Awaiting Action</p>
        </div>
      </div>

      {/* Requests Section with Navigation Tabs */}
      <div className="space-y-6">
        <div className="flex items-center gap-6 border-b border-slate-200">
          <button 
            onClick={() => setActiveTab('pending')}
            className={`pb-3 text-xs font-bold uppercase tracking-widest transition-all relative ${activeTab === 'pending' ? 'text-primary' : 'text-slate-400 hover:text-slate-600'}`}
          >
            Pending Review ({pendingRequests.length})
            {activeTab === 'pending' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-full" />}
          </button>
          <button 
            onClick={() => setActiveTab('department_team')}
            className={`pb-3 text-xs font-bold uppercase tracking-widest transition-all relative ${activeTab === 'department_team' ? 'text-primary' : 'text-slate-400 hover:text-slate-600'}`}
          >
            Department Team ({deptMembers.length})
            {activeTab === 'department_team' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-full" />}
          </button>
          <button 
            onClick={() => setActiveTab('department_leaves')}
            className={`pb-3 text-xs font-bold uppercase tracking-widest transition-all relative ${activeTab === 'department_leaves' ? 'text-primary' : 'text-slate-400 hover:text-slate-600'}`}
          >
            All Records ({departmentRequests.length})
            {activeTab === 'department_leaves' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-full" />}
          </button>
        </div>

        {/* Tab content starts here */}
        {activeTab === 'pending' && (
        <div className="space-y-6">
          {pendingRequests.length === 0 ? (
            <div className="bg-white p-16 rounded-3xl border border-slate-200/60 text-center shadow-sm">
              <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4 border border-emerald-100">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-bold text-slate-900">Queue is Empty</h3>
              <p className="text-sm text-slate-500 mt-2 max-w-xs mx-auto">
                No departmental leave applications are currently awaiting your endorsement.
              </p>
            </div>
          ) : (
            pendingRequests.map((req) => (
              <div 
                key={req.id}
                className="bg-white p-8 rounded-3xl border border-slate-200/60 shadow-sm hover:border-[#800000]/20 hover:shadow-md transition-all space-y-6 group"
              >
                {/* Applicant Info & Dates */}
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 border-b border-slate-100 pb-6">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-[#f8fafc] border border-slate-200 flex items-center justify-center font-bold text-[#800000]">
                      {req.applicantName.charAt(0)}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[10px] font-bold text-[#800000] bg-maroon-50 px-2 py-0.5 rounded uppercase tracking-wider">{req.id}</span>
                        <h4 className="font-bold text-lg text-slate-900">{req.applicantName}</h4>
                      </div>
                      <p className="text-xs text-slate-500 font-medium uppercase tracking-wider mt-0.5">{req.applicantDesignation}</p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-3">
                    <MaterialChip label={req.leaveType} variant="leaveType" leaveType={req.leaveType} />
                    <div className="h-8 w-px bg-slate-200 mx-1 hidden sm:block"></div>
                    <div className="flex items-center gap-3 px-4 py-2 bg-slate-50 rounded-xl border border-slate-100 font-bold text-slate-900">
                      <Calendar className="w-4 h-4 text-slate-400" />
                      <span className="text-xs">{req.totalDays} Days</span>
                      <span className="text-xs text-slate-400">•</span>
                      <span className="text-xs">{req.startDate} — {req.endDate}</span>
                    </div>
                  </div>
                </div>

                {/* Reason & Substitute Details */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <h5 className="text-[10px] font-bold uppercase tracking-widest text-slate-400 flex items-center gap-2">
                      <div className="w-1 h-1 rounded-full bg-[#800000]" />
                      Statement of Reason
                    </h5>
                    <p className="text-sm text-slate-700 leading-relaxed font-medium bg-slate-50/50 p-4 rounded-2xl border border-slate-100 italic">
                      "{req.reason}"
                    </p>
                  </div>
                  
                  {req.classHandovers && req.classHandovers.length > 0 ? (
                    <div className="space-y-2">
                      <h5 className="text-[10px] font-bold uppercase tracking-widest text-slate-400 flex items-center gap-2">
                        <div className="w-1 h-1 rounded-full bg-[#800000]" />
                        Academic Coverage ({req.classHandovers.length})
                      </h5>
                      <div className="space-y-2 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
                        {req.classHandovers.map((h, i) => (
                          <div key={i} className="p-3 bg-white border border-slate-100 rounded-xl flex items-center justify-between group/item hover:bg-slate-50 transition-colors">
                            <div>
                              <span className="text-[10px] font-bold text-[#800000] uppercase tracking-wider">{h.courseCode}</span>
                              <p className="text-xs font-bold text-slate-900">{h.substituteStaffName}</p>
                            </div>
                            <span className="text-[10px] font-bold text-slate-400 uppercase">{h.timeSlot}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <h5 className="text-[10px] font-bold uppercase tracking-widest text-slate-400 flex items-center gap-2">
                        <div className="w-1 h-1 rounded-full bg-[#800000]" />
                        Academic Coverage
                      </h5>
                      <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl text-xs text-slate-500 font-medium italic">
                        No substitute lecture arrangements recorded for this period.
                      </div>
                    </div>
                  )}
                </div>

                {/* Multi-tier timeline preview */}
                <div className="pt-2">
                  <TimelineStepper request={req} />
                </div>

                {/* Quick HOD Action Panel */}
                <div className="bg-[#f8fafc] p-6 rounded-3xl border border-slate-200/60 space-y-4">
                  <div className="flex items-center gap-2 text-slate-900 font-bold text-xs uppercase tracking-[0.1em]">
                    <MessageSquare className="w-4 h-4 text-[#800000]" />
                    Endorsement Remarks
                  </div>

                  <textarea
                    rows={3}
                    placeholder="Enter formal endorsement remarks for institutional records..."
                    value={selectedRequest?.id === req.id ? remarks : ''}
                    onChange={(e) => {
                      setSelectedRequest(req);
                      setRemarks(e.target.value);
                    }}
                    className="w-full px-4 py-3 bg-white border border-slate-200 rounded-2xl text-sm font-medium text-slate-900 focus:outline-hidden focus:ring-4 focus:ring-[#800000]/5 focus:border-[#800000] transition-all placeholder:text-slate-400"
                  />

                  <div className="flex flex-col sm:flex-row items-center justify-between pt-2 gap-4">
                    <button
                      onClick={() => onSelectLeaveRequest(req.id)}
                      className="text-xs text-slate-500 font-bold hover:text-[#800000] uppercase tracking-widest transition-colors flex items-center gap-2"
                    >
                      View Detailed Dossier <ChevronRight className="w-4 h-4" />
                    </button>

                    <div className="flex items-center gap-3 w-full sm:w-auto">
                      <button
                        onClick={() => handleReject(req)}
                        className="flex-1 sm:flex-none px-6 py-3 text-[10px] font-bold text-rose-700 bg-white border border-rose-200 hover:bg-rose-50 rounded-xl transition-all uppercase tracking-widest cursor-pointer active:scale-95"
                      >
                        Decline
                      </button>

                      <button
                        onClick={() => handleRecommend(req)}
                        className="flex-1 sm:flex-none px-8 py-3 text-[10px] font-bold text-white bg-[#800000] hover:bg-[#a00000] rounded-xl shadow-lg shadow-maroon-900/10 transition-all uppercase tracking-widest cursor-pointer active:scale-95"
                      >
                        Endorse & Forward
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
                <FileText className="w-4 h-4 text-primary" />
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
                className="w-full pl-9 pr-3 py-1.5 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-primary focus:outline-none"
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
                        (r.id || '').toLowerCase().includes(q) ||
                        (r.applicantName || '').toLowerCase().includes(q) ||
                        (r.leaveType || '').toLowerCase().includes(q) ||
                        (r.status || '').toLowerCase().includes(q)
                      );
                    })
                    .map((r) => (
                      <tr 
                        key={r.id} 
                        className="hover:bg-slate-50/80 transition-colors cursor-pointer"
                        onClick={() => onSelectLeaveRequest(r.id)}
                      >
                        <td className="px-4 py-3 font-mono font-bold text-primary">{r.id}</td>
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
                              className="px-2.5 py-1 text-[11px] font-bold text-slate-700 hover:text-primary bg-slate-100 hover:bg-slate-200 rounded-lg flex items-center gap-1 transition-colors cursor-pointer"
                            >
                              <Printer className="w-3 h-3" />
                              Print
                            </button>
                            <button
                              type="button"
                              onClick={() => onSelectLeaveRequest(r.id, false)}
                              className="px-2.5 py-1 text-[11px] font-bold text-white bg-primary hover:bg-[#303F9F] rounded-lg transition-colors cursor-pointer shadow-xs"
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

    </div>
  );
};
