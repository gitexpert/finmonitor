import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

interface NotificationSettings {
  user_id: string;
  in_app_notifications: boolean;
  sms_urgent: boolean;
  email_digest: boolean;
  email_address: string | null;
  phone_number: string | null;
  phone_verified: boolean;
  email_verified: boolean;
  digest_frequency: string;
  alert_threshold_high: string;
  alert_threshold_medium: string;
  alert_threshold_low: string;
  notify_on_volatile: boolean;
  notify_on_opportunity: boolean;
  notify_on_target: boolean;
  notify_on_entry: boolean;
  quiet_hours_start: string;
  quiet_hours_end: string;
  timezone: string;
}

interface Insight {
  id: string;
  user_id: string;
  ticker: string;
  type: string;
  title: string;
  message: string;
  severity: string;
  is_read: boolean;
  action_required: boolean;
  created_at: string;
}

interface PendingNotification {
  id: string;
  user_id: string;
  insight_id: string;
  channel: string;
  status: string;
}

// Mock stock price data
const MOCK_PRICES: Record<string, number> = {
  NVDA: 875.42,
  MU: 156.78,
  RKLB: 5.89,
  VRT: 52.32,
  AMD: 167.45,
  PLTR: 26.78,
  SOFI: 7.45,
  COIN: 234.56,
  TSLA: 245.67,
  AAPL: 178.23,
  MSFT: 423.89,
  META: 502.34,
};

// Format phone number for Twilio
function formatPhoneNumber(phone: string): string {
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.length === 10) {
    return `+1${cleaned}`;
  } else if (cleaned.length === 11 && cleaned.startsWith('1')) {
    return `+${cleaned}`;
  }
  return `+1${cleaned}`;
}

// Check if current time is within quiet hours
function isInQuietHours(startTime: string, endTime: string, timezone: string): boolean {
  try {
    const now = new Date();
    const options: Intl.DateTimeFormatOptions = {
      timeZone: timezone,
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    };
    const currentTime = now.toLocaleTimeString('en-US', options);
    const currentMinutes = parseInt(currentTime.split(':')[0]) * 60 + parseInt(currentTime.split(':')[1]);

    const [startHour, startMin] = startTime.split(':').map(Number);
    const [endHour, endMin] = endTime.split(':').map(Number);
    const startMinutes = startHour * 60 + startMin;
    const endMinutes = endHour * 60 + endMin;

    if (startMinutes < endMinutes) {
      return currentMinutes >= startMinutes && currentMinutes < endMinutes;
    } else {
      return currentMinutes >= startMinutes || currentMinutes < endMinutes;
    }
  } catch {
    return false;
  }
}

// Send email via Resend (mock for demo)
async function sendEmail(
  to: string,
  subject: string,
  htmlContent: string,
  textContent: string
): Promise<{ success: boolean; error?: string }> {
  const resendApiKey = Deno.env.get('RESEND_API_KEY');
  const fromEmail = Deno.env.get('RESEND_FROM_EMAIL') || 'alerts@alpha-1.io';

  if (!resendApiKey) {
    console.log(`[MOCK EMAIL] To: ${to}, Subject: ${subject}`);
    return { success: true };
  }

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: fromEmail,
        to: to,
        subject: subject,
        html: htmlContent,
        text: textContent,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('Resend error:', error);
      return { success: false, error };
    }

    console.log('Email sent successfully to:', to);
    return { success: true };
  } catch (err) {
    console.error('Email send error:', err);
    return { success: false, error: err.message };
  }
}

// Send SMS via Twilio (mock for demo)
async function sendSMS(
  to: string,
  message: string
): Promise<{ success: boolean; error?: string }> {
  const twilioAccountSid = Deno.env.get('TWILIO_ACCOUNT_SID');
  const twilioAuthToken = Deno.env.get('TWILIO_AUTH_TOKEN');
  const twilioFromNumber = Deno.env.get('TWILIO_FROM_NUMBER');

  if (!twilioAccountSid || !twilioAuthToken || !twilioFromNumber) {
    console.log(`[MOCK SMS] To: ${to}, Message: ${message}`);
    return { success: true };
  }

  try {
    const url = `https://api.twilio.com/2010-04-01/Accounts/${twilioAccountSid}/Messages.json`;
    const auth = btoa(`${twilioAccountSid}:${twilioAuthToken}`);

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        From: twilioFromNumber,
        To: formatPhoneNumber(to),
        Body: message,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('Twilio error:', error);
      return { success: false, error };
    }

    console.log('SMS sent successfully to:', to);
    return { success: true };
  } catch (err) {
    console.error('SMS send error:', err);
    return { success: false, error: err.message };
  }
}

