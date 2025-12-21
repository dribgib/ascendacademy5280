import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

const stripeKey = process.env.STRIPE_TEST_SECRET_KEY || process.env.STRIPE_LIVE_SECRET_KEY || process.env.STRIPE_SECRET_KEY;
const supabaseUrl = process.env.VITE_PUBLIC_SUPABASE_URL;
// Need Service Role to securely read profiles if RLS is strict, or Anon if user is authenticated via header
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_PUBLIC_SUPABASE_ANON_KEY;

if (!stripeKey) throw new Error('Missing Stripe Key');

const stripe = new Stripe(stripeKey);

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    // 1. Initialize Supabase
    // If we have the Auth header, we can use the Anon key and respect RLS.
    // Otherwise we use Service Role to lookup the customer ID directly.
    const authHeader = req.headers.authorization;
    const client = createClient(supabaseUrl, supabaseKey, 
        authHeader ? { global: { headers: { Authorization: authHeader } } } : {}
    );

    let userId;

    if (authHeader) {
        // Method A: Authenticated Request from Frontend
        const { data: { user }, error } = await client.auth.getUser();
        if (error || !user) throw new Error('Unauthorized');
        userId = user.id;
    } else {
        // Method B: Fallback (Not recommended without auth)
        throw new Error('Missing Authorization Header');
    }

    // 2. Get Stripe Customer ID
    const { data: profile } = await client
        .from('profiles')
        .select('stripe_customer_id')
        .eq('id', userId)
        .single();

    if (!profile?.stripe_customer_id) {
        return res.status(400).json({ error: 'No billing history found. Please subscribe to a plan first.' });
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