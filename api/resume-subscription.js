import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

const stripeKey = process.env.STRIPE_TEST_SECRET_KEY || process.env.STRIPE_LIVE_SECRET_KEY || process.env.STRIPE_SECRET_KEY;
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
    // 1. Find paused subscription
    const { data: sub, error: dbError } = await supabase
        .from('subscriptions')
        .select('stripe_subscription_id')
        .eq('child_id', childId)
        .eq('status', 'paused')
        .single();

    if (dbError || !sub) {
        return res.status(404).json({ error: 'No paused subscription found to resume.' });
    }

    // 2. Resume in Stripe
    // Setting pause_collection to null (or empty string in some SDK versions) removes the pause.
    await stripe.subscriptions.update(sub.stripe_subscription_id, {
        pause_collection: '' 
    });

    // 3. Update Supabase Status back to active
    await supabase
        .from('subscriptions')
        .update({ status: 'active' })
        .eq('stripe_subscription_id', sub.stripe_subscription_id);

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('Resume Subscription Error:', error);
    return res.status(500).json({ error: error.message });
  }
}