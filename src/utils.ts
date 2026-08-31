import { DeliveryLog, EmailRecipient } from './types';

export const GLOBAL_EMAIL_REGEX = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;

// Common typo domains map -> correct domain
const TYPO_DOMAINS_MAP: Record<string, string> = {
  // Gmail typos
  'gmail.co': 'gmail.com',
  'gmail.con': 'gmail.com',
  'gmail.cm': 'gmail.com',
  'gmail.c': 'gmail.com',
  'gmail.col': 'gmail.com',
  'gmail.om': 'gmail.com',
  'gmail.ocm': 'gmail.com',
  'gmail.comm': 'gmail.com',
  'gmail.comp': 'gmail.com',
  'gmail.org': 'gmail.com',
  'gmail.net': 'gmail.com',
  'gmail.cc': 'gmail.com',
  'gmal.com': 'gmail.com',
  'gmaill.com': 'gmail.com',
  'gamil.com': 'gmail.com',
  'gmai.com': 'gmail.com',
  'gmali.com': 'gmail.com',
  'gmaik.com': 'gmail.com',
  'gmaio.com': 'gmail.com',
  'gmil.com': 'gmail.com',
  'gmai.co': 'gmail.com',
  'gmaill.co': 'gmail.com',
  'gmaii.com': 'gmail.com',
  'gmaiil.com': 'gmail.com',
  'googlemail.co': 'googlemail.com',
  'googlemal.com': 'googlemail.com',

  // Yahoo typos
  'yahoo.co': 'yahoo.com',
  'yahoo.con': 'yahoo.com',
  'yahoo.cm': 'yahoo.com',
  'yahoo.c': 'yahoo.com',
  'yahoo.comm': 'yahoo.com',
  'yahoo.org': 'yahoo.com',
  'yahoo.net': 'yahoo.com',
  'yaho.com': 'yahoo.com',
  'yahool.com': 'yahoo.com',
  'ymail.co': 'ymail.com',
  'yaho.co': 'yahoo.com',

  // Hotmail & Outlook typos
  'hotmail.co': 'hotmail.com',
  'hotmail.con': 'hotmail.com',
  'hotmail.cm': 'hotmail.com',
  'hotmail.c': 'hotmail.com',
  'hotmial.com': 'hotmail.com',
  'hotmai.com': 'hotmail.com',
  'hotmaill.com': 'hotmail.com',
  'hotmial.co': 'hotmail.com',
  'outlook.co': 'outlook.com',
  'outlook.con': 'outlook.com',
  'outlook.cm': 'outlook.com',
  'outlook.c': 'outlook.com',
  'outlok.com': 'outlook.com',
  'outloo.com': 'outlook.com',
  'outluk.com': 'outlook.com',

  // iCloud typos
  'icloud.co': 'icloud.com',
  'icloud.con': 'icloud.com',
  'icloud.cm': 'icloud.com',
  'iclould.com': 'icloud.com',
  'iclou.com': 'icloud.com',

  // Proton typos
  'protonmail.co': 'protonmail.com',
  'protonmal.com': 'protonmail.com',
  'proton.co': 'proton.me',
};

export interface EmailValidationResult {
  isValid: boolean;
  cleanEmail: string;
  error?: string;
  suggestion?: string;
}

