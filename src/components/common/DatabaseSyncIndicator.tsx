import React, { useEffect, useState } from 'react';
import { subscribeToSyncStatus, SyncStatus } from '../../lib/mongoClient';
import { Database, RefreshCw, CheckCircle2, ArrowUpRight, Trash2, Edit3, PlusCircle } from 'lucide-react';

export const DatabaseSyncIndicator: React.FC = () => {
  const [syncStatus, setSyncStatus] = useState<SyncStatus>({
    isSyncing: false,
    message: 'Live Database Synced',
    opType: 'IDLE',
    activeCount: 0
  });

  const [showSavedPill, setShowSavedPill] = useState<boolean>(false);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    let hasBeenSyncing = false;

    const unsubscribe = subscribeToSyncStatus((status) => {
      setSyncStatus(status);
      if (status.isSyncing) {
        hasBeenSyncing = true;
        setShowSavedPill(false);
      } else if (hasBeenSyncing && !status.isSyncing) {
        hasBeenSyncing = false;
        setShowSavedPill(true);
        if (timer) clearTimeout(timer);
        timer = setTimeout(() => {
          setShowSavedPill(false);
        }, 2200);
      } else {
        setShowSavedPill(false);
      }
    });

    return () => {
      unsubscribe();
      if (timer) clearTimeout(timer);
    };
  }, []);

  if (!syncStatus.isSyncing && !showSavedPill) {
    return null;
  }

  const getOpBadge = () => {
    switch (syncStatus.opType) {
      case 'INSERT':
        return {
          icon: <PlusCircle className="w-4 h-4 text-emerald-400 animate-bounce" />,
          label: 'INSERT',
          bg: 'bg-slate-900/95 border-emerald-500/40 text-emerald-300'
        };
      case 'UPDATE':
        return {
          icon: <Edit3 className="w-4 h-4 text-indigo-400 animate-pulse" />,
          label: 'UPDATE',
          bg: 'bg-slate-900/95 border-indigo-500/40 text-indigo-300'
        };
      case 'DELETE':
        return {
          icon: <Trash2 className="w-4 h-4 text-rose-400 animate-pulse" />,
          label: 'DELETE',
          bg: 'bg-slate-900/95 border-rose-500/40 text-rose-300'
        };
      case 'RESET':
        return {
          icon: <RefreshCw className="w-4 h-4 text-amber-400 animate-spin" />,
          label: 'RESET',
          bg: 'bg-slate-900/95 border-amber-500/40 text-amber-300'
        };
      case 'SYNC':
      default:
        return {
          icon: <Database className="w-4 h-4 text-blue-400 animate-pulse" />,
          label: 'SYNCING',
          bg: 'bg-slate-900/95 border-blue-500/40 text-blue-300'
        };
    }
  };

  const badgeConfig = getOpBadge();

  return (
    <div className="fixed bottom-5 right-5 z-50 pointer-events-none transition-all duration-300 ease-in-out transform">
      {syncStatus.isSyncing ? (
        <div className={`flex items-center gap-3 px-4 py-2.5 rounded-2xl border shadow-2xl backdrop-blur-md ${badgeConfig.bg} animate-in fade-in slide-in-from-bottom-3 duration-200 pointer-events-auto`}>
          <div className="relative flex items-center justify-center">
            <RefreshCw className="w-4 h-4 text-white animate-spin" />
            <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-indigo-400 animate-ping" />
          </div>
          
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded bg-white/10 font-mono">
                DB {badgeConfig.label}
              </span>
              <span className="text-xs font-semibold text-white tracking-wide">
                Live Data Operation
              </span>
            </div>
            <p className="text-[11px] text-slate-300 font-medium">
              {typeof syncStatus.message === 'object' ? JSON.stringify(syncStatus.message) : String(syncStatus.message || 'Processing live database action...')}
            </p>
          </div>
        </div>
      ) : showSavedPill ? (
        <div className="flex items-center gap-2.5 px-4 py-2.5 rounded-2xl bg-emerald-950/90 border border-emerald-500/50 text-emerald-200 shadow-xl backdrop-blur-md animate-in fade-in slide-in-from-bottom-2 duration-300 pointer-events-auto">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span className="text-xs font-bold tracking-wide">
            Live Database Updated & Saved 🟢
          </span>
        </div>
      ) : null}
    </div>
  );
};
