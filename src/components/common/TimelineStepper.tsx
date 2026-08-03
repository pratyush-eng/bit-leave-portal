import React from 'react';
import { LeaveRequest } from '../../types';
import { CheckCircle2, Clock, XCircle, ArrowRight, ShieldCheck, UserCheck, FileText } from 'lucide-react';

interface TimelineStepperProps {
  request: LeaveRequest;
}

export const TimelineStepper: React.FC<TimelineStepperProps> = ({ request }) => {
  const isHodDone = !!request.hodApproval;
  const isHodRecommended = request.hodApproval?.status === 'RECOMMENDED';
  const isHodRejected = request.hodApproval?.status === 'REJECTED';

  const isRegDone = !!request.registrarApproval;
  const isRegApproved = request.registrarApproval?.status === 'APPROVED';
  const isRegRejected = request.registrarApproval?.status === 'REJECTED';

  return (
    <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 md:p-5 my-4">
      <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-4 flex items-center gap-2">
        <ShieldCheck className="w-4 h-4 text-indigo-600" />
        Multi-Tier Approval Progression Workflow
      </h4>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 relative">
        {/* Step 1: Applicant Submission */}
        <div className="bg-white p-3.5 rounded-lg border border-slate-200 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="inline-flex items-center gap-1.5 text-xs font-bold px-2 py-0.5 rounded-md bg-blue-100 text-blue-800">
                <FileText className="w-3.5 h-3.5" /> Step 1: Application
              </span>
              <span className="text-[11px] text-slate-500">{request.appliedOn}</span>
            </div>
            <p className="text-xs font-medium text-slate-900">{request.applicantName}</p>
            <p className="text-[11px] text-slate-500">{request.applicantDesignation} ({request.departmentName})</p>
          </div>
          <div className="mt-3 pt-2 border-t border-slate-100 flex items-center text-xs text-emerald-700 font-medium gap-1">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            Submitted & Logged
          </div>
        </div>

        {/* Step 2: HOD Endorsement */}
        <div className={`p-3.5 rounded-lg border shadow-2xs flex flex-col justify-between ${
          !isHodDone 
            ? 'bg-amber-50/50 border-amber-200' 
            : isHodRecommended 
              ? 'bg-white border-slate-200' 
              : 'bg-rose-50/50 border-rose-200'
        }`}>
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className={`inline-flex items-center gap-1.5 text-xs font-bold px-2 py-0.5 rounded-md ${
                !isHodDone 
                  ? 'bg-amber-100 text-amber-900' 
                  : isHodRecommended 
                    ? 'bg-emerald-100 text-emerald-900' 
                    : 'bg-rose-100 text-rose-900'
              }`}>
                <UserCheck className="w-3.5 h-3.5" /> Step 2: HOD Review
              </span>
              {request.hodApproval?.actionDate && (
                <span className="text-[11px] text-slate-500">{request.hodApproval.actionDate}</span>
              )}
            </div>
            <p className="text-xs font-medium text-slate-900">
              {request.hodApproval?.actionByName || 'Department HOD'}
            </p>
            {request.hodApproval?.comments && (
              <p className="text-[11px] text-slate-600 italic mt-1 line-clamp-2">
                "{request.hodApproval.comments}"
              </p>
            )}
          </div>

          <div className="mt-3 pt-2 border-t border-slate-100">
            {!isHodDone ? (
              <span className="flex items-center text-xs text-amber-700 font-medium gap-1">
                <Clock className="w-4 h-4 animate-spin shrink-0 text-amber-600" />
                Pending HOD Recommendation
              </span>
            ) : isHodRecommended ? (
              <span className="flex items-center text-xs text-emerald-700 font-medium gap-1">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                Recommended & Forwarded
              </span>
            ) : (
              <span className="flex items-center text-xs text-rose-700 font-medium gap-1">
                <XCircle className="w-4 h-4 text-rose-600 shrink-0" />
                Rejected by HOD
              </span>
            )}
          </div>
        </div>

        {/* Step 3: Registrar Final Approval */}
        <div className={`p-3.5 rounded-lg border shadow-2xs flex flex-col justify-between ${
          !isRegDone 
            ? isHodRecommended 
              ? 'bg-indigo-50/50 border-indigo-200' 
              : 'bg-slate-100 border-slate-200 opacity-60'
            : isRegApproved 
              ? 'bg-emerald-50/50 border-emerald-300' 
              : 'bg-rose-50/50 border-rose-200'
        }`}>
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className={`inline-flex items-center gap-1.5 text-xs font-bold px-2 py-0.5 rounded-md ${
                !isRegDone 
                  ? 'bg-indigo-100 text-indigo-900' 
                  : isRegApproved 
                    ? 'bg-emerald-100 text-emerald-900' 
                    : 'bg-rose-100 text-rose-900'
              }`}>
                <ShieldCheck className="w-3.5 h-3.5" /> Step 3: Registrar Sanction
              </span>
              {request.registrarApproval?.actionDate && (
                <span className="text-[11px] text-slate-500">{request.registrarApproval.actionDate}</span>
              )}
            </div>
            <p className="text-xs font-medium text-slate-900">
              {request.registrarApproval?.actionByName || 'Registrar Office'}
            </p>
            {request.registrarApproval?.comments && (
              <p className="text-[11px] text-slate-600 italic mt-1 line-clamp-2">
                "{request.registrarApproval.comments}"
              </p>
            )}
          </div>

          <div className="mt-3 pt-2 border-t border-slate-100">
            {!isHodDone ? (
              <span className="flex items-center text-xs text-slate-500 gap-1">
                <Clock className="w-4 h-4 shrink-0 text-slate-400" />
                Awaiting HOD Recommendation
              </span>
            ) : !isRegDone ? (
              <span className="flex items-center text-xs text-indigo-700 font-medium gap-1">
                <Clock className="w-4 h-4 animate-pulse shrink-0 text-indigo-600" />
                Pending Registrar Sanction
              </span>
            ) : isRegApproved ? (
              <span className="flex items-center text-xs text-emerald-700 font-semibold gap-1">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                Officially Sanctioned
              </span>
            ) : (
              <span className="flex items-center text-xs text-rose-700 font-semibold gap-1">
                <XCircle className="w-4 h-4 text-rose-600 shrink-0" />
                Sanction Rejected
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
