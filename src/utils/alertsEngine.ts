import { supabase } from '../lib/supabase';

export interface AlertsEngineResult {
  success: boolean;
  message: string;
  insights_generated: string[];
  positions_checked: number;
  watchlist_checked: number;
  timestamp: string;
  error?: string;
}

export interface NavSnapshotResult {
  success: boolean;
  message: string;
  snapshots_created: number;
  date: string;
  timestamp: string;
  error?: string;
}

export async function runAlertsEngine(): Promise<AlertsEngineResult> {
  try {
    // Get the current session for auth
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      return {
        success: false,
        message: 'Not authenticated',
        insights_generated: [],
        positions_checked: 0,
        watchlist_checked: 0,
        timestamp: new Date().toISOString(),
        error: 'Not authenticated',
      };
    }

    // Call the edge function
    const { data, error } = await supabase.functions.invoke('alerts-engine', {
      method: 'POST',
    });

    if (error) {
      console.error('Alerts engine error:', error);
      return {
        success: false,
        message: error.message || 'Failed to run alerts engine',
        insights_generated: [],
        positions_checked: 0,
        watchlist_checked: 0,
        timestamp: new Date().toISOString(),
        error: error.message,
      };
    }

    return data as AlertsEngineResult;
  } catch (err) {
    console.error('Alerts engine error:', err);
    return {
      success: false,
      message: 'An unexpected error occurred',
      insights_generated: [],
      positions_checked: 0,
      watchlist_checked: 0,
      timestamp: new Date().toISOString(),
      error: err instanceof Error ? err.message : 'Unknown error',
    };
  }
}

export async function runNavSnapshot(): Promise<NavSnapshotResult> {
  try {
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      return {
        success: false,
        message: 'Not authenticated',
        snapshots_created: 0,
        date: new Date().toISOString().split('T')[0],
        timestamp: new Date().toISOString(),
        error: 'Not authenticated',
      };
    }

    const { data, error } = await supabase.functions.invoke('nav-snapshot', {
      method: 'POST',
    });

    if (error) {
      console.error('NAV snapshot error:', error);
      return {
        success: false,
        message: error.message || 'Failed to run NAV snapshot',
        snapshots_created: 0,
        date: new Date().toISOString().split('T')[0],
        timestamp: new Date().toISOString(),
        error: error.message,
      };
    }

    return data as NavSnapshotResult;
  } catch (err) {
    console.error('NAV snapshot error:', err);
    return {
      success: false,
      message: 'An unexpected error occurred',
      snapshots_created: 0,
      date: new Date().toISOString().split('T')[0],
      timestamp: new Date().toISOString(),
      error: err instanceof Error ? err.message : 'Unknown error',
    };
  }
}

export type { };
