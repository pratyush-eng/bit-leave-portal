import React from 'react';
import { useLeave } from '../../context/LeaveContext';
import { MaterialChip } from '../common/MaterialChip';
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
        w-64 bg-[#3F51B5] text-white flex flex-col shrink-0
        transition-transform duration-200 ease-in-out shadow-xl lg:shadow-none
        ${isMobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        {/* Sidebar Header */}
        <div className="p-6 flex items-center justify-between border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-white/20 rounded-lg flex items-center justify-center font-bold text-white shadow-xs text-sm overflow-hidden shrink-0">
              {systemSettings?.institutionLogoUrl ? (
                <img 
                  src={systemSettings.institutionLogoUrl} 
                  alt="Logo" 
                  className="w-full h-full object-cover" 
                  onError={(e) => {
                    (e.target as HTMLElement).style.display = 'none';
                  }}
                />
              ) : (
                'LP'
              )}
            </div>
            <div className="min-w-0">
              <h1 className="text-base sm:text-lg font-bold tracking-tight text-white leading-tight whitespace-nowrap truncate">
                {systemSettings?.institutionName || 'BIT Leave Portal'}
              </h1>
              <p className="text-[10px] uppercase tracking-wider font-semibold opacity-60 text-indigo-100 mt-0.5 whitespace-nowrap truncate">
                University Portal
              </p>
            </div>
          </div>
          <button 
            onClick={onCloseMobile}
            className="lg:hidden p-1 rounded-lg text-white/70 hover:text-white hover:bg-white/10"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 px-4 py-4 space-y-1.5 overflow-y-auto">
          <p className="px-3 text-[10px] font-bold uppercase tracking-widest text-indigo-200/60 mb-2">
            Main Portal Menu
          </p>

          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeView === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleNavClick(item.id)}
                className={`
                  w-full flex items-center justify-between px-4 py-3 rounded-lg text-sm font-medium transition-all
                  ${isActive 
                    ? 'bg-white/10 text-white shadow-xs' 
                    : 'text-white/80 hover:text-white hover:bg-white/5 opacity-80 hover:opacity-100'}
                `}
              >
                <div className="flex items-center gap-3">
                  <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-indigo-200'}`} />
                  <span>{item.label}</span>
                </div>

                {item.badge !== undefined && item.badge > 0 && (
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    isActive ? 'bg-orange-500 text-white' : 'bg-red-500 text-white'
                  }`}>
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Footer Status Card */}
        <div className="p-4 mx-3 mb-3 bg-[#263238] rounded-xl border border-white/10 text-white shadow-sm">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-300">Multi-Tier Workflow</p>
          </div>
          <p className="text-[11px] text-slate-300 leading-tight">
            Applicant → HOD → Registrar approval pipeline active.
          </p>
        </div>

        {/* User Card Profile at Bottom */}
        <div className="p-4 border-t border-white/10 bg-black/10">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-3 min-w-0">
              <img 
                src={currentUser?.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(currentUser?.name || 'User')}&background=1e3a8a&color=fff`} 
                alt={currentUser?.name || 'User'} 
                className="w-9 h-9 rounded-full object-cover border-2 border-white/20 shadow-xs shrink-0"
              />
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-white truncate">{currentUser?.name || 'User'}</p>
                <p className="text-[10px] text-indigo-200 uppercase tracking-wider font-bold truncate">
                  {currentUser?.role} • {currentUser?.departmentId}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1 shrink-0">
              {onOpenChangePassword && (
                <button
                  onClick={() => {
                    onOpenChangePassword();
                    onCloseMobile();
                  }}
                  className="p-1.5 text-indigo-200 hover:text-white hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
                  title="Change Password"
                >
                  <KeyRound className="w-4 h-4" />
                </button>
              )}

              <button
                onClick={() => {
                  logout();
                  onCloseMobile();
                }}
                className="p-1.5 text-rose-200 hover:text-white hover:bg-rose-500/20 rounded-lg transition-colors cursor-pointer"
                title="Sign Out"
              >
                <LogOut className="w-4 h-4 text-rose-300" />
              </button>
            </div>
          </div>
        </div>

      </aside>
    </>
  );
};
