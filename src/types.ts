export interface EmailAttachment {
  id: string;
  name: string;
  type: string;
  size: number;
  dataBase64: string;
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
  delaySeconds: number;
  enableJitter: boolean;
  maxDailyCap: number;
  stopOnConsecutiveErrors: boolean;
  maxRetries: number;
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
