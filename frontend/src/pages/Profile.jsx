import React from 'react';
import { User, Mail, Shield, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function Profile() {
  const { user } = useAuth();

  const getInitials = (name) => {
    if (!name) return 'U';
    return name
      .split(' ')
      .map((part) => part[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div className="flex items-center justify-between border-b border-slate-800 pb-5">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white flex items-center gap-2.5">
            <User className="w-7 h-7 text-cyan-400" />
            <span>User Profile</span>
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Manage your account profile and preference settings.
          </p>
        </div>
      </div>

      {/* Profile Overview Card */}
      <div className="p-6 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-6">
        <div className="flex flex-col sm:flex-row items-center space-y-4 sm:space-y-0 sm:space-x-4">
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center text-white text-2xl font-bold shadow-lg shadow-cyan-500/20">
            {getInitials(user?.name || 'Guest User')}
          </div>
          <div className="space-y-1 text-center sm:text-left">
            <h2 className="text-xl font-bold text-white">{user?.name || 'Guest User'}</h2>
            <p className="text-xs text-slate-400">{user?.email || 'Not logged in'}</p>
            <span className="inline-block px-2.5 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 text-[11px] font-semibold">
              {user ? 'Registered Member' : 'Guest Visitor'}
            </span>
          </div>
        </div>

        {/* User Details Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-slate-800">
          <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
            <span className="text-[11px] font-semibold text-slate-400 uppercase">Account Status</span>
            <p className="text-sm font-semibold text-emerald-400">{user ? 'Active Account' : 'Guest Mode'}</p>
          </div>
          <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
            <span className="text-[11px] font-semibold text-slate-400 uppercase">Member Since</span>
            <p className="text-sm font-semibold text-slate-200">
              {user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'N/A'}
            </p>
          </div>
          <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
            <span className="text-[11px] font-semibold text-slate-400 uppercase">Supported Languages</span>
            <p className="text-sm font-semibold text-slate-200">English & தமிழ் (Tamil)</p>
          </div>
          <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
            <span className="text-[11px] font-semibold text-slate-400 uppercase">Camera Privacy</span>
            <p className="text-sm font-semibold text-cyan-400">Protected (In-browser execution)</p>
          </div>
        </div>
      </div>
    </div>
  );
}
