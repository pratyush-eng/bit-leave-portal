import React, { useState } from 'react';
import { useLeave } from '../../context/LeaveContext';
import { DepartmentId } from '../../types';
import { MaterialChip } from '../common/MaterialChip';
import { 
  Calendar as CalendarIcon, 
  ChevronLeft, 
  ChevronRight, 
  Filter, 
  UserCheck, 
  Building2,
  Users
} from 'lucide-react';

export const LeaveCalendar: React.FC<{ onSelectLeaveRequest?: (id: string, printMode?: boolean) => void }> = ({ onSelectLeaveRequest }) => {
  const { leaveRequests, departments } = useLeave();
  
  const [selectedDept, setSelectedDept] = useState<string>('ALL');
  const [currentDate, setCurrentDate] = useState<Date>(new Date());

  const approvedRequests = leaveRequests.filter(r => {
    if (r.status !== 'APPROVED') return false;
    if (selectedDept !== 'ALL' && r.departmentId !== selectedDept) return false;
    return true;
  });

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
      
      {/* Header & Department Filter */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <CalendarIcon className="w-5 h-5 text-indigo-600" />
            Institutional Department Absence Calendar
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Real-time visual matrix of sanctioned faculty and staff leave coverage
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1.5 bg-slate-50 p-1.5 rounded-xl border border-slate-200 text-xs">
            <Filter className="w-4 h-4 text-slate-400 ml-1" />
            <select
              value={selectedDept}
              onChange={(e) => setSelectedDept(e.target.value)}
              className="bg-transparent font-semibold text-slate-800 focus:outline-none"
            >
              <option value="ALL">All Departments</option>
              {departments.map(d => (
                <option key={d.id} value={d.id}>{d.name} ({d.code})</option>
              ))}
            </select>
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
                  {dayLeaves.map(l => (
                    <div
                      key={l.id}
                      onClick={() => onSelectLeaveRequest && onSelectLeaveRequest(l.id)}
                      className="p-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-[11px] cursor-pointer transition-colors"
                    >
                      <p className="font-bold text-indigo-950 truncate leading-tight">{l.applicantName}</p>
                      <div className="flex items-center justify-between mt-0.5 text-[9px] text-indigo-700">
                        <span>{l.leaveType}</span>
                        <span>{l.departmentId}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

    </div>
  );
};
