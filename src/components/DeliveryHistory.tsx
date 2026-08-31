import { useState, useMemo } from 'react';
import {
  History,
  CheckCircle2,
  XCircle,
  Download,
  Trash2,
  Search,
  RefreshCw,
  Mail,
  Paperclip,
  Clock,
  Filter,
} from 'lucide-react';
import { DeliveryLog, EmailRecipient } from '../types';
import { exportLogsToCSV } from '../utils';

interface DeliveryHistoryProps {
  logs: DeliveryLog[];
  onClearHistory: () => void;
  onRetryFailed: (recipients: EmailRecipient[]) => void;
}

export function DeliveryHistory({
  logs,
  onClearHistory,
  onRetryFailed,
}: DeliveryHistoryProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'sent' | 'failed'>('all');

  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      const matchesSearch =
        log.recipientEmail.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (log.recipientName && log.recipientName.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchesStatus =
        filterStatus === 'all' ? true : log.status === filterStatus;

      return matchesSearch && matchesStatus;
    });
  }, [logs, searchTerm, filterStatus]);

  const sentCount = logs.filter((l) => l.status === 'sent').length;
  const failedCount = logs.filter((l) => l.status === 'failed').length;

  const handleRetryAllFailed = () => {
    const failedLogs = logs.filter((l) => l.status === 'failed');
    if (failedLogs.length === 0) return;

    const recipients: EmailRecipient[] = failedLogs.map((l) => ({
      id: `retry_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      email: l.recipientEmail,
      name: l.recipientName,
      isValid: true,
      status: 'pending',
    }));

    onRetryFailed(recipients);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Header & Stats */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <History className="w-5 h-5 text-indigo-400" />
            <span>Delivery Logs & History</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Real-time track record of all dispatched emails, delivery timestamps, message IDs, and error diagnoses.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {logs.length > 0 && (
            <>
              <button
                id="export-csv-btn"
                onClick={() => exportLogsToCSV(logs)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-colors"
                title="Download CSV Report"
              >
                <Download className="w-3.5 h-3.5 text-emerald-400" />
                <span>Export CSV</span>
              </button>

              <button
                id="clear-logs-btn"
                onClick={() => {
                  if (window.confirm('Are you sure you want to clear all delivery logs?')) {
                    onClearHistory();
                  }
                }}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-rose-950/40 text-slate-400 hover:text-rose-300 text-xs font-semibold border border-slate-700 hover:border-rose-900/50 transition-colors"
                title="Clear All Logs"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Clear</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-between">
          <div>
            <span className="text-xs font-bold uppercase tracking-widest text-slate-500">Total Dispatched</span>
            <p className="text-2xl font-bold text-white mt-1">{logs.length}</p>
          </div>
          <div className="p-3 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
            <Mail className="w-5 h-5" />
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-between">
          <div>
            <span className="text-xs font-bold uppercase tracking-widest text-emerald-400">Delivered Successfully</span>
            <p className="text-2xl font-bold text-emerald-400 mt-1">{sentCount}</p>
          </div>
          <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-between">
          <div>
            <span className="text-xs font-bold uppercase tracking-widest text-rose-400">Failed Dispatches</span>
            <p className="text-2xl font-bold text-rose-400 mt-1">{failedCount}</p>
          </div>
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400">
            <XCircle className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Filters and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by recipient email, name, or subject line..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-900 border border-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none text-xs text-white placeholder-slate-500"
          />
        </div>

        <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-800 p-1 rounded-xl">
          <button
            onClick={() => setFilterStatus('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              filterStatus === 'all'
                ? 'bg-indigo-600 text-white'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            All ({logs.length})
          </button>
          <button
            onClick={() => setFilterStatus('sent')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              filterStatus === 'sent'
                ? 'bg-emerald-600 text-white'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Sent ({sentCount})
          </button>
          <button
            onClick={() => setFilterStatus('failed')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              filterStatus === 'failed'
                ? 'bg-rose-600 text-white'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Failed ({failedCount})
          </button>
        </div>

        {failedCount > 0 && (
          <button
            onClick={handleRetryAllFailed}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 text-xs font-semibold border border-amber-500/30 transition-colors whitespace-nowrap"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Retry Failed ({failedCount})</span>
          </button>
        )}
      </div>

      {/* Logs Table / List */}
      {filteredLogs.length === 0 ? (
        <div className="p-12 text-center rounded-2xl bg-slate-900 border border-slate-800 space-y-2">
          <History className="w-8 h-8 mx-auto text-slate-600" />
          <p className="text-sm font-semibold text-slate-300">No delivery logs found</p>
          <p className="text-xs text-slate-500">
            {searchTerm || filterStatus !== 'all'
              ? 'No matching logs for current search or filters.'
              : 'Emails sent via the Sequence Mailer will be recorded here.'}
          </p>
        </div>
      ) : (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-lg">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950 border-b border-slate-800 text-[11px] font-bold text-slate-500 uppercase tracking-widest">
                <tr>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4">Recipient</th>
                  <th className="py-3.5 px-4">Subject</th>
                  <th className="py-3.5 px-4">Attachments</th>
                  <th className="py-3.5 px-4">Sent At</th>
                  <th className="py-3.5 px-4">Message ID / Diagnostics</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 text-slate-300">
                {filteredLogs.map((log) => {
                  const isSent = log.status === 'sent';
                  return (
                    <tr key={log.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {isSent ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold uppercase text-[10px] tracking-wide">
                            <CheckCircle2 className="w-3 h-3" /> DELIVERED
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20 font-bold uppercase text-[10px] tracking-wide">
                            <XCircle className="w-3 h-3" /> FAILED
                          </span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 font-mono">
                        <div className="font-semibold text-white truncate max-w-[200px]">
                          {log.recipientEmail}
                        </div>
                        {log.recipientName && (
                          <div className="text-[11px] text-slate-400 truncate max-w-[200px]">
                            {log.recipientName}
                          </div>
                        )}
                      </td>

                      <td className="py-3.5 px-4 max-w-xs truncate">
                        <span className="text-slate-200">{log.subject}</span>
                      </td>

                      <td className="py-3.5 px-4">
                        {log.attachmentNames && log.attachmentNames.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {log.attachmentNames.map((name, i) => (
                              <span
                                key={i}
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-slate-800 text-[10px] text-slate-300 border border-slate-700"
                              >
                                <Paperclip className="w-2.5 h-2.5 text-indigo-400" />
                                <span className="truncate max-w-[120px]">{name}</span>
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-slate-500 text-[11px]">-</span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap text-slate-400 text-[11px] font-mono">
                        {new Date(log.sentAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                        <br />
                        <span className="text-[10px] text-slate-500">
                          {new Date(log.sentAt).toLocaleDateString()}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 font-mono text-[11px]">
                        {isSent ? (
                          <span className="text-slate-400 truncate block max-w-[180px]" title={log.messageId}>
                            {log.messageId || 'Success'}
                          </span>
                        ) : (
                          <span className="text-rose-400 text-[10px] block max-w-xs leading-tight" title={log.error}>
                            {log.error || 'Unknown error'}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
