import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

// Configuration
const stripeKey = process.env.STRIPE_TEST_SECRET_KEY || process.env.STRIPE_LIVE_SECRET_KEY || process.env.STRIPE_SECRET_KEY;
const supabaseUrl = process.env.VITE_PUBLIC_SUPABASE_URL;
// Use Service Role Key to bypass RLS and read subscriptions
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_PUBLIC_SUPABASE_ANON_KEY;

if (!stripeKey) throw new Error('Missing Stripe Key');

const stripe = new Stripe(stripeKey);
const supabase = createClient(supabaseUrl, supabaseServiceKey);

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { childId, newPriceId } = req.body;

  if (!childId || !newPriceId) {
    return res.status(400).json({ error: 'Missing required parameters.' });
  }

  try {
    // 1. Find active subscription in DB for this child
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

    // 2. Retrieve Subscription from Stripe
    const subscription = await stripe.subscriptions.retrieve(subscriptionId);
    
    // 3. Find the subscription item to update
    const itemId = subscription.items.data[0].id;

    // 4. Update the subscription
    // proration_behavior: 'always_invoice' calculates the difference and creates an invoice immediately (if payment required)
    // or 'create_prorations' adds it to next cycle.
    // 'always_invoice' is safer for immediate upgrades to ensure payment succeeds.
    const updatedSubscription = await stripe.subscriptions.update(subscriptionId, {
      items: [{
        id: itemId,
        price: newPriceId,
      }],
      proration_behavior: 'always_invoice', 
    });

    // 5. Update DB (or wait for webhook)
    // We'll optimistically update the package_id to reflect change immediately in UI
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