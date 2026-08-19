import React from 'react';
import { useLeave } from '../../context/LeaveContext';
import { MaterialChip } from '../common/MaterialChip';
import { TimelineStepper } from '../common/TimelineStepper';
import { 
  Plus, 
  Calendar, 
  Clock, 
  CheckCircle2, 
  FileText, 
  ChevronRight, 
  Sparkles, 
  AlertCircle,
  TrendingUp,
  UserCheck,
  Printer,
  Award
} from 'lucide-react';

interface FacultyDashboardProps {
  onOpenApplyModal: () => void;
  onSelectLeaveRequest: (id: string, printMode?: boolean) => void;
}

export const FacultyDashboard: React.FC<FacultyDashboardProps> = ({ 
  onOpenApplyModal, 
  onSelectLeaveRequest 
}) => {
  const { currentUser, leaveRequests, leavePolicies } = useLeave();

  // Faculty/Staff member's own requests (with robust trimmed & case-insensitive matching)
  const myRequests = leaveRequests.filter(r => {
    if (!r || !currentUser) return false;
    const cleanReqEmail = (r.applicantEmail || '').toLowerCase().trim();
    const cleanUserEmail = (currentUser?.email || '').toLowerCase().trim();
    const cleanReqCode = (r.applicantEmployeeCode || '').toLowerCase().trim();
    const cleanUserCode = (currentUser?.employeeCode || '').toLowerCase().trim();
    const cleanReqName = (r.applicantName || '').toLowerCase().trim();
    const cleanUserName = (currentUser?.name || '').toLowerCase().trim();

    return (
      (r.applicantId && r.applicantId === currentUser?.id) ||
      (cleanReqEmail && cleanUserEmail && cleanReqEmail === cleanUserEmail) ||
      (cleanReqCode && cleanUserCode && cleanReqCode === cleanUserCode) ||
      (cleanReqName && cleanUserName && cleanReqName === cleanUserName)
    );
  });
  const activeRequests = myRequests.filter(r => r.status === 'PENDING_HOD' || r.status === 'PENDING_REGISTRAR');
  const recentHistory = myRequests.filter(r => r.status === 'APPROVED' || r.status === 'REJECTED' || r.status === 'CANCELLED');

  return (
    <div className="space-y-6">
      
      {/* Action Header Card from Image 1 */}
      <div className="bg-white rounded-xl p-8 border border-slate-100 shadow-xs flex flex-col md:flex-row items-center justify-between gap-6">
        <div>
          <h2 className="text-xl font-bold text-slate-800">Apply for Institutional Leave</h2>
          <p className="text-xs text-slate-400 mt-1 font-medium">
            Submit a leave application with lecture substitute arrangements for HOD & Registrar approval.
          </p>
        </div>
        <button
          onClick={onOpenApplyModal}
          className="px-6 py-3 bg-[#3F51B5] text-white font-bold text-xs rounded-lg shadow-lg shadow-indigo-100 flex items-center gap-2 uppercase tracking-widest transition-all active:scale-95 cursor-pointer"
        >
          <Plus className="w-4 h-4" /> Open Leave Application Form
        </button>
      </div>

      {/* Welcome Banner from Image 1 */}
      <div className="bg-[#3F51B5] rounded-xl p-8 text-white shadow-md flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 rounded text-[9px] font-bold uppercase tracking-[0.15em] bg-white/20 text-white">
              Faculty Member
            </span>
            <span className="text-[10px] text-white font-bold uppercase tracking-wider">Department of Information and Communication Technology</span>
          </div>
          <div>
            <h2 className="text-2xl font-bold tracking-tight">
              Welcome, {currentUser?.name || 'User'}
            </h2>
            <p className="text-xs text-indigo-100/90 font-medium mt-1">Manage your institutional leave applications and lecture substitute arrangements.</p>
          </div>
        </div>

        <button
          onClick={onOpenApplyModal}
          className="px-6 py-2.5 bg-white text-[#3F51B5] font-bold text-xs rounded shadow-sm hover:bg-indigo-50 transition-all active:scale-95 flex items-center gap-2 uppercase tracking-widest cursor-pointer shrink-0"
        >
          <Plus className="w-4 h-4" /> Apply for Leave
        </button>
      </div>

      {/* Leave Balance Overview (Simplified Style from Image 1) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
        {Object.entries(currentUser?.leaveBalances || {}).map(([type, balance]) => {
          if (!balance) return null;
          const remaining = balance.total - balance.used;
          return (
            <div key={type} className="bg-white p-6 rounded-xl border border-slate-100 shadow-xs relative overflow-hidden group">
              <div className="absolute top-4 right-4">
                <Award className="w-4 h-4 text-[#3F51B5] opacity-20 group-hover:opacity-40 transition-opacity" />
              </div>
              
              <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">{type}</span>
              <p className="text-3xl font-bold text-slate-800 mt-2">{remaining}</p>
              
              <div className="mt-4 w-full bg-slate-50 h-1.5 rounded-full overflow-hidden">
                <div 
                  className="bg-[#3F51B5] h-full rounded-full transition-all duration-700" 
                  style={{ width: `${(remaining / (balance.total || 1)) * 100}%` }}
                />
              </div>
              <p className="text-[10px] text-slate-400 mt-3 font-bold uppercase tracking-wide">Remaining of {balance.total} days</p>
            </div>
          );
        })}
      </div>

      {/* Active Pending Leave Requests (Maintained but styled cleaner) */}
      {activeRequests.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400 flex items-center gap-2">
            <Clock className="w-3.5 h-3.5" />
            Active Applications
          </h3>

          <div className="space-y-4">
            {activeRequests.map((req, idx) => (
              <div 
                key={`faculty-act-req-${req?.id || 'id'}-${idx}`}
                onClick={() => onSelectLeaveRequest(req.id)}
                className="bg-white p-6 rounded-xl border border-slate-100 shadow-xs hover:border-slate-200 transition-all cursor-pointer group"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-50 pb-4 mb-4">
                  <div className="flex items-center gap-3">
                    <span className="font-bold text-xs text-[#3F51B5] bg-indigo-50 px-2 py-1 rounded">{req.id}</span>
                    <MaterialChip label={req.leaveType} variant="leaveType" leaveType={req.leaveType} />
                    <MaterialChip label={req.status} variant="status" status={req.status} />
                  </div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                    Applied on: {req.appliedOn}
                  </span>
                </div>

                <TimelineStepper request={req} />

                <div className="flex items-center justify-between text-xs text-slate-500 pt-4 mt-4 border-t border-slate-50">
                  <span className="truncate max-w-md font-medium italic">"{req.reason}"</span>
                  <span className="text-[#3F51B5] font-bold text-[10px] uppercase tracking-widest flex items-center gap-1 group-hover:gap-2 transition-all">
                    View Details <ChevronRight className="w-3.5 h-3.5" />
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Personal Leave History from Image 1 */}
      <div className="bg-white rounded-xl border border-slate-100 shadow-xs overflow-hidden">
        <div className="px-8 py-6 border-b border-slate-50 flex items-center justify-between">
          <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">Personal Leave History</h3>
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{myRequests.length} Applications</span>
        </div>

        {myRequests.length === 0 ? (
          <div className="px-8 py-20 text-center flex flex-col items-center gap-3">
            <p className="text-[11px] text-slate-400 font-medium">No leave requests submitted yet. Click "Apply for Leave" to create one.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-50/50 text-[9px] uppercase font-bold text-slate-400 tracking-[0.15em]">
                <tr>
                  <th className="px-8 py-4">Ref ID</th>
                  <th className="px-8 py-4">Category</th>
                  <th className="px-8 py-4">Period</th>
                  <th className="px-8 py-4">Days</th>
                  <th className="px-8 py-4">Stage</th>
                  <th className="px-8 py-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 text-[11px] font-medium text-slate-600">
                {myRequests.map((r, idx) => (
                  <tr 
                    key={`faculty-hist-req-${r?.id || 'id'}-${idx}`} 
                    onClick={() => onSelectLeaveRequest(r.id)}
                    className="hover:bg-slate-50/50 transition-colors cursor-pointer"
                  >
                    <td className="px-8 py-4 font-bold text-[#3F51B5]">{r.id}</td>
                    <td className="px-8 py-4">
                      <MaterialChip label={r.leaveType} variant="leaveType" leaveType={r.leaveType} />
                    </td>
                    <td className="px-8 py-4 text-slate-400 font-bold">{r.startDate} — {r.endDate}</td>
                    <td className="px-8 py-4 font-bold text-slate-800">{r.totalDays}</td>
                    <td className="px-8 py-4">
                      <MaterialChip label={r.status} variant="status" status={r.status} />
                    </td>
                    <td className="px-8 py-4 text-right">
                      <div className="flex items-center justify-end gap-4">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectLeaveRequest(r.id, true);
                          }}
                          className="text-slate-400 hover:text-[#3F51B5] transition-colors"
                          title="Print Form"
                        >
                          <Printer className="w-4 h-4" />
                        </button>
                        <button type="button" className="text-[#3F51B5] font-bold hover:underline">
                          Details
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

      {/* Institutional Policy Banner from Image 1 */}
      <div className="bg-[#263238] p-8 rounded-xl shadow-lg flex items-center gap-6 text-white overflow-hidden relative">
        <div className="absolute right-0 top-0 bottom-0 w-32 bg-white/5 skew-x-[30deg] translate-x-16 pointer-events-none"></div>
        <div className="bg-orange-500 w-12 h-12 rounded-xl flex items-center justify-center shrink-0 text-white shadow-lg shadow-orange-500/20">
          <Sparkles className="w-6 h-6" />
        </div>
        <div>
          <h4 className="text-[10px] font-bold uppercase tracking-[0.25em] text-orange-500">Institutional Policy Active</h4>
          <p className="text-[11px] font-medium text-white/70 mt-1 leading-relaxed max-w-2xl">
            Faculty substitution arrangements are verified by Department HOD prior to Registrar sanction. 
            All leave applications must adhere to the institutional statutes of BIT Mesra.
          </p>
        </div>
      </div>

    </div>
  );
};
