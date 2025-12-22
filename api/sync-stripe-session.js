import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

// Configuration
const stripeKey = process.env.STRIPE_TEST_SECRET_KEY || process.env.STRIPE_LIVE_SECRET_KEY || process.env.STRIPE_SECRET_KEY;
const supabaseUrl = process.env.VITE_PUBLIC_SUPABASE_URL;
// Use Service Role Key to bypass RLS and write to tables
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_PUBLIC_SUPABASE_ANON_KEY;

if (!stripeKey) {
  throw new Error('Missing Stripe Key');
}

const stripe = new Stripe(stripeKey);
const supabase = createClient(supabaseUrl, supabaseServiceKey);

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { sessionId } = req.body;

  if (!sessionId) {
    return res.status(400).json({ error: 'Missing sessionId' });
  }

  try {
    // 1. Retrieve the session from Stripe to get the truth
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
        expand: ['subscription', 'customer']
    });

    if (!session) {
        throw new Error('Session not found.');
    }

    const customerId = session.customer?.id || session.customer;
    const userId = session.metadata?.userId || session.client_reference_id;
    const childId = session.metadata?.childId;

    if (!userId || !customerId) {
        throw new Error('Invalid session metadata. Missing User or Customer ID.');
    }

    // 2. FORCE SYNC: Update Profile with Stripe Customer ID
    const { error: profileError } = await supabase
        .from('profiles')
        .update({ stripe_customer_id: customerId })
        .eq('id', userId);

    if (profileError) console.error('Profile Sync Error:', profileError);

    // 3. FORCE SYNC: Upsert Subscription
    if (session.subscription && childId) {
        const subData = typeof session.subscription === 'object' ? session.subscription : { id: session.subscription, status: 'active' };
        
        // If we didn't expand subscription fully, assumes active if session is paid, 
        // but ideally we rely on the expansion.
        const status = subData.status || 'active';
        const currentPeriodEnd = subData.current_period_end 
            ? new Date(subData.current_period_end * 1000).toISOString() 
            : new Date(Date.now() + 30*24*60*60*1000).toISOString();

        // Retrieve price ID if inside subscription object
        let packageId = '';
        if (subData.items && subData.items.data.length > 0) {
            packageId = subData.items.data[0].price.id;
        }

        const { error: subError } = await supabase
            .from('subscriptions')
            .upsert({
                stripe_subscription_id: subData.id,
                user_id: userId,
                child_id: childId,
                package_id: packageId, // Might be empty if not expanded, but the webhook usually catches this. This is a fallback.
                status: status,
                current_period_end: currentPeriodEnd
            }, { onConflict: 'stripe_subscription_id' });

        if (subError) console.error('Subscription Sync Error:', subError);
    }

    return res.status(200).json({ success: true, customerId });

  } catch (error) {
    console.error('Sync Error:', error);
    return res.status(500).json({ error: error.message });
  }
}