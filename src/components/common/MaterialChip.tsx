import React from 'react';
import { LeaveStatus, LeaveType, Role } from '../../types';

interface ChipProps {
  label: string;
  variant?: 'status' | 'leaveType' | 'role' | 'department' | 'default';
  status?: LeaveStatus;
  leaveType?: LeaveType;
  role?: Role;
  className?: string;
}

export const MaterialChip: React.FC<ChipProps> = ({ 
  label, 
  variant = 'default',
  status,
  leaveType,
  role,
  className = ''
}) => {
  let styleClasses = 'bg-slate-100 text-slate-700 border-slate-200';

  if (variant === 'status' && status) {
    switch (status) {
      case 'APPROVED':
        styleClasses = 'bg-emerald-50 text-emerald-600 border-emerald-200';
        break;
      case 'PENDING_HOD':
        styleClasses = 'bg-amber-50 text-amber-600 border-amber-200';
        break;
      case 'PENDING_REGISTRAR':
        styleClasses = 'bg-blue-50 text-blue-600 border-blue-200';
        break;
      case 'REJECTED':
        styleClasses = 'bg-rose-50 text-rose-600 border-rose-200';
        break;
      case 'CANCELLED':
        styleClasses = 'bg-slate-100 text-slate-500 border-slate-200';
        break;
    }
  } else if (variant === 'leaveType' && leaveType) {
    switch (leaveType) {
      case 'CASUAL':
        styleClasses = 'bg-blue-50 text-blue-700 border-blue-200';
        break;
      case 'SICK':
        styleClasses = 'bg-rose-50 text-rose-700 border-rose-200';
        break;
      case 'EARNED':
        styleClasses = 'bg-emerald-50 text-emerald-700 border-emerald-200';
        break;
      case 'DUTY':
        styleClasses = 'bg-purple-50 text-purple-700 border-purple-200';
        break;
      case 'STUDY':
        styleClasses = 'bg-amber-50 text-amber-700 border-amber-200';
        break;
      case 'MATERNITY_PATERNITY':
        styleClasses = 'bg-pink-50 text-pink-700 border-pink-200';
        break;
      case 'SPECIAL_CASUAL':
        styleClasses = 'bg-cyan-50 text-cyan-700 border-cyan-200';
        break;
    }
  } else if (variant === 'role' && role) {
    switch (role) {
      case 'FACULTY':
        styleClasses = 'bg-sky-50 text-sky-700 border-sky-200';
        break;
      case 'STAFF':
        styleClasses = 'bg-slate-100 text-slate-700 border-slate-200';
        break;
      case 'HOD':
        styleClasses = 'bg-teal-50 text-teal-700 border-teal-200';
        break;
      case 'REGISTRAR':
        styleClasses = 'bg-indigo-50 text-indigo-700 border-indigo-200';
        break;
      case 'ADMIN':
        styleClasses = 'bg-violet-50 text-violet-700 border-violet-200';
        break;
      case 'SUPER_ADMIN':
        styleClasses = 'bg-amber-50 text-amber-700 border-amber-300';
        break;
    }
  }

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide border whitespace-nowrap ${styleClasses} ${className}`}>
      {label}
    </span>
  );
};
