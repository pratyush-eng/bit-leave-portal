import React, { useState } from 'react';
import { useLeave } from '../../context/LeaveContext';
import { LeaveRequest } from '../../types';
import { MaterialChip } from '../common/MaterialChip';
import { TimelineStepper } from '../common/TimelineStepper';
import { 
  X, 
  UserCheck, 
  ShieldCheck, 
  FileText, 
  Printer, 
  MessageSquare, 
  CheckCircle2, 
  XCircle, 
  Phone, 
  MapPin, 
  Paperclip, 
  Calendar,
  Building,
  Sparkles,
  Award,
  AlertTriangle
} from 'lucide-react';

interface LeaveDetailModalProps {
  request: LeaveRequest | null;
  onClose: () => void;
  initialPrintMode?: boolean;
}

export const LeaveDetailModal: React.FC<LeaveDetailModalProps> = ({ request, onClose, initialPrintMode }) => {
  const { currentUser, allUsers, hodAction, registrarAction, cancelLeave } = useLeave();

  const [comments, setComments] = useState<string>('');
  const [showSanctionOrderPrint, setShowSanctionOrderPrint] = useState<boolean>(false);
  const [showPrintApplicationModal, setShowPrintApplicationModal] = useState<boolean>(Boolean(initialPrintMode));

  React.useEffect(() => {
    if (initialPrintMode) {
      setShowPrintApplicationModal(true);
    } else {
      setShowPrintApplicationModal(false);
    }
  }, [initialPrintMode, request?.id]);

  if (!request) return null;

  const matchedApplicant = allUsers?.find(u => 
    (request.applicantId && u.id === request.applicantId) ||
    (request.applicantEmail && u.email && u.email.toLowerCase().trim() === request.applicantEmail.toLowerCase().trim()) ||
    (request.applicantEmployeeCode && u.employeeCode && u.employeeCode.trim() === request.applicantEmployeeCode.trim())
  );

  const applicantDisplayName = (request.applicantName && request.applicantName !== 'Unknown Applicant' && request.applicantName.trim() !== '')
    ? request.applicantName
    : (matchedApplicant?.name || (request.applicantEmail ? request.applicantEmail.split('@')[0] : 'Faculty Member'));

  const activeRegistrar = allUsers?.find(u => u.role === 'REGISTRAR');
  const registrarName = request.registrarApproval?.actionByName || activeRegistrar?.name || (currentUser.role === 'REGISTRAR' ? currentUser.name : 'University Registrar');

  const isApplicant = currentUser.id === request.applicantId;
  const isHodForDept = currentUser.role === 'HOD' && currentUser.departmentId === request.departmentId;
  const isRegistrar = currentUser.role === 'REGISTRAR';
  const isSuperAdmin = currentUser.role === 'SUPER_ADMIN';

  const canHodAct = (isHodForDept || isSuperAdmin) && request.status === 'PENDING_HOD';
  const canRegistrarAct = (isRegistrar || isSuperAdmin) && request.status === 'PENDING_REGISTRAR';
  const canCancel = isApplicant && (request.status === 'PENDING_HOD' || request.status === 'PENDING_REGISTRAR');

  const handleHodEndorse = () => {
    if (!comments.trim()) {
      alert('Please provide endorsement remarks for record.');
      return;
    }
    hodAction(request.id, 'RECOMMENDED', comments);
    onClose();
  };

  const handleHodReject = () => {
    if (!comments.trim()) {
      alert('Please state reason for rejection.');
      return;
    }
    hodAction(request.id, 'REJECTED', comments);
    onClose();
  };

  const handleRegistrarApprove = () => {
    if (!comments.trim()) {
      setComments('Sanctioned as per institutional leave guidelines.');
    }
    registrarAction(request.id, 'APPROVED', comments || 'Approved.');
    onClose();
  };

  const handleRegistrarReject = () => {
    if (!comments.trim()) {
      alert('Please state reason for rejecting sanction.');
      return;
    }
    registrarAction(request.id, 'REJECTED', comments);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full my-8 border border-slate-200 overflow-hidden flex flex-col">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-blue-950 px-6 py-5 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-white/10 rounded-xl">
              <FileText className="w-6 h-6 text-indigo-300" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold">Leave Application {request.id}</h3>
                <MaterialChip label={request.status} variant="status" status={request.status} />
              </div>
              <p className="text-xs text-indigo-200 mt-0.5">
                Applied on {request.appliedOn} • {request.departmentName}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowPrintApplicationModal(true)}
              className="px-3 py-1.5 text-xs font-bold bg-white/10 hover:bg-white/20 text-white rounded-xl border border-white/20 flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Print application sheet for HOD approval / signature"
            >
              <Printer className="w-4 h-4 text-indigo-300" />
              Print Application
            </button>
            {request.status === 'APPROVED' && (
              <button
                onClick={() => setShowSanctionOrderPrint(true)}
                className="px-3 py-1.5 text-xs font-bold bg-white/10 hover:bg-white/20 text-white rounded-xl border border-white/20 flex items-center gap-1.5 transition-colors cursor-pointer"
                title="View and print official sanction order"
              >
                <Printer className="w-4 h-4 text-emerald-300" />
                Sanction Order
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1.5 text-slate-300 hover:text-white hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5 overflow-y-auto max-h-[75vh]">
          
          {/* Multi-Tier Approval Timeline */}
          <TimelineStepper request={request} />

          {/* Applicant Info & Core Summary */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
            <div>
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Applicant</p>
              <p className="text-sm font-bold text-slate-900 mt-0.5">{applicantDisplayName}</p>
              <p className="text-xs text-slate-600">{request.applicantDesignation}</p>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-[11px] font-mono font-bold text-indigo-900 bg-indigo-50 border border-indigo-200 px-1.5 py-0.5 rounded">
                  Emp ID: {request.applicantEmployeeCode || 'N/A'}
                </span>
                <span className="text-xs text-slate-500">{request.applicantEmail}</span>
              </div>
            </div>

            <div>
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Leave Category</p>
              <div className="mt-1 flex items-center gap-2">
                <MaterialChip label={request.leaveType} variant="leaveType" leaveType={request.leaveType} />
                <span className="text-xs font-bold text-slate-900">{request.totalDays} Day(s)</span>
              </div>
              <p className="text-xs text-slate-600 mt-1">
                📅 <strong>{request.startDate}</strong> to <strong>{request.endDate}</strong>
                {request.isHalfDay && ` (${request.halfDaySession === 'FIRST_HALF' ? '1st Half' : '2nd Half'})`}
              </p>
            </div>
          </div>

          {/* Reason & Contact */}
          <div className="space-y-3">
            <div>
              <p className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Reason / Justification
              </p>
              <p className="text-xs text-slate-800 bg-white p-3 rounded-xl border border-slate-200 leading-relaxed font-sans">
                {request.reason}
              </p>
            </div>

            {(request.contactPhone || request.contactAddress) && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs bg-slate-50 p-3 rounded-xl border border-slate-200">
                {request.contactPhone && (
                  <p className="flex items-center gap-1.5 text-slate-700">
                    <Phone className="w-3.5 h-3.5 text-slate-400" />
                    Phone: <strong>{request.contactPhone}</strong>
                  </p>
                )}
                {request.contactAddress && (
                  <p className="flex items-center gap-1.5 text-slate-700">
                    <MapPin className="w-3.5 h-3.5 text-slate-400" />
                    Address: <strong>{request.contactAddress}</strong>
                  </p>
                )}
              </div>
            )}

            {request.documentUrl && (
              <div className="bg-indigo-50/70 p-3 rounded-xl border border-indigo-100 flex items-center justify-between text-xs">
                <span className="flex items-center gap-2 text-indigo-900 font-medium">
                  <Paperclip className="w-4 h-4 text-indigo-600" />
                  Supporting Attachment Attached
                </span>
                <a 
                  href={request.documentUrl} 
                  target="_blank" 
                  rel="noreferrer"
                  className="px-2.5 py-1 text-[11px] font-bold bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                >
                  View Attachment
                </a>
              </div>
            )}
          </div>

          {/* Substitute Class Handovers */}
          {request.classHandovers && request.classHandovers.length > 0 && (
            <div className="space-y-2 border-t border-slate-200 pt-4">
              <p className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <UserCheck className="w-4 h-4 text-indigo-600" />
                Arranged Class Handovers
              </p>
              <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden bg-white text-xs">
                {request.classHandovers.map((h, i) => (
                  <div key={i} className="p-3 flex items-center justify-between">
                    <div>
                      <p className="font-bold text-slate-900">{h.courseCode} - {h.courseName}</p>
                      <p className="text-[11px] text-slate-500">{h.date} • {h.timeSlot}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-semibold text-indigo-700">Substitute: {h.substituteStaffName}</p>
                      <span className="inline-block text-[10px] text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200 mt-0.5">
                        Agreed
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Action Box for HOD / Registrar Reviewers */}
          {(canHodAct || canRegistrarAct) && (
            <div className="bg-gradient-to-br from-indigo-50 to-blue-50/80 p-4 rounded-xl border border-indigo-200 space-y-3 mt-4">
              <div className="flex items-center gap-2 text-indigo-900 font-bold text-xs uppercase tracking-wider">
                <MessageSquare className="w-4 h-4 text-indigo-600" />
                {canHodAct ? 'Department HOD Action Panel' : 'Registrar Sanction Panel'}
              </div>

              <textarea
                rows={2}
                value={comments}
                onChange={(e) => setComments(e.target.value)}
                placeholder={canHodAct ? "Add endorsement / recommendation remarks..." : "Add official sanction remarks or guidelines..."}
                className="w-full px-3 py-2 bg-white border border-indigo-200 rounded-xl text-xs font-normal text-slate-900 focus:ring-2 focus:ring-indigo-500"
              />

              <div className="flex items-center justify-end gap-2 pt-1">
                {canHodAct && (
                  <>
                    <button
                      onClick={handleHodReject}
                      className="px-4 py-2 text-xs font-bold text-rose-700 bg-rose-50 border border-rose-200 hover:bg-rose-100 rounded-xl transition-colors flex items-center gap-1"
                    >
                      <XCircle className="w-4 h-4" /> Reject Request
                    </button>
                    <button
                      onClick={handleHodEndorse}
                      className="px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-md transition-all active:scale-95 flex items-center gap-1"
                    >
                      <CheckCircle2 className="w-4 h-4" /> Recommend to Registrar
                    </button>
                  </>
                )}

                {canRegistrarAct && (
                  <>
                    <button
                      onClick={handleRegistrarReject}
                      className="px-4 py-2 text-xs font-bold text-rose-700 bg-rose-50 border border-rose-200 hover:bg-rose-100 rounded-xl transition-colors flex items-center gap-1"
                    >
                      <XCircle className="w-4 h-4" /> Reject Sanction
                    </button>
                    <button
                      onClick={handleRegistrarApprove}
                      className="px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-md transition-all active:scale-95 flex items-center gap-1"
                    >
                      <CheckCircle2 className="w-4 h-4" /> Give Final Sanction
                    </button>
                  </>
                )}
              </div>
            </div>
          )}

          {/* Cancellation Option for Applicant */}
          {canCancel && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-center justify-between text-xs text-amber-900">
              <span>You may withdraw or cancel this application prior to final sanction.</span>
              <button
                onClick={() => {
                  if (window.confirm('Are you sure you want to cancel this leave application?')) {
                    cancelLeave(request.id);
                    onClose();
                  }
                }}
                className="px-3 py-1.5 text-xs font-bold text-rose-700 bg-white border border-rose-200 rounded-lg hover:bg-rose-50 transition-colors"
              >
                Withdraw Request
              </button>
            </div>
          )}

        </div>

        {/* Printable Official Sanction Order Modal Preview */}
        {showSanctionOrderPrint && (
          <div className="fixed inset-0 z-60 bg-slate-900/70 flex items-center justify-center p-4">
            <div id="printable-sanction-order" className="bg-white rounded-2xl max-w-2xl w-full border border-slate-200 shadow-2xl overflow-hidden p-6 space-y-4">
              <div className="border-b-2 border-indigo-900 pb-4 text-center">
                <h2 className="text-base font-extrabold text-indigo-950 uppercase tracking-widest">
                  BIRLA INSTITUTE OF TECHNOLOGY, MESRA RANCHI
                </h2>
                <p className="text-xs text-slate-600">Office of the Registrar • Sanction Order</p>
                <p className="text-[10px] text-slate-400 mt-0.5">Ref No: REG/LV-SANCTION/{request.id}</p>
              </div>

              <div className="space-y-3 text-xs text-slate-800 leading-relaxed font-serif">
                <p className="text-right text-[11px] text-slate-500 font-sans">Date: {request.registrarApproval?.actionDate || new Date().toISOString().split('T')[0]}</p>

                <p>
                  <strong>OFFICIAL SANCTION ORDER:</strong> Sanction is hereby accorded under Rule 14-B of the Institutional Leave Regulations for <strong>{request.totalDays} day(s)</strong> of <strong>{request.leaveType} LEAVE</strong> in favor of:
                </p>

                <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 space-y-1 font-sans text-xs">
                  <p><strong>Name:</strong> {applicantDisplayName}</p>
                  <p><strong>Employee Code / Staff ID:</strong> {request.applicantEmployeeCode || 'N/A'}</p>
                  <p><strong>Designation:</strong> {request.applicantDesignation}</p>
                  <p><strong>Department:</strong> {request.departmentName}</p>
                  <p><strong>Period of Sanction:</strong> From {request.startDate} to {request.endDate}</p>
                </div>

                <p>
                  <strong>Endorsed By HOD:</strong> {request.hodApproval?.actionByName || 'Department Head'} {request.hodApproval?.comments ? `(${request.hodApproval.comments})` : ''}
                </p>

                <p>
                  <strong>Approved By:</strong> {request.registrarApproval?.actionByName || registrarName} {request.registrarApproval?.comments ? `(${request.registrarApproval.comments})` : ''}
                </p>
              </div>

              <div className="pt-8 flex items-center justify-between text-xs text-slate-600 border-t border-slate-200">
                <div>
                  <p className="font-bold text-slate-900">Institutional Seal</p>
                  <p className="text-[10px] text-slate-400">Digitally Verified Document</p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-indigo-950">{registrarName}</p>
                  <p className="text-[10px] text-slate-500">Registrar</p>
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 no-print">
                <button
                  onClick={() => setShowSanctionOrderPrint(false)}
                  className="px-4 py-1.5 text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg cursor-pointer"
                >
                  Close
                </button>
                <button
                  onClick={() => window.print()}
                  className="px-4 py-1.5 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg flex items-center gap-1 cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" /> Print Official Sanction Order
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Printable Leave Application Sheet for HOD Approval / Physical Endorsement */}
        {showPrintApplicationModal && (
          <div className="fixed inset-0 z-60 bg-slate-900/70 flex items-center justify-center p-4">
            <div
              id="printable-leave-application-sheet"
              className="bg-white rounded-2xl max-w-3xl w-full border border-slate-200 shadow-2xl overflow-hidden p-8 space-y-6 max-h-[90vh] overflow-y-auto"
            >
              {/* Official Institutional Header */}
              <div className="border-b-2 border-slate-900 pb-4 text-center space-y-1">
                <h2 className="text-lg font-black text-slate-900 uppercase tracking-widest">
                  BIRLA INSTITUTE OF TECHNOLOGY, MESRA RANCHI
                </h2>
                <p className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  OFFICIAL LEAVE APPLICATION FORM (STAFF & FACULTY)
                </p>
                <div className="flex justify-between items-center text-[11px] text-slate-500 pt-2 font-mono">
                  <span>Application Ref: <strong>{request.id}</strong></span>
                  <span>Date of Submission: <strong>{request.appliedOn}</strong></span>
                  <span>Status: <strong className="uppercase">{request.status}</strong></span>
                </div>
              </div>

              {/* Section 1: Applicant Particulars */}
              <div className="space-y-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 bg-slate-100 px-3 py-1.5 rounded-sm border-l-4 border-[#3F51B5]">
                  1. Applicant Particulars
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-2.5 text-xs text-slate-800 px-2 pt-1">
                  <div>
                    <span className="text-slate-500 block text-[10px] uppercase">Full Name</span>
                    <span className="font-bold">{applicantDisplayName}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px] uppercase">Employee Code / Staff ID</span>
                    <span className="font-bold text-indigo-950 font-mono">{request.applicantEmployeeCode || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px] uppercase">Designation</span>
                    <span className="font-medium">{request.applicantDesignation}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px] uppercase">Department / Section</span>
                    <span className="font-medium">{request.departmentName}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px] uppercase">Institutional Email</span>
                    <span className="font-mono text-slate-600">{request.applicantEmail}</span>
                  </div>
                </div>
              </div>

              {/* Section 2: Leave Details */}
              <div className="space-y-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 bg-slate-100 px-3 py-1.5 rounded-sm border-l-4 border-[#3F51B5]">
                  2. Leave Particulars
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-2.5 text-xs text-slate-800 px-2 pt-1">
                  <div>
                    <span className="text-slate-500 block text-[10px] uppercase">Type of Leave</span>
                    <span className="font-bold text-[#3F51B5]">{request.leaveType}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px] uppercase">Duration</span>
                    <span className="font-bold">{request.totalDays} Day(s)</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px] uppercase">Period</span>
                    <span className="font-medium">{request.startDate} to {request.endDate}</span>
                  </div>
                </div>
                <div className="px-2 pt-2 text-xs text-slate-800 space-y-1">
                  <span className="text-slate-500 block text-[10px] uppercase">Reason / Purpose of Leave</span>
                  <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg italic">
                    "{request.reason}"
                  </div>
                </div>
                {request.emergencyContact && (
                  <div className="px-2 text-xs text-slate-800">
                    <span className="text-slate-500 block text-[10px] uppercase">Emergency Contact During Leave</span>
                    <span className="font-medium">{request.emergencyContact}</span>
                  </div>
                )}
              </div>

              {/* Section 3: Academic / Administrative Load Handover */}
              <div className="space-y-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 bg-slate-100 px-3 py-1.5 rounded-sm border-l-4 border-[#3F51B5]">
                  3. Academic & Administrative Load Handover
                </h3>
                <div className="px-2 pt-1 text-xs text-slate-800">
                  <span className="text-slate-500 block text-[10px] uppercase mb-1">Arrangement Made During Absence</span>
                  <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg">
                    {request.alternativeArrangement ? (
                      <span>{request.alternativeArrangement}</span>
                    ) : (
                      <span className="text-slate-500 italic">No teaching / administrative load affected during this leave period.</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Section 4: Signature & Endorsement Blocks for Physical Approval */}
              <div className="space-y-4 pt-4 border-t border-slate-200">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                  4. Signatures & Official Approvals
                </h3>
                
                <div className="grid grid-cols-3 gap-6 pt-6 pb-2 text-xs text-slate-800">
                  {/* Applicant Signature */}
                  <div className="border border-slate-300 rounded-lg p-3 flex flex-col justify-between h-28">
                    <span className="text-[10px] uppercase font-bold text-slate-500 block">Applicant Signature</span>
                    <div className="border-t border-slate-400 pt-1 text-center">
                      <span className="font-semibold block text-[11px]">{applicantDisplayName}</span>
                      <span className="text-[9px] text-slate-500">Date: _______________</span>
                    </div>
                  </div>

                  {/* HOD Recommendation / Signature */}
                  <div className="border border-slate-300 rounded-lg p-3 flex flex-col justify-between h-28">
                    <div className="flex justify-between items-start">
                      <span className="text-[10px] uppercase font-bold text-slate-500 block">Head of Department (HOD)</span>
                      {request.hodApproval?.status === 'APPROVED' && (
                        <span className="px-1.5 py-0.5 bg-emerald-100 text-emerald-800 rounded text-[9px] font-bold">APPROVED ONLINE</span>
                      )}
                    </div>
                    <div className="border-t border-slate-400 pt-1 text-center">
                      <span className="font-semibold block text-[11px]">
                        {request.hodApproval?.actionByName || 'HOD Signature & Stamp'}
                      </span>
                      <span className="text-[9px] text-slate-500">
                        {request.hodApproval?.actionDate ? `Date: ${request.hodApproval.actionDate}` : 'Date: _______________'}
                      </span>
                    </div>
                  </div>

                  {/* Registrar / Principal Sanction */}
                  <div className="border border-slate-300 rounded-lg p-3 flex flex-col justify-between h-28">
                    <div className="flex justify-between items-start">
                      <span className="text-[10px] uppercase font-bold text-slate-500 block">Registrar / Dean</span>
                      {request.registrarApproval?.status === 'APPROVED' && (
                        <span className="px-1.5 py-0.5 bg-emerald-100 text-emerald-800 rounded text-[9px] font-bold">SANCTIONED ONLINE</span>
                      )}
                    </div>
                    <div className="border-t border-slate-400 pt-1 text-center">
                      <span className="font-semibold block text-[11px]">
                        {request.registrarApproval?.actionByName || registrarName}
                      </span>
                      <span className="text-[9px] text-slate-500">
                        {request.registrarApproval?.actionDate ? `Date: ${request.registrarApproval.actionDate}` : 'Date: _______________'}
                      </span>
                    </div>
                  </div>
                </div>

                <p className="text-[10px] text-slate-400 text-center italic">
                  Note: This printed leave application form can be submitted to the Department Office for physical verification and record keeping.
                </p>
              </div>

              {/* Action Buttons (Hidden when printing) */}
              <div className="pt-4 flex items-center justify-end gap-2 border-t border-slate-200 no-print">
                <button
                  type="button"
                  onClick={() => setShowPrintApplicationModal(false)}
                  className="px-4 py-2 text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-colors cursor-pointer"
                >
                  Close Preview
                </button>
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-5 py-2 text-xs font-bold bg-[#3F51B5] hover:bg-[#303F9F] text-white rounded-xl shadow-md flex items-center gap-2 transition-all active:scale-98 cursor-pointer"
                >
                  <Printer className="w-4 h-4" /> Print Application Sheet
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
