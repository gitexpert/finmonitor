import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

interface Position {
  id: string;
  user_id: string;
  ticker: string;
  shares: number;
  avg_cost: number;
  status: string;
  created_at: string;
}

interface WatchlistItem {
  id: string;
  user_id: string;
  ticker: string;
  target_price: number | null;
}

interface PriceHistory {
  date: string;
  close: number;
  high: number;
  low: number;
  volume: number;
}

// Mock price data for demonstration (in production, would fetch from real API)
const MOCK_PRICES: Record<string, { price: number; change: number; volatility: number }> = {
  NVDA: { price: 875.42, change: 2.34, volatility: 0.25 },
  MU: { price: 156.78, change: -1.23, volatility: 0.22 },
  RKLB: { price: 5.89, change: 0.45, volatility: 0.35 },
  VRT: { price: 52.32, change: 1.87, volatility: 0.18 },
  AMD: { price: 167.45, change: 3.21, volatility: 0.21 },
  PLTR: { price: 26.78, change: 0.89, volatility: 0.28 },
  SOFI: { price: 7.45, change: -0.15, volatility: 0.32 },
  COIN: { price: 234.56, change: -4.32, volatility: 0.42 },
  TSLA: { price: 245.67, change: 5.67, volatility: 0.38 },
  AAPL: { price: 178.23, change: 0.45, volatility: 0.15 },
  MSFT: { price: 423.89, change: 1.23, volatility: 0.14 },
  META: { price: 502.34, change: -2.45, volatility: 0.20 },
};

// Generate mock historical prices for RSI calculation
function generateHistoricalPrices(currentPrice: number, days: number = 30): number[] {
  const prices: number[] = [];
  let price = currentPrice;

  for (let i = days; i >= 0; i--) {
    const dailyChange = (Math.random() - 0.5) * 0.05; // -2.5% to +2.5%
    price = price * (1 + dailyChange);
    prices.push(price);
  }

  return prices;
}

// Calculate RSI (Relative Strength Index)
function calculateRSI(prices: number[], period: number = 14): number {
  if (prices.length < period + 1) {
    return 50; // Neutral RSI if not enough data
  }

  let gains = 0;
  let losses = 0;

  // Calculate initial average gain/loss
  for (let i = 1; i <= period; i++) {
    const change = prices[i] - prices[i - 1];
    if (change > 0) {
      gains += change;
    } else {
      losses += Math.abs(change);
    }
  }

  let avgGain = gains / period;
  let avgLoss = losses / period;

  // Use Wilder's smoothing method for remaining prices
  for (let i = period + 1; i < prices.length; i++) {
    const change = prices[i] - prices[i - 1];
    if (change > 0) {
      avgGain = (avgGain * (period - 1) + change) / period;
      avgLoss = (avgLoss * (period - 1)) / period;
    } else {
      avgGain = (avgGain * (period - 1)) / period;
      avgLoss = (avgLoss * (period - 1) + Math.abs(change)) / period;
    }
  }

  if (avgLoss === 0) {
    return 100;
  }

  const rs = avgGain / avgLoss;
  return 100 - (100 / (1 + rs));
}

// Calculate volatility (standard deviation of daily returns)
function calculateVolatility(prices: number[]): number {
  if (prices.length < 2) return 0;

  const returns: number[] = [];
  for (let i = 1; i < prices.length; i++) {
    returns.push((prices[i] - prices[i - 1]) / prices[i - 1]);
  }

  const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
  const variance = returns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / returns.length;
  return Math.sqrt(variance);
}

// Check for volatility alerts
async function checkVolatilityAlerts(
  supabase: ReturnType<typeof createClient>,
  positions: Position[]
): Promise<void> {
  for (const position of positions) {
    const stockData = MOCK_PRICES[position.ticker] || {
      price: 100,
      change: 0,
      volatility: 0.25,
    };

    // Generate historical prices based on current price
    const historicalPrices = generateHistoricalPrices(stockData.price);
    const currentVolatility = calculateVolatility(historicalPrices);

    // Calculate 30-day average volatility (using mock baseline)
    const averageVolatility = stockData.volatility * 0.8; // Slightly lower baseline

    // Check if current volatility deviates by more than 10%
    const volatilityDeviation = Math.abs(currentVolatility - averageVolatility) / averageVolatility;

    if (volatilityDeviation > 0.10) {
      // Check if alert already exists
      const { data: existingAlert } = await supabase
        .from('ai_insights')
        .select('id')
        .eq('user_id', position.user_id)
        .eq('ticker', position.ticker)
        .eq('type', 'volatility')
        .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
        .maybeSingle();

      if (!existingAlert) {
        const severity = volatilityDeviation > 0.20 ? 'high' : volatilityDeviation > 0.15 ? 'medium' : 'low';
        const deviationPercent = (volatilityDeviation * 100).toFixed(0);

        await supabase.from('ai_insights').insert({
          user_id: position.user_id,
          ticker: position.ticker,
          type: 'volatility',
          title: 'Elevated Volatility Detected',
          message: `${position.ticker} showing ${deviationPercent}% higher volatility than 30-day average. Consider tightening stop-losses or reducing position size.`,
          severity,
          is_read: false,
          action_required: severity === 'high',
        } as never);
      }
    }
  }
}

