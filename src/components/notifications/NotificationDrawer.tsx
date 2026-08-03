import React, { useState } from 'react';
import { useLeave } from '../../context/LeaveContext';
import { MaterialChip } from '../common/MaterialChip';
import { 
  Bell, 
  X, 
  Check, 
  CheckCheck, 
  Mail, 
  Clock, 
  ChevronRight, 
  FileText, 
  AlertCircle, 
  Sparkles,
  ExternalLink
} from 'lucide-react';

interface NotificationDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectLeaveRequest?: (leaveId: string, printMode?: boolean) => void;
}

export const NotificationDrawer: React.FC<NotificationDrawerProps> = ({ 
  isOpen, 
  onClose,
  onSelectLeaveRequest 
}) => {
  const { notifications, markNotificationRead, markAllNotificationsRead, currentUser } = useLeave();
  const [selectedEmailPreview, setSelectedEmailPreview] = useState<any | null>(null);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-slate-900/50 backdrop-blur-xs">
      <div className="absolute inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-md bg-white shadow-2xl border-l border-slate-200 flex flex-col">
          
          {/* Drawer Header */}
          <div className="p-5 bg-gradient-to-r from-slate-900 to-indigo-950 text-white flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-indigo-500/20 rounded-xl">
                <Bell className="w-5 h-5 text-indigo-300" />
              </div>
              <div>
                <h3 className="text-base font-bold">Automated Notifications</h3>
                <p className="text-xs text-slate-300">In-app alerts & email logs</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={markAllNotificationsRead}
                title="Mark all as read"
                className="p-1.5 text-slate-300 hover:text-white hover:bg-white/10 rounded-lg text-xs flex items-center gap-1 transition-colors"
              >
                <CheckCheck className="w-4 h-4" />
                <span className="hidden sm:inline">Read all</span>
              </button>
              <button
                onClick={onClose}
                className="p-1.5 text-slate-300 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Notifications List */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {notifications.length === 0 ? (
              <div className="text-center py-12 px-4">
                <Bell className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <p className="text-sm font-medium text-slate-600">No notifications yet</p>
                <p className="text-xs text-slate-400 mt-1">
                  You will receive alerts when leave requests are submitted or approved.
                </p>
              </div>
            ) : (
              notifications.map((item) => (
                <div
                  key={item.id}
                  onClick={() => {
                    markNotificationRead(item.id);
                    if (item.relatedLeaveId && onSelectLeaveRequest) {
                      onSelectLeaveRequest(item.relatedLeaveId);
                      onClose();
                    }
                  }}
                  className={`p-3.5 rounded-xl border transition-all cursor-pointer relative group ${
                    !item.read 
                      ? 'bg-indigo-50/70 border-indigo-200 shadow-2xs' 
                      : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  {!item.read && (
                    <span className="absolute top-3.5 right-3.5 w-2 h-2 rounded-full bg-indigo-600 animate-pulse" />
                  )}

                  <div className="pr-4">
                    <div className="flex items-center gap-1.5 mb-1">
                      <span className="text-xs font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
                        {item.title}
                      </span>
                    </div>
                    <p className="text-xs text-slate-700 leading-relaxed">
                      {item.message}
                    </p>

                    <div className="mt-2.5 flex items-center justify-between text-[11px] text-slate-400 border-t border-slate-100 pt-2">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3 text-slate-400" />
                        {item.timestamp}
                      </span>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedEmailPreview(item);
                        }}
                        className="text-indigo-600 hover:text-indigo-800 font-medium flex items-center gap-1 hover:underline"
                      >
                        <Mail className="w-3 h-3" />
                        Email Dispatch Log
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Email Preview Simulation Drawer/Modal */}
          {selectedEmailPreview && (
            <div className="fixed inset-0 z-60 bg-slate-900/60 flex items-center justify-center p-4">
              <div className="bg-white rounded-2xl max-w-lg w-full border border-slate-200 shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-150">
                <div className="bg-slate-900 text-white px-5 py-4 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Mail className="w-5 h-5 text-indigo-400" />
                    <h4 className="text-sm font-bold">Automated Email Dispatch View</h4>
                  </div>
                  <button 
                    onClick={() => setSelectedEmailPreview(null)}
                    className="p-1 rounded-md hover:bg-white/10 text-slate-300 hover:text-white"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="p-5 space-y-3 text-xs bg-slate-50">
                  <div className="bg-white p-3 rounded-lg border border-slate-200 space-y-1 text-slate-700">
                    <p><strong className="text-slate-900">To:</strong> {currentUser.email} ({currentUser.name})</p>
                    <p><strong className="text-slate-900">From:</strong> no-reply@institution.edu (Academia Leave System)</p>
                    <p><strong className="text-slate-900">Subject:</strong> [OFFICIAL] {selectedEmailPreview.title}</p>
                    <p><strong className="text-slate-900">Date:</strong> {selectedEmailPreview.timestamp}</p>
                  </div>

                  <div className="bg-white p-4 rounded-lg border border-slate-200 text-slate-800 leading-relaxed font-sans shadow-2xs">
                    <div className="border-b border-indigo-100 pb-2 mb-3 flex items-center justify-between">
                      <span className="font-bold text-indigo-900 text-sm">Academia Leave Management Portal</span>
                      <span className="text-[10px] text-slate-400 uppercase tracking-wider">Official Notice</span>
                    </div>

                    <p className="mb-2">Dear {currentUser.name},</p>
                    <p className="mb-4 text-slate-700">{selectedEmailPreview.message}</p>

                    {selectedEmailPreview.relatedLeaveId && (
                      <div className="bg-indigo-50 p-3 rounded border border-indigo-100 mb-4 text-indigo-950 font-mono text-[11px]">
                        Reference Reference ID: <strong>{selectedEmailPreview.relatedLeaveId}</strong>
                      </div>
                    )}

                    <p className="text-slate-500 text-[11px]">
                      This is an automated system dispatch. Please do not reply directly to this email. You may log in to the portal to track leave details.
                    </p>
                  </div>
                </div>

                <div className="p-3 bg-white border-t border-slate-200 text-right">
                  <button
                    onClick={() => setSelectedEmailPreview(null)}
                    className="px-4 py-1.5 text-xs font-semibold bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                  >
                    Close Preview
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Drawer Footer */}
          <div className="p-4 bg-slate-50 border-t border-slate-200 text-center text-xs text-slate-500">
            Automated alerts powered by institutional trigger hooks.
          </div>
        </div>
      </div>
    </div>
  );
};
