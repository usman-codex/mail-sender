import { useState, useEffect, useRef } from 'react';
import {
  initAuth,
  googleSignIn,
  logout,
  getAccessToken,
  setCachedAccessToken,
} from './services/auth';
import { sendGmailMessage } from './services/gmail';
import { storageService, DEFAULT_RATE_CONFIG } from './services/storage';
import {
  EmailAttachment,
  EmailRecipient,
  RateLimitConfig,
  DeliveryLog,
  UserProfile,
  GmailQuotaInfo,
} from './types';
import { renderTemplateText, waitWithAbort, validateEmailDetailed } from './utils';
import { Header } from './components/Header';
import { AuthCard } from './components/AuthCard';
import { EmailComposer } from './components/EmailComposer';
import { QueueProgress } from './components/QueueProgress';
import { DeliveryHistory } from './components/DeliveryHistory';
import { ConfirmationModal } from './components/ConfirmationModal';
import { AdminDashboard } from './components/AdminDashboard';
import { supabaseService, ADMIN_EMAIL } from './services/supabase';
import { analyticsService } from './services/analytics';

export default function App() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState<boolean>(true);
  const [authError, setAuthError] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<'composer' | 'history' | 'admin'>('composer');
  const [rateConfig, setRateConfig] = useState<RateLimitConfig>(DEFAULT_RATE_CONFIG);
  const [historyLogs, setHistoryLogs] = useState<DeliveryLog[]>([]);
  const [quota, setQuota] = useState<GmailQuotaInfo>(storageService.getQuota());

  const [isSendingSequence, setIsSendingSequence] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [queueRecipients, setQueueRecipients] = useState<EmailRecipient[]>([]);
  const [currentQueueIndex, setCurrentQueueIndex] = useState(0);
  const [countdownSeconds, setCountdownSeconds] = useState(0);
  const [activeSubject, setActiveSubject] = useState('');
  const [activeBody, setActiveBody] = useState('');
  const [activeAttachments, setActiveAttachments] = useState<EmailAttachment[]>([]);

  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [pendingSequenceParams, setPendingSequenceParams] = useState<{
    recipients: EmailRecipient[];
    subject: string;
    body: string;
    attachments: EmailAttachment[];
  } | null>(null);

  const abortControllerRef = useRef<AbortController | null>(null);
  const pausePromiseResolveRef = useRef<(() => void) | null>(null);
  const isPausedRef = useRef(false);
  isPausedRef.current = isPaused;

  useEffect(() => {
    analyticsService.initTracking();
    setRateConfig(storageService.getRateConfig());
    setHistoryLogs(storageService.getHistory());
    setQuota(storageService.getQuota());

    const unsubscribe = initAuth(
      (firebaseUser, accessToken) => {
        const profile: UserProfile = {
          email: firebaseUser.email || '',
          displayName: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'User',
          photoURL: firebaseUser.photoURL || undefined,
          providerId: firebaseUser.providerId,
        };
        setUser(profile);
        setToken(accessToken);
        setIsAuthLoading(false);

        analyticsService.trackUserLogin({
          email: profile.email,
          displayName: profile.displayName,
          photoUrl: profile.photoURL,
        });

        const localData = storageService.getUserData(profile.email);
        supabaseService.syncUserData(
          profile.email,
          profile.displayName,
          profile.photoURL || '',
          localData.subject || '',
          localData.body || '',
          localData.attachments || []
        );
      },
      () => {
        setUser(null);
        setToken(null);
        setIsAuthLoading(false);
      }
    );

    return () => {
      if (typeof unsubscribe === 'function') {
        unsubscribe();
      }
    };
  }, []);

  const handleSignIn = async () => {
    analyticsService.trackLinkClick('Sign In with Google');
    setIsAuthLoading(true);
    setAuthError(null);
    try {
      const result = await googleSignIn();
      if (result) {
        const profile: UserProfile = {
          email: result.user.email || '',
          displayName: result.user.displayName || result.user.email?.split('@')[0] || 'User',
          photoURL: result.user.photoURL || undefined,
          providerId: result.user.providerId,
        };
        setUser(profile);
        setToken(result.accessToken);

        analyticsService.trackUserLogin({
          email: profile.email,
          displayName: profile.displayName,
          photoUrl: profile.photoURL,
        });

        const localData = storageService.getUserData(profile.email);
        supabaseService.syncUserData(
          profile.email,
          profile.displayName,
          profile.photoURL || '',
          localData.subject || '',
          localData.body || '',
          localData.attachments || []
        );
      }
    } catch (err: any) {
      console.error('Sign-in failed:', err);
      setAuthError(err.message || 'Failed to authenticate with Google. Please try again.');
    } finally {
      setIsAuthLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      setUser(null);
      setToken(null);
      setActiveTab('composer');
    } catch (err) {
      console.error('Logout failed:', err);
    }
  };

  const handleInitiateSequence = (
    recipients: EmailRecipient[],
    subject: string,
    body: string,
    attachments: EmailAttachment[]
  ) => {
    setPendingSequenceParams({
      recipients,
      subject,
      body,
      attachments,
    });
    setIsConfirmModalOpen(true);
  };

  const executeSequence = async () => {
    if (!pendingSequenceParams || !user) return;
    setIsConfirmModalOpen(false);

    const { recipients, subject, body, attachments } = pendingSequenceParams;
    let currentAccessToken = token;

    if (!currentAccessToken) {
      currentAccessToken = await getAccessToken();
      if (!currentAccessToken) {
        alert('Authentication expired. Please sign in again with Google to send emails.');
        return;
      }
      setToken(currentAccessToken);
      setCachedAccessToken(currentAccessToken);
    }

    setIsSendingSequence(true);
    setIsPaused(false);
    setQueueRecipients(
      recipients.map((r) => ({
        ...r,
        status: 'pending',
        error: undefined,
      }))
    );
    setCurrentQueueIndex(0);
    setActiveSubject(subject);
    setActiveBody(body);
    setActiveAttachments(attachments);

    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    let consecutiveErrors = 0;

    for (let i = 0; i < recipients.length; i++) {
      if (abortController.signal.aborted) {
        break;
      }

      while (isPausedRef.current) {
        if (abortController.signal.aborted) break;
        await new Promise<void>((resolve) => {
          pausePromiseResolveRef.current = resolve;
        });
      }

      if (abortController.signal.aborted) {
        break;
      }

      setCurrentQueueIndex(i);
      const recipient = recipients[i];

      const customizedSubject = renderTemplateText(subject, {
        name: recipient.name,
        company: recipient.company,
        role: recipient.role,
        sender_name: user?.displayName,
        sender_email: user?.email,
      });

      const customizedBody = renderTemplateText(body, {
        name: recipient.name,
        company: recipient.company,
        role: recipient.role,
        sender_name: user?.displayName,
        sender_email: user?.email,
      });

      // Strict Pre-dispatch Validation
      const emailValidation = validateEmailDetailed(recipient.email);
      if (!emailValidation.isValid) {
        const timestamp = new Date().toISOString();
        const invalidError = emailValidation.error || 'Invalid recipient email address or domain';

        consecutiveErrors++;
        setQueueRecipients((prev) =>
          prev.map((r, idx) =>
            idx === i
              ? {
                  ...r,
                  status: 'failed',
                  error: invalidError,
                }
              : r
          )
        );

        const log: DeliveryLog = {
          id: `log_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          recipientEmail: recipient.email,
          recipientName: recipient.name,
          subject: customizedSubject,
          status: 'failed',
          sentAt: timestamp,
          error: invalidError,
          attachmentNames: attachments.map((a) => a.name),
        };
        storageService.addHistoryLog(log);
        setHistoryLogs((prev) => [log, ...prev]);

        supabaseService.logEmailSent(
          user.email,
          recipient.email,
          customizedSubject,
          'failed',
          attachments.map((a) => a.name),
          invalidError
        );

        continue;
      }

      setQueueRecipients((prev) =>
        prev.map((r, idx) => (idx === i ? { ...r, status: 'sending' } : r))
      );

      let sendSuccess = false;
      let messageId = '';
      let errorMessage = '';

      const maxRetries = rateConfig.maxRetries || 2;
      for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
          const res = await sendGmailMessage(currentAccessToken, {
            to: recipient.email,
            fromName: user?.displayName,
            fromEmail: user?.email,
            subject: customizedSubject,
            body: customizedBody,
            attachments,
          });

          sendSuccess = true;
          messageId = res.id;
          consecutiveErrors = 0;
          break;
        } catch (err: any) {
          errorMessage = err.message || 'Failed to dispatch email';
          console.warn(`Attempt ${attempt + 1} for ${recipient.email} failed:`, errorMessage);

          if (attempt < maxRetries) {
            await waitWithAbort(1500 * (attempt + 1), abortController.signal).catch(() => {});
          }
        }
      }

      const timestamp = new Date().toISOString();

      if (sendSuccess) {
        setQueueRecipients((prev) =>
          prev.map((r, idx) =>
            idx === i
              ? {
                  ...r,
                  status: 'sent',
                  messageId,
                  sentAt: timestamp,
                }
              : r
          )
        );

        const log: DeliveryLog = {
          id: `log_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          recipientEmail: recipient.email,
          recipientName: recipient.name,
          subject: customizedSubject,
          status: 'sent',
          sentAt: timestamp,
          messageId,
          attachmentNames: attachments.map((a) => a.name),
        };
        storageService.addHistoryLog(log);
        setHistoryLogs((prev) => [log, ...prev]);

        supabaseService.logEmailSent(
          user.email,
          recipient.email,
          customizedSubject,
          'sent',
          attachments.map((a) => a.name)
        );

        const updatedQuota = storageService.incrementQuota(1);
        setQuota(updatedQuota);
      } else {
        consecutiveErrors++;
        setQueueRecipients((prev) =>
          prev.map((r, idx) =>
            idx === i
              ? {
                  ...r,
                  status: 'failed',
                  error: errorMessage,
                }
              : r
          )
        );

        const log: DeliveryLog = {
          id: `log_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          recipientEmail: recipient.email,
          recipientName: recipient.name,
          subject: customizedSubject,
          status: 'failed',
          sentAt: timestamp,
          error: errorMessage,
          attachmentNames: attachments.map((a) => a.name),
        };
        storageService.addHistoryLog(log);
        setHistoryLogs((prev) => [log, ...prev]);

        supabaseService.logEmailSent(
          user.email,
          recipient.email,
          customizedSubject,
          'failed',
          attachments.map((a) => a.name),
          errorMessage
        );

        if (rateConfig.stopOnConsecutiveErrors && consecutiveErrors >= 2) {
          console.warn('Paused due to consecutive dispatch errors');
          setIsPaused(true);
          isPausedRef.current = true;
        }
      }

      if (i < recipients.length - 1 && !abortController.signal.aborted) {
        let delay = rateConfig.delaySeconds;
        if (rateConfig.enableJitter) {
          delay += Math.floor(Math.random() * 3);
        }

        for (let s = delay; s > 0; s--) {
          if (abortController.signal.aborted) break;
          while (isPausedRef.current) {
            if (abortController.signal.aborted) break;
            await new Promise<void>((resolve) => {
              pausePromiseResolveRef.current = resolve;
            });
          }
          setCountdownSeconds(s);
          await waitWithAbort(1000, abortController.signal).catch(() => {});
        }
        setCountdownSeconds(0);
      }
    }

    setIsSendingSequence(false);
    setCountdownSeconds(0);
    abortControllerRef.current = null;
  };

  const handlePauseSequence = () => {
    setIsPaused(true);
    isPausedRef.current = true;
  };

  const handleResumeSequence = () => {
    setIsPaused(false);
    isPausedRef.current = false;
    if (pausePromiseResolveRef.current) {
      pausePromiseResolveRef.current();
      pausePromiseResolveRef.current = null;
    }
  };

  const handleCancelSequence = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    setIsSendingSequence(false);
    setIsPaused(false);
    isPausedRef.current = false;
    if (pausePromiseResolveRef.current) {
      pausePromiseResolveRef.current();
      pausePromiseResolveRef.current = null;
    }
    setQueueRecipients((prev) =>
      prev.map((r) => (r.status === 'pending' || r.status === 'sending' ? { ...r, status: 'failed', error: 'Cancelled by user' } : r))
    );
  };

  const isAdmin = user?.email?.toLowerCase().trim() === ADMIN_EMAIL.toLowerCase().trim();

  useEffect(() => {
    if (!isAdmin && activeTab === 'admin') {
      setActiveTab('composer');
    }
  }, [isAdmin, activeTab]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-indigo-500 selection:text-white">
      <Header
        user={user}
        quota={quota}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onLogout={handleLogout}
      />

      <main className="flex-1 pb-16">
        {!user ? (
          <AuthCard
            onSignIn={handleSignIn}
            isLoading={isAuthLoading}
            error={authError}
          />
        ) : (
          <div className="space-y-6">
            {(isSendingSequence || queueRecipients.length > 0) && (
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
                <QueueProgress
                  recipients={queueRecipients}
                  currentIndex={currentQueueIndex}
                  isSending={isSendingSequence}
                  isPaused={isPaused}
                  countdownSeconds={countdownSeconds}
                  totalDelay={rateConfig.delaySeconds}
                  onPause={handlePauseSequence}
                  onResume={handleResumeSequence}
                  onCancel={handleCancelSequence}
                  onReauth={handleSignIn}
                />
              </div>
            )}

            {activeTab === 'composer' && (
              <EmailComposer
                user={user}
                rateConfig={rateConfig}
                onStartSequence={handleInitiateSequence}
                isSendingSequence={isSendingSequence}
              />
            )}

            {activeTab === 'history' && (
              <DeliveryHistory
                logs={historyLogs}
                onClearHistory={() => {
                  storageService.clearHistory();
                  setHistoryLogs([]);
                }}
                onRetryFailed={(failedRecipients) => {
                  setActiveTab('composer');
                  const userData = storageService.getUserData(user.email);
                  handleInitiateSequence(
                    failedRecipients,
                    userData.subject || 'Application',
                    userData.body || '',
                    userData.attachments || []
                  );
                }}
              />
            )}

            {activeTab === 'admin' && isAdmin && (
              <AdminDashboard currentUserEmail={user.email} />
            )}
          </div>
        )}
      </main>

      {user && pendingSequenceParams && (
        <ConfirmationModal
          isOpen={isConfirmModalOpen}
          onClose={() => setIsConfirmModalOpen(false)}
          onConfirm={executeSequence}
          recipients={pendingSequenceParams.recipients}
          subject={pendingSequenceParams.subject}
          senderEmail={user.email}
          attachments={pendingSequenceParams.attachments}
          rateConfig={rateConfig}
        />
      )}
    </div>
  );
}
