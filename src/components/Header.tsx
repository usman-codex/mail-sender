import { LogOut, Mail, Shield } from 'lucide-react';
import { UserProfile, GmailQuotaInfo } from '../types';
import { ADMIN_EMAIL } from '../services/supabase';

interface HeaderProps {
  user: UserProfile | null;
  quota: GmailQuotaInfo;
  activeTab: 'composer' | 'history' | 'admin';
  setActiveTab: (tab: 'composer' | 'history' | 'admin') => void;
  onLogout: () => void;
}

export function Header({
  user,
  quota,
  activeTab,
  setActiveTab,
  onLogout,
}: HeaderProps) {
  const maxCap = quota.tier.includes('2000') ? 2000 : 500;
  const isAdmin = user?.email?.toLowerCase().trim() === ADMIN_EMAIL.toLowerCase().trim();

  return (
    <header className="border-b border-slate-800 bg-slate-900/90 backdrop-blur-md sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-indigo-600 rounded-xl flex items-center justify-center font-bold text-white shadow-md shadow-indigo-600/30">
              <Mail className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight text-white flex items-center gap-2">
                Codex Resume Mailer
              </h1>
            </div>
          </div>

          <div className="flex items-center flex-wrap gap-3">
            {user && (
              <>
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-800/60 border border-slate-700/60 text-xs text-slate-300">
                  <span className="text-[10px] uppercase font-bold text-slate-400">Quota</span>
                  <span className="font-semibold text-white font-mono text-xs">
                    {quota.dailySentCount} / {maxCap}
                  </span>
                </div>

                <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-slate-800/80 border border-slate-700/70">
                  {user.photoURL ? (
                    <img
                      src={user.photoURL}
                      alt={user.displayName}
                      className="w-6 h-6 rounded-full border border-slate-600 object-cover"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="w-6 h-6 rounded-full bg-indigo-600 text-white font-bold text-xs flex items-center justify-center">
                      {(user.displayName || user.email || 'U').charAt(0).toUpperCase()}
                    </div>
                  )}
                  <span className="text-xs font-semibold text-slate-200 truncate max-w-[160px]">
                    {user.email}
                  </span>
                  <button
                    id="logout-btn"
                    onClick={onLogout}
                    title="Sign Out"
                    className="text-slate-400 hover:text-rose-400 p-1 transition-colors ml-1 cursor-pointer"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                  </button>
                </div>
              </>
            )}
          </div>
        </div>

        {user && (
          <div className="flex items-center gap-2 mt-3 pt-2.5 border-t border-slate-800/80">
            <button
              id="tab-composer"
              onClick={() => setActiveTab('composer')}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'composer'
                  ? 'bg-indigo-600 text-white'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Mailer
            </button>
            <button
              id="tab-history"
              onClick={() => setActiveTab('history')}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'history'
                  ? 'bg-indigo-600 text-white'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Delivery Logs ({quota.dailySentCount})
            </button>

            {isAdmin && (
              <button
                id="tab-admin"
                onClick={() => setActiveTab('admin')}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                  activeTab === 'admin'
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                    : 'text-amber-400 hover:text-amber-300 bg-amber-500/10 border border-amber-500/20'
                }`}
              >
                <Shield className="w-3 h-3" />
                <span>Admin Page (Users & CVs)</span>
              </button>
            )}
          </div>
        )}
      </div>
    </header>
  );
}
