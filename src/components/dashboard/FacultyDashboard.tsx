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
  Printer
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

  // Faculty's own requests
  const myRequests = leaveRequests.filter(r => r.applicantId === currentUser.id);
  const activeRequests = myRequests.filter(r => r.status === 'PENDING_HOD' || r.status === 'PENDING_REGISTRAR');
  const recentHistory = myRequests.filter(r => r.status === 'APPROVED' || r.status === 'REJECTED' || r.status === 'CANCELLED');

  return (
    <div className="space-y-6">
      
      {/* Welcome Banner */}
      <div className="bg-[#3F51B5] rounded-xl p-6 text-white shadow-md relative overflow-hidden flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-widest bg-white/20 text-white border border-white/20">
              {currentUser.departmentName}
            </span>
            <span className="text-xs text-indigo-100 font-medium">Emp Code: {currentUser.employeeCode}</span>
          </div>
          <h2 className="text-xl font-medium tracking-tight">
            Welcome back, {currentUser.name}
          </h2>
          <p className="text-xs text-indigo-100/90 mt-1 max-w-xl leading-relaxed">
            University leave quota tracking, substitute lecture handover management, and multi-tier HOD & Registrar sanction workflow portal.
          </p>
        </div>

        <button
          onClick={onOpenApplyModal}
          className="px-5 py-2.5 bg-white text-[#3F51B5] hover:bg-slate-50 rounded font-medium text-xs uppercase tracking-wide shadow-md transition-all active:scale-95 flex items-center gap-2 shrink-0 cursor-pointer"
        >
          <Plus className="w-4 h-4 text-[#3F51B5]" />
          Apply for Leave
        </button>
      </div>

      {/* Leave Quotas & Balances Grid */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-[10px] font-bold uppercase tracking-widest text-slate-400 flex items-center gap-1.5">
            <TrendingUp className="w-3.5 h-3.5 text-[#3F51B5]" />
            Annual Leave Balance Quotas
          </h3>
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Real-time Sync</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {leavePolicies.map((pol) => {
            const bal = currentUser.leaveBalances[pol.type] || { total: pol.annualQuota, used: 0, pending: 0 };
            const remaining = bal.total - bal.used - bal.pending;
            const percentUsed = Math.min(100, Math.round(((bal.used + bal.pending) / bal.total) * 100));

            return (
              <div 
                key={pol.type}
                className="bg-white p-5 rounded-xl shadow-xs border border-slate-100 flex flex-col justify-between hover:border-slate-300 transition-all"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <MaterialChip label={pol.label.split(' ')[0]} variant="leaveType" leaveType={pol.type} />
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      {remaining} Available
                    </span>
                  </div>

                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-2">{pol.label}</p>
                  <p className="text-3xl font-light text-[#3F51B5] mt-1">{remaining}</p>
                  <p className="text-[10px] text-slate-500 mt-0.5">Used: {bal.used} / Quota: {bal.total} Days</p>
                </div>

                {/* Editorial Thin Progress Bar */}
                <div className="mt-4 pt-2 border-t border-slate-50">
                  <div className="h-1 w-full bg-indigo-50 rounded-full overflow-hidden">
                    <div 
                      className="h-full rounded-full transition-all duration-300" 
                      style={{ 
                        width: `${percentUsed}%`, 
                        backgroundColor: '#3F51B5' 
                      }} 
                    />
                  </div>
                  {bal.pending > 0 && (
                    <p className="text-[10px] text-amber-600 font-bold uppercase tracking-wide mt-1.5 flex items-center gap-1">
                      <Clock className="w-3 h-3" /> {bal.pending} Pending Approval
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Active Pending Leave Requests */}
      {activeRequests.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-[10px] font-bold uppercase tracking-widest text-slate-400 flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-amber-500" />
            Active Applications Under Review
          </h3>

          <div className="space-y-4">
            {activeRequests.map((req) => (
              <div 
                key={req.id}
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
                {myRequests.map((r) => (
                  <tr 
                    key={r.id} 
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
