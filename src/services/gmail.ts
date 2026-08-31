import { EmailAttachment } from '../types';

interface SendEmailParams {
  to: string;
  fromName?: string;
  fromEmail?: string;
  subject: string;
  body: string;
  attachments?: EmailAttachment[];
  isHtml?: boolean;
}

/**
 * Encodes a UTF-8 string into RFC 4648 URL-safe Base64 for the Gmail API
 */
function encodeBase64Url(str: string): string {
  const bytes = new TextEncoder().encode(str);
  let binary = '';
  const len = bytes.byteLength;
  const CHUNK_SIZE = 8192;
  for (let i = 0; i < len; i += CHUNK_SIZE) {
    const chunk = bytes.subarray(i, Math.min(i + CHUNK_SIZE, len));
    binary += String.fromCharCode.apply(null, Array.from(chunk));
  }
  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

/**
 * Encodes header values (like Subject or From Name) using MIME Q/B-encoding (RFC 2047)
 */
function encodeMimeHeader(text: string): string {
  if (!text) return '';
  // If ASCII only and no special characters, return as is
  if (/^[\x20-\x7E]+$/.test(text) && !/[;="?]/.test(text)) {
    return text;
  }
  const bytes = new TextEncoder().encode(text);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return `=?UTF-8?B?${btoa(binary)}?=`;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Builds a valid RFC 2822 / RFC 2046 MIME message
 */
function buildMimeMessage({
  to,
  fromName,
  fromEmail,
  subject,
  body,
  attachments = [],
}: SendEmailParams): string {
  const CRLF = '\r\n';
  const boundary = `----=_Part_Mix_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  const altBoundary = `----=_Part_Alt_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

  // Build clean sender header
  let fromHeader = '';
  if (fromEmail) {
    if (fromName) {
      fromHeader = `From: ${encodeMimeHeader(fromName)} <${fromEmail}>`;
    } else {
      fromHeader = `From: <${fromEmail}>`;
    }
  }

  // Format HTML body with clean paragraph tags
  const htmlContent = body
    .split('\n')
    .map((line) => (line.trim() === '' ? '<br/>' : `<p style="margin: 0 0 12px 0; line-height: 1.6; color: #1e293b;">${escapeHtml(line)}</p>`))
    .join('');

  const fullHtml = `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 15px; color: #1e293b; background-color: #ffffff; margin: 0; padding: 16px;">
<div style="max-width: 680px; margin: 0 auto;">
${htmlContent}
</div>
</body>
</html>`;

  const headers: string[] = [
    `To: ${to}`,
    fromHeader,
    `Subject: ${encodeMimeHeader(subject)}`,
    'MIME-Version: 1.0',
  ].filter(Boolean);

  if (attachments.length === 0) {
    // Single / Alternative message without attachments
    headers.push(`Content-Type: multipart/alternative; boundary="${altBoundary}"`);

    const parts = [
      headers.join(CRLF),
      '',
      `--${altBoundary}`,
      'Content-Type: text/plain; charset="UTF-8"',
      'Content-Transfer-Encoding: 8bit',
      '',
      body,
      `--${altBoundary}`,
      'Content-Type: text/html; charset="UTF-8"',
      'Content-Transfer-Encoding: 8bit',
      '',
      fullHtml,
      `--${altBoundary}--`,
      '',
    ];
    return parts.join(CRLF);
  }

  // Multipart/mixed message WITH attachments
  headers.push(`Content-Type: multipart/mixed; boundary="${boundary}"`);

  let message = headers.join(CRLF) + CRLF + CRLF;

  // 1. First part: Text and HTML alternative body
  message += `--${boundary}${CRLF}`;
  message += `Content-Type: multipart/alternative; boundary="${altBoundary}"${CRLF}${CRLF}`;
  
  message += `--${altBoundary}${CRLF}`;
  message += `Content-Type: text/plain; charset="UTF-8"${CRLF}`;
  message += `Content-Transfer-Encoding: 8bit${CRLF}${CRLF}`;
  message += `${body}${CRLF}${CRLF}`;

  message += `--${altBoundary}${CRLF}`;
  message += `Content-Type: text/html; charset="UTF-8"${CRLF}`;
  message += `Content-Transfer-Encoding: 8bit${CRLF}${CRLF}`;
  message += `${fullHtml}${CRLF}${CRLF}`;
  
  message += `--${altBoundary}--${CRLF}${CRLF}`;

  // 2. Subsequent parts: Attachments
  for (const file of attachments) {
    let cleanBase64 = file.dataBase64 || '';
    if (cleanBase64.includes(',')) {
      cleanBase64 = cleanBase64.split(',')[1];
    }
    // Remove any newlines from base64
    cleanBase64 = cleanBase64.replace(/[\r\n\s]/g, '');

    // Break base64 into 76-char RFC compliant chunks
    const chunkedBase64 = cleanBase64.match(/.{1,76}/g)?.join(CRLF) || cleanBase64;

    const mimeType = file.type || 'application/octet-stream';
    const safeFileName = file.name.replace(/["\r\n]/g, '_');

    message += `--${boundary}${CRLF}`;
    message += `Content-Type: ${mimeType}; name="${safeFileName}"${CRLF}`;
    message += `Content-Disposition: attachment; filename="${safeFileName}"${CRLF}`;
    message += `Content-Transfer-Encoding: base64${CRLF}${CRLF}`;
    message += `${chunkedBase64}${CRLF}${CRLF}`;
  }

  message += `--${boundary}--${CRLF}`;
  return message;
}

export async function sendGmailMessage(
  accessToken: string,
  params: SendEmailParams
): Promise<{ id: string; threadId: string }> {
  // Support Sandbox Demo Mode
  if (accessToken === 'demo-sandbox-token') {
    await new Promise((res) => setTimeout(res, 600));
    return {
      id: `demo_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
      threadId: `thread_${Date.now()}`,
    };
  }

  const rawMime = buildMimeMessage(params);
  const rawBase64Url = encodeBase64Url(rawMime);

  const response = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      raw: rawBase64Url,
    }),
  });

  if (!response.ok) {
    let errorDetail = `Gmail API error (status: ${response.status})`;
    try {
      const errJson = await response.json();
      if (errJson?.error?.message) {
        errorDetail = errJson.error.message;
      }
    } catch {
      // Keep default
    }

    if (response.status === 401) {
      throw new Error('Authentication expired or unauthorized. Please re-authenticate your Google account.');
    } else if (response.status === 429) {
      throw new Error(`Gmail API rate limit exceeded: ${errorDetail}. Sequence will throttle.`);
    } else if (response.status === 403) {
      const lower = errorDetail.toLowerCase();
      if (lower.includes('not been used') || lower.includes('disabled') || lower.includes('accessnotconfigured')) {
        throw new Error('Gmail API is not enabled in your Google Cloud Project (mail-sender-cafbf). Please enable it in Google Cloud Console.');
      }
      if (lower.includes('insufficient') || lower.includes('scope') || lower.includes('permission_denied')) {
        throw new Error('Missing "Send emails on your behalf" permission. Please sign out and sign in again, checking all permission boxes.');
      }
      throw new Error(`Permission denied or quota exceeded: ${errorDetail}`);
    }
    throw new Error(errorDetail);
  }

  return response.json();
}

export async function getGmailUserProfile(accessToken: string): Promise<{
  emailAddress: string;
  messagesTotal: number;
  threadsTotal: number;
  historyId: string;
}> {
  if (accessToken === 'demo-sandbox-token') {
    return {
      emailAddress: 'demo.applicant@gmail.com',
      messagesTotal: 120,
      threadsTotal: 45,
      historyId: 'demo-history-1',
    };
  }

  const response = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/profile', {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch Gmail profile: ${response.statusText}`);
  }

  return response.json();
}
