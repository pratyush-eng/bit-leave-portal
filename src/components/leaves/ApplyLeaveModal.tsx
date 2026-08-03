import React, { useState, useEffect } from 'react';
import { useLeave } from '../../context/LeaveContext';
import { LeaveType, ClassHandover } from '../../types';
import confetti from 'canvas-confetti';
import { 
  X, 
  Calendar as CalendarIcon, 
  FileText, 
  Paperclip, 
  Phone, 
  MapPin, 
  UserCheck, 
  Plus, 
  Trash2, 
  AlertCircle,
  CheckCircle2,
  Clock,
  Sparkles
} from 'lucide-react';

interface ApplyLeaveModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const ApplyLeaveModal: React.FC<ApplyLeaveModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const { currentUser, allUsers, leavePolicies, applyForLeave } = useLeave();

  const [leaveType, setLeaveType] = useState<LeaveType>('CASUAL');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [isHalfDay, setIsHalfDay] = useState<boolean>(false);
  const [halfDaySession, setHalfDaySession] = useState<'FIRST_HALF' | 'SECOND_HALF'>('FIRST_HALF');
  const [reason, setReason] = useState<string>('');
  const [contactPhone, setContactPhone] = useState<string>(currentUser.phone || '');
  const [contactAddress, setContactAddress] = useState<string>('');
  const [documentUrl, setDocumentUrl] = useState<string>('');
  const [fileName, setFileName] = useState<string>('');
  
  // Class handovers for faculty
  const [handovers, setHandovers] = useState<ClassHandover[]>([]);

  // Calculate working days between startDate and endDate
  const calculateDays = (): number => {
    if (!startDate || !endDate) return 0;
    if (isHalfDay) return 0.5;

    const start = new Date(startDate);
    const end = new Date(endDate);
    
    if (end < start) return 0;

    let count = 0;
    const cur = new Date(start);
    while (cur <= end) {
      const day = cur.getDay();
      if (day !== 0 && day !== 6) { // Exclude Sunday (0) and Saturday (6)
        count++;
      } else {
        count++; // Count all calendar days for educational institutions if needed, or 5-day week
      }
      cur.setDate(cur.getDate() + 1);
    }
    return count > 0 ? count : 1;
  };

  const calculatedDays = calculateDays();

  // Current balance for selected leave type
  const selectedPolicy = leavePolicies.find(p => p.type === leaveType);
  const userBalance = currentUser.leaveBalances[leaveType] || { total: 0, used: 0, pending: 0 };
  const remainingDays = userBalance.total - userBalance.used - userBalance.pending;

  const isExceedingBalance = calculatedDays > remainingDays;

  // Substitute staff list (faculty from same/other department)
  const availableSubstitutes = allUsers.filter(u => u.id !== currentUser.id);

  const handleAddHandover = () => {
    setHandovers(prev => [
      ...prev,
      {
        courseCode: '',
        courseName: '',
        substituteStaffId: availableSubstitutes[0]?.id || '',
        substituteStaffName: availableSubstitutes[0]?.name || '',
        date: startDate || new Date().toISOString().split('T')[0],
        timeSlot: '10:00 AM - 11:30 AM'
      }
    ]);
  };

  const handleRemoveHandover = (index: number) => {
    setHandovers(prev => prev.filter((_, i) => i !== index));
  };

  const handleHandoverChange = (index: number, field: keyof ClassHandover, value: string) => {
    setHandovers(prev => prev.map((h, i) => {
      if (i === index) {
        if (field === 'substituteStaffId') {
          const staff = availableSubstitutes.find(s => s.id === value);
          return { ...h, substituteStaffId: value, substituteStaffName: staff ? staff.name : '' };
        }
        return { ...h, [field]: value };
      }
      return h;
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!startDate || !endDate) {
      alert('Please select both start and end dates.');
      return;
    }
    if (calculatedDays <= 0) {
      alert('End date must be on or after start date.');
      return;
    }
    if (!reason.trim()) {
      alert('Please provide a valid reason for applying leave.');
      return;
    }

    applyForLeave({
      leaveType,
      startDate,
      endDate,
      totalDays: calculatedDays,
      isHalfDay,
      halfDaySession: isHalfDay ? halfDaySession : undefined,
      reason,
      contactPhone,
      contactAddress,
      documentUrl: fileName ? `https://example.com/docs/${fileName}` : undefined,
      classHandovers: currentUser.role === 'FACULTY' ? handovers : undefined
    });

    // Trigger celebratory confetti
    confetti({
      particleCount: 50,
      spread: 60,
      origin: { y: 0.6 }
    });

    if (onSuccess) onSuccess();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full my-8 border border-slate-200 overflow-hidden flex flex-col">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 px-6 py-5 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-white/10 rounded-xl backdrop-blur-xs">
              <FileText className="w-6 h-6 text-blue-200" />
            </div>
            <div>
              <h3 className="text-lg font-bold">Apply for Institutional Leave</h3>
              <p className="text-xs text-blue-200">
                Official Multi-Tier Sanction Portal • {currentUser.departmentName}
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 text-blue-200 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5 overflow-y-auto max-h-[75vh]">
          
          {/* Leave Type Selector with Balance Overview */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
              Leave Category & Policy
            </label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <select
                  value={leaveType}
                  onChange={(e) => setLeaveType(e.target.value as LeaveType)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:ring-2 focus:ring-indigo-500 transition-all"
                >
                  {leavePolicies.map(p => (
                    <option key={p.type} value={p.type}>
                      {p.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Balance Box */}
              <div className="bg-slate-50 border border-slate-200 p-3 rounded-xl flex items-center justify-between">
                <div>
                  <p className="text-[11px] text-slate-500 font-medium">Available Quota</p>
                  <p className="text-base font-extrabold text-indigo-950">
                    {remainingDays} <span className="text-xs font-normal text-slate-500">/ {userBalance.total} Days</span>
                  </p>
                </div>
                {userBalance.pending > 0 && (
                  <span className="text-[10px] font-semibold text-amber-700 bg-amber-50 px-2 py-1 rounded-md border border-amber-200">
                    {userBalance.pending} days pending
                  </span>
                )}
              </div>
            </div>

            {selectedPolicy && (
              <p className="text-[11px] text-slate-500 italic bg-blue-50/60 p-2.5 rounded-lg border border-blue-100/80">
                ℹ️ {selectedPolicy.description}
              </p>
            )}
          </div>

          {/* Dates & Half-Day Options */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1">
                Start Date
              </label>
              <input
                type="date"
                required
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value);
                  if (!endDate) setEndDate(e.target.value);
                }}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium text-slate-900 focus:bg-white focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1">
                End Date
              </label>
              <input
                type="date"
                required
                disabled={isHalfDay}
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium text-slate-900 focus:bg-white focus:ring-2 focus:ring-indigo-500 disabled:opacity-50"
              />
            </div>
          </div>

          {/* Half Day Option */}
          <div className="flex flex-wrap items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-xl gap-2">
            <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-800">
              <input
                type="checkbox"
                checked={isHalfDay}
                onChange={(e) => {
                  setIsHalfDay(e.target.checked);
                  if (e.target.checked && startDate) {
                    setEndDate(startDate);
                  }
                }}
                className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
              />
              Apply for Half-Day Leave
            </label>

            {isHalfDay && (
              <div className="flex items-center gap-2 text-xs">
                <label className="flex items-center gap-1 cursor-pointer text-slate-700 font-medium">
                  <input
                    type="radio"
                    name="halfDaySession"
                    value="FIRST_HALF"
                    checked={halfDaySession === 'FIRST_HALF'}
                    onChange={() => setHalfDaySession('FIRST_HALF')}
                    className="text-indigo-600 focus:ring-indigo-500"
                  />
                  1st Half (Forenoon)
                </label>
                <label className="flex items-center gap-1 cursor-pointer text-slate-700 font-medium">
                  <input
                    type="radio"
                    name="halfDaySession"
                    value="SECOND_HALF"
                    checked={halfDaySession === 'SECOND_HALF'}
                    onChange={() => setHalfDaySession('SECOND_HALF')}
                    className="text-indigo-600 focus:ring-indigo-500"
                  />
                  2nd Half (Afternoon)
                </label>
              </div>
            )}
          </div>

          {/* Calculated Duration Summary */}
          {calculatedDays > 0 && (
            <div className={`p-3 rounded-xl border flex items-center justify-between text-xs font-semibold ${
              isExceedingBalance 
                ? 'bg-rose-50 border-rose-200 text-rose-800' 
                : 'bg-emerald-50 border-emerald-200 text-emerald-800'
            }`}>
              <span className="flex items-center gap-1.5">
                <Clock className="w-4 h-4" />
                Requested Duration: <strong>{calculatedDays} Day(s)</strong>
              </span>
              {isExceedingBalance && (
                <span className="flex items-center gap-1 text-[11px] font-bold text-rose-700">
                  <AlertCircle className="w-3.5 h-3.5" /> Exceeds available quota ({remainingDays} left)
                </span>
              )}
            </div>
          )}

          {/* Reason for Leave */}
          <div>
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1">
              Reason / Justification <span className="text-rose-500">*</span>
            </label>
            <textarea
              required
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Provide a detailed explanation for leave request..."
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-normal text-slate-900 focus:bg-white focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Emergency Contact Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1">
                Emergency Contact Number
              </label>
              <div className="relative">
                <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="text"
                  value={contactPhone}
                  onChange={(e) => setContactPhone(e.target.value)}
                  placeholder="+91 98765 43210"
                  className="w-full pl-9 pr-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium text-slate-900 focus:bg-white focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1">
                Contact Address During Leave
              </label>
              <div className="relative">
                <MapPin className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="text"
                  value={contactAddress}
                  onChange={(e) => setContactAddress(e.target.value)}
                  placeholder="Address or city..."
                  className="w-full pl-9 pr-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium text-slate-900 focus:bg-white focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>
          </div>

          {/* Supporting Document Attachment (e.g. Medical / Conference Acceptance) */}
          <div>
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1 flex items-center justify-between">
              <span>Supporting Document Attachment</span>
              {selectedPolicy?.requiresDocument && (
                <span className="text-[10px] text-amber-700 font-bold bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                  Required for {selectedPolicy.label}
                </span>
              )}
            </label>
            <div className="border-2 border-dashed border-slate-300 rounded-xl p-4 text-center bg-slate-50 hover:bg-slate-100/80 transition-colors cursor-pointer relative">
              <input
                type="file"
                accept=".pdf,.png,.jpg,.jpeg"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    setFileName(file.name);
                  }
                }}
                className="absolute inset-0 opacity-0 cursor-pointer"
              />
              <Paperclip className="w-6 h-6 text-slate-400 mx-auto mb-1" />
              <p className="text-xs font-semibold text-slate-700">
                {fileName ? `Attached: ${fileName}` : 'Click to attach Medical Certificate / Conference Letter'}
              </p>
              <p className="text-[10px] text-slate-400 mt-0.5">PDF, PNG, JPG up to 10MB</p>
            </div>
          </div>

          {/* Substitute Class Handover Section (For Faculty Members) */}
          {currentUser.role === 'FACULTY' && (
            <div className="border-t border-slate-200 pt-4 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                    <UserCheck className="w-4 h-4 text-indigo-600" />
                    Academic Class Handover & Substitutes
                  </h4>
                  <p className="text-[11px] text-slate-500">
                    Assign colleagues to cover scheduled lectures during absence
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleAddHandover}
                  className="px-3 py-1.5 text-xs font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 rounded-lg hover:bg-indigo-100 flex items-center gap-1 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add Lecture
                </button>
              </div>

              {handovers.length === 0 ? (
                <p className="text-xs text-slate-400 italic bg-slate-50 p-3 rounded-lg border border-slate-200 text-center">
                  No lecture handovers added. Click "Add Lecture" if you have classes during leave dates.
                </p>
              ) : (
                <div className="space-y-2.5">
                  {handovers.map((h, idx) => (
                    <div key={idx} className="p-3 bg-slate-50 rounded-xl border border-slate-200 grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-center">
                      <div className="sm:col-span-3">
                        <input
                          type="text"
                          placeholder="Course Code (e.g. CS301)"
                          value={h.courseCode}
                          onChange={(e) => handleHandoverChange(idx, 'courseCode', e.target.value)}
                          className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-medium"
                        />
                      </div>
                      <div className="sm:col-span-3">
                        <input
                          type="text"
                          placeholder="Course Name"
                          value={h.courseName}
                          onChange={(e) => handleHandoverChange(idx, 'courseName', e.target.value)}
                          className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-medium"
                        />
                      </div>
                      <div className="sm:col-span-3">
                        <select
                          value={h.substituteStaffId}
                          onChange={(e) => handleHandoverChange(idx, 'substituteStaffId', e.target.value)}
                          className="w-full px-2 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-semibold"
                        >
                          {availableSubstitutes.map(s => (
                            <option key={s.id} value={s.id}>
                              {s.name} ({s.departmentId})
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="sm:col-span-2">
                        <input
                          type="text"
                          placeholder="Time Slot"
                          value={h.timeSlot}
                          onChange={(e) => handleHandoverChange(idx, 'timeSlot', e.target.value)}
                          className="w-full px-2 py-1.5 bg-white border border-slate-300 rounded-lg text-[11px]"
                        />
                      </div>
                      <div className="sm:col-span-1 text-right">
                        <button
                          type="button"
                          onClick={() => handleRemoveHandover(idx)}
                          className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Form Actions */}
          <div className="border-t border-slate-200 pt-4 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-xl hover:bg-slate-100 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-md transition-all active:scale-95 flex items-center gap-1.5"
            >
              <CheckCircle2 className="w-4 h-4" />
              Submit Leave Request
            </button>
          </div>

        </form>
      </div>
    </div>
  );
};
