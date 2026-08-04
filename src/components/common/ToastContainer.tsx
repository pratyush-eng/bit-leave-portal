import React, { useEffect, useState } from 'react';
import { useLeave } from '../../context/LeaveContext';
import { ToastNotification, LeaveStatus } from '../../types';
import { AnimatePresence, motion } from 'motion/react';
import { 
  CheckCircle2, 
  XCircle, 
  AlertCircle, 
  Clock, 
  X, 
  ExternalLink, 
  Send, 
  ArrowUpRight,
  Ban,
  BellRing
} from 'lucide-react';

interface ToastContainerProps {
  onSelectLeaveRequest?: (leaveId: string, printMode?: boolean) => void;
}

export const ToastContainer: React.FC<ToastContainerProps> = ({ onSelectLeaveRequest }) => {
  const { toasts, removeToast } = useLeave();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-3 max-w-sm sm:max-w-md w-full px-4 sm:px-0 pointer-events-none">
      <AnimatePresence mode="popLayout">
        {toasts.map((toast) => (
          <ToastItem 
            key={toast.id} 
            toast={toast} 
            onClose={() => removeToast(toast.id)} 
            onSelectLeaveRequest={onSelectLeaveRequest}
          />
        ))}
      </AnimatePresence>
    </div>
  );
};

interface ToastItemProps {
  toast: ToastNotification;
  onClose: () => void;
  onSelectLeaveRequest?: (leaveId: string, printMode?: boolean) => void;
}

const ToastItem: React.FC<ToastItemProps> = ({ toast, onClose, onSelectLeaveRequest }) => {
  const [isHovered, setIsHovered] = useState(false);
  const [progress, setProgress] = useState(100);

  // Auto-dismiss after 6 seconds, paused on hover
  useEffect(() => {
    if (isHovered) return;

    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev <= 2) {
          clearInterval(interval);
          onClose();
          return 0;
        }
        return prev - 2; // 100 / 50 steps = 5 seconds
      });
    }, 100);

    return () => clearInterval(interval);
  }, [isHovered, onClose]);

  // Icon and badge style mapping
  const getStatusConfig = (type: ToastNotification['type'], status?: LeaveStatus) => {
    if (status === 'APPROVED' || type === 'SUCCESS') {
      return {
        bg: 'bg-emerald-50/95 border-emerald-300',
        badgeBg: 'bg-emerald-600 text-white',
        badgeText: 'SANCTIONED & APPROVED',
        barColor: 'bg-emerald-600',
        icon: <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />,
        accentBorder: 'border-l-4 border-l-emerald-600'
      };
    }
    if (status === 'REJECTED' || type === 'ERROR') {
      return {
        bg: 'bg-rose-50/95 border-rose-300',
        badgeBg: 'bg-rose-600 text-white',
        badgeText: 'REJECTED',
        barColor: 'bg-rose-600',
        icon: <XCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />,
        accentBorder: 'border-l-4 border-l-rose-600'
      };
    }
    if (status === 'PENDING_REGISTRAR') {
      return {
        bg: 'bg-indigo-50/95 border-indigo-300',
        badgeBg: 'bg-indigo-600 text-white',
        badgeText: 'HOD ENDORSED',
        barColor: 'bg-indigo-600',
        icon: <ArrowUpRight className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />,
        accentBorder: 'border-l-4 border-l-indigo-600'
      };
    }
    if (status === 'PENDING_HOD' || type === 'INFO') {
      return {
        bg: 'bg-amber-50/95 border-amber-300',
        badgeBg: 'bg-amber-600 text-white',
        badgeText: 'PENDING HOD',
        barColor: 'bg-amber-600',
        icon: <Send className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />,
        accentBorder: 'border-l-4 border-l-amber-600'
      };
    }
    if (status === 'CANCELLED' || type === 'WARNING') {
      return {
        bg: 'bg-slate-100/95 border-slate-300',
        badgeBg: 'bg-slate-700 text-white',
        badgeText: 'CANCELLED',
        barColor: 'bg-slate-600',
        icon: <Ban className="w-5 h-5 text-slate-600 shrink-0 mt-0.5" />,
        accentBorder: 'border-l-4 border-l-slate-600'
      };
    }

    return {
      bg: 'bg-white/95 border-slate-200',
      badgeBg: 'bg-slate-800 text-white',
      badgeText: 'NOTIFICATION',
      barColor: 'bg-blue-600',
      icon: <BellRing className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />,
      accentBorder: 'border-l-4 border-l-blue-600'
    };
  };

  const config = getStatusConfig(toast.type, toast.status);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 30, scale: 0.92 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 20, scale: 0.9, transition: { duration: 0.2 } }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={`pointer-events-auto rounded-2xl border shadow-2xl backdrop-blur-md p-4 relative overflow-hidden transition-all ${config.bg} ${config.accentBorder}`}
    >
      <div className="flex items-start gap-3">
        {config.icon}

        <div className="flex-1 min-w-0 pr-2">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full ${config.badgeBg}`}>
              {config.badgeText}
            </span>
            <span className="text-[10px] font-medium text-slate-400">
              {toast.timestamp}
            </span>
          </div>

          <h4 className="text-xs font-bold text-slate-900 leading-snug">
            {toast.title}
          </h4>

          <p className="text-xs text-slate-600 mt-1 leading-relaxed">
            {toast.message}
          </p>

          {toast.leaveId && onSelectLeaveRequest && (
            <button
              onClick={() => {
                onSelectLeaveRequest(toast.leaveId!);
                onClose();
              }}
              className="mt-2.5 inline-flex items-center gap-1.5 text-[11px] font-bold text-indigo-700 hover:text-indigo-900 hover:underline cursor-pointer transition-colors"
            >
              <ExternalLink className="w-3.5 h-3.5" /> View Leave Details (#{toast.leaveId})
            </button>
          )}
        </div>

        <button
          onClick={onClose}
          className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors cursor-pointer shrink-0"
          title="Dismiss Toast"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Progress Bar */}
      <div className="absolute bottom-0 left-0 right-0 h-1 bg-slate-200/50">
        <div 
          className={`h-full transition-all duration-100 ease-linear ${config.barColor}`}
          style={{ width: `${progress}%` }}
        />
      </div>
    </motion.div>
  );
};
