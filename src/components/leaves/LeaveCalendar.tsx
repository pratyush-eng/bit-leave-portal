import React, { useState, useEffect, useMemo } from 'react';
import { useLeave } from '../../context/LeaveContext';
import { DepartmentId, LeaveRequest } from '../../types';
import { MaterialChip } from '../common/MaterialChip';
import { TimelineStepper } from '../common/TimelineStepper';
import { 
  Calendar as CalendarIcon, 
  ChevronLeft, 
  ChevronRight, 
  Filter, 
  UserCheck, 
  Building2,
  Users,
  ShieldAlert,
  Lock,
  History,
  Printer,
  Search,
  CheckCircle2,
  Clock,
  XCircle,
  FileText,
  User
} from 'lucide-react';

export const LeaveCalendar: React.FC<{ onSelectLeaveRequest?: (id: string, printMode?: boolean) => void }> = ({ onSelectLeaveRequest }) => {
  const { leaveRequests, departments, currentUser } = useLeave();
  
  const isDeptAdmin = currentUser?.role === 'ADMIN' && currentUser?.role !== 'SUPER_ADMIN';
  const isDeptRestricted = isDeptAdmin || (currentUser?.role !== 'SUPER_ADMIN' && currentUser?.role !== 'REGISTRAR');
  const userDeptId = currentUser?.departmentId;

  const [activeTab, setActiveTab] = useState<'calendar' | 'my_history'>('calendar');
  const [selectedDept, setSelectedDept] = useState<string>('ALL');
  const [currentDate, setCurrentDate] = useState<Date>(new Date());

  // Filter states for My Leave History tab
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [typeFilter, setTypeFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  useEffect(() => {
    if (isDeptRestricted && userDeptId) {
      setSelectedDept(userDeptId);
    }
  }, [isDeptRestricted, userDeptId]);

  const effectiveDept = (isDeptRestricted && userDeptId) ? userDeptId : selectedDept;

  // Identify logged-in user's personal requests with robust email, code, name, & ID matching
  const myRequests = useMemo(() => {
    if (!currentUser) return [];
    const cleanUserEmail = (currentUser.email || '').toLowerCase().trim();
    const cleanUserCode = (currentUser.employeeCode || '').toLowerCase().trim();
    const cleanUserName = (currentUser.name || '').toLowerCase().trim();

    return leaveRequests.filter(r => {
      if (!r) return false;
      const cleanReqEmail = (r.applicantEmail || '').toLowerCase().trim();
      const cleanReqCode = (r.applicantEmployeeCode || '').toLowerCase().trim();
      const cleanReqName = (r.applicantName || '').toLowerCase().trim();

      return (
        (r.applicantId && currentUser.id && r.applicantId === currentUser.id) ||
        (cleanReqEmail && cleanUserEmail && cleanReqEmail === cleanUserEmail) ||
        (cleanReqCode && cleanUserCode && cleanReqCode === cleanUserCode) ||
        (cleanReqName && cleanUserName && cleanReqName === cleanUserName)
      );
    });
  }, [leaveRequests, currentUser]);

  // Helper to check if a leave request belongs to the logged in user
  const isMyRequest = (r: LeaveRequest) => {
    if (!currentUser) return false;
    const cleanUserEmail = (currentUser.email || '').toLowerCase().trim();
    const cleanUserCode = (currentUser.employeeCode || '').toLowerCase().trim();
    const cleanUserName = (currentUser.name || '').toLowerCase().trim();

    const cleanReqEmail = (r.applicantEmail || '').toLowerCase().trim();
    const cleanReqCode = (r.applicantEmployeeCode || '').toLowerCase().trim();
    const cleanReqName = (r.applicantName || '').toLowerCase().trim();

    return (
      (r.applicantId && currentUser.id && r.applicantId === currentUser.id) ||
      (cleanReqEmail && cleanUserEmail && cleanReqEmail === cleanUserEmail) ||
      (cleanReqCode && cleanUserCode && cleanReqCode === cleanUserCode) ||
      (cleanReqName && cleanUserName && cleanReqName === cleanUserName)
    );
  };

  const approvedRequests = leaveRequests.filter(r => {
    if (r.status !== 'APPROVED') return false;
    if (effectiveDept !== 'ALL' && r.departmentId !== effectiveDept) return false;
    return true;
  });

  // Filtered personal history records
  const filteredMyRequests = useMemo(() => {
    return myRequests.filter(r => {
      if (statusFilter !== 'ALL' && r.status !== statusFilter) return false;
      if (typeFilter !== 'ALL' && r.leaveType !== typeFilter) return false;
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const matchesId = r.id.toLowerCase().includes(query);
        const matchesType = r.leaveType.toLowerCase().includes(query);
        const matchesReason = (r.reason || '').toLowerCase().includes(query);
        const matchesDates = `${r.startDate} ${r.endDate}`.includes(query);
        if (!matchesId && !matchesType && !matchesReason && !matchesDates) return false;
      }
      return true;
    });
  }, [myRequests, statusFilter, typeFilter, searchQuery]);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfWeek = new Date(year, month, 1).getDay();

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  // Helper to check which leaves fall on a given day
  const getLeavesForDay = (dayNumber: number) => {
    const formattedDay = `${year}-${String(month + 1).padStart(2, '0')}-${String(dayNumber).padStart(2, '0')}`;
    return approvedRequests.filter(r => {
      return formattedDay >= r.startDate && formattedDay <= r.endDate;
    });
  };

  return (
    <div className="space-y-6">
      
      {/* Top Main Navigation Tabs */}
      <div className="bg-white p-2 rounded-2xl border border-slate-200 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button
            onClick={() => setActiveTab('calendar')}
            className={`flex-1 sm:flex-none px-5 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer ${
              activeTab === 'calendar'
                ? 'bg-[#3F51B5] text-white shadow-xs'
                : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
            }`}
          >
            <CalendarIcon className="w-4 h-4" />
            Department Absence Calendar
          </button>
          
          <button
            onClick={() => setActiveTab('my_history')}
            className={`flex-1 sm:flex-none px-5 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer ${
              activeTab === 'my_history'
                ? 'bg-[#3F51B5] text-white shadow-xs'
                : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
            }`}
          >
            <History className="w-4 h-4" />
            My Personal Leave History
            {myRequests.length > 0 && (
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                activeTab === 'my_history' ? 'bg-white text-[#3F51B5]' : 'bg-indigo-100 text-indigo-900'
              }`}>
                {myRequests.length}
              </span>
            )}
          </button>
        </div>

        <div className="text-xs text-slate-500 font-medium px-3 py-1 bg-slate-50 rounded-xl border border-slate-100 flex items-center gap-1.5">
          <User className="w-3.5 h-3.5 text-indigo-600" />
          <span>Logged as: <strong>{currentUser?.name || 'Staff/Faculty'}</strong> ({currentUser?.departmentId || 'BIT'})</span>
        </div>
      </div>

      {/* TAB 1: CALENDAR VIEW */}
      {activeTab === 'calendar' && (
        <div className="space-y-6">
          
          {/* Department Restriction Notice for Admin */}
          {isDeptAdmin && (
            <div className="bg-indigo-50/80 border border-indigo-200 rounded-2xl p-4 flex items-center justify-between gap-4 text-indigo-950">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold shrink-0">
                  <Lock className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs font-bold text-indigo-950 flex items-center gap-2">
                    Department Restricted View Active
                  </p>
                  <p className="text-xs text-indigo-800 mt-0.5">
                    As a Department Admin for <strong>{currentUser?.departmentName || userDeptId}</strong> ({userDeptId}), calendar visibility is restricted strictly to your own department's sanctioned leaves.
                  </p>
                </div>
              </div>
              <span className="hidden sm:inline-block px-3 py-1 bg-indigo-200 text-indigo-900 font-extrabold text-[10px] rounded-full uppercase tracking-wider whitespace-nowrap">
                {userDeptId} Dept Only
              </span>
            </div>
          )}

          {/* Header & Department Filter */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div>
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <CalendarIcon className="w-5 h-5 text-indigo-600" />
                {isDeptAdmin ? `${currentUser?.departmentName || userDeptId} Absence Calendar` : 'Institutional Department Absence Calendar'}
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Real-time visual matrix of sanctioned faculty and staff leave coverage
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-1.5 bg-slate-50 p-1.5 rounded-xl border border-slate-200 text-xs">
                <Filter className="w-4 h-4 text-slate-400 ml-1" />
                <select
                  value={effectiveDept}
                  onChange={(e) => setSelectedDept(e.target.value)}
                  disabled={isDeptRestricted}
                  className={`bg-transparent font-semibold text-slate-800 focus:outline-none ${
                    isDeptRestricted ? 'opacity-75 cursor-not-allowed' : 'cursor-pointer'
                  }`}
                >
                  {!isDeptRestricted && <option value="ALL">All Departments</option>}
                  {departments
                    .filter(d => !isDeptRestricted || d.id === userDeptId)
                    .map(d => (
                      <option key={d.id} value={d.id}>{d.name} ({d.code})</option>
                    ))}
                </select>
                {isDeptRestricted && (
                  <span className="text-[10px] bg-amber-100 text-amber-800 font-bold px-2 py-0.5 rounded-full border border-amber-200 ml-1">
                    Locked to {userDeptId}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-xl">
                <button 
                  onClick={handlePrevMonth}
                  className="p-1.5 rounded-lg hover:bg-white text-slate-700 transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="text-xs font-bold text-slate-900 px-2 min-w-[110px] text-center">
                  {monthNames[month]} {year}
                </span>
                <button 
                  onClick={handleNextMonth}
                  className="p-1.5 rounded-lg hover:bg-white text-slate-700 transition-colors"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Calendar Grid */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
            
            {/* Days of Week Header */}
            <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50 text-center text-xs font-bold text-slate-600 py-3">
              <span>Sun</span>
              <span>Mon</span>
              <span>Tue</span>
              <span>Wed</span>
              <span>Thu</span>
              <span>Fri</span>
              <span>Sat</span>
            </div>

            {/* Days Grid */}
            <div className="grid grid-cols-7 auto-rows-fr divide-x divide-y divide-slate-100 min-h-[500px]">
              {/* Empty cells for leading days */}
              {Array.from({ length: firstDayOfWeek }).map((_, i) => (
                <div key={`empty-${i}`} className="bg-slate-50/40 p-2 min-h-[100px]" />
              ))}

              {/* Actual Days */}
              {Array.from({ length: daysInMonth }).map((_, i) => {
                const dayNum = i + 1;
                const dayLeaves = getLeavesForDay(dayNum);
                const isToday = new Date().getDate() === dayNum && new Date().getMonth() === month && new Date().getFullYear() === year;

                return (
                  <div 
                    key={`day-${dayNum}`}
                    className={`p-2 min-h-[100px] flex flex-col justify-start transition-colors ${
                      isToday ? 'bg-indigo-50/40 font-bold' : 'hover:bg-slate-50/60'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        isToday ? 'bg-indigo-600 text-white font-extrabold' : 'text-slate-700 font-semibold'
                      }`}>
                        {dayNum}
                      </span>
                      {dayLeaves.length > 0 && (
                        <span className="text-[10px] font-bold text-slate-400">
                          {dayLeaves.length} absent
                        </span>
                      )}
                    </div>

                    <div className="space-y-1 overflow-y-auto max-h-[90px]">
                      {dayLeaves.map(l => {
                        const mine = isMyRequest(l);
                        return (
                          <div
                            key={l.id}
                            onClick={() => onSelectLeaveRequest && onSelectLeaveRequest(l.id)}
                            className={`p-1.5 rounded-lg border text-[11px] cursor-pointer transition-colors ${
                              mine 
                                ? 'bg-emerald-50 hover:bg-emerald-100 border-emerald-300 text-emerald-950 font-bold'
                                : 'bg-indigo-50 hover:bg-indigo-100 border-indigo-200 text-indigo-950'
                            }`}
                          >
                            <div className="flex items-center justify-between gap-1">
                              <p className="font-bold truncate leading-tight">{l.applicantName}</p>
                              {mine && (
                                <span className="bg-emerald-600 text-white text-[9px] font-extrabold px-1.5 py-0.2 rounded-full uppercase tracking-tighter shrink-0">
                                  You
                                </span>
                              )}
                            </div>
                            <div className="flex items-center justify-between mt-0.5 text-[9px] opacity-80">
                              <span>{l.leaveType}</span>
                              <span>{l.departmentId}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Quick Summary Section of User's Sanctioned Leaves on Calendar */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <User className="w-4 h-4 text-emerald-600" />
                Your Sanctioned & Active Leave Applications
              </h3>
              <button
                onClick={() => setActiveTab('my_history')}
                className="text-xs font-bold text-[#3F51B5] hover:underline flex items-center gap-1 cursor-pointer"
              >
                View Complete Leave History ({myRequests.length}) &rarr;
              </button>
            </div>

            {myRequests.length === 0 ? (
              <p className="text-xs text-slate-500 py-3 italic">
                No personal leave records found. Use the "Apply for Leave" tab to submit a new leave application.
              </p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {myRequests.slice(0, 4).map(r => (
                  <div
                    key={r.id}
                    onClick={() => onSelectLeaveRequest && onSelectLeaveRequest(r.id)}
                    className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-white hover:border-indigo-300 transition-all cursor-pointer space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-extrabold text-xs text-indigo-950">{r.id}</span>
                      <MaterialChip label={r.status} variant="status" status={r.status} />
                    </div>
                    <div className="flex items-center justify-between text-xs text-slate-700 font-medium">
                      <span>{r.leaveType}</span>
                      <span>{r.startDate} &rarr; {r.endDate} ({r.totalDays}d)</span>
                    </div>
                    <p className="text-[11px] text-slate-500 line-clamp-1 italic">
                      "{r.reason}"
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
      )}

      {/* TAB 2: MY PERSONAL LEAVE HISTORY VIEW */}
      {activeTab === 'my_history' && (
        <div className="space-y-6">
          
          {/* Header & Stats Bar */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
              <div>
                <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <History className="w-5 h-5 text-indigo-600" />
                  My Personal Leave Application History
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Complete historic record of all leave applications submitted by {currentUser?.name}
                </p>
              </div>

              <div className="flex items-center gap-2 text-xs font-bold text-indigo-900 bg-indigo-50 px-3 py-1.5 rounded-xl border border-indigo-100">
                <span>Total Applications:</span>
                <span className="text-sm font-extrabold text-[#3F51B5]">{myRequests.length}</span>
              </div>
            </div>

            {/* Quick Status Stats Badges */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Applied</p>
                  <p className="text-lg font-extrabold text-slate-900">{myRequests.length}</p>
                </div>
                <FileText className="w-5 h-5 text-slate-400" />
              </div>

              <div className="bg-emerald-50/60 p-3 rounded-xl border border-emerald-200 flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-800">Sanctioned</p>
                  <p className="text-lg font-extrabold text-emerald-950">
                    {myRequests.filter(r => r.status === 'APPROVED').length}
                  </p>
                </div>
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              </div>

              <div className="bg-amber-50/60 p-3 rounded-xl border border-amber-200 flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-amber-800">Pending Review</p>
                  <p className="text-lg font-extrabold text-amber-950">
                    {myRequests.filter(r => r.status === 'PENDING_HOD' || r.status === 'PENDING_REGISTRAR').length}
                  </p>
                </div>
                <Clock className="w-5 h-5 text-amber-600" />
              </div>

              <div className="bg-rose-50/60 p-3 rounded-xl border border-rose-200 flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-rose-800">Rejected/Cancelled</p>
                  <p className="text-lg font-extrabold text-rose-950">
                    {myRequests.filter(r => r.status === 'REJECTED' || r.status === 'CANCELLED').length}
                  </p>
                </div>
                <XCircle className="w-5 h-5 text-rose-600" />
              </div>
            </div>

            {/* Filters Bar */}
            <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 pt-2">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search by ID, leave type, or reason..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 focus:outline-none cursor-pointer"
                >
                  <option value="ALL">All Statuses</option>
                  <option value="APPROVED">Sanctioned (Approved)</option>
                  <option value="PENDING_HOD">Pending HOD</option>
                  <option value="PENDING_REGISTRAR">Pending Registrar</option>
                  <option value="REJECTED">Rejected</option>
                  <option value="CANCELLED">Cancelled</option>
                </select>

                <select
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value)}
                  className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 focus:outline-none cursor-pointer"
                >
                  <option value="ALL">All Leave Types</option>
                  <option value="Casual Leave">Casual Leave (CL)</option>
                  <option value="Earned Leave">Earned Leave (EL)</option>
                  <option value="Commuted Leave">Commuted Leave (Medical)</option>
                  <option value="Maternity Leave">Maternity Leave</option>
                  <option value="Paternity Leave">Paternity Leave</option>
                  <option value="Duty Leave">Special Casual / Duty Leave</option>
                </select>
              </div>
            </div>
          </div>

          {/* Leave Applications List */}
          <div className="space-y-4">
            {filteredMyRequests.length === 0 ? (
              <div className="bg-white p-8 rounded-2xl border border-slate-200 text-center space-y-2">
                <History className="w-8 h-8 text-slate-300 mx-auto" />
                <p className="text-sm font-bold text-slate-700">No leave records matching filter</p>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                  Try adjusting your search query or status filters to view previous leave submissions.
                </p>
              </div>
            ) : (
              filteredMyRequests.map(r => (
                <div
                  key={r.id}
                  onClick={() => onSelectLeaveRequest && onSelectLeaveRequest(r.id)}
                  className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs hover:border-indigo-300 transition-all cursor-pointer space-y-3"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-extrabold text-sm text-indigo-950">{r.id}</span>
                      <MaterialChip label={r.leaveType} variant="leaveType" leaveType={r.leaveType} />
                      <MaterialChip label={r.status} variant="status" status={r.status} />
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="text-xs text-slate-600">
                        Period: <strong>{r.startDate} to {r.endDate}</strong> ({r.totalDays} days)
                      </span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (onSelectLeaveRequest) onSelectLeaveRequest(r.id, true);
                        }}
                        className="px-2.5 py-1 text-xs font-bold bg-indigo-50 hover:bg-indigo-100 text-[#3F51B5] rounded-lg border border-indigo-200 flex items-center gap-1 transition-colors cursor-pointer"
                        title="Print official application sheet"
                      >
                        <Printer className="w-3.5 h-3.5" />
                        Print Form
                      </button>
                    </div>
                  </div>

                  {/* Reason & Substitute info */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs bg-slate-50 p-3 rounded-xl border border-slate-100">
                    <div>
                      <span className="font-bold text-slate-500 uppercase text-[10px] block">Reason for Leave:</span>
                      <p className="text-slate-800 mt-0.5">{r.reason || 'Not specified'}</p>
                    </div>
                    <div>
                      <span className="font-bold text-slate-500 uppercase text-[10px] block">Substitute Arrangement:</span>
                      <p className="text-slate-800 mt-0.5">{r.substituteArrangement || 'N/A'}</p>
                    </div>
                  </div>

                  {/* Approval Stepper */}
                  <TimelineStepper request={r} />
                </div>
              ))
            )}
          </div>

        </div>
      )}

    </div>
  );
};
