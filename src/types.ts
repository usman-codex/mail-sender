export interface EmailAttachment {
  id: string;
  name: string;
  type: string;
  size: number;
  dataBase64: string; // Base64 encoded payload
  uploadedAt: string;
}

export interface EmailTemplate {
  id: string;
  title: string;
  subject: string;
  body: string;
  isDefault?: boolean;
  category?: 'Job Application' | 'Freelance' | 'Follow Up' | 'Custom';
  attachments: EmailAttachment[];
  createdAt: string;
  updatedAt: string;
}

export interface EmailRecipient {
  id: string;
  email: string;
  name?: string;
  company?: string;
  role?: string;
  isValid: boolean;
  status: 'pending' | 'queued' | 'sending' | 'sent' | 'failed';
  error?: string;
  sentAt?: string;
  messageId?: string;
}

export interface RateLimitConfig {
  delaySeconds: number; // Delay between consecutive email sends (e.g., 4s)
  enableJitter: boolean; // Random +0 to +2 seconds jitter to mimic human timing
  maxDailyCap: number; // Daily safe limit threshold warning (e.g., 450 emails)
  stopOnConsecutiveErrors: boolean; // Pause immediately if 2 consecutive emails fail
  maxRetries: number; // Retries on transient errors (like 429 / 503)
}

export interface DeliveryLog {
  id: string;
  recipientEmail: string;
  recipientName?: string;
  subject: string;
  status: 'sent' | 'failed';
  sentAt: string;
  error?: string;
  messageId?: string;
  attachmentNames: string[];
  templateTitle?: string;
}

export interface UserProfile {
  email: string;
  displayName: string;
  photoURL?: string;
  providerId: string;
}

export interface GmailQuotaInfo {
  dailySentCount: number;
  lastResetDate: string;
  tier: 'Free Gmail (500/day)' | 'Google Workspace (2000/day)';
}

export interface UserSavedData {
  user_email: string;
  display_name?: string;
  photo_url?: string;
  subject: string;
  body: string;
  attachments: EmailAttachment[];
  updated_at?: string;
  created_at?: string;
  total_sent_count?: number;
}
