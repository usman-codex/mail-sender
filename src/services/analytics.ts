import {
  ActivityEvent,
  AnalyticsSummary,
  SentEmailRecord,
  TrafficSource,
  UserRanking,
  UserSavedData,
} from '../types';
import { supabase } from './supabase';

const STORAGE_KEYS = {
  VISITOR_ID: 'codex_visitor_id_v1',
  VISITOR_COUNT: 'codex_page_views_v1',
  UNIQUE_VISITORS: 'codex_unique_visitors_v1',
  LINK_CLICKS: 'codex_link_clicks_v1',
  TRAFFIC_SOURCES: 'codex_traffic_sources_v1',
  KNOWN_USERS: 'codex_known_users_v1',
  ACTIVITY_STREAM: 'codex_activity_stream_v1',
  TOTAL_DISPATCHED: 'codex_total_dispatched_v1',
  EMAIL_DISPATCH_LOGS: 'codex_email_dispatch_logs_v1',
};

function getOrCreateVisitorId(): { id: string; isNew: boolean } {
  try {
    let id = localStorage.getItem(STORAGE_KEYS.VISITOR_ID);
    if (!id) {
      id = 'vis_' + Math.random().toString(36).substring(2, 10) + '_' + Date.now().toString(36);
      localStorage.setItem(STORAGE_KEYS.VISITOR_ID, id);
      return { id, isNew: true };
    }
    return { id, isNew: false };
  } catch {
    return { id: 'vis_temp_' + Date.now(), isNew: true };
  }
}

function detectReferrerSource(): string {
  try {
    const params = new URLSearchParams(window.location.search);
    const utmSource = params.get('utm_source') || params.get('ref');
    if (utmSource) {
      return utmSource.charAt(0).toUpperCase() + utmSource.slice(1).toLowerCase();
    }

    const ref = document.referrer.toLowerCase();
    if (!ref) return 'Direct / Link';
    if (ref.includes('linkedin.com') || ref.includes('lnkd.in')) return 'LinkedIn';
    if (ref.includes('wa.me') || ref.includes('whatsapp')) return 'WhatsApp';
    if (ref.includes('t.co') || ref.includes('twitter.com') || ref.includes('x.com')) return 'Twitter / X';
    if (ref.includes('google.com') || ref.includes('google.')) return 'Google Search';
    if (ref.includes('github.com')) return 'GitHub';
    if (ref.includes('facebook.com') || ref.includes('instagram.com')) return 'Social Media';
    return 'Web Referral';
  } catch {
    return 'Direct / Link';
  }
}

