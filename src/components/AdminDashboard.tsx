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
  Calendar,
  ExternalLink,
  ChevronRight,
  UserCheck,
} from 'lucide-react';
import { UserSavedData, EmailAttachment } from '../types';
import { supabaseService, ADMIN_EMAIL } from '../services/supabase';
import { formatBytes } from '../utils';

interface AdminDashboardProps {
  currentUserEmail: string;
}

export function AdminDashboard({ currentUserEmail }: AdminDashboardProps) {
  const isAuthorized = currentUserEmail?.toLowerCase().trim() === ADMIN_EMAIL.toLowerCase().trim();

  const [usersData, setUsersData] = useState<UserSavedData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUser, setSelectedUser] = useState<UserSavedData | null>(null);
  const [downloadingAttachmentId, setDownloadingAttachmentId] = useState<string | null>(null);

  const fetchUsers = async () => {
    if (!isAuthorized) return;
    setLoading(true);
    try {
      const data = await supabaseService.getAllUsersData();
      setUsersData(data);
      if (data.length > 0 && !selectedUser) {
        setSelectedUser(data[0]);
      }
    } catch (err) {
      console.error('Error fetching admin data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthorized) {
      fetchUsers();
    }
  }, [isAuthorized]);

  if (!isAuthorized) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12 text-center space-y-3">
        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 inline-block">
          <Shield className="w-8 h-8 mx-auto" />
        </div>
        <h2 className="text-base font-bold text-white">Access Restricted</h2>
        <p className="text-xs text-slate-400">
          This administration control panel is only accessible by <span className="font-mono text-indigo-400">{ADMIN_EMAIL}</span>.
        </p>
      </div>
    );
  }

  const filteredUsers = usersData.filter((u) => {
    const query = searchQuery.toLowerCase();
    return (
      u.user_email?.toLowerCase().includes(query) ||
      u.display_name?.toLowerCase().includes(query) ||
      u.subject?.toLowerCase().includes(query)
    );
  });

  const handleDownloadAttachment = (attachment: EmailAttachment) => {
    try {
      setDownloadingAttachmentId(attachment.id);
      const link = document.createElement('a');
      link.href = attachment.dataBase64;
      link.download = attachment.name || 'cv_attachment';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (e) {
      console.error('Download failed', e);
    } finally {
      setTimeout(() => setDownloadingAttachmentId(null), 800);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Top Header Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 shrink-0">
            <Shield className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-white">
                Admin Control Center
              </h2>
              <span className="px-2 py-0.5 rounded-full bg-indigo-500/20 border border-indigo-500/30 text-[10px] font-mono text-indigo-300">
                Super Admin
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Viewing all registered users, their saved email templates, and uploaded CV files.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-right hidden sm:block">
            <p className="text-[10px] uppercase font-bold text-slate-500">Authorized Admin</p>
            <p className="text-xs font-mono font-semibold text-emerald-400">{currentUserEmail}</p>
          </div>
          <button
            type="button"
            onClick={fetchUsers}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-200 text-xs font-semibold border border-slate-700 transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-indigo-400 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh Users</span>
          </button>
        </div>
      </div>

      {/* Main Content Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Users List Column */}
        <div className="lg:col-span-5 space-y-3">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-indigo-400" />
                <span>Users ({filteredUsers.length})</span>
              </span>
            </div>

            {/* Search Box */}
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

            {/* Users list items */}
            {loading ? (
              <div className="py-12 text-center text-xs text-slate-500 space-y-2">
                <RefreshCw className="w-5 h-5 animate-spin mx-auto text-indigo-400" />
                <p>Loading user database...</p>
              </div>
            ) : filteredUsers.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-500">
                <p>No user records found in Supabase.</p>
                <p className="text-[11px] text-slate-600 mt-1">Users will appear here once they log in and customize their template.</p>
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
                      className={`w-full text-left p-3.5 rounded-xl border transition-all ${
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

        {/* User Detail Column (Template & CV Preview) */}
        <div className="lg:col-span-7 space-y-4">
          {selectedUser ? (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-5">
              {/* User Profile Header */}
              <div className="flex items-center justify-between pb-4 border-b border-slate-800">
                <div className="flex items-center gap-3">
                  {selectedUser.photo_url ? (
                    <img
                      src={selectedUser.photo_url}
                      alt={selectedUser.display_name}
                      className="w-10 h-10 rounded-full border border-slate-700 object-cover"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-indigo-600 text-white font-bold text-sm flex items-center justify-center">
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

              {/* Subject Line */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-400 flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Saved Subject Line</span>
                </label>
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white font-mono">
                  {selectedUser.subject || <span className="text-slate-600 italic">No subject saved yet</span>}
                </div>
              </div>

              {/* Message Body */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-400 flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Saved Message / Template Body</span>
                </label>
                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 whitespace-pre-wrap leading-relaxed max-h-72 overflow-y-auto font-sans">
                  {selectedUser.body || <span className="text-slate-600 italic">No body text saved yet</span>}
                </div>
              </div>

              {/* Uploaded CV Files & Download */}
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
                        className="flex items-center justify-between p-3 rounded-xl bg-slate-950 border border-slate-800 hover:border-slate-700 transition-colors"
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
              Select a user from the left list to view their saved template and CV attachments.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
