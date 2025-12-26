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

// Configure these Coupons in your Stripe Dashboard!
const COUPONS = {
    SIBLING_45: 'SIBLING_45', // 45% OFF
    SIBLING_65: 'SIBLING_65'  // 65% OFF
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
    // If user has existing active subscriptions, apply discount to this new one
    if (activeSubscriptionCount > 0) {
        // 1 Sibling exists -> 45% off (2nd kid)
        // 2+ Siblings exist -> 65% off (3rd+ kid)
        const couponCode = activeSubscriptionCount >= 2 ? COUPONS.SIBLING_65 : COUPONS.SIBLING_45;
        
        // Note: Coupon must exist in Stripe. If not found, this might throw error, 
        // but we'll try/catch specifically or just let it fail so admin knows to create coupons.
        sessionConfig.discounts = [{ coupon: couponCode }];
    }

    const session = await stripe.checkout.sessions.create(sessionConfig);

    return res.status(200).json({ sessionId: session.id });
  } catch (error) {
    console.error('Checkout API Error:', error);
    // If error is about coupon missing
    if (error.message.includes('No such coupon')) {
        return res.status(400).json({ error: 'System Error: Sibling Discount Coupon missing in Stripe. Please contact support.' });
    }
    return res.status(500).json({ error: error.message });
  }
}