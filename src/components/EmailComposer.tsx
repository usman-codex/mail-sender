import { useState, useEffect, KeyboardEvent, ClipboardEvent, useRef } from 'react';
import {
  Send,
  Mail,
  Users,
  Plus,
  Trash2,
  AlertCircle,
  RotateCcw,
  Check,
  Cloud,
  Sparkles,
} from 'lucide-react';
import { EmailAttachment, EmailRecipient, RateLimitConfig, UserProfile } from '../types';
import { parseRecipientInput, isValidEmail, extractEmailsWithRemaining, validateEmailDetailed } from '../utils';
import { AttachmentUploader } from './AttachmentUploader';
import { storageService } from '../services/storage';
import { supabaseService } from '../services/supabase';

interface EmailComposerProps {
  user: UserProfile;
  rateConfig: RateLimitConfig;
  onStartSequence: (
    recipients: EmailRecipient[],
    subject: string,
    body: string,
    attachments: EmailAttachment[]
  ) => void;
  isSendingSequence: boolean;
}

export function EmailComposer({
  user,
  onStartSequence,
  isSendingSequence,
}: EmailComposerProps) {
  const savedData = storageService.getUserData(user.email);

  const [recipientInput, setRecipientInput] = useState('');
  const [recipients, setRecipients] = useState<EmailRecipient[]>([]);
  const [subject, setSubject] = useState(savedData.subject || '');
  const [body, setBody] = useState(savedData.body || '');
  const [attachments, setAttachments] = useState<EmailAttachment[]>(savedData.attachments || []);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [suggestionCorrection, setSuggestionCorrection] = useState<string | null>(null);
  const [isAutoSaved, setIsAutoSaved] = useState(false);
  const [cloudSynced, setCloudSynced] = useState(false);

  const inputRef = useRef<HTMLTextAreaElement>(null);
  const autoAddTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const debounceSyncTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    let isMounted = true;
    if (user?.email) {
      const local = storageService.getUserData(user.email);
      setSubject(local.subject || '');
      setBody(local.body || '');
      setAttachments(local.attachments || []);

      supabaseService.getUserData(user.email).then((cloudData) => {
        if (isMounted && cloudData) {
          if (cloudData.subject || cloudData.body || (cloudData.attachments && cloudData.attachments.length > 0)) {
            setSubject(cloudData.subject || '');
            setBody(cloudData.body || '');
            setAttachments(cloudData.attachments || []);
            storageService.saveUserData(user.email, {
              subject: cloudData.subject || '',
              body: cloudData.body || '',
              attachments: cloudData.attachments || [],
            });
            setCloudSynced(true);
            setTimeout(() => setCloudSynced(false), 3000);
          }
        }
      });
    }
    return () => {
      isMounted = false;
    };
  }, [user?.email]);

  const persistChanges = (newSubject: string, newBody: string, newAttachments: EmailAttachment[]) => {
    if (user?.email) {
      storageService.saveUserData(user.email, {
        subject: newSubject,
        body: newBody,
        attachments: newAttachments,
      });
      setIsAutoSaved(true);
      setTimeout(() => setIsAutoSaved(false), 2000);

      if (debounceSyncTimeoutRef.current) {
        clearTimeout(debounceSyncTimeoutRef.current);
      }
      debounceSyncTimeoutRef.current = setTimeout(async () => {
        const synced = await supabaseService.syncUserData(
          user.email,
          user.displayName || user.email.split('@')[0],
          user.photoURL || '',
          newSubject,
          newBody,
          newAttachments
        );
        if (synced) {
          setCloudSynced(true);
          setTimeout(() => setCloudSynced(false), 2500);
        }
      }, 1000);
    }
  };

  const handleSubjectChange = (val: string) => {
    setSubject(val);
    setValidationError(null);
    setSuggestionCorrection(null);
    persistChanges(val, body, attachments);
  };

  const handleBodyChange = (val: string) => {
    setBody(val);
    setValidationError(null);
    setSuggestionCorrection(null);
    persistChanges(subject, val, attachments);
  };

  const handleAttachmentsChange = (newAttachments: EmailAttachment[]) => {
    setAttachments(newAttachments);
    persistChanges(subject, body, newAttachments);
  };

  const applySuggestion = (suggestedEmail: string) => {
    const validation = validateEmailDetailed(suggestedEmail);
    if (validation.isValid) {
      const existingEmails = new Set(recipients.map((r) => r.email.toLowerCase()));
      if (!existingEmails.has(validation.cleanEmail)) {
        setRecipients((prev) => [
          ...prev,
          {
            id: `rcp_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
            email: validation.cleanEmail,
            name: '',
            company: '',
            role: '',
            isValid: true,
            status: 'pending',
          },
        ]);
      }
      setRecipientInput('');
      setValidationError(null);
      setSuggestionCorrection(null);
    }
  };

  const addRecipientsFromInput = (text: string) => {
    const raw = text.trim();
    if (!raw) return;

    // First validate if it's a single email candidate
    const tokens = raw.split(/[\r\n,;\t\s]+/).filter(Boolean);
    if (tokens.length === 1) {
      const validation = validateEmailDetailed(tokens[0]);
      if (!validation.isValid) {
        setValidationError(validation.error || 'Invalid email address format.');
        setSuggestionCorrection(validation.suggestion || null);
        return;
      }
    }

    const parsed = parseRecipientInput(raw);
    if (parsed.length === 0) {
      const firstToken = tokens[0] || raw;
      const validation = validateEmailDetailed(firstToken);
      setValidationError(validation.error || 'Invalid email address. Please enter a valid recipient email.');
      setSuggestionCorrection(validation.suggestion || null);
      return;
    }

    setValidationError(null);
    setSuggestionCorrection(null);

    const existingEmails = new Set(recipients.map((r) => r.email.toLowerCase()));
    const newItems = parsed.filter((p) => !existingEmails.has(p.email.toLowerCase()));

    if (newItems.length > 0) {
      setRecipients((prev) => [...prev, ...newItems]);
    }

    setRecipientInput('');
  };

  const handleInputChange = (value: string) => {
    setRecipientInput(value);
    setValidationError(null);
    setSuggestionCorrection(null);

    if (autoAddTimeoutRef.current) {
      clearTimeout(autoAddTimeoutRef.current);
      autoAddTimeoutRef.current = null;
    }

    const hasDelimiter = /[\r\n,;\t\s]/.test(value);
    if (hasDelimiter) {
      const { extracted, remainingText } = extractEmailsWithRemaining(value);
      if (extracted.length > 0) {
        const existingEmails = new Set(recipients.map((r) => r.email.toLowerCase()));
        const newItems = extracted.filter((p) => !existingEmails.has(p.email.toLowerCase()));
        
        if (newItems.length > 0) {
          setRecipients((prev) => [...prev, ...newItems]);
        }
        setRecipientInput(remainingText);
        return;
      }
    }

    const trimmed = value.trim();
    const validation = validateEmailDetailed(trimmed);
    if (validation.isValid) {
      autoAddTimeoutRef.current = setTimeout(() => {
        const existingEmails = new Set(recipients.map((r) => r.email.toLowerCase()));
        if (!existingEmails.has(validation.cleanEmail)) {
          const newRecipient: EmailRecipient = {
            id: `rcp_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
            email: validation.cleanEmail,
            name: '',
            company: '',
            role: '',
            isValid: true,
            status: 'pending',
          };
          setRecipients((prev) => [...prev, newRecipient]);
          setRecipientInput('');
          setValidationError(null);
          setSuggestionCorrection(null);
        }
      }, 500);
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      addRecipientsFromInput(recipientInput);
    } else if (e.key === ',' || e.key === ';' || e.key === 'Tab') {
      if (recipientInput.trim()) {
        e.preventDefault();
        addRecipientsFromInput(recipientInput);
      }
    }
  };

  const handleBlur = () => {
    if (recipientInput.trim()) {
      const parsed = parseRecipientInput(recipientInput.trim());
      if (parsed.length > 0) {
        addRecipientsFromInput(recipientInput);
      }
    }
  };

  const handlePaste = (e: ClipboardEvent<HTMLTextAreaElement>) => {
    const pastedData = e.clipboardData.getData('text');
    const parsed = parseRecipientInput(pastedData);
    if (parsed.length > 0) {
      e.preventDefault();
      addRecipientsFromInput(pastedData);
    }
  };

  const removeRecipient = (id: string) => {
    setRecipients(recipients.filter((r) => r.id !== id));
  };

  const clearAllRecipients = () => {
    setRecipients([]);
    setRecipientInput('');
    setValidationError(null);
    setSuggestionCorrection(null);
  };

  const handleTriggerSend = () => {
    let finalRecipients = [...recipients];
    if (recipientInput.trim()) {
      const validation = validateEmailDetailed(recipientInput.trim());
      if (!validation.isValid) {
        setValidationError(validation.error || 'Recipient email is invalid. Please fix before sending.');
        setSuggestionCorrection(validation.suggestion || null);
        inputRef.current?.focus();
        return;
      }
      const extra = parseRecipientInput(recipientInput);
      const existing = new Set(finalRecipients.map((r) => r.email.toLowerCase()));
      const filtered = extra.filter((e) => !existing.has(e.email.toLowerCase()));
      finalRecipients = [...finalRecipients, ...filtered];
    }

    if (finalRecipients.length === 0) {
      setValidationError('Please enter at least one valid recipient email.');
      inputRef.current?.focus();
      return;
    }

    // Double-check all recipients for strict validity
    for (const r of finalRecipients) {
      const check = validateEmailDetailed(r.email);
      if (!check.isValid) {
        setValidationError(`Invalid email in list: "${r.email}" - ${check.error}`);
        setSuggestionCorrection(check.suggestion || null);
        return;
      }
    }

    if (!subject.trim()) {
      setValidationError('Please enter an email subject.');
      return;
    }

    if (!body.trim()) {
      setValidationError('Please enter an email message.');
      return;
    }

    setValidationError(null);
    setSuggestionCorrection(null);

    persistChanges(subject, body, attachments);

    onStartSequence(finalRecipients, subject, body, attachments);

    setRecipients([]);
    setRecipientInput('');
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-5">
      {validationError && (
        <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-lg">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            <span className="font-medium">{validationError}</span>
          </div>
          {suggestionCorrection && (
            <button
              type="button"
              onClick={() => applySuggestion(suggestionCorrection)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 text-[11px] font-semibold border border-rose-500/40 transition-colors shrink-0 cursor-pointer self-start sm:self-auto"
            >
              <Sparkles className="w-3 h-3 text-rose-300" />
              <span>Use {suggestionCorrection} instead</span>
            </button>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-slate-900 rounded-2xl border border-slate-800 p-5 space-y-4 flex flex-col h-full">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-indigo-400" />
                <span>Recipients ({recipients.length})</span>
              </label>

              {recipients.length > 0 && (
                <button
                  type="button"
                  onClick={clearAllRecipients}
                  className="text-[11px] text-slate-400 hover:text-rose-400 transition-colors flex items-center gap-1"
                >
                  <RotateCcw className="w-3 h-3" /> Clear
                </button>
              )}
            </div>

            <div className="space-y-2">
              <div className="relative">
                <textarea
                  ref={inputRef}
                  rows={4}
                  value={recipientInput}
                  onChange={(e) => handleInputChange(e.target.value)}
                  onKeyDown={handleKeyDown}
                  onBlur={handleBlur}
                  onPaste={handlePaste}
                  placeholder="Enter recipient email (e.g. hr@company.com)..."
                  className="w-full p-3.5 rounded-xl bg-slate-950 border border-slate-700/80 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none text-xs text-slate-200 placeholder-slate-500 font-mono resize-none leading-relaxed"
                />
              </div>

              <div className="flex justify-between items-center text-[11px] text-slate-500">
                <span>Press Enter or , to add</span>
                <button
                  type="button"
                  disabled={!recipientInput.trim()}
                  onClick={() => addRecipientsFromInput(recipientInput)}
                  className="inline-flex items-center gap-1 px-3 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-semibold transition-colors cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add</span>
                </button>
              </div>
            </div>

            {recipients.length > 0 ? (
              <div className="space-y-1.5 flex-1 max-h-72 overflow-y-auto pr-1">
                {recipients.map((rcp, idx) => (
                  <div
                    key={rcp.id}
                    className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs font-mono"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-[10px] text-slate-500">{idx + 1}.</span>
                      <span className="text-slate-200 truncate">{rcp.email}</span>
                      <span className="inline-flex items-center gap-1 text-[10px] font-medium text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.5 rounded shrink-0">
                        <Check className="w-2.5 h-2.5" /> Valid
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeRecipient(rcp.id)}
                      className="p-1 text-slate-500 hover:text-rose-400 rounded transition-colors cursor-pointer"
                      title="Remove"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-6 text-center rounded-xl bg-slate-950 border border-slate-800/80 text-slate-400 text-xs flex-1 flex flex-col items-center justify-center">
                <Users className="w-5 h-5 text-slate-600 mb-1.5" />
                <p className="text-slate-400">No recipients added yet</p>
                <p className="text-[11px] text-slate-500 mt-1">Only verified & valid emails will be accepted</p>
              </div>
            )}
          </div>
        </div>

        <div className="lg:col-span-7 bg-slate-900 rounded-2xl border border-slate-800 p-5 space-y-4 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-300">
                Email Content
              </label>
              <div className="flex items-center gap-2">
                {cloudSynced && (
                  <span className="text-[11px] text-indigo-400 flex items-center gap-1 font-medium animate-fade-in">
                    <Cloud className="w-3 h-3" /> Supabase Synced
                  </span>
                )}
                {isAutoSaved && (
                  <span className="text-[11px] text-emerald-400 flex items-center gap-1 font-medium animate-fade-in">
                    <Check className="w-3 h-3" /> Saved
                  </span>
                )}
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs text-slate-400 flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-indigo-400" />
                <span>Subject</span>
              </label>
              <input
                type="text"
                value={subject}
                onChange={(e) => handleSubjectChange(e.target.value)}
                placeholder="Enter email subject..."
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700/80 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none text-xs text-white"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs text-slate-400">
                Message Body
              </label>
              <textarea
                rows={8}
                value={body}
                onChange={(e) => handleBodyChange(e.target.value)}
                placeholder="Write or paste your email message here..."
                className="w-full p-3.5 rounded-xl bg-slate-950 border border-slate-700/80 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none text-xs text-slate-200 leading-relaxed font-sans resize-y"
              />
            </div>

            <AttachmentUploader
              attachments={attachments}
              onUpdateAttachments={handleAttachmentsChange}
              isCVMode={true}
            />
          </div>

          <div className="pt-3 border-t border-slate-800 flex justify-end">
            <button
              id="start-sequence-dispatch-btn"
              type="button"
              disabled={isSendingSequence || (recipients.length === 0 && !recipientInput.trim())}
              onClick={handleTriggerSend}
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-semibold shadow-lg shadow-indigo-600/30 transition-all cursor-pointer"
            >
              <Send className="w-3.5 h-3.5" />
              <span>
                {isSendingSequence
                  ? 'Sending...'
                  : `Send Email (${recipients.length || (recipientInput.trim() ? 1 : 0)})`}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
