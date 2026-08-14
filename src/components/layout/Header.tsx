import React, { useState, useEffect } from 'react';
import { useLeave } from '../../context/LeaveContext';
import { MaterialChip } from '../common/MaterialChip';
import { subscribeToSyncStatus, SyncStatus } from '../../lib/mongoClient';
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

  useEffect(() => {
    const unsub = subscribeToSyncStatus(setSyncStatus);
    return () => unsub();
  }, []);

  return (
    <header className="h-16 bg-white border-b border-slate-200 sticky top-0 z-30 shadow-xs flex items-center justify-between px-3 sm:px-6 lg:px-8 shrink-0">
      <div className="flex items-center justify-between w-full min-w-0 gap-2">
        
        {/* Left Side: Mobile Menu Button & Portal Title */}
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <button
            onClick={onToggleMobileSidebar}
            className="p-1.5 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 lg:hidden transition-colors shrink-0"
            aria-label="Toggle navigation drawer"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-[#3F51B5] text-white flex items-center justify-center font-bold text-xs shadow-xs overflow-hidden shrink-0">
              {systemSettings?.institutionLogoUrl ? (
                <img 
                  src={systemSettings.institutionLogoUrl} 
                  alt="Logo" 
                  className="w-full h-full object-cover" 
                  onError={(e) => {
                    // Fallback to icon if image fails to load
                    (e.target as HTMLElement).style.display = 'none';
                  }}
                />
              ) : (
                <GraduationCap className="w-4 h-4 text-white" />
              )}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="text-xs sm:text-sm md:text-base font-bold text-slate-800 leading-tight whitespace-nowrap truncate">
                  {systemSettings?.institutionName || 'BIT Mesra Leave Portal'}
                </h2>
                {syncStatus.isSyncing ? (
                  <span className="hidden sm:inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-700 text-[10px] font-bold uppercase tracking-wider animate-pulse">
                    <RefreshCw className="w-3 h-3 text-indigo-600 animate-spin" />
                    <span>Live DB Syncing...</span>
                  </span>
                ) : (
                  <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-[10px] font-bold uppercase tracking-wider">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                    <span>Live DB Online</span>
                  </span>
                )}
              </div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest hidden md:block whitespace-nowrap truncate">
                Leave Portal • Multi-Tier Approval
              </p>
            </div>
          </div>
        </div>

        {/* Right Side: Quick Role Switcher, Change Password, Notifications, User Profile & Sign Out */}
        <div className="flex items-center gap-1.5 sm:gap-2 md:gap-3 shrink-0">
          
          {/* Persona / Role Switcher Launcher Button */}
          {(systemSettings?.enableRoleSwitcher || currentUser?.role === 'SUPER_ADMIN') && (
            <button
              onClick={onOpenRoleSwitcher}
              className="bg-[#3F51B5] hover:bg-[#303F9F] text-white px-2 sm:px-3 py-1.5 rounded-lg shadow-xs text-[11px] sm:text-xs font-bold uppercase tracking-wide flex items-center gap-1 transition-all active:scale-95 cursor-pointer shrink-0"
              title="Click to switch persona or role"
            >
              <ArrowLeftRight className="w-3.5 h-3.5 shrink-0 opacity-90" />
              <span className="hidden sm:inline">Role:</span>
              <span>{currentUser?.role}</span>
            </button>
          )}

          {/* Change Password Button */}
          {onOpenChangePassword && (
            <button
              onClick={onOpenChangePassword}
              className="flex items-center gap-1 text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg text-xs font-bold transition-all active:scale-95 cursor-pointer shrink-0"
              title="Change Account Password"
            >
              <KeyRound className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
              <span className="hidden sm:inline">Password</span>
            </button>
          )}

          {/* Notifications Button */}
          <button
            onClick={onOpenNotifications}
            className="relative flex items-center gap-1 text-slate-600 hover:text-slate-900 transition-colors p-1.5 sm:p-2 rounded-lg hover:bg-slate-100 cursor-pointer shrink-0"
            title="Notifications"
          >
            <Bell className="w-4 h-4 sm:w-5 sm:h-5" />
            <span className="text-xs font-medium text-slate-600 hidden md:inline">Alerts</span>
            {unreadNotificationCount > 0 && (
              <div className="w-4 h-4 sm:w-5 sm:h-5 bg-red-500 text-white rounded-full flex items-center justify-center text-[9px] sm:text-[10px] font-bold shadow-2xs">
                {unreadNotificationCount}
              </div>
            )}
          </button>

          {/* User Avatar */}
          <div className="hidden sm:flex items-center gap-2 pl-2 border-l border-slate-200 shrink-0">
            <img
              src={currentUser?.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(currentUser?.name || 'User')}&background=1e3a8a&color=fff`}
              alt={currentUser?.name || 'User'}
              className="w-7 h-7 sm:w-8 sm:h-8 rounded-full object-cover border border-slate-200 shadow-2xs"
            />
            <div className="text-left hidden lg:block">
              <p className="text-xs font-semibold text-slate-800 leading-none">{currentUser?.name || 'User'}</p>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">{currentUser?.departmentId}</p>
            </div>
          </div>

          {/* Sign Out Button */}
          <button
            onClick={logout}
            className="flex items-center gap-1 px-2 sm:px-3 py-1.5 sm:py-2 text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg transition-all cursor-pointer active:scale-95 uppercase tracking-wider shrink-0"
            title="Log out of session"
          >
            <LogOut className="w-3.5 h-3.5 text-rose-600 shrink-0" />
            <span className="hidden sm:inline">Logout</span>
          </button>

        </div>
      </div>
    </header>
  );
};
