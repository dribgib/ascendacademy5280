import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

// Robust Environment Variable Detection
const stripeKey = process.env.STRIPE_TEST_SECRET_KEY || process.env.STRIPE_LIVE_SECRET_KEY || process.env.STRIPE_SECRET_KEY;
const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_PUBLIC_SUPABASE_URL;
// Prefer Service Role for DB writes, fallback to Anon
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.VITE_PUBLIC_SUPABASE_ANON_KEY;

if (!stripeKey || !supabaseUrl || !supabaseKey) {
  throw new Error('Missing Configuration: Check STRIPE_SECRET_KEY and SUPABASE_URL/KEY');
}

const stripe = new Stripe(stripeKey);
const supabase = createClient(supabaseUrl, supabaseKey, {
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

  try {
    const { priceId, userId, childId, returnUrl, userEmail } = req.body;

    // 1. Check for existing Stripe Customer ID
    const { data: profile } = await supabase
        .from('profiles')
        .select('stripe_customer_id')
        .eq('id', userId)
        .single();

    let customerId = profile?.stripe_customer_id;

    // FAIL-SAFE: Check Stripe directly if DB is empty to avoid duplicates
    if (!customerId && userEmail) {
        const existingCustomers = await stripe.customers.list({ email: userEmail, limit: 1 });
        if (existingCustomers.data.length > 0) {
            customerId = existingCustomers.data[0].id;
            // Sync DB in background
            await supabase.from('profiles').update({ stripe_customer_id: customerId }).eq('id', userId);
        }
    }

    // 2. Prepare Session
    const sessionConfig = {
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: `${returnUrl}&session_id={CHECKOUT_SESSION_ID}`, 
      cancel_url: returnUrl,
      client_reference_id: userId,
      metadata: {
        childId: childId,
        userId: userId
      },
      subscription_data: {
        metadata: {
          childId: childId,
          userId: userId
        }
      }
    };

    if (customerId) {
        sessionConfig.customer = customerId;
    } else {
        sessionConfig.customer_email = userEmail;
    }

    const session = await stripe.checkout.sessions.create(sessionConfig);

    return res.status(200).json({ sessionId: session.id });
  } catch (error) {
    console.error('Checkout API Error:', error);
    return res.status(500).json({ error: error.message });
  }
}