// Build notification message content
function buildNotificationMessage(insight: Insight): { subject: string; body: string; html: string } {
  const ticker = insight.ticker;
  const currentPrice = MOCK_PRICES[ticker];
  const time = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

  const emojis: Record<string, string> = {
    alert: '🚨',
    opportunity: '📈',
    volatility: '📊',
    target: '🎯',
    earnings: '💵',
  };

  const emoji = emojis[insight.type] || '📱';
  const subject = `${emoji} Alpha-1 Alert: ${ticker} - ${insight.title}`;

  const body = `${emoji} ${insight.title}

Ticker: ${ticker}
${currentPrice ? `Current Price: $${currentPrice.toFixed(2)}` : ''}

${insight.message}

${insight.action_required ? '⚠️ Action Required!' : ''}

Sent at ${time} via Alpha-1 Portfolio Monitor
`;

  const html = `
    <div style="font-family: system-ui, -apple-system, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px; background: linear-gradient(180deg, #0f172a 0%, #1e293b 100%); border-radius: 12px;">
      <div style="text-align: center; margin-bottom: 24px;">
        <div style="display: inline-block; padding: 12px; background: ${insight.severity === 'high' ? 'rgba(239, 68, 68, 0.2)' : insight.severity === 'medium' ? 'rgba(251, 191, 36, 0.2)' : 'rgba(16, 185, 129, 0.2)'}; border-radius: 12px; margin-bottom: 12px;">
          <span style="font-size: 32px;">${emoji}</span>
        </div>
        <h1 style="color: white; margin: 0; font-size: 20px; font-weight: 600;">${insight.title}</h1>
        <p style="color: ${insight.severity === 'high' ? '#ef4444' : insight.severity === 'medium' ? '#fbbf24' : '#10b981'}; margin: 8px 0 0; text-transform: uppercase; letter-spacing: 0.05em; font-size: 12px;">
          ${insight.severity} priority • ${insight.type}
        </p>
      </div>

      <div style="background: rgba(255,255,255,0.05); border-radius: 8px; padding: 16px; margin-bottom: 16px;">
        <p style="color: white; margin: 0; display: flex;">
          <span style="font-family: 'Courier New', monospace; font-size: 18px; font-weight: 700; margin-right: 12px;">${ticker}</span>
          ${currentPrice ? `<span style="color: #94a3b8;"> current: $${currentPrice.toFixed(2)}</span>` : ''}
        </p>
      </div>

      <p style="color: #e2e8f0; line-height: 1.6; margin: 0 0 16px;">
        ${insight.message}
      </p>

      ${insight.action_required ? `
        <div style="background: rgba(251, 191, 36, 0.1); border: 1px solid rgba(251, 191, 36, 0.3); border-radius: 8px; padding: 12px; margin-bottom: 16px;">
          <p style="color: #fbbf24; margin: 0; font-size: 14px;">
            ⚠️ Action Required - Review your position or setup
          </p>
        </div>
      ` : ''}

      <div style="border-top: 1px solid rgba(255,255,255,0.1); padding-top: 16px; margin-top: 24px;">
        <p style="color: #64748b; font-size: 12px; margin: 0; text-align: center;">
          Sent at ${time} via Alpha-1 Portfolio Monitor
          <br/>
          <a href="https://alpha-1.io/settings/notifications" style="color: #6366f1;">Manage notification preferences</a>
        </p>
      </div>
    </div>
  `;

  return { subject, body, html };
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    console.log('Starting notification worker...');

    // Get pending notification logs
    const { data: pendingLogs, error: logError } = await supabase
      .from('notification_logs')
      .select('id, user_id, insight_id, channel, status')
      .eq('status', 'pending')
      .limit(100);

    if (logError) {
      throw logError;
    }

    if (!pendingLogs || pendingLogs.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          message: 'No pending notifications',
          processed: 0,
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const results = {
      processed: 0,
      sent: 0,
      failed: 0,
      skipped: 0,
    };

    // Process each pending notification
    for (const log of pendingLogs as PendingNotification[]) {
      console.log(`Processing notification ${log.id} for insight ${log.insight_id}`);

      // Get the insight
      const { data: insight, error: insightError } = await supabase
        .from('ai_insights')
        .select('*')
        .eq('id', log.insight_id)
        .single();

      if (insightError || !insight) {
        console.error('Error fetching insight:', insightError);
        await supabase
          .from('notification_logs')
          .update({ status: 'failed', error_message: 'Insight not found' })
          .eq('id', log.id);
        results.failed++;
        continue;
      }

      const insightData = insight as Insight;

      // Already read, skip notification
      if (insightData.is_read) {
        await supabase
          .from('notification_logs')
          .update({ status: 'sent', sent_at: new Date().toISOString() })
          .eq('id', log.id);
        results.skipped++;
        continue;
      }

      // Get notification settings
      const { data: settings } = await supabase
        .from('notification_settings')
        .select('*')
        .eq('user_id', log.user_id)
        .single<NotificationSettings>();

      const notificationSettings = settings || {
        sms_urgent: false,
        email_digest: false,
        email_address: null,
        phone_number: null,
        phone_verified: false,
        email_verified: false,
        quiet_hours_start: '22:00',
        quiet_hours_end: '07:00',
        timezone: 'America/New_York',
      };

      // Check quiet hours
      const isQuiet = isInQuietHours(
        notificationSettings.quiet_hours_start,
        notificationSettings.quiet_hours_end,
        notificationSettings.timezone
      );

      if (isQuiet) {
        console.log('Skipping - within quiet hours');
        results.skipped++;
        continue;
      }

      const { subject, body, html } = buildNotificationMessage(insightData);
      let sendResult = { success: true };

      // Send appropriate notification based on settings and insight severity
      if (insightData.severity === 'high' && notificationSettings.sms_urgent && notificationSettings.phone_number) {
        console.log('Sending SMS for high severity alert');
        sendResult = await sendSMS(notificationSettings.phone_number, body);
      } else if (notificationSettings.email_digest && notificationSettings.email_address) {
        console.log('Sending email notification');
        sendResult = await sendEmail(
          notificationSettings.email_address,
          subject,
          html,
          body
        );
      }

      // Update notification log
      await supabase
        .from('notification_logs')
        .update({
          status: sendResult.success ? 'sent' : 'failed',
          sent_at: sendResult.success ? new Date().toISOString() : null,
          error_message: sendResult.error || null,
        })
        .eq('id', log.id);

      if (sendResult.success) {
        results.sent++;
      } else {
        results.failed++;
      }

      results.processed++;
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Notification worker completed',
        results,
        timestamp: new Date().toISOString(),
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Notification worker error:', error);

    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'An unexpected error occurred',
        timestamp: new Date().toISOString(),
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
