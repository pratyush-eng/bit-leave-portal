import React, { useState } from 'react';
import { useLeave } from '../../context/LeaveContext';
import { MaterialChip } from '../common/MaterialChip';
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
  LogOut
} from 'lucide-react';

interface HeaderProps {
  onToggleMobileSidebar: () => void;
  onOpenRoleSwitcher: () => void;
  onOpenNotifications: () => void;
  activeView: string;
}

export const Header: React.FC<HeaderProps> = ({ 
  onToggleMobileSidebar, 
  onOpenRoleSwitcher, 
  onOpenNotifications,
  activeView
}) => {
  const { currentUser, unreadNotificationCount, logout } = useLeave();

  return (
    <header className="h-16 bg-white border-b border-slate-200 sticky top-0 z-30 shadow-xs flex items-center justify-between px-4 sm:px-6 lg:px-8 shrink-0">
      <div className="flex items-center justify-between w-full">
        
        {/* Left Side: Mobile Menu Button & Portal Title */}
        <div className="flex items-center gap-3">
          <button
            onClick={onToggleMobileSidebar}
            className="p-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 lg:hidden transition-colors"
            aria-label="Toggle navigation drawer"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded bg-[#3F51B5] text-white flex items-center justify-center font-bold text-xs shadow-xs">
              <GraduationCap className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-semibold text-slate-800 leading-tight">
                University Administrative Portal
              </h2>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest hidden sm:block">
                EduLeave • Multi-Tier Approval
              </p>
            </div>
          </div>
        </div>

        {/* Right Side: Quick Role Switcher, Notifications, User Profile & Sign Out */}
        <div className="flex items-center gap-3 sm:gap-4">
          
          {/* Persona / Role Switcher Launcher Button */}
          <button
            onClick={onOpenRoleSwitcher}
            className="bg-[#3F51B5] hover:bg-[#303F9F] text-white px-3 sm:px-4 py-2 rounded-lg shadow-xs text-xs font-medium uppercase tracking-wide flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer"
            title="Click to switch persona or role"
          >
            <ArrowLeftRight className="w-3.5 h-3.5 shrink-0 opacity-90" />
            <span className="hidden md:inline">Role:</span>
            <span>{currentUser.role}</span>
          </button>

          {/* Notifications Button */}
          <button
            onClick={onOpenNotifications}
            className="relative flex items-center gap-1.5 text-slate-600 hover:text-slate-900 transition-colors p-2 rounded-lg hover:bg-slate-100 cursor-pointer"
            title="Notifications"
          >
            <Bell className="w-5 h-5" />
            <span className="text-xs font-medium text-slate-600 hidden md:inline">Alerts</span>
            {unreadNotificationCount > 0 && (
              <div className="w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center text-[10px] font-bold shadow-2xs">
                {unreadNotificationCount}
              </div>
            )}
          </button>

          {/* User Avatar */}
          <div className="hidden sm:flex items-center gap-2.5 pl-3 border-l border-slate-200">
            <img
              src={currentUser.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(currentUser.name)}&background=1e3a8a&color=fff`}
              alt={currentUser.name}
              className="w-8 h-8 rounded-full object-cover border border-slate-200 shadow-2xs"
            />
            <div className="text-left hidden lg:block">
              <p className="text-xs font-semibold text-slate-800 leading-none">{currentUser.name}</p>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">{currentUser.departmentId}</p>
            </div>
          </div>

          {/* Sign Out Button */}
          <button
            onClick={logout}
            className="flex items-center gap-1 px-3 py-2 text-xs font-medium text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg transition-all cursor-pointer active:scale-95 uppercase tracking-wider ml-1"
            title="Log out of session"
          >
            <LogOut className="w-3.5 h-3.5 text-rose-600" />
            <span className="hidden sm:inline">Logout</span>
          </button>

        </div>
      </div>
    </header>
  );
};
