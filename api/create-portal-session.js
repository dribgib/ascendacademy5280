import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

// Check for Live key, then Test key, then generic key
const stripeKey = process.env.STRIPE_LIVE_SECRET_KEY || process.env.STRIPE_TEST_SECRET_KEY || process.env.STRIPE_SECRET_KEY;

if (!stripeKey) {
  throw new Error('Missing Stripe Secret Key in Environment Variables');
}

const stripe = new Stripe(stripeKey);

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    // 1. Verify User with Supabase
    // We create a client using the Auth Header from the request
    const supabaseUrl = process.env.VITE_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.VITE_PUBLIC_SUPABASE_ANON_KEY;
    
    // Check if auth header exists
    const authHeader = req.headers.authorization;
    if (!authHeader) {
        throw new Error('Missing Authorization Header');
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
        global: { headers: { Authorization: authHeader } }
    });

    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
        throw new Error('Unauthorized');
    }

    // 2. Get Stripe Customer ID from DB
    const { data: profile } = await supabase
        .from('profiles')
        .select('stripe_customer_id')
        .eq('id', user.id)
        .single();

    if (!profile?.stripe_customer_id) {
        throw new Error('No billing account found for this user.');
    }

    const { returnUrl } = req.body;

    // 3. Create Portal Session
    const session = await stripe.billingPortal.sessions.create({
      customer: profile.stripe_customer_id,
      return_url: returnUrl,
    });

    return res.status(200).json({ url: session.url });
  } catch (error) {
    console.error('Portal Error:', error);
    return res.status(400).json({ error: error.message });
  }
}