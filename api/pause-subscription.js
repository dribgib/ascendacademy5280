
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

const stripeKey = process.env.STRIPE_LIVE_SECRET_KEY || process.env.STRIPE_SECRET_KEY || process.env.STRIPE_TEST_SECRET_KEY;
const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY || process.env.VITE_PUBLIC_SUPABASE_ANON_KEY;

if (!stripeKey || !supabaseUrl || !supabaseServiceKey) {
  throw new Error('Missing Config: Check Stripe/Supabase Env Vars');
}

const stripe = new Stripe(stripeKey);
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { persistSession: false }
});

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');

  if (req.method === 'OPTIONS') return res.status(200).end();

  const { childId } = req.body;
  if (!childId) return res.status(400).json({ error: 'Missing childId' });

  try {
    // 1. Find active subscription
    const { data: sub, error: dbError } = await supabase
        .from('subscriptions')
        .select('stripe_subscription_id')
        .eq('child_id', childId)
        .eq('status', 'active')
        .single();

    if (dbError || !sub) {
        return res.status(404).json({ error: 'No active subscription found to pause.' });
    }

    // 2. Pause in Stripe
    // We use behavior: 'void' to keep the subscription technically active but stop collecting money.
    // This allows us to resume it easily later without creating a new one.
    await stripe.subscriptions.update(sub.stripe_subscription_id, {
        pause_collection: {
            behavior: 'void' 
        }
    });

    // 3. Update Supabase Status
    // We mark it as 'paused' locally so the UI knows.
    await supabase
        .from('subscriptions')
        .update({ status: 'paused' })
        .eq('stripe_subscription_id', sub.stripe_subscription_id);

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('Pause Subscription Error:', error);
    return res.status(500).json({ error: error.message });
  }
}
