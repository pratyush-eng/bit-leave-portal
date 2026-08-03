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
  Search
} from 'lucide-react';

interface HodDashboardProps {
  onSelectLeaveRequest: (id: string, printMode?: boolean) => void;
}

export const HodDashboard: React.FC<HodDashboardProps> = ({ onSelectLeaveRequest }) => {
  const { currentUser, leaveRequests, allUsers, hodAction } = useLeave();

  const [activeTab, setActiveTab] = useState<'pending' | 'department_team'>('pending');
  const [selectedRequest, setSelectedRequest] = useState<LeaveRequest | null>(null);
  const [remarks, setRemarks] = useState<string>('');

  // Requests in HOD's department waiting for HOD recommendation
  const pendingRequests = leaveRequests.filter(
    r => r.status === 'PENDING_HOD' && r.departmentId === currentUser.departmentId
  );

  // All department requests
  const departmentRequests = leaveRequests.filter(r => r.departmentId === currentUser.departmentId);

  // Department faculty/staff members
  const deptMembers = allUsers.filter(u => u.departmentId === currentUser.departmentId);

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

    </div>
  );
};
