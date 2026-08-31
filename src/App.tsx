import { useState, useEffect, useRef } from 'react';
import {
  initAuth,
  googleSignIn,
  logout,
  getAccessToken,
  setCachedAccessToken,
} from './services/auth';
import { sendGmailMessage, getGmailUserProfile } from './services/gmail';
import { storageService, DEFAULT_TEMPLATES, DEFAULT_RATE_CONFIG } from './services/storage';
import {
  EmailAttachment,
  EmailRecipient,
  EmailTemplate,
  RateLimitConfig,
  DeliveryLog,
  UserProfile,
  GmailQuotaInfo,
} from './types';
import { renderTemplateText, waitWithAbort } from './utils';
import { Header } from './components/Header';
import { AuthCard } from './components/AuthCard';
import { EmailComposer } from './components/EmailComposer';
import { QueueProgress } from './components/QueueProgress';
import { DeliveryHistory } from './components/DeliveryHistory';
import { ConfirmationModal } from './components/ConfirmationModal';
import { AdminDashboard } from './components/AdminDashboard';
import { supabaseService, ADMIN_EMAIL } from './services/supabase';

export default function App() {
  // Auth state
  const [user, setUser] = useState<UserProfile | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState<boolean>(true);
  const [authError, setAuthError] = useState<string | null>(null);

  // App data state
  const [activeTab, setActiveTab] = useState<'composer' | 'history' | 'admin'>('composer');
  const [rateConfig, setRateConfig] = useState<RateLimitConfig>(DEFAULT_RATE_CONFIG);
  const [historyLogs, setHistoryLogs] = useState<DeliveryLog[]>([]);
  const [quota, setQuota] = useState<GmailQuotaInfo>(storageService.getQuota());

  // Sequence runner state
  const [isSendingSequence, setIsSendingSequence] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [queueRecipients, setQueueRecipients] = useState<EmailRecipient[]>([]);
  const [currentQueueIndex, setCurrentQueueIndex] = useState(0);
  const [countdownSeconds, setCountdownSeconds] = useState(0);
  const [activeSubject, setActiveSubject] = useState('');
  const [activeBody, setActiveBody] = useState('');
  const [activeAttachments, setActiveAttachments] = useState<EmailAttachment[]>([]);

  // Confirmation modal state
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [pendingSequenceParams, setPendingSequenceParams] = useState<{
    recipients: EmailRecipient[];
    subject: string;
    body: string;
    attachments: EmailAttachment[];
  } | null>(null);

  // Abort controller ref for pausing/stopping
  const abortControllerRef = useRef<AbortController | null>(null);
  const pausePromiseResolveRef = useRef<(() => void) | null>(null);
  const isPausedRef = useRef(false);
  isPausedRef.current = isPaused;

  // Initialize data and auth
  useEffect(() => {
    // Load local storage items
    setRateConfig(storageService.getRateConfig());
    setHistoryLogs(storageService.getHistory());
    setQuota(storageService.getQuota());

    // Init Auth listener
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

        // Sync initial login profile to Supabase
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

        // Sync to Supabase immediately upon sign in
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

  const handleDemoLogin = () => {
    setIsAuthLoading(true);
    setAuthError(null);
    setTimeout(() => {
      const demoProfile: UserProfile = {
        email: 'demo.applicant@gmail.com',
        displayName: 'Demo User (Sandbox)',
        photoURL: undefined,
        providerId: 'demo-sandbox',
      };
      setUser(demoProfile);
      setToken('demo-sandbox-token');
      setIsAuthLoading(false);
    }, 400);
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

  // Trigger sequence after user fills composer
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

  // User confirmed the modal -> execute sending loop
  const executeSequence = async () => {
    if (!pendingSequenceParams || !user) return;
    setIsConfirmModalOpen(false);

    const { recipients, subject, body, attachments } = pendingSequenceParams;
    let currentAccessToken = token;

    // Validate access token
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

      // Check if paused
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

      // Mark as sending
      setQueueRecipients((prev) =>
        prev.map((r, idx) => (idx === i ? { ...r, status: 'sending' } : r))
      );

      // Render customized subject and body
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

      let sendSuccess = false;
      let messageId = '';
      let errorMessage = '';

      // Try sending with transient retry logic
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
        // Update recipient state
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

        // Record delivery log locally
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

        // Record to Supabase email logs
        supabaseService.logEmailSent(user.email, recipient.email, customizedSubject, 'sent');

        // Increment daily quota
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

        // Record failed log to Supabase
        supabaseService.logEmailSent(user.email, recipient.email, customizedSubject, 'failed', errorMessage);

        // Stop on 2 consecutive errors if enabled
        if (rateConfig.stopOnConsecutiveErrors && consecutiveErrors >= 2) {
          console.warn('Paused due to consecutive dispatch errors');
          setIsPaused(true);
          isPausedRef.current = true;
        }
      }

      // If more emails remain and not cancelled, wait anti-ban delay with countdown
      if (i < recipients.length - 1 && !abortController.signal.aborted) {
        let delay = rateConfig.delaySeconds;
        if (rateConfig.enableJitter) {
          delay += Math.floor(Math.random() * 3); // 0 to 2s random variation
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

  // Pause / Resume / Cancel handlers
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
      {/* Top Header */}
      <Header
        user={user}
        quota={quota}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onLogout={handleLogout}
      />

      {/* Main Container */}
      <main className="flex-1 pb-16">
        {!user ? (
          <AuthCard
            onSignIn={handleSignIn}
            isLoading={isAuthLoading}
            error={authError}
            onDemoLogin={handleDemoLogin}
          />
        ) : (
          <div className="space-y-6">
            {/* Live Queue Progress Monitor (Shows when sending or recently completed) */}
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

            {/* Active Tab View */}
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

            {/* Admin Dashboard: ONLY accessible if logged in as usmancodex.dev@gmail.com */}
            {activeTab === 'admin' && isAdmin && (
              <AdminDashboard currentUserEmail={user.email} />
            )}
          </div>
        )}
      </main>

      {/* Confirmation Modal */}
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
