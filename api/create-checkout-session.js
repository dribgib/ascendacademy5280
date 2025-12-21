import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

// Check for Test key first, then Live key
const stripeKey = process.env.STRIPE_TEST_SECRET_KEY || process.env.STRIPE_LIVE_SECRET_KEY || process.env.STRIPE_SECRET_KEY;
const supabaseUrl = process.env.VITE_PUBLIC_SUPABASE_URL;
// Use Service Role Key if available (preferred for backend), otherwise Anon
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_PUBLIC_SUPABASE_ANON_KEY;

if (!stripeKey || !supabaseUrl || !supabaseKey) {
  throw new Error('Missing Configuration: Check STRIPE_SECRET_KEY and SUPABASE_URL/KEY');
}

const stripe = new Stripe(stripeKey);
const supabase = createClient(supabaseUrl, supabaseKey);

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const { priceId, userId, childId, returnUrl, userEmail } = req.body;

    // 1. Check if user already has a Stripe Customer ID in Supabase
    const { data: profile } = await supabase
        .from('profiles')
        .select('stripe_customer_id')
        .eq('id', userId)
        .single();

    let customerId = profile?.stripe_customer_id;

    // FAIL-SAFE: If DB missing ID, check Stripe for existing customer by email to avoid duplicates
    if (!customerId && userEmail) {
        const existingCustomers = await stripe.customers.list({ email: userEmail, limit: 1 });
        if (existingCustomers.data.length > 0) {
            customerId = existingCustomers.data[0].id;
            // Background update to sync DB
            await supabase.from('profiles').update({ stripe_customer_id: customerId }).eq('id', userId);
        }
    }

    // 2. Prepare Session Object
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
      // Metadata on the *Session*
      metadata: {
        childId: childId,
        userId: userId
      },
      // Metadata on the *Subscription* (Critical for future webhook updates)
      subscription_data: {
        metadata: {
          childId: childId,
          userId: userId
        }
      }
    };

    // 3. Attach Customer ID if exists, otherwise pass email for new creation
    if (customerId) {
        sessionConfig.customer = customerId;
    } else {
        sessionConfig.customer_email = userEmail;
        // Stripe will create a new customer. The Webhook must catch this and update the DB.
    }

    // 4. Create the session
    const session = await stripe.checkout.sessions.create(sessionConfig);

    return res.status(200).json({ sessionId: session.id });
  } catch (error) {
    console.error('Checkout API Error:', error);
    return res.status(400).json({ error: error.message });
  }
}