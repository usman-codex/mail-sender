import { useState } from 'react';
import { Shield, Clock, AlertTriangle, CheckCircle2, Sliders, Zap, Save, HelpCircle } from 'lucide-react';
import { RateLimitConfig, GmailQuotaInfo } from '../types';
import { storageService } from '../services/storage';

interface RateLimitSettingsProps {
  rateConfig: RateLimitConfig;
  onUpdateRateConfig: (config: RateLimitConfig) => void;
  quota: GmailQuotaInfo;
}

export function RateLimitSettings({
  rateConfig,
  onUpdateRateConfig,
  quota,
}: RateLimitSettingsProps) {
  const [config, setConfig] = useState<RateLimitConfig>(rateConfig);
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    onUpdateRateConfig(config);
    storageService.saveRateConfig(config);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const handleResetDefaults = () => {
    const defaults: RateLimitConfig = {
      delaySeconds: 4,
      enableJitter: true,
      maxDailyCap: 450,
      stopOnConsecutiveErrors: true,
      maxRetries: 2,
    };
    setConfig(defaults);
    onUpdateRateConfig(defaults);
    storageService.saveRateConfig(defaults);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      <div>
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <Shield className="w-5 h-5 text-indigo-400" />
          <span>Anti-Ban & Rate Throttling Settings</span>
        </h2>
        <p className="text-xs text-slate-400 mt-1">
          Configure safety intervals, jitter delays, and sequence protections to ensure safe delivery and protect your Gmail account reputation.
        </p>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-6 shadow-xl">
        {/* Interval Throttling Slider */}
        <div className="space-y-3 pb-6 border-b border-slate-800">
          <div className="flex items-center justify-between">
            <div>
              <label className="text-sm font-bold text-white flex items-center gap-2">
                <Clock className="w-4 h-4 text-indigo-400" />
                <span>Inter-Email Delay (Throttle Interval)</span>
              </label>
              <p className="text-xs text-slate-400 mt-0.5">
                Delay time between consecutive email dispatches. Recommended: 3 to 6 seconds.
              </p>
            </div>
            <span className="px-3 py-1 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-bold font-mono">
              {config.delaySeconds}s delay
            </span>
          </div>

          <input
            type="range"
            min="1"
            max="15"
            step="0.5"
            value={config.delaySeconds}
            onChange={(e) => setConfig({ ...config, delaySeconds: parseFloat(e.target.value) })}
            className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
          />

          <div className="flex justify-between text-[11px] text-slate-500 font-mono">
            <span>1s (Fast / Risky)</span>
            <span className="text-emerald-400 font-medium">3s - 5s (Optimal Safety)</span>
            <span>15s (Ultra Conservative)</span>
          </div>
        </div>

        {/* Jitter (Humanized Timing) */}
        <div className="flex items-start justify-between gap-4 pb-6 border-b border-slate-800">
          <div>
            <label className="text-sm font-bold text-white flex items-center gap-2">
              <Zap className="w-4 h-4 text-amber-400" />
              <span>Human Variance (Random Jitter)</span>
            </label>
            <p className="text-xs text-slate-400 mt-0.5 max-w-xl leading-relaxed">
              Adds an unpredictable +0.5 to +2.0 second variance to each email send. This mimics natural human sending behavior and avoids rigid bot timing patterns.
            </p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer shrink-0">
            <input
              type="checkbox"
              checked={config.enableJitter}
              onChange={(e) => setConfig({ ...config, enableJitter: e.target.checked })}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
          </label>
        </div>

        {/* Error Circuit Breaker */}
        <div className="flex items-start justify-between gap-4 pb-6 border-b border-slate-800">
          <div>
            <label className="text-sm font-bold text-white flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-400" />
              <span>Automatic Circuit Breaker</span>
            </label>
            <p className="text-xs text-slate-400 mt-0.5 max-w-xl leading-relaxed">
              Immediately pause the sequence if Gmail returns 2 consecutive errors or rate-limit warnings. Prevents burning through your list if there is an authorization issue.
            </p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer shrink-0">
            <input
              type="checkbox"
              checked={config.stopOnConsecutiveErrors}
              onChange={(e) => setConfig({ ...config, stopOnConsecutiveErrors: e.target.checked })}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
          </label>
        </div>

        {/* Daily Cap Threshold Warning */}
        <div className="space-y-3 pb-6 border-b border-slate-800">
          <div className="flex items-center justify-between">
            <div>
              <label className="text-sm font-bold text-white flex items-center gap-2">
                <Shield className="w-4 h-4 text-emerald-400" />
                <span>Daily Safe Cap Warning Threshold</span>
              </label>
              <p className="text-xs text-slate-400 mt-0.5">
                Warn before starting any sequence if today's cumulative emails would exceed this number.
              </p>
            </div>
            <input
              type="number"
              min="10"
              max="2000"
              value={config.maxDailyCap}
              onChange={(e) => setConfig({ ...config, maxDailyCap: parseInt(e.target.value) || 450 })}
              className="w-24 px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white text-right font-mono focus:border-indigo-500 focus:outline-none"
            />
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center justify-between pt-2">
          <button
            type="button"
            onClick={handleResetDefaults}
            className="text-xs text-slate-400 hover:text-slate-200 transition-colors"
          >
            Reset to Recommended Defaults
          </button>

          <div className="flex items-center gap-3">
            {saved && (
              <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-lg border border-emerald-500/20">
                <CheckCircle2 className="w-3.5 h-3.5" /> Saved!
              </span>
            )}
            <button
              id="save-rate-settings-btn"
              onClick={handleSave}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md shadow-indigo-600/25 transition-all cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>Save Throttling Settings</span>
            </button>
          </div>
        </div>
      </div>

      {/* Gmail Sending Rules Guide Box */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
        <h3 className="text-sm font-bold text-white flex items-center gap-2">
          <HelpCircle className="w-4 h-4 text-indigo-400" />
          <span>Official Gmail Sending Rules & Best Practices</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-1.5">
            <span className="font-semibold text-slate-200">Daily Recipient Quotas</span>
            <p className="text-slate-400 leading-relaxed">
              • Personal Gmail accounts (@gmail.com): <strong className="text-white">500 emails/day</strong> via API.<br/>
              • Google Workspace accounts (@yourcompany.com): <strong className="text-white">2,000 emails/day</strong>.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-1.5">
            <span className="font-semibold text-slate-200">Anti-Spam & Reputation</span>
            <p className="text-slate-400 leading-relaxed">
              • Avoid sending all emails in 1 instant burst.<br/>
              • Always maintain 3–5 seconds delay with active CV attachments to keep spam filters clean and ensure 99%+ inbox placement.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