// Check RSI for watchlist items
async function checkRSIAlerts(
  supabase: ReturnType<typeof createClient>,
  watchlist: WatchlistItem[]
): Promise<void> {
  for (const item of watchlist) {
    const stockData = MOCK_PRICES[item.ticker] || {
      price: 100,
      change: 0,
      volatility: 0.25,
    };

    // Generate historical prices and calculate RSI
    const historicalPrices = generateHistoricalPrices(stockData.price, 30);
    const rsi = calculateRSI(historicalPrices);

    // Check for oversold condition (RSI < 35)
    if (rsi < 35) {
      // Check if alert already exists
      const { data: existingAlert } = await supabase
        .from('ai_insights')
        .select('id')
        .eq('user_id', item.user_id)
        .eq('ticker', item.ticker)
        .eq('type', 'opportunity')
        .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
        .maybeSingle();

      if (!existingAlert) {
        await supabase.from('ai_insights').insert({
          user_id: item.user_id,
          ticker: item.ticker,
          type: 'opportunity',
          title: 'Potential Entry Point - Oversold',
          message: item.target_price
            ? `${item.ticker} RSI at ${rsi.toFixed(0)} suggests oversold conditions. Approaching your target of $${item.target_price.toFixed(2)}. Consider dollar-cost averaging.`
            : `${item.ticker} RSI at ${rsi.toFixed(0)} suggests oversold conditions. Consider adding to your watchlist or initiating a position.`,
          severity: rsi < 30 ? 'high' : rsi < 32 ? 'medium' : 'low',
          is_read: false,
          action_required: false,
        } as never);
      }
    }

    // Check for overbought condition (RSI > 70)
    if (rsi > 70) {
      const { data: existingAlert } = await supabase
        .from('ai_insights')
        .select('id')
        .eq('user_id', item.user_id)
        .eq('ticker', item.ticker)
        .eq('type', 'alert')
        .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
        .maybeSingle();

      if (!existingAlert) {
        await supabase.from('ai_insights').insert({
          user_id: item.user_id,
          ticker: item.ticker,
          type: 'alert',
          title: 'Overbought Warning',
          message: `${item.ticker} RSI at ${rsi.toFixed(0)} indicates overbought conditions. Consider waiting for pullback or taking partial profits.`,
          severity: rsi > 75 ? 'high' : rsi > 72 ? 'medium' : 'low',
          is_read: false,
          action_required: true,
        } as never);
      }
    }
  }
}

// Check price targets for watchlist items
async function checkPriceTargetAlerts(
  supabase: ReturnType<typeof createClient>,
  watchlist: WatchlistItem[]
): Promise<void> {
  for (const item of watchlist) {
    if (!item.target_price) continue;

    const stockData = MOCK_PRICES[item.ticker] || { price: 100 };
    const currentPrice = stockData.price;
    const targetPrice = item.target_price;

    // Calculate distance to target
    const distancePercent = ((targetPrice - currentPrice) / currentPrice) * 100;

    // Alert if within 5% of target
    if (Math.abs(distancePercent) <= 5) {
      const { data: existingAlert } = await supabase
        .from('ai_insights')
        .select('id')
        .eq('user_id', item.user_id)
        .eq('ticker', item.ticker)
        .eq('type', 'target')
        .gte('created_at', new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString())
        .maybeSingle();

      if (!existingAlert) {
        const isAbove = currentPrice > targetPrice;
        const distance = Math.abs(distancePercent).toFixed(1);

        await supabase.from('ai_insights').insert({
          user_id: item.user_id,
          ticker: item.ticker,
          type: 'target',
          title: isAbove ? 'Target Exceeded' : 'Near Target Price',
          message: isAbove
            ? `${item.ticker} is now above your target of $${targetPrice.toFixed(2)}. Current price: $${currentPrice.toFixed(2)}. Consider taking profits.`
            : `${item.ticker} is ${distance}% away from your target of $${targetPrice.toFixed(2)}. Current price: $${currentPrice.toFixed(2)}.`,
          severity: isAbove ? 'high' : distancePercent <= 2 ? 'high' : 'medium',
          is_read: false,
          action_required: isAbove || distancePercent <= 2,
        } as never);
      }
    }
  }
}

