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
    // 1. Find subscriptions for this child
    const { data: subs } = await supabase
        .from('subscriptions')
        .select('stripe_subscription_id, status')
        .eq('child_id', childId);

    if (subs && subs.length > 0) {
        for (const sub of subs) {
            // Only cancel on Stripe if it looks active/trialing
            if ((sub.status === 'active' || sub.status === 'trialing') && sub.stripe_subscription_id) {
                try {
                    console.log(`Cancelling Stripe Sub: ${sub.stripe_subscription_id}`);
                    await stripe.subscriptions.cancel(sub.stripe_subscription_id);
                } catch (stripeErr) {
                    console.warn(`Stripe Cancel Warning (${sub.stripe_subscription_id}):`, stripeErr.message);
                    // Continue even if Stripe fails (e.g. already canceled)
                }
            }
        }

        // 2. Delete ALL subscriptions for this child from DB to free Foreign Key constraint
        // Using Service Role to bypass RLS
        const { error: deleteError } = await supabase
            .from('subscriptions')
            .delete()
            .eq('child_id', childId);
        
        if (deleteError) throw deleteError;
    }

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('Cancel Subscription Error:', error);
    return res.status(500).json({ error: error.message });
  }
}