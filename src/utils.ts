import { DeliveryLog, EmailRecipient } from './types';

export const EMAIL_REGEX = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;
export const GLOBAL_EMAIL_REGEX = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
export const STRICT_EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

export function isValidEmail(email: string): boolean {
  return STRICT_EMAIL_REGEX.test(email.trim());
}

export function extractEmailsWithRemaining(
  rawInput: string
): { extracted: EmailRecipient[]; remainingText: string } {
  if (!rawInput) return { extracted: [], remainingText: '' };

  const endsWithDelimiter = /[\r\n,;\t\s]$/.test(rawInput);

  if (endsWithDelimiter) {
    const extracted = parseRecipientInput(rawInput);
    return { extracted, remainingText: '' };
  }

  const parts = rawInput.split(/[\r\n,;\t\s]+/);
  const candidateText = parts.slice(0, -1).join(' ');
  const remainingText = parts[parts.length - 1] || '';

  const extracted = parseRecipientInput(candidateText);
  return { extracted, remainingText };
}

export function parseRecipientInput(rawInput: string): EmailRecipient[] {
  if (!rawInput || !rawInput.trim()) return [];

  const recipients: EmailRecipient[] = [];
  const seenEmails = new Set<string>();

  const matches = rawInput.match(GLOBAL_EMAIL_REGEX);
  if (!matches) return [];

  for (const rawMatch of matches) {
    const cleanEmail = rawMatch
      .trim()
      .toLowerCase()
      .replace(/^[<("'\s]+/, '')
      .replace(/[>)"',\s;:]+$/, '')
      .replace(/\.+$/, '');

    if (cleanEmail && isValidEmail(cleanEmail) && !seenEmails.has(cleanEmail)) {
      seenEmails.add(cleanEmail);
      recipients.push({
        id: `rcp_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        email: cleanEmail,
        name: '',
        company: '',
        role: '',
        isValid: true,
        status: 'pending',
      });
    }
  }

  return recipients;
}

export function formatBytes(bytes: number, decimals: number = 2): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

export function renderTemplateText(
  template: string,
  variables: {
    name?: string;
    company?: string;
    role?: string;
    sender_email?: string;
    sender_name?: string;
    [key: string]: string | undefined;
  }
): string {
  let result = template;
  for (const [key, value] of Object.entries(variables)) {
    if (value !== undefined) {
      const regex = new RegExp(`{{\\s*${key}\\s*}}`, 'gi');
      result = result.replace(regex, value);
    }
  }

  result = result.replace(/{{\s*name\s*}}/gi, variables.name || 'Hiring Team');
  result = result.replace(/{{\s*company\s*}}/gi, variables.company || 'your organization');
  result = result.replace(/{{\s*role\s*}}/gi, variables.role || 'the advertised position');
  result = result.replace(/{{\s*sender_email\s*}}/gi, variables.sender_email || '');
  result = result.replace(/{{\s*sender_name\s*}}/gi, variables.sender_name || '');

  return result;
}

export function waitWithAbort(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      return reject(new Error('Sequence paused or cancelled by user'));
    }

    const timer = setTimeout(() => {
      resolve();
    }, ms);

    if (signal) {
      signal.addEventListener('abort', () => {
        clearTimeout(timer);
        reject(new Error('Sequence paused or cancelled by user'));
      });
    }
  });
}

export function exportLogsToCSV(logs: DeliveryLog[]): void {
  if (logs.length === 0) return;

  const headers = ['Recipient Email', 'Recipient Name', 'Subject', 'Status', 'Sent At', 'Attachments', 'Error / Message ID'];
  const rows = logs.map((l) => [
    `"${l.recipientEmail}"`,
    `"${l.recipientName || ''}"`,
    `"${(l.subject || '').replace(/"/g, '""')}"`,
    `"${l.status}"`,
    `"${new Date(l.sentAt).toLocaleString()}"`,
    `"${(l.attachmentNames || []).join('; ')}"`,
    `"${(l.error || l.messageId || '').replace(/"/g, '""')}"`,
  ]);

  const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `gmail_delivery_report_${new Date().toISOString().split('T')[0]}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