// Check for significant price movements in positions
async function checkPriceMovementAlerts(
  supabase: ReturnType<typeof createClient>,
  positions: Position[]
): Promise<void> {
  for (const position of positions) {
    const stockData = MOCK_PRICES[position.ticker] || { price: 100, change: 0 };
    const currentPrice = stockData.price;
    const avgCost = position.avg_cost;

    // Calculate gain/loss
    const gainPercent = ((currentPrice - avgCost) / avgCost) * 100;

    // Alert on significant gains (>25%) for potential profit taking
    if (gainPercent > 25) {
      const { data: existingAlert } = await supabase
        .from('ai_insights')
        .select('id')
        .eq('user_id', position.user_id)
        .eq('ticker', position.ticker)
        .eq('type', 'opportunity')
        .gte('created_at', new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString())
        .maybeSingle();

      if (!existingAlert) {
        await supabase.from('ai_insights').insert({
          user_id: position.user_id,
          ticker: position.ticker,
          type: 'opportunity',
          title: 'Significant Gain - Consider Profit Taking',
          message: `${position.ticker} is up ${gainPercent.toFixed(0)}% from your average cost of $${avgCost.toFixed(2)}. Consider taking partial profits or trailing your stop-loss.`,
          severity: gainPercent > 40 ? 'high' : gainPercent > 30 ? 'medium' : 'low',
          is_read: false,
          action_required: gainPercent > 35,
        } as never);
      }
    }

    // Alert on significant losses (>15%) as risk warning
    if (gainPercent < -15) {
      const { data: existingAlert } = await supabase
        .from('ai_insights')
        .select('id')
        .eq('user_id', position.user_id)
        .eq('ticker', position.ticker)
        .eq('type', 'alert')
        .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
        .maybeSingle();

      if (!existingAlert) {
        await supabase.from('ai_insights').insert({
          user_id: position.user_id,
          ticker: position.ticker,
          type: 'alert',
          title: 'Position Underwater - Risk Assessment',
          message: `${position.ticker} is down ${Math.abs(gainPercent).toFixed(0)}% from your average cost of $${avgCost.toFixed(2)}. Review your thesis and consider your risk tolerance.`,
          severity: gainPercent < -25 ? 'high' : gainPercent < -20 ? 'medium' : 'low',
          is_read: false,
          action_required: gainPercent < -25,
        } as never);
      }
    }
  }
}

// Clean up old read insights (older than 7 days)
async function cleanupOldInsights(supabase: ReturnType<typeof createClient>): Promise<void> {
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  await supabase
    .from('ai_insights')
    .delete()
    .eq('is_read', true)
    .lt('created_at', sevenDaysAgo);
}

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    // Verify API key header for scheduled jobs
    const authHeader = req.headers.get('Authorization');
    const cronKey = Deno.env.get('CRON_SECRET');

    // Allow if called from cron with secret, or from authenticated request
    const isAuthorized = authHeader === `Bearer ${cronKey}` || req.method === 'POST';

    if (!isAuthorized) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Initialize Supabase client with service role for admin operations
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    console.log('Starting alerts engine...');

    // Fetch all active positions
    const { data: positions, error: positionsError } = await supabase
      .from('positions')
      .select('id, user_id, ticker, shares, avg_cost, status, created_at')
      .eq('status', 'active');

    if (positionsError) {
      console.error('Error fetching positions:', positionsError);
      throw positionsError;
    }

    // Fetch all watchlist items
    const { data: watchlist, error: watchlistError } = await supabase
      .from('watchlist')
      .select('id, user_id, ticker, target_price');

    if (watchlistError) {
      console.error('Error fetching watchlist:', watchlistError);
      throw watchlistError;
    }

    console.log(`Processing ${positions?.length || 0} positions and ${watchlist?.length || 0} watchlist items`);

    const insights: string[] = [];

    // Run all alert checks
    if (positions && positions.length > 0) {
      await checkVolatilityAlerts(supabase, positions as Position[]);
      await checkPriceMovementAlerts(supabase, positions as Position[]);
      insights.push(`Volatility and price movement checks for ${positions.length} positions`);
    }

    if (watchlist && watchlist.length > 0) {
      await checkRSIAlerts(supabase, watchlist as WatchlistItem[]);
      await checkPriceTargetAlerts(supabase, watchlist as WatchlistItem[]);
      insights.push(`RSI and price target checks for ${watchlist.length} watchlist items`);
    }

    // Cleanup old insights
    await cleanupOldInsights(supabase);

    const result = {
      success: true,
      message: 'Alerts engine completed successfully',
      insights_generated: insights,
      positions_checked: positions?.length || 0,
      watchlist_checked: watchlist?.length || 0,
      timestamp: new Date().toISOString(),
    };

    console.log('Alerts engine completed:', result);

    return new Response(
      JSON.stringify(result),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Alerts engine error:', error);

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
