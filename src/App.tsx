/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { LeaveProvider, useLeave } from './context/LeaveContext';
import { Header } from './components/layout/Header';
import { Sidebar } from './components/layout/Sidebar';
import { RoleSwitcherModal } from './components/layout/RoleSwitcherModal';
import { NotificationDrawer } from './components/notifications/NotificationDrawer';
import { ApplyLeaveModal } from './components/leaves/ApplyLeaveModal';
import { LeaveDetailModal } from './components/leaves/LeaveDetailModal';
import { LeaveCalendar } from './components/leaves/LeaveCalendar';
import { AnalyticsReports } from './components/reports/AnalyticsReports';
import { ToastContainer } from './components/common/ToastContainer';
import { ChangePasswordModal } from './components/auth/ChangePasswordModal';

import { FacultyDashboard } from './components/dashboard/FacultyDashboard';
import { HodDashboard } from './components/dashboard/HodDashboard';
import { RegistrarDashboard } from './components/dashboard/RegistrarDashboard';
import { AdminDashboard } from './components/dashboard/AdminDashboard';
import { SuperAdminDashboard } from './components/dashboard/SuperAdminDashboard';
import { LoginPage } from './components/auth/LoginPage';

import { LeaveRequest } from './types';
import { MaterialChip } from './components/common/MaterialChip';
import { TimelineStepper } from './components/common/TimelineStepper';
import { Plus, Filter, Search, FileText, Printer } from 'lucide-react';

