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
      label: currentUser?.role === 'HOD' ? 'Pending Approvals' : currentUser?.role === 'REGISTRAR' ? 'Pending Approvals' : 'Pending Approvals', 
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
      <aside 
        className={`
          fixed lg:static top-0 bottom-0 left-0 z-40
          w-64 flex flex-col shrink-0
          transition-transform duration-200 ease-in-out shadow-xl lg:shadow-none
          ${isMobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}
        style={{ 
          backgroundColor: 'var(--sidebar-bg-color, #3F51B5)', 
          color: 'var(--sidebar-text-color, #ffffff)' 
        }}
      >
        {/* Sidebar Header */}
        <div className="p-6 flex items-center justify-between border-b border-white/5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 flex items-center justify-center shrink-0 overflow-hidden drop-shadow-md">
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
              <h1 className="text-sm font-bold tracking-tight text-white leading-tight uppercase">
                BIT MESRA
              </h1>
              <p className="text-[10px] text-indigo-100 font-medium whitespace-nowrap">
                Leave Portal v2.0
              </p>
            </div>
          </div>
          <button 
            onClick={onCloseMobile}
            className="lg:hidden p-1.5 rounded-lg text-indigo-100 hover:text-white hover:bg-white/10"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeView === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleNavClick(item.id)}
                className={`
                  w-full flex items-center justify-between px-4 py-3 rounded-xl text-xs font-bold transition-all group
                  ${isActive 
                    ? 'bg-white/20 shadow-sm' 
                    : 'opacity-70 hover:bg-white/5 hover:opacity-100'}
                `}
                style={{ color: 'inherit' }}
              >
                <div className="flex items-center gap-4">
                  <Icon className={`w-4 h-4 transition-colors ${isActive ? 'opacity-100' : 'opacity-70 group-hover:opacity-100'}`} />
                  <span className="font-medium tracking-tight text-[13px]">{item.label}</span>
                </div>

                {item.badge !== undefined && item.badge > 0 && (
                  <span className={`px-1.5 py-0.5 rounded-full text-[8px] font-bold ${
                    isActive ? 'bg-white' : 'bg-rose-500 text-white'
                  }`}
                  style={{ color: isActive ? 'var(--sidebar-bg-color)' : 'inherit' }}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Workflow Info Card */}
        <div className="px-4 mb-4">
          <div className="bg-[#263238] p-4 rounded-2xl shadow-lg border border-white/5">
            <div className="flex items-center gap-2 mb-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]"></div>
              <span className="text-[10px] font-bold text-white uppercase tracking-widest">Multi-tier Workflow</span>
            </div>
            <p className="text-[10px] text-slate-400 font-medium leading-relaxed">
              Applicant → HOD → Registrar approval pipeline active.
            </p>
          </div>
        </div>

        {/* Sidebar Footer / User Section */}
        <div className="p-4 border-t border-white/10 bg-indigo-900/10">
          <div className="flex items-center gap-3">
            <img
              src={currentUser?.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(currentUser?.name || 'User')}&background=fff&color=3F51B5`}
              alt={currentUser?.name || 'User'}
              className="w-10 h-10 rounded-full border-2 border-white/20 object-cover shrink-0"
            />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-white truncate leading-tight">
                {currentUser?.name || 'Portal User'}
              </p>
              <p className="text-[9px] font-bold text-indigo-200 uppercase tracking-tight truncate mt-0.5 opacity-80">
                {currentUser?.role} • {currentUser?.departmentId || 'BIT'}
              </p>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <button
                onClick={() => {
                  if (onOpenChangePassword) onOpenChangePassword();
                  onCloseMobile();
                }}
                className="p-1.5 text-indigo-200 hover:text-white hover:bg-white/10 rounded-lg transition-all cursor-pointer"
                title="Change Password"
              >
                <KeyRound className="w-4 h-4" />
              </button>
              <button
                onClick={() => {
                  logout();
                  onCloseMobile();
                }}
                className="p-1.5 text-indigo-200 hover:text-rose-300 hover:bg-rose-500/10 rounded-lg transition-all cursor-pointer"
                title="Sign Out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
};
