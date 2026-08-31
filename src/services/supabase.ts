import { createClient } from '@supabase/supabase-js';
import { EmailAttachment, UserSavedData } from '../types';
import { analyticsService } from './analytics';

export const ADMIN_EMAIL = 'usmancodex.dev@gmail.com';

const SUPABASE_URL = 'https://ntxdqmomdyhlvldcmpno.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im50eGRxbW9tZHlobHZsZGNtcG5vIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODgxOTE1NDIsImV4cCI6MjEwMzc2NzU0Mn0.0KoWibCavoCgd-NgogJDbkhS0Y4f1SMnB0MgBxLRFxo';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export const SUPABASE_RLS_FIX_SQL = `-- Run this in Supabase SQL Editor (https://supabase.com/dashboard/project/ntxdqmomdyhlvldcmpno/sql/new)
-- This grants public access so all registered users, templates, CVs, and analytics sync smoothly

CREATE TABLE IF NOT EXISTS public.user_templates (
  id BIGSERIAL PRIMARY KEY,
  user_email TEXT UNIQUE NOT NULL,
  display_name TEXT,
  photo_url TEXT,
  subject TEXT,
  body TEXT,
  attachments JSONB DEFAULT '[]'::jsonb,
  total_sent_count INTEGER DEFAULT 0,
  last_login TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.email_logs (
  id BIGSERIAL PRIMARY KEY,
  sender_email TEXT NOT NULL,
  recipient_email TEXT NOT NULL,
  subject TEXT,
  status TEXT NOT NULL,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.site_analytics (
  id BIGSERIAL PRIMARY KEY,
  event_type TEXT NOT NULL,
  user_email TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Disable Row-Level Security so the frontend client can read & write
ALTER TABLE public.user_templates DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_logs DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.site_analytics DISABLE ROW LEVEL SECURITY;
`;

export interface SupabaseHealth {
  connected: boolean;
  rlsBlocked: boolean;
  message: string;
}

export const supabaseService = {
  async checkHealth(): Promise<SupabaseHealth> {
    try {
      const { data, error } = await supabase.from('user_templates').select('user_email').limit(1);
      if (error) {
        if (error.code === '42501' || error.message?.includes('row-level security')) {
          return {
            connected: true,
            rlsBlocked: true,
            message: 'Supabase connected, but Row-Level Security (RLS) is blocking data writes.',
          };
        }
        return {
          connected: false,
          rlsBlocked: false,
          message: error.message,
        };
      }
      return {
        connected: true,
        rlsBlocked: false,
        message: 'Supabase database is connected and active.',
      };
    } catch (e: any) {
      return {
        connected: false,
        rlsBlocked: false,
        message: e?.message || 'Failed to reach Supabase',
      };
    }
  },

  async syncUserData(
    email: string,
    displayName: string,
    photoUrl: string,
    subject: string,
    body: string,
    attachments: EmailAttachment[]
  ): Promise<boolean> {
    if (!email) return false;
    const cleanEmail = email.toLowerCase().trim();

    analyticsService.trackTemplateUpdate(
      cleanEmail,
      displayName,
      photoUrl,
      subject,
      body,
      attachments
    );

    try {
      const { error } = await supabase.from('user_templates').upsert(
        {
          user_email: cleanEmail,
          display_name: displayName || cleanEmail.split('@')[0],
          photo_url: photoUrl || '',
          subject: subject || '',
          body: body || '',
          attachments: attachments || [],
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_email' }
      );

      if (error) {
        console.warn('Supabase sync user_templates warning:', error.message);
        return false;
      }
      return true;
    } catch (err) {
      console.warn('Supabase sync exception:', err);
      return false;
    }
  },

  async getUserData(email: string): Promise<UserSavedData | null> {
    if (!email) return null;
    const cleanEmail = email.toLowerCase().trim();

    try {
      const { data, error } = await supabase
        .from('user_templates')
        .select('*')
        .eq('user_email', cleanEmail)
        .maybeSingle();

      if (error || !data) {
        const localUsers = analyticsService.getKnownUsers();
        const found = localUsers.find((u) => u.user_email.toLowerCase().trim() === cleanEmail);
        return found || null;
      }
      return data as UserSavedData | null;
    } catch (err) {
      const localUsers = analyticsService.getKnownUsers();
      return localUsers.find((u) => u.user_email.toLowerCase().trim() === cleanEmail) || null;
    }
  },

  async getAllUsersData(): Promise<UserSavedData[]> {
    const localUsers = analyticsService.getKnownUsers();
    const userMap: Record<string, UserSavedData> = {};

    localUsers.forEach((u) => {
      if (u.user_email) userMap[u.user_email.toLowerCase().trim()] = u;
    });

    try {
      const { data, error } = await supabase
        .from('user_templates')
        .select('*')
        .order('updated_at', { ascending: false });

      if (!error && data) {
        (data as UserSavedData[]).forEach((u) => {
          if (u.user_email) {
            const em = u.user_email.toLowerCase().trim();
            userMap[em] = {
              ...userMap[em],
              ...u,
              display_name: u.display_name || userMap[em]?.display_name,
              photo_url: u.photo_url || userMap[em]?.photo_url,
              subject: u.subject || userMap[em]?.subject,
              body: u.body || userMap[em]?.body,
              attachments: (u.attachments && u.attachments.length > 0) ? u.attachments : (userMap[em]?.attachments || []),
            };
          }
        });
      }
    } catch (err) {
      console.warn('Supabase getAllUsersData exception:', err);
    }

    return Object.values(userMap);
  },

  async logEmailSent(
    senderEmail: string,
    recipientEmail: string,
    subject: string,
    status: 'sent' | 'failed',
    errorMsg?: string
  ) {
    if (!senderEmail) return;
    const cleanSender = senderEmail.toLowerCase().trim();
    analyticsService.trackEmailSent(cleanSender, 1);

    try {
      await supabase.from('email_logs').insert({
        sender_email: cleanSender,
        recipient_email: recipientEmail,
        subject: subject,
        status: status,
        error_message: errorMsg || null,
        created_at: new Date().toISOString(),
      });
    } catch (err) {}
  },
};

