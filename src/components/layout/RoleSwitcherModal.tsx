import React from 'react';
import { useLeave } from '../../context/LeaveContext';
import { MaterialChip } from '../common/MaterialChip';
import { X, UserCheck, Shield, Award, Users, RefreshCw } from 'lucide-react';

interface RoleSwitcherModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const RoleSwitcherModal: React.FC<RoleSwitcherModalProps> = ({ isOpen, onClose }) => {
  const { allUsers, currentUser, switchUser, resetData } = useLeave();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden border border-slate-200">
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-indigo-900 via-indigo-800 to-blue-900 px-6 py-5 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/10 rounded-xl backdrop-blur-xs">
              <Users className="w-6 h-6 text-indigo-200" />
            </div>
            <div>
              <h3 className="text-lg font-bold">Interactive Persona & Role Switcher</h3>
              <p className="text-xs text-indigo-200">
                Switch user profiles instantly to test the multi-tier approval workflow end-to-end
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 rounded-lg text-indigo-200 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-4">
          <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-3 text-xs text-indigo-900 flex items-start gap-2.5">
            <Award className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">Workflow Simulation Guide:</p>
              <p className="mt-0.5 text-indigo-800">
                1. <strong>Prof. Rajesh Kumar (Faculty)</strong> applies for leave → 
                2. Switch to <strong>Dr. Sunita Verma (HOD CSE)</strong> to endorse & forward → 
                3. Switch to <strong>Dr. A. K. Kapoor (Registrar)</strong> to give final sanction.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {allUsers.map((user) => {
              const isSelected = user.id === currentUser.id;
              return (
                <div
                  key={user.id}
                  onClick={() => {
                    switchUser(user.id);
                    onClose();
                  }}
                  className={`p-4 rounded-xl border transition-all cursor-pointer flex items-center justify-between group ${
                    isSelected 
                      ? 'border-indigo-600 bg-indigo-50/60 ring-2 ring-indigo-500/20 shadow-sm' 
                      : 'border-slate-200 hover:border-indigo-300 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <img 
                      src={user.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=1e3a8a&color=fff`} 
                      alt={user.name} 
                      className="w-12 h-12 rounded-full object-cover border border-slate-300 shadow-2xs"
                    />
                    <div>
                      <h4 className="text-sm font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
                        {user.name}
                      </h4>
                      <p className="text-xs text-slate-600">{user.designation}</p>
                      <p className="text-[11px] text-slate-500 mt-0.5">{user.departmentName}</p>
                      <div className="mt-1.5 flex items-center gap-1.5">
                        <MaterialChip label={user.role} variant="role" role={user.role} />
                      </div>
                    </div>
                  </div>

                  {isSelected && (
                    <span className="p-1.5 bg-indigo-600 text-white rounded-full shadow-2xs">
                      <UserCheck className="w-4 h-4" />
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="bg-slate-50 px-6 py-4 border-t border-slate-200 flex items-center justify-between">
          <button
            onClick={() => {
              if (window.confirm('Reset app data to default initial state?')) {
                resetData();
                onClose();
              }
            }}
            className="px-3 py-1.5 text-xs text-rose-700 bg-rose-50 border border-rose-200 hover:bg-rose-100 rounded-lg font-medium flex items-center gap-1.5 transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Reset Initial Sample Data
          </button>

          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-100 transition-colors shadow-2xs"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
