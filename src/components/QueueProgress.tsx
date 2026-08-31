import { useEffect, useState } from 'react';
import {
  Play,
  Pause,
  Square,
  Clock,
  CheckCircle2,
  XCircle,
  Loader2,
  Mail,
  AlertTriangle,
  ExternalLink,
  RefreshCw,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { EmailRecipient } from '../types';

interface QueueProgressProps {
  recipients: EmailRecipient[];
  currentIndex: number;
  isSending: boolean;
  isPaused: boolean;
  countdownSeconds: number;
  totalDelay: number;
  onPause: () => void;
  onResume: () => void;
  onCancel: () => void;
  onReauth?: () => void;
}

export function QueueProgress({
  recipients,
  currentIndex,
  isSending,
  isPaused,
  countdownSeconds,
  onPause,
  onResume,
  onCancel,
  onReauth,
}: QueueProgressProps) {
  const total = recipients.length;
  const sentCount = recipients.filter((r) => r.status === 'sent').length;
  const failedCount = recipients.filter((r) => r.status === 'failed').length;
  const processedCount = sentCount + failedCount;
  const progressPercent = total > 0 ? Math.round((processedCount / total) * 100) : 0;
  const isComplete = !isSending && processedCount > 0 && processedCount === total;

  const failedItems = recipients.filter((r) => r.status === 'failed' && r.error);
  const firstError = failedItems[0]?.error || '';

  const isApiNotEnabled =
    firstError.toLowerCase().includes('not enabled') ||
    firstError.toLowerCase().includes('not been used') ||
    firstError.toLowerCase().includes('accessnotconfigured');

  const isPermissionIssue =
    firstError.toLowerCase().includes('permission') ||
    firstError.toLowerCase().includes('unauthorized') ||
    firstError.toLowerCase().includes('expired') ||
    firstError.toLowerCase().includes('scope');

  useEffect(() => {
    if (isComplete && sentCount > 0) {
      try {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#f43f5e', '#6366f1', '#10b981', '#f59e0b'],
        });
      } catch {}
    }
  }, [isComplete, sentCount]);

  const currentRecipient = recipients[currentIndex];

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-5 relative overflow-hidden">
      <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none"></div>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center">
            {isSending ? (
              <Loader2 className="w-5 h-5 animate-spin text-indigo-400" />
            ) : isComplete ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            ) : (
              <Mail className="w-5 h-5 text-slate-400" />
            )}
          </div>
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <span>Sequence Dispatch Monitor</span>
              {isSending && (
                <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 font-bold uppercase tracking-wider border border-indigo-500/30 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-ping"></span>
                  Active Sequence
                </span>
              )}
              {isPaused && (
                <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-bold uppercase tracking-wider border border-amber-500/30">
                  Paused
                </span>
              )}
              {isComplete && (
                <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold uppercase tracking-wider border border-emerald-500/30">
                  Completed
                </span>
              )}
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              {isSending
                ? `Pacing email delivery via official Gmail API throttler.`
                : isComplete
                ? `Finished processing all ${total} queued emails.`
                : `Sequence paused.`}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isSending && !isPaused && (
            <button
              id="pause-sequence-btn"
              onClick={onPause}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 text-xs font-semibold border border-slate-700 transition-colors cursor-pointer"
            >
              <Pause className="w-3.5 h-3.5" />
              <span>Pause</span>
            </button>
          )}

          {isPaused && (
            <button
              id="resume-sequence-btn"
              onClick={onResume}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md shadow-indigo-600/25 transition-all cursor-pointer"
            >
              <Play className="w-3.5 h-3.5" />
              <span>Resume</span>
            </button>
          )}

          {(isSending || isPaused) && (
            <button
              id="cancel-sequence-btn"
              onClick={onCancel}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-rose-950/40 text-slate-300 hover:text-rose-300 text-xs font-semibold border border-slate-700 hover:border-rose-900/50 transition-colors cursor-pointer"
            >
              <Square className="w-3.5 h-3.5" />
              <span>Stop / Cancel</span>
            </button>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex justify-between items-center text-xs">
          <span className="text-slate-400 font-medium">
            Campaign Progress: <strong className="text-white">{processedCount}</strong> of <strong className="text-white">{total}</strong> ({progressPercent}%)
          </span>
          <div className="flex items-center gap-3 font-mono text-[11px]">
            <span className="text-emerald-400 font-semibold">✓ {sentCount} sent</span>
            {failedCount > 0 && <span className="text-rose-400 font-semibold">✗ {failedCount} failed</span>}
          </div>
        </div>

        <div className="w-full h-2 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
          <div
            className="h-full rounded-full bg-indigo-600 transition-all duration-300 shadow-[0_0_8px_rgba(79,70,229,0.5)]"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {failedCount > 0 && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs space-y-3">
          <div className="flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <h4 className="font-semibold text-rose-200">
                {isApiNotEnabled
                  ? 'Action Required: Enable Gmail API in Google Cloud'
                  : isPermissionIssue
                  ? 'Permission Required: Grant Gmail Send Scope'
                  : 'Dispatch Encountered Errors'}
              </h4>
              <p className="text-rose-300/90 leading-relaxed text-[11px]">
                {firstError}
              </p>
            </div>
          </div>

          <div className="pt-2 border-t border-rose-500/20 flex flex-wrap items-center gap-2">
            <a
              href="https://console.cloud.google.com/apis/library/gmail.googleapis.com?project=mail-sender-cafbf"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs shadow transition cursor-pointer"
            >
              <span>1. Enable Gmail API (1-Click)</span>
              <ExternalLink className="w-3 h-3" />
            </a>

            {onReauth && (
              <button
                onClick={onReauth}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium text-xs border border-slate-700 transition cursor-pointer"
              >
                <RefreshCw className="w-3 h-3" />
                <span>2. Re-Authenticate with Google</span>
              </button>
            )}
          </div>
        </div>
      )}

      {isSending && !isPaused && countdownSeconds > 0 && (
        <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400 animate-pulse">
              <Clock className="w-4 h-4" />
            </div>
            <div>
              <p className="font-semibold text-slate-200">
                Rate-Limit Throttling Delay Active
              </p>
              <p className="text-[11px] text-slate-400">
                Next email queued for <span className="text-indigo-300 font-mono">{currentRecipient?.email}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="px-3 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-300 font-mono font-bold text-xs">
              Throttled ({countdownSeconds.toFixed(1)}s left)
            </span>
          </div>
        </div>
      )}

      <div className="space-y-2">
        <div className="text-xs font-bold text-slate-500 uppercase tracking-widest px-1">
          Queue Sequence Log
        </div>

        <div className="max-h-60 overflow-y-auto space-y-2 p-1 rounded-xl bg-slate-950 border border-slate-800">
          {recipients.map((rcp, idx) => {
            const isCurrent = idx === currentIndex && isSending;
            return (
              <div
                key={rcp.id}
                className={`p-3 rounded-lg border text-xs transition-colors ${
                  isCurrent
                    ? 'bg-indigo-600/10 border-indigo-500/40 text-white'
                    : rcp.status === 'sent'
                    ? 'bg-slate-900/60 border-slate-800/60 text-slate-300'
                    : rcp.status === 'failed'
                    ? 'bg-rose-950/20 border-rose-900/40 text-rose-300'
                    : 'bg-slate-900/30 border-slate-800/40 text-slate-400'
                }`}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5 min-w-0 font-mono">
                    <span className="text-slate-500 text-[10px] w-5 text-right">{idx + 1}.</span>
                    <span className="font-semibold truncate text-slate-200">{rcp.email}</span>
                  </div>

                  <div className="shrink-0 flex items-center gap-2">
                    {rcp.status === 'sent' && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 text-[10px] font-bold uppercase text-emerald-400 border border-emerald-500/20">
                        <CheckCircle2 className="w-3 h-3" /> DELIVERED
                      </span>
                    )}
                    {rcp.status === 'failed' && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-500/10 text-[10px] font-bold uppercase text-rose-400 border border-rose-500/20">
                        <XCircle className="w-3 h-3" /> FAILED
                      </span>
                    )}
                    {isCurrent && (
                      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-indigo-500/10 text-[10px] font-bold uppercase text-indigo-300 border border-indigo-500/30 animate-pulse">
                        <Loader2 className="w-3 h-3 animate-spin" /> DISPATCHING...
                      </span>
                    )}
                    {rcp.status === 'pending' && !isCurrent && (
                      <span className="px-2 py-0.5 bg-slate-800 text-slate-500 rounded-full text-[10px] font-bold uppercase">
                        QUEUED
                      </span>
                    )}
                  </div>
                </div>

                {rcp.status === 'failed' && rcp.error && (
                  <div className="mt-2 pt-2 border-t border-rose-900/30 text-[11px] text-rose-300/90 flex items-start gap-1.5">
                    <span className="font-semibold text-rose-400 shrink-0">Reason:</span>
                    <span className="break-all">{rcp.error}</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
