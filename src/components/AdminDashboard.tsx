import { useState, useEffect } from 'react';
import {
  Users,
  Search,
  RefreshCw,
  Mail,
  Paperclip,
  FileText,
  Clock,
  Download,
  Shield,
  TrendingUp,
  MousePointerClick,
  Eye,
  Send,
  Award,
  Activity,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
  Globe,
  ExternalLink,
  ChevronRight,
  UserCheck,
  BarChart3,
  Layers,
  Sparkles,
} from 'lucide-react';
import { UserSavedData, EmailAttachment, AnalyticsSummary, ActivityEvent } from '../types';
import { supabaseService, ADMIN_EMAIL, SUPABASE_RLS_FIX_SQL, SupabaseHealth } from '../services/supabase';
import { analyticsService } from '../services/analytics';
import { formatBytes } from '../utils';

interface AdminDashboardProps {
  currentUserEmail: string;
}

export function AdminDashboard({ currentUserEmail }: AdminDashboardProps) {
  const isAuthorized = currentUserEmail?.toLowerCase().trim() === ADMIN_EMAIL.toLowerCase().trim();

  const [activeAdminTab, setActiveAdminTab] = useState<'overview' | 'rankings' | 'users' | 'database'>('overview');
  const [usersData, setUsersData] = useState<UserSavedData[]>([]);
  const [analytics, setAnalytics] = useState<AnalyticsSummary | null>(null);
  const [dbHealth, setDbHealth] = useState<SupabaseHealth | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUser, setSelectedUser] = useState<UserSavedData | null>(null);
  const [downloadingAttachmentId, setDownloadingAttachmentId] = useState<string | null>(null);
  const [copiedSql, setCopiedSql] = useState(false);

  const loadAllData = async () => {
    if (!isAuthorized) return;
    setLoading(true);
    try {
      const [users, health] = await Promise.all([
        supabaseService.getAllUsersData(),
        supabaseService.checkHealth(),
      ]);

      setUsersData(users);
      setDbHealth(health);

      const summary = analyticsService.getSummary(users);
      setAnalytics(summary);

      if (users.length > 0 && !selectedUser) {
        setSelectedUser(users[0]);
      }
    } catch (err) {
      console.error('Error fetching admin data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthorized) {
      loadAllData();
    }
  }, [isAuthorized]);

  if (!isAuthorized) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center space-y-4">
        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 inline-block">
          <Shield className="w-10 h-10 mx-auto" />
        </div>
        <h2 className="text-lg font-bold text-white">Access Restricted to Super Admin</h2>
        <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
          This administration insights center is exclusively authorized for <span className="font-mono text-indigo-400 font-semibold">{ADMIN_EMAIL}</span>.
        </p>
      </div>
    );
  }

  const handleCopySql = () => {
    navigator.clipboard.writeText(SUPABASE_RLS_FIX_SQL);
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 2500);
  };

  const handleDownloadAttachment = (attachment: EmailAttachment) => {
    try {
      setDownloadingAttachmentId(attachment.id);
      const link = document.createElement('a');
      link.href = attachment.dataBase64;
      link.download = attachment.name || 'cv_document';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (e) {
      console.error('Download failed', e);
    } finally {
      setTimeout(() => setDownloadingAttachmentId(null), 800);
    }
  };

  const filteredUsers = usersData.filter((u) => {
    const query = searchQuery.toLowerCase();
    return (
      u.user_email?.toLowerCase().includes(query) ||
      u.display_name?.toLowerCase().includes(query) ||
      u.subject?.toLowerCase().includes(query)
    );
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Top Banner & Control Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xl shadow-black/20">
        <div className="flex items-center gap-3.5">
          <div className="p-3 rounded-xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 border border-indigo-500/30 text-indigo-400 shrink-0">
            <Shield className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-white tracking-tight">
                Codex Admin & Analytics Center
              </h2>
              <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[10px] font-mono text-emerald-400 font-semibold flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                Live Sync
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Real-time user registrations, link click traffic, ranking insights, and CV template attachments.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-right hidden sm:block">
            <p className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Authorized Admin</p>
            <p className="text-xs font-mono font-semibold text-emerald-400">{currentUserEmail}</p>
          </div>
          <button
            type="button"
            onClick={loadAllData}
            disabled={loading}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-200 text-xs font-semibold border border-slate-700 transition-colors shadow-sm cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-indigo-400 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh All Data</span>
          </button>
        </div>
      </div>

      {/* RLS Warning / Fix Banner if Supabase needs policy update */}
      {dbHealth?.rlsBlocked && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-amber-200">Supabase Row-Level Security (RLS) Notice</p>
              <p className="text-amber-300/80 mt-0.5 text-[11px] leading-relaxed">
                Supabase database is connected, but Row-Level Security is currently restricting public writes. We are preserving all user data in unified memory and storage. Run the 10-second SQL command to enable direct Supabase cloud sync.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setActiveAdminTab('database')}
            className="px-3 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 font-semibold border border-amber-500/40 shrink-0 transition-colors cursor-pointer text-center"
          >
            View 1-Click SQL Fix
          </button>
        </div>
      )}

      {/* Sub-Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-2 overflow-x-auto">
        <button
          type="button"
          onClick={() => setActiveAdminTab('overview')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all whitespace-nowrap ${
            activeAdminTab === 'overview'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
              : 'text-slate-400 hover:text-white hover:bg-slate-900'
          }`}
        >
          <BarChart3 className="w-4 h-4" />
          <span>Overview & Traffic Insights</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveAdminTab('rankings')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all whitespace-nowrap ${
            activeAdminTab === 'rankings'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
              : 'text-slate-400 hover:text-white hover:bg-slate-900'
          }`}
        >
          <Award className="w-4 h-4" />
          <span>User Rankings & Leaderboard</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveAdminTab('users')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all whitespace-nowrap ${
            activeAdminTab === 'users'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
              : 'text-slate-400 hover:text-white hover:bg-slate-900'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Registered Users & CVs ({usersData.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveAdminTab('database')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all whitespace-nowrap ${
            activeAdminTab === 'database'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
              : 'text-slate-400 hover:text-white hover:bg-slate-900'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>Supabase Database Setup</span>
        </button>
      </div>

      {/* VIEW 1: OVERVIEW & TRAFFIC INSIGHTS */}
      {activeAdminTab === 'overview' && (
        <div className="space-y-6">
          {/* Key Metrics Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 relative overflow-hidden">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-400">Total Page Visits</span>
                <div className="p-2 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
                  <Eye className="w-4 h-4" />
                </div>
              </div>
              <p className="text-2xl font-bold text-white mt-3 font-mono">
                {analytics?.pageViews || 0}
              </p>
              <div className="flex items-center gap-1.5 mt-2 text-[11px] text-slate-500">
                <span className="text-blue-400 font-semibold">{analytics?.uniqueVisitors || 0}</span>
                <span>unique visitors tracked</span>
              </div>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 relative overflow-hidden">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-400">Link & CTA Clicks</span>
                <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                  <MousePointerClick className="w-4 h-4" />
                </div>
              </div>
              <p className="text-2xl font-bold text-white mt-3 font-mono">
                {analytics?.linkClicks || 0}
              </p>
              <div className="flex items-center gap-1.5 mt-2 text-[11px] text-slate-500">
                <span className="text-indigo-400 font-semibold">Interactive</span>
                <span>intent & engagement</span>
              </div>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 relative overflow-hidden">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-400">Registered Accounts</span>
                <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  <UserCheck className="w-4 h-4" />
                </div>
              </div>
              <p className="text-2xl font-bold text-white mt-3 font-mono">
                {analytics?.totalRegistered || 0}
              </p>
              <div className="flex items-center gap-1.5 mt-2 text-[11px] text-slate-500">
                <span className="text-emerald-400 font-semibold">{usersData.filter(u => u.attachments?.length > 0).length}</span>
                <span>users attached CV files</span>
              </div>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 relative overflow-hidden">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-400">Emails Dispatched</span>
                <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
                  <Send className="w-4 h-4" />
                </div>
              </div>
              <p className="text-2xl font-bold text-white mt-3 font-mono">
                {analytics?.totalEmailsDispatched || 0}
              </p>
              <div className="flex items-center gap-1.5 mt-2 text-[11px] text-slate-500">
                <span className="text-purple-400 font-semibold">100%</span>
                <span>Gmail API direct deliverability</span>
              </div>
            </div>
          </div>

          {/* Traffic Sources & Conversion Flow */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Traffic Breakdown */}
            <div className="lg:col-span-6 bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <Globe className="w-4 h-4 text-indigo-400" />
                  <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                    Traffic & Link Referral Sources
                  </h3>
                </div>
                <span className="text-[10px] text-slate-500">Live Breakdown</span>
              </div>

              <div className="space-y-3">
                {analytics?.trafficSources && analytics.trafficSources.length > 0 ? (
                  analytics.trafficSources.map((source) => (
                    <div key={source.name} className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-medium text-slate-300 flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-indigo-500"></span>
                          {source.name}
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="text-slate-400 font-mono text-[11px]">{source.count} visits</span>
                          <span className="text-xs font-bold text-white font-mono">{source.percentage}%</span>
                        </div>
                      </div>
                      <div className="w-full h-2 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
                        <div
                          className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full transition-all duration-500"
                          style={{ width: `${Math.max(source.percentage, 5)}%` }}
                        />
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-slate-500 py-4 text-center">No traffic recorded yet.</p>
                )}
              </div>
            </div>

            {/* Conversion Flow Funnel */}
            <div className="lg:col-span-6 bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-emerald-400" />
                  <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                    User Conversion Funnel
                  </h3>
                </div>
                <span className="text-[10px] text-slate-500">End-to-End Flow</span>
              </div>

              <div className="space-y-3">
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800/80 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="w-6 h-6 rounded-lg bg-blue-500/20 text-blue-400 font-bold text-xs flex items-center justify-center">1</span>
                    <div>
                      <p className="text-xs font-semibold text-white">Visited App</p>
                      <p className="text-[10px] text-slate-500">Clicked LinkedIn / Shared URL</p>
                    </div>
                  </div>
                  <span className="text-xs font-mono font-bold text-blue-400">{analytics?.pageViews || 0}</span>
                </div>

                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800/80 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="w-6 h-6 rounded-lg bg-indigo-500/20 text-indigo-400 font-bold text-xs flex items-center justify-center">2</span>
                    <div>
                      <p className="text-xs font-semibold text-white">Google OAuth Login</p>
                      <p className="text-[10px] text-slate-500">Authorized Gmail API sending</p>
                    </div>
                  </div>
                  <span className="text-xs font-mono font-bold text-indigo-400">{analytics?.totalRegistered || 0}</span>
                </div>

                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800/80 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="w-6 h-6 rounded-lg bg-emerald-500/20 text-emerald-400 font-bold text-xs flex items-center justify-center">3</span>
                    <div>
                      <p className="text-xs font-semibold text-white">CV & Template Configured</p>
                      <p className="text-[10px] text-slate-500">Attached resume & customized pitch</p>
                    </div>
                  </div>
                  <span className="text-xs font-mono font-bold text-emerald-400">
                    {usersData.filter((u) => u.attachments?.length > 0 || u.body).length}
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800/80 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="w-6 h-6 rounded-lg bg-purple-500/20 text-purple-400 font-bold text-xs flex items-center justify-center">4</span>
                    <div>
                      <p className="text-xs font-semibold text-white">Outreach Dispatched</p>
                      <p className="text-[10px] text-slate-500">Completed bulk sequences</p>
                    </div>
                  </div>
                  <span className="text-xs font-mono font-bold text-purple-400">{analytics?.totalEmailsDispatched || 0}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Real-time Activity Flow Stream */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-indigo-400" />
                <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                  Live Activity Flow Stream
                </h3>
              </div>
              <span className="text-[10px] text-slate-500 font-mono">Recent Events</span>
            </div>

            <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
              {analytics?.recentActivities && analytics.recentActivities.length > 0 ? (
                analytics.recentActivities.map((act) => (
                  <div
                    key={act.id}
                    className="p-3 rounded-xl bg-slate-950 border border-slate-800/70 flex items-center justify-between gap-3 text-xs"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`p-2 rounded-lg shrink-0 ${
                        act.type === 'login' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                        act.type === 'cv_uploaded' ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20' :
                        act.type === 'dispatch' ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20' :
                        act.type === 'click' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' :
                        'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                      }`}>
                        {act.type === 'login' ? <UserCheck className="w-3.5 h-3.5" /> :
                         act.type === 'cv_uploaded' ? <Paperclip className="w-3.5 h-3.5" /> :
                         act.type === 'dispatch' ? <Send className="w-3.5 h-3.5" /> :
                         act.type === 'click' ? <MousePointerClick className="w-3.5 h-3.5" /> :
                         <Eye className="w-3.5 h-3.5" />}
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-white truncate">{act.title}</p>
                        {act.description && (
                          <p className="text-[11px] text-slate-400 truncate mt-0.5">{act.description}</p>
                        )}
                      </div>
                    </div>
                    <span className="text-[10px] text-slate-500 font-mono shrink-0">
                      {new Date(act.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                ))
              ) : (
                <div className="py-8 text-center text-xs text-slate-500">
                  <Activity className="w-5 h-5 mx-auto text-slate-600 mb-1" />
                  <span>No activities logged in this session yet. Events will record automatically.</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* VIEW 2: USER RANKINGS & LEADERBOARD */}
      {activeAdminTab === 'rankings' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div>
              <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <Award className="w-4 h-4 text-amber-400" />
                <span>User Outreach Rankings & Leaderboard</span>
              </h3>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Users ranked by outreach volume, campaign activity, and resume configuration.
              </p>
            </div>
            <span className="text-xs font-mono text-indigo-400 font-semibold">
              Total Candidates: {analytics?.rankings?.length || 0}
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-800 text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                  <th className="py-3 px-3">Rank</th>
                  <th className="py-3 px-3">User</th>
                  <th className="py-3 px-3">Emails Sent</th>
                  <th className="py-3 px-3">CV Status</th>
                  <th className="py-3 px-3">Last Active</th>
                  <th className="py-3 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {analytics?.rankings && analytics.rankings.length > 0 ? (
                  analytics.rankings.map((user) => {
                    const isTop1 = user.rank === 1;
                    const isTop2 = user.rank === 2;
                    const isTop3 = user.rank === 3;
                    return (
                      <tr key={user.email} className="hover:bg-slate-800/40 transition-colors">
                        <td className="py-3.5 px-3">
                          <div className="flex items-center gap-1.5">
                            {isTop1 ? (
                              <span className="w-6 h-6 rounded-full bg-amber-500/20 text-amber-300 font-bold flex items-center justify-center border border-amber-500/30 text-xs">
                                🥇
                              </span>
                            ) : isTop2 ? (
                              <span className="w-6 h-6 rounded-full bg-slate-300/20 text-slate-200 font-bold flex items-center justify-center border border-slate-300/30 text-xs">
                                🥈
                              </span>
                            ) : isTop3 ? (
                              <span className="w-6 h-6 rounded-full bg-amber-700/20 text-amber-400 font-bold flex items-center justify-center border border-amber-700/30 text-xs">
                                🥉
                              </span>
                            ) : (
                              <span className="w-6 h-6 rounded-full bg-slate-800 text-slate-400 font-mono font-bold flex items-center justify-center text-[11px]">
                                #{user.rank}
                              </span>
                            )}
                          </div>
                        </td>

                        <td className="py-3.5 px-3">
                          <div className="flex items-center gap-2.5">
                            {user.photoUrl ? (
                              <img
                                src={user.photoUrl}
                                alt={user.displayName}
                                className="w-7 h-7 rounded-full border border-slate-700 object-cover"
                                referrerPolicy="no-referrer"
                              />
                            ) : (
                              <div className="w-7 h-7 rounded-full bg-indigo-600 text-white font-bold text-xs flex items-center justify-center">
                                {user.displayName.charAt(0).toUpperCase()}
                              </div>
                            )}
                            <div>
                              <p className="font-semibold text-white flex items-center gap-1.5">
                                <span>{user.displayName}</span>
                                {user.email === ADMIN_EMAIL && (
                                  <span className="px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 text-[9px] font-bold">
                                    Admin
                                  </span>
                                )}
                              </p>
                              <p className="text-[11px] text-slate-400 font-mono">{user.email}</p>
                            </div>
                          </div>
                        </td>

                        <td className="py-3.5 px-3">
                          <span className="px-2.5 py-1 rounded-lg bg-indigo-500/10 border border-indigo-500/20 font-mono font-bold text-indigo-300 text-xs">
                            {user.emailsSent} sent
                          </span>
                        </td>

                        <td className="py-3.5 px-3">
                          {user.hasCv ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 text-[11px] font-medium">
                              <Paperclip className="w-3 h-3 text-emerald-400" />
                              <span>{user.cvCount} CV Attached</span>
                            </span>
                          ) : (
                            <span className="text-[11px] text-slate-500 italic">No CV uploaded</span>
                          )}
                        </td>

                        <td className="py-3.5 px-3 text-slate-400 font-mono text-[11px]">
                          {user.lastActive ? new Date(user.lastActive).toLocaleDateString() : 'N/A'}
                        </td>

                        <td className="py-3.5 px-3 text-right">
                          <button
                            type="button"
                            onClick={() => {
                              const found = usersData.find((u) => u.user_email === user.email);
                              if (found) {
                                setSelectedUser(found);
                                setActiveAdminTab('users');
                              }
                            }}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 transition-colors cursor-pointer"
                          >
                            <span>Inspect</span>
                            <ChevronRight className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-xs text-slate-500">
                      No user rankings recorded yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* VIEW 3: REGISTERED USERS & SAVED CVS */}
      {activeAdminTab === 'users' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: User Directory */}
          <div className="lg:col-span-5 space-y-3">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-indigo-400" />
                  <span>User Accounts ({filteredUsers.length})</span>
                </span>
              </div>

              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by email or name..."
                  className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-950 border border-slate-800 focus:border-indigo-500 focus:outline-none text-xs text-white placeholder-slate-500"
                />
              </div>

              {loading ? (
                <div className="py-12 text-center text-xs text-slate-500 space-y-2">
                  <RefreshCw className="w-5 h-5 animate-spin mx-auto text-indigo-400" />
                  <p>Loading user database...</p>
                </div>
              ) : filteredUsers.length === 0 ? (
                <div className="py-12 text-center text-xs text-slate-500 space-y-1">
                  <p>No user records found matching search.</p>
                  <p className="text-[11px] text-slate-600">Users appear automatically upon sign-in.</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1">
                  {filteredUsers.map((u) => {
                    const isSelected = selectedUser?.user_email === u.user_email;
                    const hasCv = u.attachments && u.attachments.length > 0;
                    return (
                      <button
                        key={u.user_email}
                        type="button"
                        onClick={() => setSelectedUser(u)}
                        className={`w-full text-left p-3.5 rounded-xl border transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-indigo-600/10 border-indigo-500/50 shadow-md shadow-indigo-600/5'
                            : 'bg-slate-950 border-slate-800 hover:border-slate-700'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-semibold text-white truncate">
                                {u.display_name || u.user_email.split('@')[0]}
                              </span>
                              {u.user_email === ADMIN_EMAIL && (
                                <span className="px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 text-[9px] font-bold">
                                  Admin
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-slate-400 font-mono truncate mt-0.5">
                              {u.user_email}
                            </p>
                          </div>
                          <ChevronRight className={`w-4 h-4 shrink-0 transition-transform ${isSelected ? 'text-indigo-400 translate-x-0.5' : 'text-slate-600'}`} />
                        </div>

                        <div className="flex items-center gap-3 mt-2.5 pt-2 border-t border-slate-800/60 text-[10px] text-slate-400">
                          <span className="flex items-center gap-1">
                            <Paperclip className={`w-3 h-3 ${hasCv ? 'text-emerald-400' : 'text-slate-600'}`} />
                            <span className={hasCv ? 'text-slate-200' : 'text-slate-500'}>
                              {u.attachments?.length || 0} CV File{u.attachments?.length === 1 ? '' : 's'}
                            </span>
                          </span>
                          {u.updated_at && (
                            <span className="flex items-center gap-1 text-slate-500">
                              <Clock className="w-3 h-3" />
                              {new Date(u.updated_at).toLocaleDateString(undefined, {
                                month: 'short',
                                day: 'numeric',
                              })}
                            </span>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Selected User Template & CV Inspector */}
          <div className="lg:col-span-7 space-y-4">
            {selectedUser ? (
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-5 shadow-xl shadow-black/10">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-800">
                  <div className="flex items-center gap-3">
                    {selectedUser.photo_url ? (
                      <img
                        src={selectedUser.photo_url}
                        alt={selectedUser.display_name}
                        className="w-11 h-11 rounded-full border border-slate-700 object-cover"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="w-11 h-11 rounded-full bg-indigo-600 text-white font-bold text-sm flex items-center justify-center">
                        {(selectedUser.display_name || selectedUser.user_email || 'U').charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div>
                      <h3 className="text-sm font-bold text-white">
                        {selectedUser.display_name || selectedUser.user_email.split('@')[0]}
                      </h3>
                      <p className="text-xs text-indigo-400 font-mono">{selectedUser.user_email}</p>
                    </div>
                  </div>

                  {selectedUser.updated_at && (
                    <div className="text-right text-[11px] text-slate-500">
                      <span>Last Updated: </span>
                      <span className="text-slate-300 font-mono">
                        {new Date(selectedUser.updated_at).toLocaleString()}
                      </span>
                    </div>
                  )}
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-400 flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Saved Subject Line</span>
                  </label>
                  <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white font-mono">
                    {selectedUser.subject || <span className="text-slate-600 italic">No subject saved yet</span>}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-400 flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Saved Message / Template Pitch Body</span>
                  </label>
                  <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 whitespace-pre-wrap leading-relaxed max-h-72 overflow-y-auto font-sans">
                    {selectedUser.body || <span className="text-slate-600 italic">No body text saved yet</span>}
                  </div>
                </div>

                <div className="space-y-2 pt-2">
                  <label className="text-xs font-semibold text-slate-400 flex items-center gap-1.5">
                    <Paperclip className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Uploaded CV / Attachments ({selectedUser.attachments?.length || 0})</span>
                  </label>

                  {selectedUser.attachments && selectedUser.attachments.length > 0 ? (
                    <div className="space-y-2">
                      {selectedUser.attachments.map((file) => (
                        <div
                          key={file.id}
                          className="flex items-center justify-between p-3.5 rounded-xl bg-slate-950 border border-slate-800 hover:border-slate-700 transition-colors"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <FileText className="w-5 h-5 text-indigo-400 shrink-0" />
                            <div className="min-w-0">
                              <p className="text-xs font-semibold text-slate-200 truncate">{file.name}</p>
                              <p className="text-[10px] text-slate-500 font-mono">
                                {formatBytes(file.size)} • {file.type || 'Document'}
                              </p>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleDownloadAttachment(file)}
                            disabled={downloadingAttachmentId === file.id}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-sm transition-colors cursor-pointer shrink-0 ml-2"
                          >
                            <Download className="w-3.5 h-3.5" />
                            <span>{downloadingAttachmentId === file.id ? 'Downloading...' : 'Download CV'}</span>
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-center text-xs text-slate-500">
                      User has not uploaded any CV attachments yet.
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center text-xs text-slate-500">
                Select a user from the directory to inspect their email pitch and download their CV files.
              </div>
            )}
          </div>
        </div>
      )}

      {/* VIEW 4: SUPABASE DATABASE SETUP & SQL FIX */}
      {activeAdminTab === 'database' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Layers className="w-4 h-4 text-indigo-400" />
                <span>Supabase Database Status & Setup</span>
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Configure permanent cloud synchronization for all registered users, templates, and analytics.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400">Database Status:</span>
              <span className={`px-2.5 py-1 rounded-full text-xs font-mono font-bold ${
                dbHealth?.rlsBlocked
                  ? 'bg-amber-500/10 text-amber-300 border border-amber-500/30'
                  : dbHealth?.connected
                  ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/30'
                  : 'bg-rose-500/10 text-rose-300 border border-rose-500/30'
              }`}>
                {dbHealth?.rlsBlocked ? 'RLS Policy Pending' : dbHealth?.connected ? 'Connected & Active' : 'Disconnected'}
              </span>
            </div>
          </div>

          <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-300">
                1-Click Supabase SQL Script (Fix Row-Level Security)
              </span>
              <button
                type="button"
                onClick={handleCopySql}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition-colors cursor-pointer"
              >
                {copiedSql ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedSql ? 'Copied to Clipboard!' : 'Copy SQL Script'}</span>
              </button>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed">
              To allow live cloud sync of all users across different devices, copy this script and run it in your{' '}
              <a
                href="https://supabase.com/dashboard/project/rfhmbudcthdsgzdeydzc/sql/new"
                target="_blank"
                rel="noreferrer"
                className="text-indigo-400 hover:underline font-medium inline-flex items-center gap-1"
              >
                <span>Supabase SQL Editor</span>
                <ExternalLink className="w-3 h-3" />
              </a>
              :
            </p>

            <pre className="p-4 rounded-xl bg-slate-900 border border-slate-800 text-[11px] font-mono text-emerald-300 overflow-x-auto max-h-60 leading-relaxed">
              {SUPABASE_RLS_FIX_SQL}
            </pre>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs text-slate-400">
            <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
              <p className="font-semibold text-white flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>Step 1</span>
              </p>
              <p className="text-[11px]">Click "Copy SQL Script" above.</p>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
              <p className="font-semibold text-white flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>Step 2</span>
              </p>
              <p className="text-[11px]">Open Supabase Dashboard SQL Editor & Paste.</p>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
              <p className="font-semibold text-white flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>Step 3</span>
              </p>
              <p className="text-[11px]">Click "Run". Live cloud sync will be fully enabled!</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
