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
    const authHeader = req.headers.authorization;
    
    // Check if Auth Header is present and valid
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
       console.error("Missing or invalid Authorization header in portal request");
       // Note: We cannot throw here immediately if we want to fallback, 
       // but we require auth for this sensitive action.
    }

    const client = createClient(supabaseUrl, supabaseKey, 
        authHeader ? { global: { headers: { Authorization: authHeader } } } : {}
    );

    // 2. Authenticate User
    const { data: { user }, error: userError } = await client.auth.getUser();

    if (userError || !user) {
        console.error("Portal Auth Error:", userError);
        return res.status(401).json({ error: 'Unauthorized: Unable to verify user session.' });
    }

    const userId = user.id;

    // 3. Get Stripe Customer ID
    const { data: profile, error: profileError } = await client
        .from('profiles')
        .select('stripe_customer_id')
        .eq('id', userId)
        .single();

    if (profileError) {
        console.error("Profile Lookup Error:", profileError);
        return res.status(500).json({ error: 'Database error retrieving profile.' });
    }

    if (!profile?.stripe_customer_id) {
        return res.status(400).json({ error: 'No billing history found. Please subscribe to a plan first.' });
    }

    const { returnUrl } = req.body;

    // 4. Create Portal Session
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