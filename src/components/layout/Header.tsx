import React, { useState, useEffect } from 'react';
import { useLeave } from '../../context/LeaveContext';
import { MaterialChip } from '../common/MaterialChip';
import { subscribeToSyncStatus, SyncStatus, getMongoStatus } from '../../lib/mongoClient';
import { BitLogo } from '../common/BitLogo';
import { 
  Bell, 
  Search, 
  User as UserIcon, 
  Menu, 
  RefreshCw, 
  GraduationCap, 
  ArrowLeftRight,
  ShieldAlert,
  ChevronDown,
  LogOut,
  KeyRound,
  Database,
  Check
} from 'lucide-react';

interface HeaderProps {
  onToggleMobileSidebar: () => void;
  onOpenRoleSwitcher: () => void;
  onOpenNotifications: () => void;
  onOpenChangePassword?: () => void;
  activeView: string;
}

export const Header: React.FC<HeaderProps> = ({ 
  onToggleMobileSidebar, 
  onOpenRoleSwitcher, 
  onOpenNotifications,
  onOpenChangePassword,
  activeView
}) => {
  const { currentUser, unreadNotificationCount, logout, systemSettings } = useLeave();
  const [syncStatus, setSyncStatus] = useState<SyncStatus>({
    isSyncing: false,
    message: 'Live DB Synced',
    opType: 'IDLE',
    activeCount: 0
  });
  const [dbConnected, setDbConnected] = useState<boolean | null>(null);

  useEffect(() => {
    const unsub = subscribeToSyncStatus(setSyncStatus);
    return () => unsub();
  }, []);

  useEffect(() => {
    let isMounted = true;
    let failureCount = 0;

    const checkDb = async () => {
      try {
        const data = await getMongoStatus();
        if (isMounted) {
          if (data && (data.connected === true || (data as any).success === true)) {
            failureCount = 0;
            setDbConnected(true);
          } else if (data && data.connected === false) {
            failureCount++;
            if (failureCount >= 2) {
              setDbConnected(false);
            }
          }
        }
      } catch (_e) {
        if (isMounted) {
          failureCount++;
          if (failureCount >= 2) {
            setDbConnected(false);
          }
        }
      }
    };

    checkDb();
    const initialTimer = setTimeout(checkDb, 1500);
    const interval = setInterval(checkDb, 8000);

    return () => {
      isMounted = false;
      clearTimeout(initialTimer);
      clearInterval(interval);
    };
  }, []);

  return (
    <header className="h-14 bg-white border-b border-slate-200 sticky top-0 z-30 flex items-center justify-between px-4 sm:px-6 shrink-0">
      <div className="flex items-center justify-between w-full min-w-0 gap-4">
        
        {/* Left Side: Mobile Menu Button & Portal Title */}
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={onToggleMobileSidebar}
            className="p-1.5 rounded text-slate-500 hover:text-slate-900 hover:bg-slate-100 lg:hidden transition-colors shrink-0"
            aria-label="Toggle navigation"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-2 min-w-0">
            <div className="w-8 h-8 rounded bg-[#3F51B5] flex items-center justify-center font-bold text-xs text-white shrink-0 overflow-hidden">
              {systemSettings?.institutionLogoUrl ? (
                <img 
                  src={systemSettings.institutionLogoUrl} 
                  alt="Logo" 
                  className="w-full h-full object-contain p-1" 
                  onError={(e) => {
                    (e.target as HTMLElement).style.display = 'none';
                  }}
                />
              ) : (
                <BitLogo className="w-full h-full" />
              )}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="text-sm sm:text-base font-semibold text-slate-900 leading-tight whitespace-nowrap truncate">
                  {systemSettings?.institutionName || 'BIT Leave Portal'}
                </h1>
                {syncStatus.isSyncing ? (
                  <span className="hidden sm:inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-700 text-[10px] font-bold uppercase tracking-wider">
                    <RefreshCw className="w-3 h-3 animate-spin" />
                    <span>Syncing</span>
                  </span>
                ) : dbConnected === true ? (
                  <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-100 text-emerald-700 text-[10px] font-bold uppercase tracking-wider">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    <span>Live</span>
                  </span>
                ) : null}
              </div>
              <p className="text-[10px] text-slate-400 font-medium uppercase tracking-widest hidden md:block whitespace-nowrap truncate">
                Automated Institutional Leave Management
              </p>
            </div>
          </div>
        </div>

        {/* Right Side: Quick Role Switcher, Change Password, Notifications, User Profile & Sign Out */}
        <div className="flex items-center gap-2 md:gap-4 shrink-0">
          
          {/* Persona / Role Switcher Launcher Button */}
          {(systemSettings?.enableRoleSwitcher || currentUser?.role === 'SUPER_ADMIN') && (
            <button
              onClick={onOpenRoleSwitcher}
              className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-1.5 rounded text-[10px] font-bold uppercase tracking-wide flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer shrink-0"
              title="Click to switch persona or role"
            >
              <ArrowLeftRight className="w-3 h-3 opacity-70" />
              <span className="hidden sm:inline">{currentUser?.role}</span>
            </button>
          )}

          {/* Notifications Button */}
          <button
            onClick={onOpenNotifications}
            className="relative p-1.5 text-slate-500 hover:text-[#3F51B5] hover:bg-slate-50 rounded transition-colors cursor-pointer shrink-0"
            title="Notifications"
          >
            <Bell className="w-5 h-5" />
            {unreadNotificationCount > 0 && (
              <div className="absolute -top-1 -right-1 w-4 h-4 bg-[#3F51B5] text-white rounded-full flex items-center justify-center text-[9px] font-bold ring-2 ring-white">
                {unreadNotificationCount}
              </div>
            )}
          </button>

          {/* User Profile */}
          <div className="hidden sm:flex items-center gap-2.5 pl-3 border-l border-slate-100 shrink-0">
            <div className="text-right hidden lg:block">
              <p className="text-xs font-bold text-slate-800 leading-none">{currentUser?.name || 'User'}</p>
              <p className="text-[10px] font-medium text-slate-400 mt-0.5">{currentUser?.role}</p>
            </div>
            <img
              src={currentUser?.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(currentUser?.name || 'User')}&background=3F51B5&color=fff`}
              alt={currentUser?.name || 'User'}
              className="w-7 h-7 rounded-full object-cover border border-slate-200"
            />
          </div>

          {/* Sign Out Button */}
          <button
            onClick={logout}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded transition-all cursor-pointer active:scale-95 shrink-0"
            title="Log out of session"
          >
            <LogOut className="w-4 h-4" />
            <span className="hidden sm:inline">Sign Out</span>
          </button>

        </div>
      </div>
    </header>
  );
};
