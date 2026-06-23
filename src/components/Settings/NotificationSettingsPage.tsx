import { useState, useEffect } from 'react';
import { Bell, Clock, Save, RefreshCw, AlertTriangle, Info } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import type { DatabaseNotificationSettings } from '../../types/database';

const TIMEZONES = [
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'Europe/London',
  'Europe/Paris',
  'Asia/Tokyo',
  'Asia/Shanghai',
  'Australia/Sydney',
];

export default function NotificationSettingsPage() {
  const [settings, setSettings] = useState<DatabaseNotificationSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const fetchSettings = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const userId = (await supabase.auth.getUser()).data.user?.id;
      if (!userId) {
        setError('Not authenticated');
        return;
      }

      const { data, error: fetchError } = await supabase
        .from('notification_settings')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (fetchError) throw fetchError;

      if (!data) {
        // Create default settings if not found
        const { data: newSettings } = await supabase
          .from('notification_settings')
          .insert({ user_id: userId } as never)
          .select()
          .single();

        setSettings(newSettings);
      } else {
        setSettings(data);
      }
    } catch (err) {
      console.error('Error fetching notification settings:', err);
      setError('Failed to load notification settings');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleSave = async () => {
    if (!settings) return;

    setIsSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const { error: updateError } = await supabase
        .from('notification_settings')
        .update({
          in_app_notifications: settings.in_app_notifications,
          sms_urgent: settings.sms_urgent,
          email_digest: settings.email_digest,
          email_address: settings.email_address,
          phone_number: settings.phone_number,
          digest_frequency: settings.digest_frequency,
          digest_time: settings.digest_time,
          alert_threshold_high: settings.alert_threshold_high,
          alert_threshold_medium: settings.alert_threshold_medium,
          alert_threshold_low: settings.alert_threshold_low,
          notify_on_volatile: settings.notify_on_volatile,
          notify_on_opportunity: settings.notify_on_opportunity,
          notify_on_target: settings.notify_on_target,
          notify_on_entry: settings.notify_on_entry,
          quiet_hours_start: settings.quiet_hours_start,
          quiet_hours_end: settings.quiet_hours_end,
          timezone: settings.timezone,
        } as never)
        .eq('id', settings.id);

      if (updateError) throw updateError;

      setSuccess('Settings saved successfully!');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error('Error saving settings:', err);
      setError('Failed to save settings');
    } finally {
      setIsSaving(false);
    }
  };

  const updateSetting = <K extends keyof DatabaseNotificationSettings>(
    key: K,
    value: DatabaseNotificationSettings[K]
  ) => {
    setSettings((prev) => prev ? { ...prev, [key]: value } : null);
  };

  if (isLoading) {
    return (
      <div className="animate-pulse space-y-6">
        <div className="skeleton h-8 w-48 mb-2" />
        <div className="skeleton h-4 w-64 mb-6" />
        <div className="skeleton h-96 w-full rounded-xl" />
      </div>
    );
  }

  if (!settings) {
    return (
      <div className="text-center py-12">
        <p className="text-slate-400">Unable to load notification settings</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-white">Notification Settings</h1>
        <p className="text-slate-400 mt-1">Configure how and when you receive alerts</p>
      </div>

      {error && (
        <div className="p-4 bg-loss/10 border border-loss/30 rounded-xl text-loss">
          {error}
        </div>
      )}

      {success && (
        <div className="p-4 bg-gain/10 border border-gain/30 rounded-xl text-gain">
          {success}
        </div>
      )}

      {/* Delivery Channels */}
      <div className="glass-card p-6">
        <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <Bell className="w-5 h-5 text-accent" />
          Delivery Channels
        </h2>

        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 rounded-xl bg-slate-800/30">
            <div>
              <p className="font-medium text-white">In-App Notifications</p>
              <p className="text-sm text-slate-400">Show alerts in the application dashboard</p>
            </div>
            <button
              onClick={() => updateSetting('in_app_notifications', !settings.in_app_notifications)}
              className={`w-12 h-6 rounded-full transition-colors ${
                settings.in_app_notifications ? 'bg-accent' : 'bg-slate-700'
              }`}
            >
              <div
                className={`w-5 h-5 rounded-full bg-white transform transition-transform ${
                  settings.in_app_notifications ? 'translate-x-6' : 'translate-x-0.5'
                }`}
              />
            </button>
          </div>

          <div className="flex items-center justify-between p-4 rounded-xl bg-slate-800/30">
            <div className="flex-1">
              <p className="font-medium text-white">SMS Alerts for Urgent Signals</p>
              <p className="text-sm text-slate-400">Receive text messages for high-priority alerts</p>
            </div>
            <div className="flex items-center gap-4">
              <input
                type="tel"
                value={settings.phone_number || ''}
                onChange={(e) => updateSetting('phone_number', e.target.value)}
                className="input-field w-36 px-3 py-2 text-sm"
                placeholder="+1 555 123 4567"
                disabled={!settings.sms_urgent}
              />
              <button
                onClick={() => updateSetting('sms_urgent', !settings.sms_urgent)}
                className={`w-12 h-6 rounded-full transition-colors ${
                  settings.sms_urgent ? 'bg-accent' : 'bg-slate-700'
                }`}
              >
                <div
                  className={`w-5 h-5 rounded-full bg-white transform transition-transform ${
                    settings.sms_urgent ? 'translate-x-6' : 'translate-x-0.5'
                  }`}
                />
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between p-4 rounded-xl bg-slate-800/30">
            <div className="flex-1">
              <p className="font-medium text-white">Email Digest</p>
              <p className="text-sm text-slate-400">Receive periodic summary via email</p>
            </div>
            <div className="flex items-center gap-4">
              <input
                type="email"
                value={settings.email_address || ''}
                onChange={(e) => updateSetting('email_address', e.target.value)}
                className="input-field w-44 px-3 py-2 text-sm"
                placeholder="you@example.com"
                disabled={!settings.email_digest}
              />
              <button
                onClick={() => updateSetting('email_digest', !settings.email_digest)}
                className={`w-12 h-6 rounded-full transition-colors ${
                  settings.email_digest ? 'bg-accent' : 'bg-slate-700'
                }`}
              >
                <div
                  className={`w-5 h-5 rounded-full bg-white transform transition-transform ${
                    settings.email_digest ? 'translate-x-6' : 'translate-x-0.5'
                  }`}
                />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Digest Schedule */}
      <div className="glass-card p-6">
        <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <Clock className="w-5 h-5 text-accent" />
          Email Digest Schedule
        </h2>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="input-label">Frequency</label>
            <select
              value={settings.digest_frequency}
              onChange={(e) => updateSetting('digest_frequency', e.target.value as 'daily' | 'weekly' | 'monthly')}
              className="input-field"
            >
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
            </select>
          </div>

          <div>
            <label className="input-label">Delivery Time</label>
            <input
              type="time"
              value={settings.digest_time}
              onChange={(e) => updateSetting('digest_time', e.target.value)}
              className="input-field"
            />
          </div>

          <div className="col-span-2">
            <label className="input-label">Timezone</label>
            <select
              value={settings.timezone}
              onChange={(e) => updateSetting('timezone', e.target.value)}
              className="input-field"
            >
              {TIMEZONES.map((tz) => (
                <option key={tz} value={tz}>
                  {tz.replace('_', ' ').split('/').pop()}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Alert Thresholds */}
      <div className="glass-card p-6">
        <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-amber-400" />
          Alert Thresholds
        </h2>
        <p className="text-sm text-slate-400 mb-4">Minimum severity level to trigger push/external notifications</p>

        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="input-label">High Severity</label>
            <select
              value={settings.alert_threshold_high}
              onChange={(e) => updateSetting('alert_threshold_high', e.target.value as 'high' | 'medium' | 'low')}
              className="input-field"
            >
              <option value="high">Push Only</option>
              <option value="medium">SMS + Email</option>
              <option value="low">All Channels</option>
            </select>
          </div>

          <div>
            <label className="input-label">Medium Severity</label>
            <select
              value={settings.alert_threshold_medium}
              onChange={(e) => updateSetting('alert_threshold_medium', e.target.value as 'high' | 'medium' | 'low' | 'none')}
              className="input-field"
            >
              <option value="high">Push Only</option>
              <option value="medium">Email Only</option>
              <option value="low">All Channels</option>
              <option value="none">None</option>
            </select>
          </div>

          <div>
            <label className="input-label">Low Severity</label>
            <select
              value={settings.alert_threshold_low}
              onChange={(e) => updateSetting('alert_threshold_low', e.target.value as 'high' | 'medium' | 'low' | 'none')}
              className="input-field"
            >
              <option value="high">Push Only</option>
              <option value="medium">Email Only</option>
              <option value="low">All Channels</option>
              <option value="none">None</option>
            </select>
          </div>
        </div>
      </div>

      {/* Alert Types */}
      <div className="glass-card p-6">
        <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <Info className="w-5 h-5 text-ai" />
          Alert Types
        </h2>
        <p className="text-sm text-slate-400 mb-4">Which insights should trigger notifications</p>

        <div className="space-y-3">
          {[
            { key: 'notify_on_volatile', label: 'Volatility Alerts', desc: 'Significant price movement detection' },
            { key: 'notify_on_opportunity', label: 'Opportunity Alerts', desc: 'Potential entry points and oversold signals' },
            { key: 'notify_on_target', label: 'Target Price Alerts', desc: 'When approaching or hitting price targets' },
            { key: 'notify_on_entry', label: 'Entry Signal Alerts', desc: 'RSI-based entry recommendations' },
          ].map(({ key, label, desc }) => (
            <div key={key} className="flex items-center justify-between p-3 rounded-lg bg-slate-800/30">
              <div>
                <p className="font-medium text-white">{label}</p>
                <p className="text-sm text-slate-400">{desc}</p>
              </div>
              <button
                onClick={() => updateSetting(key as keyof DatabaseNotificationSettings, !(settings as DatabaseNotificationSettings)[key as keyof DatabaseNotificationSettings])}
                className={`w-10 h-5 rounded-full transition-colors ${
                  (settings as DatabaseNotificationSettings)[key as keyof DatabaseNotificationSettings] ? 'bg-accent' : 'bg-slate-700'
                }`}
              >
                <div
                  className={`w-4 h-4 rounded-full bg-white transform transition-transform ${
                    (settings as DatabaseNotificationSettings)[key as keyof DatabaseNotificationSettings] ? 'translate-x-5' : 'translate-x-0.5'
                  }`}
                />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Quiet Hours */}
      <div className="glass-card p-6">
        <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <Clock className="w-5 h-5 text-slate-400" />
          Quiet Hours
        </h2>
        <p className="text-sm text-slate-400 mb-4">Suppress notifications during these hours</p>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="input-label">Start</label>
            <input
              type="time"
              value={settings.quiet_hours_start}
              onChange={(e) => updateSetting('quiet_hours_start', e.target.value)}
              className="input-field"
            />
          </div>
          <div>
            <label className="input-label">End</label>
            <input
              type="time"
              value={settings.quiet_hours_end}
              onChange={(e) => updateSetting('quiet_hours_end', e.target.value)}
              className="input-field"
            />
          </div>
        </div>
      </div>

      {/* Save Button */}
      <div className="flex justify-end gap-4">
        <button
          onClick={fetchSettings}
          className="btn-secondary flex items-center gap-2"
          disabled={isSaving}
        >
          <RefreshCw className="w-4 h-4" />
          Reset
        </button>
        <button
          onClick={handleSave}
          className="btn-primary flex items-center gap-2"
          disabled={isSaving}
        >
          <Save className="w-4 h-4" />
          {isSaving ? 'Saving...' : 'Save Settings'}
        </button>
      </div>
    </div>
  );
}
