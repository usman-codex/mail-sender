import { DeliveryLog, EmailRecipient } from './types';

// RFC 5322 email regex matcher
export const EMAIL_REGEX = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;
export const GLOBAL_EMAIL_REGEX = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
export const STRICT_EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

/**
 * Checks if a string is a complete valid email address
 */
export function isValidEmail(email: string): boolean {
  return STRICT_EMAIL_REGEX.test(email.trim());
}

/**
 * Real-time extraction helper: extracts completed emails and returns remaining unfinished text
 */
export function extractEmailsWithRemaining(
  rawInput: string
): { extracted: EmailRecipient[]; remainingText: string } {
  if (!rawInput) return { extracted: [], remainingText: '' };

  // Check if ending with a delimiter (space, comma, newline, semicolon, tab)
  const endsWithDelimiter = /[\r\n,;\t\s]$/.test(rawInput);

  if (endsWithDelimiter) {
    const extracted = parseRecipientInput(rawInput);
    return { extracted, remainingText: '' };
  }

  // If typing continuously, take everything up to the last word/token
  const parts = rawInput.split(/[\r\n,;\t\s]+/);
  const candidateText = parts.slice(0, -1).join(' ');
  const remainingText = parts[parts.length - 1] || '';

  const extracted = parseRecipientInput(candidateText);
  return { extracted, remainingText };
}

/**
 * Parses raw input text (which can contain multiple emails separated by newlines, commas, tabs, spaces,
 * or messy text pasted from Google Maps, Excel, websites, etc.)
 * ONLY extracts valid email addresses and completely ignores all other text, phone numbers, URLs, and noise.
 */
export function parseRecipientInput(rawInput: string): EmailRecipient[] {
  if (!rawInput || !rawInput.trim()) return [];

  const recipients: EmailRecipient[] = [];
  const seenEmails = new Set<string>();

  // Extract all emails anywhere in the text using global regex
  const matches = rawInput.match(GLOBAL_EMAIL_REGEX);
  if (!matches) return [];

  for (const rawMatch of matches) {
    // Strip any boundary punctuation like trailing comma, closing parenthesis, period, or leading angle bracket
    const cleanEmail = rawMatch
      .trim()
      .toLowerCase()
      .replace(/^[<("'\s]+/, '')
      .replace(/[>)"',\s;:]+$/, '')
      .replace(/\.+$/, ''); // strip trailing dots

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

/**
 * Human friendly format for file sizes
 */
export function formatBytes(bytes: number, decimals: number = 2): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

/**
 * Replace placeholders in template text
 */
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

  // Replace default fallbacks for unreplaced common tags
  result = result.replace(/{{\s*name\s*}}/gi, variables.name || 'Hiring Team');
  result = result.replace(/{{\s*company\s*}}/gi, variables.company || 'your organization');
  result = result.replace(/{{\s*role\s*}}/gi, variables.role || 'the advertised position');
  result = result.replace(/{{\s*sender_email\s*}}/gi, variables.sender_email || '');
  result = result.replace(/{{\s*sender_name\s*}}/gi, variables.sender_name || '');

  return result;
}

/**
 * Delay with cancel token / abort controller support
 */
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

/**
 * Convert Delivery logs to downloadable CSV
 */
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
