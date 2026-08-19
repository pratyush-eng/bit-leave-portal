import React from 'react';
import { useLeave } from '../../context/LeaveContext';
import { MaterialChip } from '../common/MaterialChip';
import { BitLogo } from '../common/BitLogo';
import { 
  LayoutDashboard, 
  FilePlus, 
  History, 
  CheckSquare, 
  Calendar, 
  BarChart3, 
  ShieldCheck, 
  UserCog, 
  X,
  Sparkles,
  Building2,
  FileCheck2,
  LogOut,
  KeyRound
} from 'lucide-react';

interface SidebarProps {
  activeView: string;
  setActiveView: (view: string) => void;
  isMobileOpen: boolean;
  onCloseMobile: () => void;
  onOpenChangePassword?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeView,
  setActiveView,
  isMobileOpen,
  onCloseMobile,
  onOpenChangePassword
}) => {
  const { currentUser, leaveRequests, logout, systemSettings } = useLeave();

  // Calculate pending approval counts
  const pendingHodCount = leaveRequests.filter(
    r => r.status === 'PENDING_HOD' && currentUser?.departmentId && r.departmentId === currentUser.departmentId
  ).length;

  const pendingRegistrarCount = leaveRequests.filter(
    r => r.status === 'PENDING_REGISTRAR'
  ).length;

  const pendingCountForRole = currentUser?.role === 'HOD' 
    ? pendingHodCount 
    : currentUser?.role === 'REGISTRAR' 
      ? pendingRegistrarCount 
      : 0;

  const isHodOrRegistrar = currentUser?.role === 'HOD' || currentUser?.role === 'REGISTRAR' || currentUser?.role === 'SUPER_ADMIN';
  const isAdminOrSuper = currentUser?.role === 'ADMIN' || currentUser?.role === 'SUPER_ADMIN';
  const isSuperAdmin = currentUser?.role === 'SUPER_ADMIN';

  const navItems = [
    { id: 'dashboard', label: 'Dashboard Overview', icon: LayoutDashboard },
    { id: 'apply_leave', label: 'Apply for Leave', icon: FilePlus },
    { id: 'my_leaves', label: 'My Leave History', icon: History },
    ...(isHodOrRegistrar ? [{ 
      id: 'approvals', 
      label: currentUser?.role === 'HOD' ? 'HOD Endorsements' : currentUser?.role === 'REGISTRAR' ? 'Registrar Sanctions' : 'Pending Approvals', 
      icon: CheckSquare,
      badge: pendingCountForRole
    }] : []),
    { id: 'calendar', label: 'Department Calendar', icon: Calendar },
    { id: 'reports', label: 'Analytics & Reports', icon: BarChart3 },
    ...(isAdminOrSuper ? [{ id: 'admin', label: 'User Roles & Quotas', icon: UserCog }] : []),
    ...(isSuperAdmin ? [{ id: 'super_admin', label: 'Super Admin Controls', icon: ShieldCheck }] : []),
  ];

  const handleNavClick = (viewId: string) => {
    setActiveView(viewId);
    onCloseMobile();
  };

  return (
    <>
      {/* Overlay for Mobile */}
      {isMobileOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-40 lg:hidden"
          onClick={onCloseMobile}
        />
      )}

      {/* Navigation Drawer Container */}
      <aside className={`
        fixed lg:static top-0 bottom-0 left-0 z-40
        w-64 bg-[#3F51B5] text-indigo-100 flex flex-col shrink-0
        transition-transform duration-200 ease-in-out shadow-xl lg:shadow-none
        ${isMobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        {/* Sidebar Header */}
        <div className="p-4 flex items-center justify-between border-b border-white/5">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 bg-white p-1 rounded-lg flex items-center justify-center font-bold text-[#3F51B5] shrink-0 overflow-hidden shadow-sm">
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
              <h1 className="text-sm font-bold tracking-tight text-white leading-tight uppercase truncate">
                BIT Mesra
              </h1>
              <p className="text-[10px] text-indigo-200/80 font-medium whitespace-nowrap truncate">
                Leave Portal v2.0
              </p>
            </div>
          </div>
          <button 
            onClick={onCloseMobile}
            className="lg:hidden p-1.5 rounded-lg text-indigo-200 hover:text-white hover:bg-white/10"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 px-0 py-4 space-y-0.5 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeView === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleNavClick(item.id)}
                className={`
                  w-full flex items-center justify-between px-6 py-3 text-[10px] font-bold transition-all group relative
                  ${isActive 
                    ? 'bg-white/10 text-white' 
                    : 'text-indigo-200 hover:bg-white/5 hover:text-white'}
                `}
              >
                {isActive && <div className="absolute left-0 top-0 bottom-0 w-1 bg-white"></div>}
                <div className="flex items-center gap-3">
                  <Icon className={`w-4 h-4 transition-colors ${isActive ? 'text-white' : 'text-indigo-300 group-hover:text-white'}`} />
                  <span className="uppercase tracking-[0.1em]">{item.label}</span>
                </div>

                {item.badge !== undefined && item.badge > 0 && (
                  <span className={`px-1.5 py-0.5 rounded-full text-[8px] font-bold ${
                    isActive ? 'bg-white text-[#3F51B5]' : 'bg-rose-500 text-white'
                  }`}>
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Bottom Actions */}
        <div className="p-4 border-t border-white/5 space-y-1">
          <button
            onClick={() => {
              if (onOpenChangePassword) onOpenChangePassword();
              onCloseMobile();
            }}
            className="w-full flex items-center gap-3 px-4 py-2.5 text-[10px] font-bold text-indigo-200 hover:text-white rounded transition-colors text-left uppercase tracking-widest cursor-pointer group"
          >
            <KeyRound className="w-4 h-4 opacity-50 group-hover:opacity-100" />
            Change Password
          </button>

          <button
            onClick={() => {
              logout();
              onCloseMobile();
            }}
            className="w-full flex items-center gap-3 px-4 py-2.5 text-[10px] font-bold text-indigo-200 hover:text-white rounded transition-colors text-left uppercase tracking-widest cursor-pointer group"
          >
            <LogOut className="w-4 h-4 opacity-50 group-hover:opacity-100" />
            Sign Out
          </button>
        </div>
      </aside>
    </>
  );
};
