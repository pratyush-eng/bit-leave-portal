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
      
      {/* Welcome & Stats Banner */}
      <div className="bg-[#3F51B5] rounded-xl p-6 text-white shadow-md flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-widest bg-white/20 text-white">
              Faculty Member
            </span>
            <span className="text-xs text-indigo-100 font-medium">Department of {currentUser?.departmentName || 'BIT Mesra'}</span>
          </div>
          <h2 className="text-xl font-medium tracking-tight">
            Welcome, {currentUser?.name || 'User'}
          </h2>
          <p className="text-xs text-indigo-100 mt-1">Manage your institutional leave applications and lecture substitute arrangements.</p>
        </div>

        <button
          onClick={onOpenApplyModal}
          className="px-5 py-2.5 bg-white text-[#3F51B5] font-bold text-xs rounded shadow-sm hover:bg-indigo-50 transition-all active:scale-95 flex items-center gap-2 uppercase tracking-wide cursor-pointer"
        >
          <Plus className="w-4 h-4" /> Apply for Leave
        </button>
      </div>

      {/* Leave Balance Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {Object.entries(currentUser?.leaveBalances || {}).map(([type, balance]) => {
          if (!balance) return null;
          const remaining = balance.total - balance.used;
          return (
            <div key={type} className="bg-white p-4 rounded-xl border border-slate-100 shadow-xs">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{type}</span>
                <Award className="w-4 h-4 text-[#3F51B5] opacity-20" />
              </div>
              <p className="text-2xl font-light text-slate-800">{remaining}</p>
              <div className="mt-2 w-full bg-slate-100 h-1 rounded-full overflow-hidden">
                <div 
                  className="bg-[#3F51B5] h-full rounded-full" 
                  style={{ width: `${(remaining / (balance.total || 1)) * 100}%` }}
                />
              </div>
              <p className="text-[9px] text-slate-400 mt-1 font-medium">Remaining of {balance.total} days</p>
            </div>
          );
        })}
      </div>

      {/* Active Pending Leave Requests */}
      {activeRequests.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-[10px] font-bold uppercase tracking-widest text-slate-400 flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-amber-500" />
            Active Applications Under Review
          </h3>

          <div className="space-y-4">
            {activeRequests.map((req, idx) => (
              <div 
                key={`faculty-act-req-${req?.id || 'id'}-${idx}`}
                onClick={() => onSelectLeaveRequest(req.id)}
                className="bg-white p-6 rounded-xl border border-slate-100 shadow-xs hover:border-slate-300 transition-all cursor-pointer group"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3 mb-3">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-[#3F51B5]">{req.id}</span>
                    <MaterialChip label={req.leaveType} variant="leaveType" leaveType={req.leaveType} />
                    <MaterialChip label={req.status} variant="status" status={req.status} />
                  </div>
                  <span className="text-xs text-slate-500">
                    Applied on: <strong>{req.appliedOn}</strong>
                  </span>
                </div>

                <TimelineStepper request={req} />

                <div className="flex items-center justify-between text-xs text-slate-600 pt-2 border-t border-slate-50 mt-3">
                  <span className="truncate max-w-md">Reason: <em>"{req.reason}"</em></span>
                  <span className="text-[#3F51B5] font-semibold text-xs group-hover:translate-x-1 transition-transform flex items-center gap-1 shrink-0">
                    View Details <ChevronRight className="w-4 h-4" />
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent Leave History Table */}
      <div className="bg-white rounded-xl border border-slate-100 shadow-xs overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500">Personal Leave History</h3>
          <span className="text-xs font-medium text-slate-500">{myRequests.length} Applications</span>
        </div>

        {myRequests.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-xs">
            No leave requests submitted yet. Click "Apply for Leave" to create one.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-50 text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                <tr>
                  <th className="px-6 py-4">Ref ID</th>
                  <th className="px-6 py-4">Leave Category</th>
                  <th className="px-6 py-4">Leave Period</th>
                  <th className="px-6 py-4">Days</th>
                  <th className="px-6 py-4">Current Stage</th>
                  <th className="px-6 py-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs font-medium text-slate-700">
                {myRequests.map((r, idx) => (
                  <tr 
                    key={`faculty-hist-req-${r?.id || 'id'}-${idx}`} 
                    onClick={() => onSelectLeaveRequest(r.id)}
                    className="hover:bg-slate-50/80 transition-colors cursor-pointer"
                  >
                    <td className="px-6 py-4 font-mono font-bold text-[#3F51B5]">{r.id}</td>
                    <td className="px-6 py-4">
                      <MaterialChip label={r.leaveType} variant="leaveType" leaveType={r.leaveType} />
                    </td>
                    <td className="px-6 py-4 text-slate-600">{r.startDate} to {r.endDate}</td>
                    <td className="px-6 py-4 font-semibold text-slate-800">{r.totalDays}</td>
                    <td className="px-6 py-4">
                      <MaterialChip label={r.status} variant="status" status={r.status} />
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-3">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectLeaveRequest(r.id, true);
                          }}
                          className="text-slate-600 hover:text-[#3F51B5] font-bold text-xs flex items-center gap-1 transition-colors cursor-pointer"
                          title="Print application for HOD approval"
                        >
                          <Printer className="w-3.5 h-3.5" />
                          Print Form
                        </button>
                        <button type="button" className="text-[#3F51B5] hover:underline font-bold text-xs">
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

      {/* Editorial Bottom System Banner */}
      <div className="bg-[#263238] p-6 rounded-xl shadow-md flex items-center gap-4 text-white">
        <div className="bg-orange-500 w-10 h-10 rounded-lg flex items-center justify-center shrink-0 text-white font-bold">
          <Sparkles className="w-5 h-5" />
        </div>
        <div>
          <h4 className="text-xs font-bold uppercase tracking-widest text-orange-400">Institutional Policy Active</h4>
          <p className="text-[11px] opacity-80 mt-0.5">Faculty substitution arrangements are verified by Department HOD prior to Registrar sanction.</p>
        </div>
      </div>

    </div>
  );
};
