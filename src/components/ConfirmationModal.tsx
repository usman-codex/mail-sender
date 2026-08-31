import { AlertTriangle, Mail, Paperclip, Clock, ShieldCheck, X } from 'lucide-react';
import { EmailAttachment, EmailRecipient, RateLimitConfig } from '../types';
import { formatBytes } from '../utils';

interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  recipients: EmailRecipient[];
  subject: string;
  senderEmail: string;
  attachments: EmailAttachment[];
  rateConfig: RateLimitConfig;
}

export function ConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  recipients,
  subject,
  senderEmail,
  attachments,
  rateConfig,
}: ConfirmationModalProps) {
  if (!isOpen) return null;

  const totalAttachmentsSize = attachments.reduce((acc, a) => acc + a.size, 0);
  const estimatedDurationSecs = Math.round(
    recipients.length * rateConfig.delaySeconds + (rateConfig.enableJitter ? recipients.length * 1 : 0)
  );
  const estimatedDurationMinutes = (estimatedDurationSecs / 60).toFixed(1);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-5 relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center shrink-0">
            <Mail className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white">Confirm Email Sequence Dispatch</h3>
            <p className="text-xs text-slate-400">Review recipient list and security details before sending</p>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3 text-xs">
          <div className="flex justify-between items-center py-1 border-b border-slate-800">
            <span className="text-slate-400">Sender Account:</span>
            <span className="font-semibold text-indigo-400 font-mono">{senderEmail}</span>
          </div>

          <div className="flex justify-between items-center py-1 border-b border-slate-800">
            <span className="text-slate-400">Total Recipients:</span>
            <span className="font-bold text-white px-2 py-0.5 rounded-lg bg-slate-800 border border-slate-700">
              {recipients.length} {recipients.length === 1 ? 'email' : 'emails'}
            </span>
          </div>

          <div className="flex justify-between items-start py-1 border-b border-slate-800">
            <span className="text-slate-400">Subject Preview:</span>
            <span className="font-medium text-slate-200 text-right max-w-[240px] truncate">
              {subject}
            </span>
          </div>

          <div className="flex justify-between items-center py-1 border-b border-slate-800">
            <span className="text-slate-400 flex items-center gap-1">
              <Paperclip className="w-3.5 h-3.5" /> Attachments:
            </span>
            <span className="font-medium text-emerald-400">
              {attachments.length > 0
                ? `${attachments.length} file(s) (${formatBytes(totalAttachmentsSize)})`
                : 'None'}
            </span>
          </div>

          <div className="flex justify-between items-center py-1">
            <span className="text-slate-400 flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-amber-400" /> Throttling Delay:
            </span>
            <span className="font-medium text-amber-300">
              {rateConfig.delaySeconds}s / email (~{estimatedDurationMinutes} mins total)
            </span>
          </div>
        </div>

        <div className="space-y-1.5">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">
            Recipients Queue Preview:
          </span>
          <div className="max-h-24 overflow-y-auto p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1 font-mono text-[11px] text-slate-300">
            {recipients.slice(0, 5).map((r, idx) => (
              <div key={r.id} className="truncate flex items-center gap-2">
                <span className="text-slate-500">{idx + 1}.</span>
                <span className="text-slate-200">{r.email}</span>
              </div>
            ))}
            {recipients.length > 5 && (
              <div className="text-slate-500 italic">...and {recipients.length - 5} more recipient(s)</div>
            )}
          </div>
        </div>

        <div className="p-3.5 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-[11px] text-indigo-300 flex items-start gap-2.5">
          <ShieldCheck className="w-4 h-4 shrink-0 text-indigo-400 mt-0.5" />
          <span>
            Emails will be sent directly through your authenticated Google account adhering to sequence pacing to prevent rate limits.
          </span>
        </div>

        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
          >
            Cancel
          </button>

          <button
            id="confirm-send-dispatch-btn"
            type="button"
            onClick={() => {
              onClose();
              onConfirm();
            }}
            className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-lg shadow-indigo-600/25 transition-all cursor-pointer flex items-center gap-2"
          >
            <Mail className="w-4 h-4" />
            <span>Confirm & Start Sending</span>
          </button>
        </div>
      </div>
    </div>
  );
}
