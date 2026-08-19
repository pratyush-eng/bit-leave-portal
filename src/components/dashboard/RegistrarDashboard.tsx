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
      
      {/* Welcome & Stats Banner */}
      <div className="bg-[#3F51B5] rounded-xl p-6 text-white shadow-md flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-widest bg-white/20 text-white">
              Institutional Authority (Registrar)
            </span>
            <span className="text-xs text-indigo-100 font-medium">BIT Mesra • Institutional Administration</span>
          </div>
          <h2 className="text-xl font-medium tracking-tight">
            Institutional Sanction Portal
          </h2>
          <p className="text-xs text-indigo-100 mt-1">Review HOD-endorsed applications and issue official institutional sanction orders.</p>
        </div>

        <div className="bg-white/10 px-6 py-3 rounded-lg border border-white/20 text-center min-w-[120px]">
          <p className="text-2xl font-light">{pendingRequests.length}</p>
          <p className="text-[10px] font-bold uppercase tracking-widest opacity-80">Awaiting Order</p>
        </div>
      </div>

      {/* Stats Quick Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div 
          onClick={() => setActiveTab('pending')}
          className={`p-4 rounded-xl border transition-all cursor-pointer flex items-center gap-4 ${activeTab === 'pending' ? 'bg-[#3F51B5] border-[#3F51B5] text-white shadow-md' : 'bg-white border-slate-100 text-slate-700 hover:border-slate-200 shadow-xs'}`}
        >
          <div className={`p-2 rounded-lg ${activeTab === 'pending' ? 'bg-white/20' : 'bg-indigo-50 text-[#3F51B5]'}`}>
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <p className={`text-[10px] font-bold uppercase tracking-widest ${activeTab === 'pending' ? 'text-indigo-100' : 'text-slate-400'}`}>Sanction Queue</p>
            <p className="text-xl font-medium">{pendingRequests.length} Applications</p>
          </div>
        </div>

        <div 
          onClick={() => setActiveTab('all_institutional')}
          className={`p-4 rounded-xl border transition-all cursor-pointer flex items-center gap-4 ${activeTab === 'all_institutional' ? 'bg-[#3F51B5] border-[#3F51B5] text-white shadow-md' : 'bg-white border-slate-100 text-slate-700 hover:border-slate-200 shadow-xs'}`}
        >
          <div className={`p-2 rounded-lg ${activeTab === 'all_institutional' ? 'bg-white/20' : 'bg-indigo-50 text-[#3F51B5]'}`}>
            <Building2 className="w-5 h-5" />
          </div>
          <div>
            <p className={`text-[10px] font-bold uppercase tracking-widest ${activeTab === 'all_institutional' ? 'text-indigo-100' : 'text-slate-400'}`}>Institutional Register</p>
            <p className="text-xl font-medium">{leaveRequests.length} Total Records</p>
          </div>
        </div>
      </div>

      {/* Requests List */}
      <div className="space-y-6">
        {activeTab === 'pending' ? (
          pendingRequests.length === 0 ? (
            <div className="bg-white p-16 rounded-3xl border border-slate-200/60 text-center shadow-sm">
              <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4 border border-emerald-100">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-bold text-slate-900">Queue is Clear</h3>
              <p className="text-sm text-slate-500 mt-2 max-w-xs mx-auto">
                All departmental recommendations have been processed for final sanctioning.
              </p>
            </div>
          ) : (
            pendingRequests.map((req) => (
              <div 
                key={req.id}
                className="bg-white p-8 rounded-3xl border border-slate-200/60 shadow-sm hover:border-[#800000]/20 hover:shadow-md transition-all space-y-6 group"
              >
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
                      <p className="text-xs text-slate-500 font-medium uppercase tracking-wider mt-0.5">{req.applicantDesignation} • {req.departmentName}</p>
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

                {/* HOD Endorsement Note */}
                {req.hodApproval && (
                  <div className="bg-amber-50/60 p-5 rounded-2xl border border-amber-100 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-amber-900 font-bold text-[10px] uppercase tracking-widest">
                        <CheckCircle2 className="w-4 h-4 text-amber-600" />
                        Departmental Recommendation
                      </div>
                      <span className="text-[10px] font-mono text-amber-700 font-bold opacity-60">{req.hodApproval.actionDate}</span>
                    </div>
                    <div className="flex items-start gap-4">
                      <div className="h-full w-1 bg-amber-200 rounded-full shrink-0"></div>
                      <p className="italic text-sm text-slate-700 font-medium leading-relaxed">"{req.hodApproval.comments}"</p>
                    </div>
                    <p className="text-[10px] font-bold text-amber-800 uppercase tracking-widest ml-5">— {req.hodApproval.actionByName} (HOD)</p>
                  </div>
                )}

                {/* Timeline */}
                <div className="pt-2">
                  <TimelineStepper request={req} />
                </div>

                {/* Action Form */}
                <div className="bg-[#f8fafc] p-8 rounded-3xl border border-slate-200/60 space-y-6">
                  <div className="flex items-center gap-2 text-slate-900 font-bold text-xs uppercase tracking-[0.1em]">
                    <MessageSquare className="w-4 h-4 text-[#800000]" />
                    Official Sanction Remarks
                  </div>

                  <textarea
                    rows={3}
                    placeholder="Provide official administrative remarks for this sanction order..."
                    value={selectedRequest?.id === req.id ? remarks : ''}
                    onChange={(e) => {
                      setSelectedRequest(req);
                      setRemarks(e.target.value);
                    }}
                    className="w-full px-5 py-4 bg-white border border-slate-200 rounded-2xl text-sm font-medium text-slate-900 focus:outline-hidden focus:ring-4 focus:ring-[#800000]/5 focus:border-[#800000] transition-all placeholder:text-slate-400"
                  />

                  <div className="flex flex-col sm:flex-row items-center justify-between gap-6 pt-2">
                    <button
                      onClick={() => onSelectLeaveRequest(req.id)}
                      className="text-xs text-slate-500 font-bold hover:text-[#800000] uppercase tracking-widest transition-colors flex items-center gap-2"
                    >
                      Inspect Full Dossier <Printer className="w-4 h-4" />
                    </button>

                    <div className="flex items-center gap-3 w-full sm:w-auto">
                      <button
                        onClick={() => handleReject(req)}
                        className="flex-1 sm:flex-none px-8 py-3.5 text-[10px] font-bold text-rose-700 bg-white border border-rose-200 hover:bg-rose-50 rounded-xl transition-all uppercase tracking-widest cursor-pointer active:scale-95 shadow-sm"
                      >
                        Decline Sanction
                      </button>

                      <button
                        onClick={() => handleApprove(req)}
                        className="flex-1 sm:flex-none px-10 py-3.5 text-[10px] font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-lg shadow-emerald-900/20 transition-all uppercase tracking-widest cursor-pointer active:scale-95"
                      >
                        Approve & Issue Sanction
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