const AppContent: React.FC = () => {
  const { currentUser, leaveRequests, isAuthenticated, systemSettings } = useLeave();

  useEffect(() => {
    const faviconUrl = systemSettings?.institutionLogoUrl || '/favicon.svg';
    const existingIcon = document.querySelector<HTMLLinkElement>("link[rel='icon']") || document.querySelector<HTMLLinkElement>("link[rel='shortcut icon']");
    if (existingIcon) {
      existingIcon.href = faviconUrl;
    } else {
      const link = document.createElement('link');
      link.rel = 'icon';
      link.href = faviconUrl;
      document.head.appendChild(link);
    }
  }, [systemSettings?.institutionLogoUrl]);

  const [activeView, setActiveView] = useState<string>('dashboard');
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState<boolean>(false);
  const [isRoleSwitcherOpen, setIsRoleSwitcherOpen] = useState<boolean>(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState<boolean>(false);
  const [isApplyModalOpen, setIsApplyModalOpen] = useState<boolean>(false);
  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState<boolean>(false);
  const [selectedLeaveId, setSelectedLeaveId] = useState<string | null>(null);
  const [printLeaveMode, setPrintLeaveMode] = useState<boolean>(false);

  if (!isAuthenticated) {
    return <LoginPage />;
  }

  // Leave detail selection
  const selectedLeaveRequest = leaveRequests.find(r => r.id === selectedLeaveId) || null;

  const handleSelectLeaveRequest = (id: string, printMode = false) => {
    setSelectedLeaveId(id);
    setPrintLeaveMode(printMode);
  };

  // Render view router based on activeView & role
  const renderMainContent = () => {
    switch (activeView) {
      case 'dashboard':
        switch (currentUser.role) {
          case 'FACULTY':
          case 'STAFF':
            return (
              <FacultyDashboard 
                onOpenApplyModal={() => setIsApplyModalOpen(true)}
                onSelectLeaveRequest={handleSelectLeaveRequest}
              />
            );
          case 'HOD':
            return <HodDashboard onSelectLeaveRequest={handleSelectLeaveRequest} />;
          case 'REGISTRAR':
            return <RegistrarDashboard onSelectLeaveRequest={handleSelectLeaveRequest} />;
          case 'ADMIN':
            return <AdminDashboard />;
          case 'SUPER_ADMIN':
            return <SuperAdminDashboard />;
          default:
            return (
              <FacultyDashboard 
                onOpenApplyModal={() => setIsApplyModalOpen(true)}
                onSelectLeaveRequest={handleSelectLeaveRequest}
              />
            );
        }

      case 'apply_leave':
        return (
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs flex flex-col md:flex-row items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Apply for Institutional Leave</h2>
                <p className="text-xs text-slate-500 mt-1">
                  Submit a leave application with lecture substitute arrangements for HOD & Registrar approval.
                </p>
              </div>

              <button
                onClick={() => setIsApplyModalOpen(true)}
                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-md transition-all active:scale-95 flex items-center gap-2"
              >
                <Plus className="w-4 h-4" /> Open Leave Application Form
              </button>
            </div>

            <FacultyDashboard 
              onOpenApplyModal={() => setIsApplyModalOpen(true)}
              onSelectLeaveRequest={handleSelectLeaveRequest}
            />
          </div>
        );

      case 'my_leaves':
        const myRequests = leaveRequests.filter(r => r.applicantId === currentUser.id);
        return (
          <div className="space-y-6">
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-slate-900">My Personal Leave Dossier & History</h2>
                <p className="text-xs text-slate-500 mt-0.5">Track status, comments, and timeline progression</p>
              </div>

              <button
                onClick={() => setIsApplyModalOpen(true)}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-xs flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" /> Apply Leave
              </button>
            </div>

            <div className="space-y-4">
              {myRequests.length === 0 ? (
                <div className="bg-white p-12 text-center text-slate-400 text-xs rounded-2xl border border-slate-200">
                  No leave applications submitted yet.
                </div>
              ) : (
                myRequests.map((r) => (
                  <div
                    key={r.id}
                    onClick={() => handleSelectLeaveRequest(r.id)}
                    className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs hover:border-indigo-300 transition-all cursor-pointer space-y-3"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-2">
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-sm text-indigo-950">{r.id}</span>
                        <MaterialChip label={r.leaveType} variant="leaveType" leaveType={r.leaveType} />
                        <MaterialChip label={r.status} variant="status" status={r.status} />
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-slate-500">Dates: <strong>{r.startDate} to {r.endDate}</strong> ({r.totalDays} days)</span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSelectLeaveRequest(r.id, true);
                          }}
                          className="px-2.5 py-1 text-xs font-bold bg-indigo-50 hover:bg-indigo-100 text-[#3F51B5] rounded-lg border border-indigo-200 flex items-center gap-1 transition-colors cursor-pointer"
                          title="Print official application sheet"
                        >
                          <Printer className="w-3.5 h-3.5" />
                          Print Form
                        </button>
                      </div>
                    </div>

                    <TimelineStepper request={r} />
                  </div>
                ))
              )}
            </div>
          </div>
        );

      case 'approvals':
        if (currentUser.role === 'HOD') {
          return <HodDashboard onSelectLeaveRequest={handleSelectLeaveRequest} />;
        } else if (currentUser.role === 'REGISTRAR') {
          return <RegistrarDashboard onSelectLeaveRequest={handleSelectLeaveRequest} />;
        } else {
          return <HodDashboard onSelectLeaveRequest={handleSelectLeaveRequest} />;
        }

      case 'calendar':
        return <LeaveCalendar onSelectLeaveRequest={handleSelectLeaveRequest} />;

      case 'reports':
        return <AnalyticsReports />;

      case 'admin':
        return <AdminDashboard />;

      case 'super_admin':
        return <SuperAdminDashboard />;

      default:
        return <FacultyDashboard onOpenApplyModal={() => setIsApplyModalOpen(true)} onSelectLeaveRequest={handleSelectLeaveRequest} />;
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 font-sans flex flex-col antialiased">
      
      {/* Top Header */}
      <Header
        onToggleMobileSidebar={() => setIsMobileSidebarOpen(prev => !prev)}
        onOpenRoleSwitcher={() => setIsRoleSwitcherOpen(true)}
        onOpenNotifications={() => setIsNotificationsOpen(true)}
        onOpenChangePassword={() => setIsChangePasswordOpen(true)}
        activeView={activeView}
      />

      {/* Main Layout Container */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* Navigation Sidebar Drawer */}
        <Sidebar
          activeView={activeView}
          setActiveView={setActiveView}
          isMobileOpen={isMobileSidebarOpen}
          onCloseMobile={() => setIsMobileSidebarOpen(false)}
          onOpenChangePassword={() => setIsChangePasswordOpen(true)}
        />

        {/* Workspace Canvas */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full">
          {renderMainContent()}
        </main>
      </div>

      {/* Modals & Drawers */}
      <RoleSwitcherModal
        isOpen={isRoleSwitcherOpen}
        onClose={() => setIsRoleSwitcherOpen(false)}
      />

      <NotificationDrawer
        isOpen={isNotificationsOpen}
        onClose={() => setIsNotificationsOpen(false)}
        onSelectLeaveRequest={handleSelectLeaveRequest}
      />

      <ApplyLeaveModal
        isOpen={isApplyModalOpen}
        onClose={() => setIsApplyModalOpen(false)}
        onSuccess={() => setActiveView('my_leaves')}
      />

      <LeaveDetailModal
        request={selectedLeaveRequest}
        onClose={() => {
          setSelectedLeaveId(null);
          setPrintLeaveMode(false);
        }}
        initialPrintMode={printLeaveMode}
      />

      {isChangePasswordOpen && (
        <ChangePasswordModal onClose={() => setIsChangePasswordOpen(false)} />
      )}

      <ToastContainer onSelectLeaveRequest={handleSelectLeaveRequest} />
    </div>
  );
};

export default function App() {
  return (
    <LeaveProvider>
      <AppContent />
    </LeaveProvider>
  );
}
