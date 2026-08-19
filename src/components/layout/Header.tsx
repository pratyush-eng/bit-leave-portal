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
    <header 
      className="bg-white border-b border-slate-100 sticky top-0 z-30 flex items-center justify-between px-4 sm:px-6 shrink-0 transition-all duration-300"
      style={{ 
        height: 'var(--header-height, 56px)', 
        backgroundColor: 'var(--nav-bg-color, #ffffff)', 
        color: 'var(--nav-text-color, #1e293b)',
        boxShadow: 'var(--nav-shadow)'
      }}
    >
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
            <div className="w-8 h-8 flex items-center justify-center shrink-0 overflow-hidden drop-shadow-md">
              {systemSettings?.institutionLogoUrl ? (
                <img 
                  src={systemSettings.institutionLogoUrl} 
                  alt="Logo" 
                  className="w-full h-full object-contain" 
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
                <h1 className="text-sm sm:text-base font-bold text-slate-800 leading-tight whitespace-nowrap truncate">
                  {systemSettings?.institutionName || 'BIT Leave Portal'}
                </h1>
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-emerald-50 border border-emerald-100 text-emerald-600 text-[8px] font-bold uppercase tracking-wider">
                  <span className="w-1 h-1 rounded-full bg-emerald-500" />
                  <span>Live</span>
                </span>
              </div>
              <p className="text-[8px] text-slate-400 font-bold uppercase tracking-[0.1em] hidden md:block whitespace-nowrap truncate">
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
            className="relative p-1.5 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer shrink-0"
            title="Notifications"
          >
            <Bell className="w-5 h-5" />
            {unreadNotificationCount > 0 && (
              <div className="absolute top-1 right-1 w-2 h-2 bg-rose-500 rounded-full ring-2 ring-white"></div>
            )}
          </button>

          {/* User Profile */}
          <div className="flex items-center gap-3 shrink-0">
            <div className="text-right hidden md:block">
              <p className="text-xs font-bold text-slate-800 leading-none">{currentUser?.name || 'User'}</p>
              <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-tight">{currentUser?.role}</p>
            </div>
            <img
              src={currentUser?.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(currentUser?.name || 'User')}&background=3F51B5&color=fff`}
              alt={currentUser?.name || 'User'}
              className="w-8 h-8 rounded-full object-cover border border-slate-100 shadow-sm"
            />
          </div>

          {/* Sign Out Button */}
          <button
            onClick={logout}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-slate-500 hover:text-primary transition-all cursor-pointer active:scale-95 shrink-0"
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
