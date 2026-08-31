import { useState } from 'react';
import { Mail, Zap, FileText, Lock, AlertCircle, Copy, Check, ExternalLink, Sparkles } from 'lucide-react';

interface AuthCardProps {
  onSignIn: () => void;
  isLoading: boolean;
  error?: string | null;
  onDemoLogin?: () => void;
}

export function AuthCard({ onSignIn, isLoading, error, onDemoLogin }: AuthCardProps) {
  const [copied, setCopied] = useState(false);
  const currentHostname = typeof window !== 'undefined' ? window.location.hostname : '';

  const handleCopyHostname = () => {
    if (currentHostname) {
      navigator.clipboard.writeText(currentHostname);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const isUnauthorizedDomain = error?.toLowerCase().includes('unauthorized-domain');

  return (
    <div className="max-w-2xl mx-auto my-12 px-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 sm:p-10 shadow-2xl relative overflow-hidden">
        {/* Background glow */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20"></div>
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none -ml-20 -mb-20"></div>

        <div className="relative z-10 text-center">
          {/* Logo / Badge */}
          <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-indigo-600 flex items-center justify-center shadow-xl shadow-indigo-600/30 text-white">
            <Mail className="w-8 h-8" />
          </div>

          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-white mb-3">
            Codex Mail Dispatcher
          </h2>
          <p className="text-slate-400 text-sm sm:text-base max-w-lg mx-auto leading-relaxed mb-8">
            Send targeted applications, proposals, and personalized messages with pre-attached CVs directly with anti-ban rate limiting.
          </p>

          {/* Official styled Google Sign In Button */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-6">
            <button
              id="google-signin-btn"
              onClick={onSignIn}
              disabled={isLoading}
              className="group relative inline-flex items-center justify-center gap-3 px-7 py-3.5 rounded-xl bg-white text-slate-900 font-semibold text-sm hover:bg-slate-100 active:scale-[0.98] transition-all shadow-lg shadow-white/10 disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer w-full sm:w-auto"
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-slate-900/30 border-t-slate-900 rounded-full animate-spin"></div>
              ) : (
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 10.03 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
                  />
                </svg>
              )}
              <span>{isLoading ? 'Connecting to Gmail...' : 'Sign in with Google'}</span>
            </button>

            {onDemoLogin && (
              <button
                id="demo-preview-btn"
                onClick={onDemoLogin}
                className="inline-flex items-center justify-center gap-2 px-5 py-3.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium text-sm transition border border-slate-700 cursor-pointer w-full sm:w-auto"
              >
                <Sparkles className="w-4 h-4 text-amber-400" />
                <span>Try Sandbox Demo</span>
              </button>
            )}
          </div>

          {/* Error / Unauthorized Domain Banner */}
          {error && (
            <div className="mb-6 p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs text-left space-y-3">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-rose-300">
                    {isUnauthorizedDomain ? 'Firebase Domain Authorization Required' : 'Authorization Notice'}
                  </p>
                  <p className="text-rose-300/90 mt-0.5">
                    {isUnauthorizedDomain
                      ? 'This preview URL is not yet listed in Firebase Console Authorized Domains.'
                      : error}
                  </p>
                </div>
              </div>

              {isUnauthorizedDomain && currentHostname && (
                <div className="bg-slate-950/70 p-3 rounded-lg border border-slate-800 space-y-2 mt-2">
                  <p className="text-slate-300 text-[11px] font-medium">
                    Add this domain to Firebase Console &gt; Authentication &gt; Settings &gt; Authorized domains:
                  </p>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 bg-slate-900 px-2.5 py-1.5 rounded border border-slate-700 font-mono text-indigo-300 text-xs truncate">
                      {currentHostname}
                    </code>
                    <button
                      onClick={handleCopyHostname}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs transition shrink-0 cursor-pointer"
                    >
                      {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copied ? 'Copied' : 'Copy'}</span>
                    </button>
                  </div>
                  <div className="pt-1 flex items-center justify-between text-[11px]">
                    <a
                      href="https://console.firebase.google.com/project/mail-sender-cafbf/authentication/settings"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-indigo-400 hover:text-indigo-300 underline inline-flex items-center gap-1"
                    >
                      <span>Open Firebase Auth Settings</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Feature Pillars */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-6 border-t border-slate-800 text-left">
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex items-start gap-3">
              <div className="p-2 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 shrink-0">
                <FileText className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-semibold text-white">CV & Attachments</h4>
                <p className="text-[11px] text-slate-400 leading-snug mt-0.5">
                  Saved locally so you never have to re-upload your resume each time.
                </p>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex items-start gap-3">
              <div className="p-2 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 shrink-0">
                <Zap className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-semibold text-white">Anti-Ban Pacing</h4>
                <p className="text-[11px] text-slate-400 leading-snug mt-0.5">
                  Sequenced delivery and jitter intervals keep your Gmail account safe.
                </p>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex items-start gap-3">
              <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 shrink-0">
                <Lock className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-semibold text-white">Direct & Private</h4>
                <p className="text-[11px] text-slate-400 leading-snug mt-0.5">
                  Official Google OAuth token client. Zero external credential logging.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
