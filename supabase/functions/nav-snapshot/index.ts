import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

// Mock current prices for NAV calculation
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

interface Position {
  id: string;
  user_id: string;
  ticker: string;
  shares: number;
  avg_cost: number;
  status: string;
}

interface CashLedgerEntry {
  user_id: string;
  amount: number;
  transaction_type: string;
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

    console.log('Starting NAV snapshot calculation...');

    // Get all active positions grouped by user
    const { data: positions, error: posError } = await supabase
      .from('positions')
      .select('id, user_id, ticker, shares, avg_cost, status')
      .eq('status', 'active');

    if (posError) throw posError;

    // Get cash balances for all users
    const { data: cashLedger, error: cashError } = await supabase
      .from('cash_ledger')
      .select('user_id, amount, transaction_type');

    if (cashError) throw cashError;

    // Calculate cash balance per user
    const cashBalances: Record<string, number> = {};
    for (const entry of (cashLedger || []) as CashLedgerEntry[]) {
      if (!cashBalances[entry.user_id]) {
        cashBalances[entry.user_id] = 0;
      }
      if (entry.transaction_type === 'deposit' || entry.transaction_type === 'trade_sell') {
        cashBalances[entry.user_id] += entry.amount;
      } else {
        cashBalances[entry.user_id] -= entry.amount;
      }
    }

    // Group positions by user
    const userPositions: Record<string, Position[]> = {};
    for (const pos of (positions || []) as Position[]) {
      if (!userPositions[pos.user_id]) {
        userPositions[pos.user_id] = [];
      }
      userPositions[pos.user_id].push(pos);
    }

    const today = new Date().toISOString().split('T')[0];
    const snapshots: Array<{
      user_id: string;
      date: string;
      total_value: number;
      equity_value: number;
      cash_value: number;
      daily_change: number | null;
      daily_change_percent: number | null;
    }> = [];

    // Calculate NAV for each user
    for (const userId of Object.keys(userPositions)) {
      const userPos = userPositions[userId];
      let equityValue = 0;

      for (const pos of userPos) {
        const currentPrice = MOCK_PRICES[pos.ticker] || 100;
        equityValue += pos.shares * currentPrice;
      }

      const cashValue = cashBalances[userId] || 0;
      const totalValue = equityValue + cashValue;

      // Check if snapshot already exists for today
      const { data: existingSnapshot } = await supabase
        .from('portfolio_history')
        .select('*')
        .eq('user_id', userId)
        .eq('date', today)
        .maybeSingle();

      // Get yesterday's snapshot for daily change
      const { data: yesterdaySnapshot } = await supabase
        .from('portfolio_history')
        .select('*')
        .eq('user_id', userId)
        .order('date', { ascending: false })
        .limit(1)
        .maybeSingle();

      const yesterdayValue = yesterdaySnapshot?.total_value || totalValue;
      const dailyChange = totalValue - yesterdayValue;
      const dailyChangePercent = yesterdayValue > 0 ? (dailyChange / yesterdayValue) * 100 : 0;

      if (existingSnapshot) {
        // Update existing snapshot
        await supabase
          .from('portfolio_history')
          .update({
            total_value: totalValue,
            equity_value: equityValue,
            cash_value: cashValue,
            daily_change: dailyChange,
            daily_change_percent: dailyChangePercent,
          })
          .eq('id', existingSnapshot.id);
      } else {
        // Create new snapshot
        snapshots.push({
          user_id: userId,
          date: today,
          total_value: totalValue,
          equity_value: equityValue,
          cash_value: cashValue,
          daily_change: yesterdaySnapshot ? dailyChange : null,
          daily_change_percent: yesterdaySnapshot ? dailyChangePercent : null,
        });
      }
    }

    // Bulk insert new snapshots
    if (snapshots.length > 0) {
      const { error: insertError } = await supabase
        .from('portfolio_history')
        .insert(snapshots as never);

      if (insertError) {
        console.error('Error inserting snapshots:', insertError);
      }
    }

    const result = {
      success: true,
      message: `NAV snapshots calculated for ${Object.keys(userPositions).length} users`,
      snapshots_created: snapshots.length,
      date: today,
      timestamp: new Date().toISOString(),
    };

    console.log('NAV snapshot completed:', result);

    return new Response(
      JSON.stringify(result),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('NAV snapshot error:', error);

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
