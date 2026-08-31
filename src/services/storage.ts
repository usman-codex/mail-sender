import { DeliveryLog, EmailAttachment, EmailTemplate, RateLimitConfig, GmailQuotaInfo } from '../types';

const STORAGE_KEYS = {
  TEMPLATES: 'gmail_mailer_templates_v2',
  DEFAULT_ATTACHMENTS: 'gmail_mailer_default_attachments_v2',
  HISTORY: 'gmail_mailer_history_v2',
  RATE_CONFIG: 'gmail_mailer_rate_config_v2',
  QUOTA: 'gmail_mailer_quota_v2',
  USER_DATA_PREFIX: 'gmail_user_data_',
};

export const DEFAULT_TEMPLATES: EmailTemplate[] = [
  {
    id: 'template_default',
    title: 'Default Template',
    category: 'Custom',
    isDefault: true,
    subject: '',
    body: '',
    attachments: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

export const DEFAULT_RATE_CONFIG: RateLimitConfig = {
  delaySeconds: 4,
  enableJitter: true,
  maxDailyCap: 450,
  stopOnConsecutiveErrors: true,
  maxRetries: 2,
};

export const storageService = {
  getUserData(userEmail: string): { subject: string; body: string; attachments: EmailAttachment[] } {
    if (!userEmail) {
      return { subject: '', body: '', attachments: [] };
    }
    try {
      const key = `${STORAGE_KEYS.USER_DATA_PREFIX}${userEmail.toLowerCase().trim()}`;
      const data = localStorage.getItem(key);
      if (data) {
        return JSON.parse(data);
      }
    } catch (e) {
      console.error('Failed to get user data from storage', e);
    }
    return { subject: '', body: '', attachments: [] };
  },

  saveUserData(
    userEmail: string,
    data: { subject: string; body: string; attachments: EmailAttachment[] }
  ) {
    if (!userEmail) return;
    try {
      const key = `${STORAGE_KEYS.USER_DATA_PREFIX}${userEmail.toLowerCase().trim()}`;
      localStorage.setItem(key, JSON.stringify(data));
    } catch (e) {
      console.error('Failed to save user data to storage', e);
    }
  },

  getTemplates(): EmailTemplate[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.TEMPLATES);
      if (!data) {
        this.saveTemplates(DEFAULT_TEMPLATES);
        return DEFAULT_TEMPLATES;
      }
      return JSON.parse(data);
    } catch {
      return DEFAULT_TEMPLATES;
    }
  },

  saveTemplates(templates: EmailTemplate[]) {
    try {
      localStorage.setItem(STORAGE_KEYS.TEMPLATES, JSON.stringify(templates));
    } catch (e) {
      console.error('Failed to save templates', e);
    }
  },

  getDefaultAttachments(): EmailAttachment[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.DEFAULT_ATTACHMENTS);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  },

  saveDefaultAttachments(attachments: EmailAttachment[]) {
    try {
      localStorage.setItem(STORAGE_KEYS.DEFAULT_ATTACHMENTS, JSON.stringify(attachments));
    } catch (e) {
      console.error('Failed to save attachments to local storage', e);
    }
  },

  getHistory(): DeliveryLog[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.HISTORY);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  },

  addHistoryLog(log: DeliveryLog) {
    try {
      const history = this.getHistory();
      const updated = [log, ...history].slice(0, 1000); // keep last 1000 logs
      localStorage.setItem(STORAGE_KEYS.HISTORY, JSON.stringify(updated));
    } catch (e) {
      console.error('Failed to add history log', e);
    }
  },

  clearHistory() {
    try {
      localStorage.removeItem(STORAGE_KEYS.HISTORY);
    } catch (e) {
      console.error('Failed to clear history', e);
    }
  },

  getRateConfig(): RateLimitConfig {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.RATE_CONFIG);
      return data ? { ...DEFAULT_RATE_CONFIG, ...JSON.parse(data) } : DEFAULT_RATE_CONFIG;
    } catch {
      return DEFAULT_RATE_CONFIG;
    }
  },

  saveRateConfig(config: RateLimitConfig) {
    try {
      localStorage.setItem(STORAGE_KEYS.RATE_CONFIG, JSON.stringify(config));
    } catch (e) {
      console.error('Failed to save rate config', e);
    }
  },

  getQuota(): GmailQuotaInfo {
    const today = new Date().toISOString().split('T')[0];
    try {
      const data = localStorage.getItem(STORAGE_KEYS.QUOTA);
      if (data) {
        const parsed: GmailQuotaInfo = JSON.parse(data);
        if (parsed.lastResetDate === today) {
          return parsed;
        }
      }
    } catch {
      // ignore
    }
    const fresh: GmailQuotaInfo = {
      dailySentCount: 0,
      lastResetDate: today,
      tier: 'Free Gmail (500/day)',
    };
    this.saveQuota(fresh);
    return fresh;
  },

  incrementQuota(count: number = 1): GmailQuotaInfo {
    const current = this.getQuota();
    const updated: GmailQuotaInfo = {
      ...current,
      dailySentCount: current.dailySentCount + count,
    };
    this.saveQuota(updated);
    return updated;
  },

  saveQuota(quota: GmailQuotaInfo) {
    try {
      localStorage.setItem(STORAGE_KEYS.QUOTA, JSON.stringify(quota));
    } catch (e) {
      console.error('Failed to save quota', e);
    }
  },
};
