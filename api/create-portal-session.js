import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

// Robust Environment Variable Detection
const stripeKey = process.env.STRIPE_TEST_SECRET_KEY || process.env.STRIPE_LIVE_SECRET_KEY || process.env.STRIPE_SECRET_KEY;
const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_PUBLIC_SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY; // Do not fallback to Anon for DB ops to ensure RLS bypass

if (!stripeKey) throw new Error('Missing Stripe Key');
if (!supabaseUrl || !supabaseAnonKey) throw new Error('Missing Supabase Configuration');

const stripe = new Stripe(stripeKey);

export default async function handler(req, res) {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const authHeader = req.headers.authorization || req.headers.Authorization;
    
    if (!authHeader) {
       console.error("Portal API: Missing Authorization header");
       return res.status(401).json({ error: 'Missing auth token' });
    }

    // 1. Verify User Session (using Anon Key)
    const authClient = createClient(supabaseUrl, supabaseAnonKey, {
        auth: {
            persistSession: false,
            autoRefreshToken: false,
            detectSessionInUrl: false
        },
        global: { headers: { Authorization: authHeader } }
    });

    const { data: { user }, error: userError } = await authClient.auth.getUser();

    if (userError || !user) {
        console.error("Portal API Auth Failed:", userError?.message);
        return res.status(401).json({ error: 'Unauthorized: Session verification failed.' });
    }

    const userId = user.id;

    // 2. Lookup Profile (using Service Role Key if available, else Anon)
    // Using Service Role is critical to read 'stripe_customer_id' if RLS policies are strict.
    const dbKey = supabaseServiceKey || supabaseAnonKey;
    if (!supabaseServiceKey) console.warn("Portal API: Service Role Key missing, falling back to Anon Key. RLS may block profile lookup.");

    const dbClient = createClient(supabaseUrl, dbKey, {
        auth: { persistSession: false }
    });

    const { data: profile, error: profileError } = await dbClient
        .from('profiles')
        .select('stripe_customer_id')
        .eq('id', userId)
        .single();

    if (profileError) {
        console.error("Portal API Profile Lookup Error:", profileError.message);
        return res.status(500).json({ error: 'Database error retrieving billing account.' });
    }

    if (!profile?.stripe_customer_id) {
        return res.status(400).json({ error: 'No billing history found. Please subscribe to a plan first.' });
    }

    const { returnUrl } = req.body;

    // 3. Create Stripe Portal Session
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