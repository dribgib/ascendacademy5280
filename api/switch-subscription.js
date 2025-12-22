import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

const stripeKey = process.env.STRIPE_TEST_SECRET_KEY || process.env.STRIPE_LIVE_SECRET_KEY || process.env.STRIPE_SECRET_KEY;
const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;

if (!stripeKey) throw new Error('Missing Stripe Key');
if (!supabaseUrl || !supabaseServiceKey) throw new Error('Missing Supabase Config or Service Key');

const stripe = new Stripe(stripeKey);
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { persistSession: false }
});

export default async function handler(req, res) {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { childId, newPriceId } = req.body;

  if (!childId || !newPriceId) {
    return res.status(400).json({ error: 'Missing required parameters.' });
  }

  try {
    // 1. Find active subscription
    const { data: sub, error: subError } = await supabase
        .from('subscriptions')
        .select('stripe_subscription_id')
        .eq('child_id', childId)
        .eq('status', 'active')
        .single();

    if (subError || !sub) {
        return res.status(404).json({ error: 'Active subscription not found for this athlete.' });
    }

    const subscriptionId = sub.stripe_subscription_id;

    // 2. Get Stripe Subscription
    const subscription = await stripe.subscriptions.retrieve(subscriptionId);
    const itemId = subscription.items.data[0].id;

    // 3. Update Stripe Subscription
    const updatedSubscription = await stripe.subscriptions.update(subscriptionId, {
      items: [{
        id: itemId,
        price: newPriceId,
      }],
      proration_behavior: 'always_invoice', 
    });

    // 4. Update DB Optimistically
    await supabase
        .from('subscriptions')
        .update({ package_id: newPriceId })
        .eq('stripe_subscription_id', subscriptionId);

    return res.status(200).json({ 
        success: true, 
        message: 'Subscription updated',
        subscription: updatedSubscription 
    });

  } catch (error) {
    console.error('Switch Subscription Error:', error);
    return res.status(500).json({ error: error.message });
  }
}