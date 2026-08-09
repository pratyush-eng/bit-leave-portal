import React, { useState } from 'react';
import { useLeave } from '../../context/LeaveContext';
import { LeaveRequest } from '../../types';
import { MaterialChip } from '../common/MaterialChip';
import { TimelineStepper } from '../common/TimelineStepper';
import { 
  ShieldCheck, 
  MessageSquare, 
  CheckCircle2, 
  XCircle, 
  Building2, 
  Calendar, 
  Printer, 
  Award,
  Search,
  Filter
} from 'lucide-react';

interface RegistrarDashboardProps {
  onSelectLeaveRequest: (id: string, printMode?: boolean) => void;
}

export const RegistrarDashboard: React.FC<RegistrarDashboardProps> = ({ onSelectLeaveRequest }) => {
  const { currentUser, leaveRequests, registrarAction, departments } = useLeave();

  const [selectedDeptFilter, setSelectedDeptFilter] = useState<string>('ALL');
  const [selectedRequest, setSelectedRequest] = useState<LeaveRequest | null>(null);
  const [remarks, setRemarks] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'pending' | 'all_institutional'>('pending');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Requests that HOD recommended and are waiting for Registrar sanction
  const pendingRequests = leaveRequests.filter(r => {
    if (!r) return false;
    const isPendingReg = r.status === 'PENDING_REGISTRAR' || r.status === 'RECOMMENDED' || (r.hodApproval?.status === 'RECOMMENDED' && r.status !== 'APPROVED' && r.status !== 'REJECTED');
    if (!isPendingReg) return false;

    if (selectedDeptFilter !== 'ALL') {
      const filterClean = selectedDeptFilter.toLowerCase().trim();
      const reqDeptId = (r.departmentId || '').toLowerCase().trim();
      if (reqDeptId !== filterClean) return false;
    }
    return true;
  });

  const filteredAllRequests = leaveRequests.filter(r => {
    if (!r) return false;
    if (selectedDeptFilter !== 'ALL') {
      const filterClean = selectedDeptFilter.toLowerCase().trim();
      const reqDeptId = (r.departmentId || '').toLowerCase().trim();
      if (reqDeptId !== filterClean) return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const matchId = r.id.toLowerCase().includes(q);
      const matchName = r.applicantName.toLowerCase().includes(q);
      const matchEmail = (r.applicantEmail || '').toLowerCase().includes(q);
      const matchDept = (r.departmentName || '').toLowerCase().includes(q);
      const matchType = (r.leaveType || '').toLowerCase().includes(q);
      return matchId || matchName || matchEmail || matchDept || matchType;
    }
    return true;
  });

  const handleApprove = (req: LeaveRequest) => {
    const commentToSave = remarks.trim() || 'Sanctioned under institutional leave regulations.';
    registrarAction(req.id, 'APPROVED', commentToSave);
    setRemarks('');
    setSelectedRequest(null);
  };

  const handleReject = (req: LeaveRequest) => {
    if (!remarks.trim()) {
      alert('Please state reason for rejecting sanction.');
      return;
    }
    registrarAction(req.id, 'REJECTED', remarks);
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
              Registrar Executive Office
            </span>
            <span className="text-xs text-indigo-100 font-medium">Sanction Authority</span>
          </div>
          <h2 className="text-xl font-medium tracking-tight">
            Registrar Leave Sanction Portal • {currentUser.name}
          </h2>
          <p className="text-xs text-indigo-100/90 mt-1 max-w-xl leading-relaxed">
            Final approving authority for institutional leave applications recommended by departmental Head of Departments (HODs).
          </p>
        </div>

        <div className="bg-white/10 p-4 rounded-xl border border-white/20 text-center min-w-[150px]">
          <p className="text-3xl font-light text-white">{pendingRequests.length}</p>
          <p className="text-[10px] font-bold uppercase tracking-widest text-indigo-100 mt-1">Awaiting Sanction</p>
        </div>
      </div>

      {/* Navigation Tabs & Filter Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-2 border-b md:border-b-0 border-slate-100 pb-2 md:pb-0">
          <button
            onClick={() => setActiveTab('pending')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'pending'
                ? 'bg-[#3F51B5] text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            Pending Sanction Queue ({pendingRequests.length})
          </button>

          <button
            onClick={() => setActiveTab('all_institutional')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'all_institutional'
                ? 'bg-[#3F51B5] text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Institutional Register ({leaveRequests.length})
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {activeTab === 'all_institutional' && (
            <input
              type="text"
              placeholder="Search by ID, name, email, department..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-[#3F51B5]"
            />
          )}

          <div className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200 text-xs">
            <Filter className="w-4 h-4 text-slate-400" />
            <span className="text-slate-500">Dept:</span>
            <select
              value={selectedDeptFilter}
              onChange={(e) => setSelectedDeptFilter(e.target.value)}
              className="font-bold text-slate-800 bg-transparent focus:outline-none"
            >
              <option value="ALL">All Departments</option>
              {departments.map(d => (
                <option key={d.id} value={d.id}>{d.name} ({d.code})</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Requests List */}
      <div className="space-y-4">
        {activeTab === 'pending' ? (
          pendingRequests.length === 0 ? (
            <div className="bg-white p-12 rounded-xl border border-slate-100 text-center shadow-xs">
              <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-3" />
              <h3 className="text-sm font-semibold text-slate-800">Sanction Queue Cleared</h3>
              <p className="text-xs text-slate-500 mt-1">
                There are no pending HOD-endorsed applications awaiting Registrar sanction.
              </p>
            </div>
          ) : (
            pendingRequests.map((req) => (
              <div 
                key={req.id}
                className="bg-white p-6 rounded-xl border border-slate-100 shadow-xs hover:border-slate-300 transition-all space-y-4"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                  <div>
                    <span className="font-mono text-xs font-bold text-[#3F51B5] mr-2">{req.id}</span>
                    <span className="font-semibold text-sm text-slate-800">{req.applicantName}</span>
                    <span className="text-xs text-slate-500 ml-2">({req.applicantDesignation} • {req.departmentName})</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <MaterialChip label={req.leaveType} variant="leaveType" leaveType={req.leaveType} />
                    <span className="text-xs font-semibold text-slate-800 bg-slate-50 border border-slate-200 px-3 py-1 rounded">
                      {req.totalDays} Day(s) • {req.startDate} to {req.endDate}
                    </span>
                  </div>
                </div>

                {/* HOD Endorsement Note */}
                {req.hodApproval && (
                  <div className="bg-amber-50/80 p-3 rounded-lg border border-amber-200 text-xs text-amber-900 space-y-1">
                    <p className="font-bold text-amber-950 flex items-center gap-1.5 uppercase tracking-wide text-[10px]">
                      <CheckCircle2 className="w-3.5 h-3.5 text-amber-600" />
                      HOD Endorsement ({req.hodApproval.actionByName}):
                    </p>
                    <p className="italic text-slate-700">"{req.hodApproval.comments}"</p>
                    <p className="text-[10px] text-amber-700 font-mono">{req.hodApproval.actionDate}</p>
                  </div>
                )}

                {/* Timeline */}
                <TimelineStepper request={req} />

                {/* Action Form */}
                <div className="bg-indigo-50/50 p-4 rounded-lg border border-indigo-100 space-y-3">
                  <div className="flex items-center gap-2 text-slate-800 font-bold text-xs uppercase tracking-wide">
                    <MessageSquare className="w-4 h-4 text-[#3F51B5]" />
                    Registrar Sanction Order & Remarks:
                  </div>

                  <textarea
                    rows={2}
                    placeholder="Official remarks (e.g., 'Sanctioned under Clause 14-B. Deduct from Earned Leave balance.')"
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
                      View Application Dossier →
                    </button>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleReject(req)}
                        className="px-4 py-2 text-xs font-medium text-rose-700 bg-rose-50 border border-rose-200 hover:bg-rose-100 rounded transition-colors flex items-center gap-1 uppercase tracking-wide cursor-pointer"
                      >
                        <XCircle className="w-3.5 h-3.5" /> Reject Sanction
                      </button>

                      <button
                        onClick={() => handleApprove(req)}
                        className="px-5 py-2 text-xs font-medium text-white bg-emerald-600 hover:bg-emerald-700 rounded shadow-sm transition-all active:scale-95 flex items-center gap-1 uppercase tracking-wide cursor-pointer"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" /> Issue Final Sanction
                      </button>
                    </div>
                  </div>
                </div>

              </div>
            ))
          )
        ) : (
          /* Institutional Register Tab */
          filteredAllRequests.length === 0 ? (
            <div className="bg-white p-12 rounded-xl border border-slate-100 text-center shadow-xs">
              <p className="text-sm font-semibold text-slate-800">No Institutional Leave Records Found</p>
              <p className="text-xs text-slate-500 mt-1">Try adjusting department filter or search query.</p>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-slate-100 shadow-xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider text-[10px] font-bold border-b border-slate-100">
                    <tr>
                      <th className="px-4 py-3">ID</th>
                      <th className="px-4 py-3">Applicant</th>
                      <th className="px-4 py-3">Department</th>
                      <th className="px-4 py-3">Type</th>
                      <th className="px-4 py-3">Dates</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredAllRequests.map(req => (
                      <tr key={req.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="px-4 py-3 font-mono font-bold text-[#3F51B5]">{req.id}</td>
                        <td className="px-4 py-3">
                          <p className="font-bold text-slate-800">{req.applicantName}</p>
                          <p className="text-[10px] text-slate-400">{req.applicantEmail}</p>
                        </td>
                        <td className="px-4 py-3 font-medium text-slate-700">{req.departmentName}</td>
                        <td className="px-4 py-3">
                          <MaterialChip label={req.leaveType} variant="leaveType" leaveType={req.leaveType} />
                        </td>
                        <td className="px-4 py-3 text-slate-700">
                          {req.startDate} to {req.endDate} ({req.totalDays}d)
                        </td>
                        <td className="px-4 py-3">
                          <MaterialChip label={req.status} variant="status" status={req.status} />
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button
                            onClick={() => onSelectLeaveRequest(req.id)}
                            className="px-3 py-1 bg-indigo-50 text-[#3F51B5] rounded font-semibold hover:bg-indigo-100 text-[11px] cursor-pointer"
                          >
                            View
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )
        )}
      </div>

    </div>
  );
};
