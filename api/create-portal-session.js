import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

const stripeKey = process.env.STRIPE_TEST_SECRET_KEY || process.env.STRIPE_LIVE_SECRET_KEY || process.env.STRIPE_SECRET_KEY;
const supabaseUrl = process.env.VITE_PUBLIC_SUPABASE_URL;
// Use Anon Key for Auth verification
const supabaseAnonKey = process.env.VITE_PUBLIC_SUPABASE_ANON_KEY;
// Use Service Role for DB lookup (bypass RLS)
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_PUBLIC_SUPABASE_ANON_KEY;

if (!stripeKey) throw new Error('Missing Stripe Key');
if (!supabaseUrl || !supabaseAnonKey) throw new Error('Missing Supabase Config');

const stripe = new Stripe(stripeKey);

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    // 1. Validation
    // Vercel might lowercase headers
    const authHeader = req.headers.authorization || req.headers.Authorization;
    
    if (!authHeader) {
       console.error("Portal API: Missing Authorization header");
       return res.status(401).json({ error: 'Missing auth token' });
    }

    // 2. Authenticate User
    // CRITICAL for Vercel/Serverless: 
    // - persistSession: false (no localStorage)
    // - autoRefreshToken: false (we just verify the current token)
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
        console.error("Portal API: Auth failed", userError?.message);
        return res.status(401).json({ error: 'Unauthorized: Invalid session.' });
    }

    const userId = user.id;

    // 3. Get Stripe Customer ID
    // Use Service Role client for reliable DB access (bypassing RLS)
    const dbClient = createClient(supabaseUrl, supabaseServiceKey, {
        auth: { persistSession: false }
    });

    const { data: profile, error: profileError } = await dbClient
        .from('profiles')
        .select('stripe_customer_id')
        .eq('id', userId)
        .single();

    if (profileError) {
        console.error("Portal API: Profile lookup failed", profileError.message);
        return res.status(500).json({ error: 'Database error.' });
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
    console.error('Portal API Critical Error:', error);
    return res.status(400).json({ error: error.message });
  }
}