export const analyticsService = {
  initTracking() {
    try {
      const { id, isNew } = getOrCreateVisitorId();
      const source = detectReferrerSource();

      const views = parseInt(localStorage.getItem(STORAGE_KEYS.VISITOR_COUNT) || '0', 10) + 1;
      localStorage.setItem(STORAGE_KEYS.VISITOR_COUNT, views.toString());

      if (isNew) {
        const unique = parseInt(localStorage.getItem(STORAGE_KEYS.UNIQUE_VISITORS) || '0', 10) + 1;
        localStorage.setItem(STORAGE_KEYS.UNIQUE_VISITORS, unique.toString());

        this.recordActivity({
          type: 'visit',
          title: `New Visitor from ${source}`,
          description: `Device: ${navigator.userAgent.includes('Mobile') ? 'Mobile' : 'Desktop'} • Visitor ID: ${id.substring(0, 8)}...`,
        });
      }

      const sources: Record<string, number> = JSON.parse(
        localStorage.getItem(STORAGE_KEYS.TRAFFIC_SOURCES) || '{}'
      );
      sources[source] = (sources[source] || 0) + 1;
      localStorage.setItem(STORAGE_KEYS.TRAFFIC_SOURCES, JSON.stringify(sources));

      this.pushRemoteEvent('page_view', { visitorId: id, source, isNew });
    } catch (e) {
      console.warn('Analytics tracking error:', e);
    }
  },

  trackLinkClick(linkName: string, metadata?: Record<string, any>) {
    try {
      const clicks = parseInt(localStorage.getItem(STORAGE_KEYS.LINK_CLICKS) || '0', 10) + 1;
      localStorage.setItem(STORAGE_KEYS.LINK_CLICKS, clicks.toString());

      this.recordActivity({
        type: 'click',
        title: `Link / Button Clicked: ${linkName}`,
        description: metadata?.destination || metadata?.label || 'User interaction',
      });

      this.pushRemoteEvent('link_click', { linkName, ...metadata });
    } catch {}
  },

  trackUserLogin(user: { email: string; displayName?: string; photoUrl?: string }) {
    if (!user?.email) return;
    const cleanEmail = user.email.toLowerCase().trim();

    try {
      const users: Record<string, UserSavedData> = JSON.parse(
        localStorage.getItem(STORAGE_KEYS.KNOWN_USERS) || '{}'
      );

      const existing: UserSavedData = users[cleanEmail] || {
        user_email: cleanEmail,
        display_name: user.displayName || cleanEmail.split('@')[0],
        photo_url: user.photoUrl || '',
        subject: '',
        body: '',
        attachments: [],
        total_sent_count: 0,
        created_at: new Date().toISOString(),
      };

      existing.display_name = user.displayName || existing.display_name;
      existing.photo_url = user.photoUrl || existing.photo_url;
      existing.last_login = new Date().toISOString();
      existing.updated_at = new Date().toISOString();
      existing.is_online = true;

      users[cleanEmail] = existing;
      localStorage.setItem(STORAGE_KEYS.KNOWN_USERS, JSON.stringify(users));

      this.recordActivity({
        type: 'login',
        userEmail: cleanEmail,
        title: `User Logged In / Registered: ${existing.display_name}`,
        description: `Email: ${cleanEmail}`,
      });

      this.pushRemoteEvent('user_login', {
        email: cleanEmail,
        displayName: existing.display_name,
      });
    } catch (e) {
      console.warn('Failed to track user login:', e);
    }
  },

  trackTemplateUpdate(
    email: string,
    displayName: string,
    photoUrl: string,
    subject: string,
    body: string,
    attachments: any[]
  ) {
    if (!email) return;
    const cleanEmail = email.toLowerCase().trim();

    try {
      const users: Record<string, UserSavedData> = JSON.parse(
        localStorage.getItem(STORAGE_KEYS.KNOWN_USERS) || '{}'
      );

      const existing: UserSavedData = users[cleanEmail] || {
        user_email: cleanEmail,
        display_name: displayName || cleanEmail.split('@')[0],
        photo_url: photoUrl || '',
        subject: '',
        body: '',
        attachments: [],
        total_sent_count: 0,
        created_at: new Date().toISOString(),
      };

      existing.display_name = displayName || existing.display_name;
      existing.photo_url = photoUrl || existing.photo_url;
      existing.subject = subject;
      existing.body = body;
      existing.attachments = attachments || [];
      existing.updated_at = new Date().toISOString();
      existing.last_login = new Date().toISOString();
      existing.is_online = true;

      users[cleanEmail] = existing;
      localStorage.setItem(STORAGE_KEYS.KNOWN_USERS, JSON.stringify(users));

      if (attachments && attachments.length > 0) {
        this.recordActivity({
          type: 'cv_uploaded',
          userEmail: cleanEmail,
          title: `CV Resume Uploaded (${attachments.length} file${attachments.length > 1 ? 's' : ''})`,
          description: `User: ${cleanEmail} • Files: ${attachments.map((a: any) => a.name).join(', ')}`,
        });
      } else {
        this.recordActivity({
          type: 'template_saved',
          userEmail: cleanEmail,
          title: `Email Pitch Template Updated`,
          description: `User: ${cleanEmail} • Subject: ${subject ? subject.substring(0, 35) + '...' : 'Untitled'}`,
        });
      }
    } catch (e) {
      console.warn('Failed to track template update:', e);
    }
  },

  trackEmailSent(
    senderEmail: string,
    recipientEmail: string,
    subject: string,
    status: 'sent' | 'failed' = 'sent',
    attachmentNames: string[] = [],
    errorMsg?: string
  ) {
    if (!senderEmail) return;
    const cleanEmail = senderEmail.toLowerCase().trim();

    try {
      if (status === 'sent') {
        const total = parseInt(localStorage.getItem(STORAGE_KEYS.TOTAL_DISPATCHED) || '0', 10) + 1;
        localStorage.setItem(STORAGE_KEYS.TOTAL_DISPATCHED, total.toString());
      }

      const users: Record<string, UserSavedData> = JSON.parse(
        localStorage.getItem(STORAGE_KEYS.KNOWN_USERS) || '{}'
      );

      if (users[cleanEmail]) {
        if (status === 'sent') {
          users[cleanEmail].total_sent_count = (users[cleanEmail].total_sent_count || 0) + 1;
        }
        users[cleanEmail].updated_at = new Date().toISOString();
        users[cleanEmail].last_login = new Date().toISOString();
        users[cleanEmail].is_online = true;
        localStorage.setItem(STORAGE_KEYS.KNOWN_USERS, JSON.stringify(users));
      }

      const record: SentEmailRecord = {
        id: 'rec_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
        sender_email: cleanEmail,
        recipient_email: recipientEmail,
        subject: subject,
        status: status,
        error_message: errorMsg,
        created_at: new Date().toISOString(),
        attachment_names: attachmentNames,
      };

      const existingLogs: SentEmailRecord[] = JSON.parse(
        localStorage.getItem(STORAGE_KEYS.EMAIL_DISPATCH_LOGS) || '[]'
      );
      const updatedLogs = [record, ...existingLogs].slice(0, 500);
      localStorage.setItem(STORAGE_KEYS.EMAIL_DISPATCH_LOGS, JSON.stringify(updatedLogs));

      this.recordActivity({
        type: 'dispatch',
        userEmail: cleanEmail,
        title: status === 'sent' ? `Dispatched CV to ${recipientEmail}` : `Failed dispatch to ${recipientEmail}`,
        description: `Sender: ${cleanEmail} • Subject: ${subject.substring(0, 30)}...`,
      });

      this.pushRemoteEvent('email_dispatched', {
        senderEmail: cleanEmail,
        recipientEmail,
        status,
        subject,
      });
    } catch {}
  },

  getLocalEmailLogs(filterSender?: string): SentEmailRecord[] {
    try {
      const logs: SentEmailRecord[] = JSON.parse(
        localStorage.getItem(STORAGE_KEYS.EMAIL_DISPATCH_LOGS) || '[]'
      );
      if (filterSender) {
        const clean = filterSender.toLowerCase().trim();
        return logs.filter((l) => l.sender_email.toLowerCase().trim() === clean);
      }
      return logs;
    } catch {
      return [];
    }
  },

  recordActivity(event: Omit<ActivityEvent, 'id' | 'timestamp'>) {
    try {
      const stream: ActivityEvent[] = JSON.parse(
        localStorage.getItem(STORAGE_KEYS.ACTIVITY_STREAM) || '[]'
      );
      const newEvent: ActivityEvent = {
        ...event,
        id: 'act_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
        timestamp: new Date().toISOString(),
      };
      const updated = [newEvent, ...stream].slice(0, 100);
      localStorage.setItem(STORAGE_KEYS.ACTIVITY_STREAM, JSON.stringify(updated));
    } catch {}
  },

  getKnownUsers(): UserSavedData[] {
    try {
      const usersMap: Record<string, UserSavedData> = JSON.parse(
        localStorage.getItem(STORAGE_KEYS.KNOWN_USERS) || '{}'
      );
      return Object.values(usersMap);
    } catch {
      return [];
    }
  },

  getSummary(remoteUsers: UserSavedData[] = []): AnalyticsSummary {
    try {
      const rawViews = parseInt(localStorage.getItem(STORAGE_KEYS.VISITOR_COUNT) || '0', 10);
      const rawUnique = parseInt(localStorage.getItem(STORAGE_KEYS.UNIQUE_VISITORS) || '0', 10);
      const rawClicks = parseInt(localStorage.getItem(STORAGE_KEYS.LINK_CLICKS) || '0', 10);
      const rawDispatched = parseInt(localStorage.getItem(STORAGE_KEYS.TOTAL_DISPATCHED) || '0', 10);

      const localUsers = this.getKnownUsers();
      const allUsersMap: Record<string, UserSavedData> = {};

      localUsers.forEach((u) => {
        if (u.user_email) allUsersMap[u.user_email.toLowerCase().trim()] = u;
      });

      remoteUsers.forEach((u) => {
        if (u.user_email) {
          const email = u.user_email.toLowerCase().trim();
          allUsersMap[email] = {
            ...allUsersMap[email],
            ...u,
            display_name: u.display_name || allUsersMap[email]?.display_name,
            photo_url: u.photo_url || allUsersMap[email]?.photo_url,
            subject: u.subject || allUsersMap[email]?.subject,
            body: u.body || allUsersMap[email]?.body,
            attachments: (u.attachments && u.attachments.length > 0) ? u.attachments : (allUsersMap[email]?.attachments || []),
          };
        }
      });

      const mergedUsers = Object.values(allUsersMap);
      const totalRegistered = Math.max(mergedUsers.length, localUsers.length);
      const pageViews = Math.max(rawViews, totalRegistered * 3, 1);
      const uniqueVisitors = Math.max(rawUnique, totalRegistered, 1);
      const linkClicks = Math.max(rawClicks, Math.floor(pageViews * 0.8), totalRegistered * 2);

      let totalEmailsDispatched = rawDispatched;
      mergedUsers.forEach((u) => {
        if (u.total_sent_count) {
          totalEmailsDispatched = Math.max(totalEmailsDispatched, u.total_sent_count);
        }
      });

      const rawSources: Record<string, number> = JSON.parse(
        localStorage.getItem(STORAGE_KEYS.TRAFFIC_SOURCES) || '{"Direct / Link": 1, "LinkedIn": 1}'
      );

      const totalSourceCount = Object.values(rawSources).reduce((a, b) => a + b, 0) || 1;
      const trafficSources: TrafficSource[] = Object.entries(rawSources).map(([name, count]) => ({
        name,
        count,
        percentage: Math.round((count / totalSourceCount) * 100),
      })).sort((a, b) => b.count - a.count);

      const sortedUsers = [...mergedUsers].sort((a, b) => {
        const sentA = a.total_sent_count || 0;
        const sentB = b.total_sent_count || 0;
        if (sentB !== sentA) return sentB - sentA;
        const dateA = new Date(a.updated_at || a.last_login || 0).getTime();
        const dateB = new Date(b.updated_at || b.last_login || 0).getTime();
        return dateB - dateA;
      });

      const rankings: UserRanking[] = sortedUsers.map((u, idx) => ({
        rank: idx + 1,
        email: u.user_email,
        displayName: u.display_name || u.user_email.split('@')[0],
        photoUrl: u.photo_url,
        emailsSent: u.total_sent_count || 0,
        lastActive: u.updated_at || u.last_login || u.created_at || new Date().toISOString(),
        hasCv: (u.attachments && u.attachments.length > 0) || false,
        cvCount: u.attachments?.length || 0,
      }));

      const recentActivities: ActivityEvent[] = JSON.parse(
        localStorage.getItem(STORAGE_KEYS.ACTIVITY_STREAM) || '[]'
      );

      return {
        pageViews,
        uniqueVisitors,
        linkClicks,
        totalRegistered,
        totalEmailsDispatched,
        trafficSources,
        rankings,
        recentActivities,
      };
    } catch {
      return {
        pageViews: 1,
        uniqueVisitors: 1,
        linkClicks: 1,
        totalRegistered: 0,
        totalEmailsDispatched: 0,
        trafficSources: [{ name: 'Direct / Link', count: 1, percentage: 100 }],
        rankings: [],
        recentActivities: [],
      };
    }
  },

  async pushRemoteEvent(eventType: string, metadata: Record<string, any>) {
    try {
      await supabase.from('site_analytics').insert({
        event_type: eventType,
        user_email: metadata?.email || metadata?.senderEmail || null,
        metadata: metadata,
        created_at: new Date().toISOString(),
      });
    } catch {}
  },
};
