import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

const stripeKey = process.env.STRIPE_TEST_SECRET_KEY || process.env.STRIPE_LIVE_SECRET_KEY || process.env.STRIPE_SECRET_KEY;
const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY || process.env.VITE_PUBLIC_SUPABASE_ANON_KEY;

if (!stripeKey || !supabaseUrl || !supabaseServiceKey) {
  throw new Error('Missing Configuration: Check Stripe/Supabase Env Vars');
}

const stripe = new Stripe(stripeKey);
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { persistSession: false }
});

// HARDCODED COUPON IDS PROVIDED BY USER
const COUPONS = {
  TEST: {
    SIBLING_45: 'fdvUgssw',
    SIBLING_65: 'IktqmbKi'
  },
  LIVE: {
    SIBLING_45: '2fW4gpPa',
    SIBLING_65: 'C4cNT90G'
  }
};

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');

  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    const { priceId, userId, childId, returnUrl, userEmail, activeSubscriptionCount } = req.body;

    // 1. Get/Create Stripe Customer ID
    const { data: profile } = await supabase
        .from('profiles')
        .select('stripe_customer_id')
        .eq('id', userId)
        .single();

    let customerId = profile?.stripe_customer_id;

    if (!customerId && userEmail) {
        const existingCustomers = await stripe.customers.list({ email: userEmail, limit: 1 });
        if (existingCustomers.data.length > 0) {
            customerId = existingCustomers.data[0].id;
            await supabase.from('profiles').update({ stripe_customer_id: customerId }).eq('id', userId);
        }
    }

    // 2. Prepare Checkout Session
    const sessionConfig = {
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      mode: 'subscription',
      success_url: `${returnUrl}&session_id={CHECKOUT_SESSION_ID}`, 
      cancel_url: returnUrl,
      client_reference_id: userId,
      metadata: { childId, userId },
      subscription_data: { metadata: { childId, userId } }
    };

    if (customerId) {
        sessionConfig.customer = customerId;
    } else {
        sessionConfig.customer_email = userEmail;
    }
    
    // 3. APPLY SIBLING DISCOUNT
    if (activeSubscriptionCount > 0) {
        // Determine Mode
        const isTestMode = stripeKey.startsWith('sk_test');
        const couponMap = isTestMode ? COUPONS.TEST : COUPONS.LIVE;
        
        // Select Coupon ID
        const couponId = activeSubscriptionCount >= 2 ? couponMap.SIBLING_65 : couponMap.SIBLING_45;

        // Apply Coupon
        sessionConfig.discounts = [{ coupon: couponId }];
    }

    const session = await stripe.checkout.sessions.create(sessionConfig);

    return res.status(200).json({ sessionId: session.id });
  } catch (error) {
    console.error('Checkout API Error:', error);
    return res.status(500).json({ error: error.message });
  }
}