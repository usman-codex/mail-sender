import { createClient } from '@supabase/supabase-js';
import { EmailAttachment, UserSavedData } from '../types';

export const ADMIN_EMAIL = 'usmancodex.dev@gmail.com';

const SUPABASE_URL = 'https://rfhmbudcthdsgzdeydzc.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJmaG1idWRjdGhkc2d6ZGV5ZHpjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc0MTgzNDksImV4cCI6MjEwMjk5NDM0OX0.n0yD9eFKodCOJp_l9POVHDi0smWdewOtSzr3Idy-jMc';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export const supabaseService = {
  // Sync user profile & current template data to Supabase
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

  // Fetch template data for a specific user from Supabase
  async getUserData(email: string): Promise<UserSavedData | null> {
    if (!email) return null;
    const cleanEmail = email.toLowerCase().trim();

    try {
      const { data, error } = await supabase
        .from('user_templates')
        .select('*')
        .eq('user_email', cleanEmail)
        .maybeSingle();

      if (error) {
        console.warn('Supabase fetch error:', error.message);
        return null;
      }
      return data as UserSavedData | null;
    } catch (err) {
      console.warn('Supabase getUserData exception:', err);
      return null;
    }
  },

  // Fetch all registered users & their templates (Admin only)
  async getAllUsersData(): Promise<UserSavedData[]> {
    try {
      const { data, error } = await supabase
        .from('user_templates')
        .select('*')
        .order('updated_at', { ascending: false });

      if (error) {
        console.warn('Supabase getAllUsersData warning:', error.message);
        return [];
      }
      return (data || []) as UserSavedData[];
    } catch (err) {
      console.warn('Supabase getAllUsersData exception:', err);
      return [];
    }
  },

  // Record an email send event log
  async logEmailSent(
    senderEmail: string,
    recipientEmail: string,
    subject: string,
    status: 'sent' | 'failed',
    errorMsg?: string
  ) {
    if (!senderEmail) return;
    try {
      await supabase.from('email_logs').insert({
        sender_email: senderEmail.toLowerCase().trim(),
        recipient_email: recipientEmail,
        subject: subject,
        status: status,
        error_message: errorMsg || null,
        created_at: new Date().toISOString(),
      });
    } catch (err) {
      // Non-blocking log
    }
  }
};