export function validateEmailDetailed(rawEmail: string): EmailValidationResult {
  if (!rawEmail || !rawEmail.trim()) {
    return { isValid: false, cleanEmail: '', error: 'Email address cannot be empty.' };
  }

  const clean = rawEmail
    .trim()
    .toLowerCase()
    .replace(/^[<("'\s]+/, '')
    .replace(/[>)"',\s;:]+$/, '')
    .replace(/\.+$/, '');

  if (clean.length > 254) {
    return { isValid: false, cleanEmail: clean, error: 'Email address is too long (exceeds 254 characters).' };
  }

  const atIndex = clean.indexOf('@');
  if (atIndex === -1) {
    return { isValid: false, cleanEmail: clean, error: 'Missing "@" symbol in email address.' };
  }

  if (clean.indexOf('@', atIndex + 1) !== -1) {
    return { isValid: false, cleanEmail: clean, error: 'Email contains multiple "@" symbols.' };
  }

  const localPart = clean.slice(0, atIndex);
  const domainPart = clean.slice(atIndex + 1);

  if (!localPart || localPart.length === 0) {
    return { isValid: false, cleanEmail: clean, error: 'Missing username before "@".' };
  }

  if (!domainPart || domainPart.length === 0) {
    return { isValid: false, cleanEmail: clean, error: 'Missing domain after "@".' };
  }

  if (localPart.startsWith('.') || localPart.endsWith('.')) {
    return { isValid: false, cleanEmail: clean, error: 'Username cannot start or end with a period.' };
  }

  if (localPart.includes('..') || domainPart.includes('..')) {
    return { isValid: false, cleanEmail: clean, error: 'Email cannot contain consecutive periods ("..").' };
  }

  // Check valid characters in local part
  const localPartRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+$/;
  if (!localPartRegex.test(localPart)) {
    return { isValid: false, cleanEmail: clean, error: 'Username contains invalid characters.' };
  }

  // Check domain structure
  if (!domainPart.includes('.')) {
    return { isValid: false, cleanEmail: clean, error: `Invalid domain "${domainPart}". Missing top-level domain (e.g. .com).` };
  }

  const domainSegments = domainPart.split('.');
  const tld = domainSegments[domainSegments.length - 1];

  if (!tld || tld.length < 2 || !/^[a-zA-Z]+$/.test(tld)) {
    return { isValid: false, cleanEmail: clean, error: `Invalid top-level domain ".${tld}". Top-level domain must be valid letters.` };
  }

  // Check domain segments for invalid start/end hyphens
  for (const seg of domainSegments) {
    if (!seg || seg.startsWith('-') || seg.endsWith('-') || !/^[a-zA-Z0-9-]+$/.test(seg)) {
      return { isValid: false, cleanEmail: clean, error: `Invalid domain format in "${domainPart}".` };
    }
  }

  // Check against known typo domains
  if (TYPO_DOMAINS_MAP[domainPart]) {
    const correctDomain = TYPO_DOMAINS_MAP[domainPart];
    const suggestedEmail = `${localPart}@${correctDomain}`;
    return {
      isValid: false,
      cleanEmail: clean,
      error: `"${domainPart}" is an invalid or misspelled domain. Did you mean "${correctDomain}"?`,
      suggestion: suggestedEmail,
    };
  }

  return {
    isValid: true,
    cleanEmail: clean,
  };
}

export function isValidEmail(email: string): boolean {
  return validateEmailDetailed(email).isValid;
}

export function extractEmailsWithRemaining(
  rawInput: string
): { extracted: EmailRecipient[]; remainingText: string; invalidDetected?: string[] } {
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

  // Tokenize by common delimiters
  const tokens = rawInput
    .split(/[\r\n,;\t\s]+/)
    .map((t) => t.trim())
    .filter(Boolean);

  for (const token of tokens) {
    const validation = validateEmailDetailed(token);
    if (validation.isValid && !seenEmails.has(validation.cleanEmail)) {
      seenEmails.add(validation.cleanEmail);
      recipients.push({
        id: `rcp_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        email: validation.cleanEmail,
        name: '',
        company: '',
        role: '',
        isValid: true,
        status: 'pending',
      });
    }
  }

  // Fallback check with regex for free-flowing text
  if (recipients.length === 0) {
    const matches = rawInput.match(GLOBAL_EMAIL_REGEX);
    if (matches) {
      for (const rawMatch of matches) {
        const validation = validateEmailDetailed(rawMatch);
        if (validation.isValid && !seenEmails.has(validation.cleanEmail)) {
          seenEmails.add(validation.cleanEmail);
          recipients.push({
            id: `rcp_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
            email: validation.cleanEmail,
            name: '',
            company: '',
            role: '',
            isValid: true,
            status: 'pending',
          });
        }
      }
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
