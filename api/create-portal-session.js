
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

// Configuration
// We verify usage of keys provided by the user, checking Live first
const stripeKey = process.env.STRIPE_LIVE_SECRET_KEY || process.env.STRIPE_SECRET_KEY || process.env.STRIPE_TEST_SECRET_KEY;
const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_PUBLIC_SUPABASE_URL;
// Use Service Role Key for reliable backend operations (bypasses RLS)
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY || process.env.VITE_PUBLIC_SUPABASE_ANON_KEY;

if (!stripeKey) throw new Error('Missing Stripe Key');
if (!supabaseUrl || !supabaseServiceKey) throw new Error('Missing Supabase Configuration');

const stripe = new Stripe(stripeKey);

// Initialize Supabase with Service Role Key
// "persistSession: false" is critical for serverless environments
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
    detectSessionInUrl: false
  }
});

export default async function handler(req, res) {
  // CORS Headers - Essential for frontend fetch
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    // 1. Extract Token
    const authHeader = req.headers.authorization || req.headers.Authorization;
    if (!authHeader) {
       console.error("Portal API: No Authorization header provided");
       return res.status(401).json({ error: 'Missing Authorization Header' });
    }

    // Clean the token (remove "Bearer " prefix)
    const token = authHeader.replace(/^Bearer\s+/i, '');

    // 2. Verify User
    // We pass the token explicitly to getUser(). This verifies the JWT signature.
    // Since we initialized supabase with Service Role, this acts as a privileged check.
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);

    if (userError || !user) {
        console.error("Portal API: User verification failed", userError?.message);
        return res.status(401).json({ error: 'Invalid or expired session. Please log in again.' });
    }

    // 3. Get Stripe Customer ID
    // Service Role Key allows us to read the 'profiles' table even if RLS is restrictive
    const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('stripe_customer_id')
        .eq('id', user.id)
        .single();

    if (profileError) {
        console.error("Portal API: Database lookup failed", profileError.message);
        return res.status(500).json({ error: 'Database connection failed.' });
    }

    if (!profile?.stripe_customer_id) {
        return res.status(400).json({ error: 'No billing history found. Please subscribe to a plan first.' });
    }

    const { returnUrl } = req.body;

    // 4. Create Stripe Portal Session
    const session = await stripe.billingPortal.sessions.create({
      customer: profile.stripe_customer_id,
      return_url: returnUrl || req.headers.referer,
    });

    return res.status(200).json({ url: session.url });

  } catch (error) {
    console.error('Portal API Critical Error:', error);
    return res.status(500).json({ error: error.message });
  }
}
