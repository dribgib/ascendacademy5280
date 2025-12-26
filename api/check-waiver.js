import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY || process.env.VITE_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');

  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    let body = req.body;
    if (typeof body === 'string') {
        try { body = JSON.parse(body); } catch (e) {}
    }
    const { email, name } = body || {};

    if (!email) {
        return res.status(200).json({ verified: false, message: 'Missing email.' });
    }

    // 1. WHITELIST OVERRIDE
    const WHITELIST = ['colton.joseph@gmail.com', 'mrrljackson@gmail.com', 'admin@ascend5280.com'];
    if (WHITELIST.includes(email.toLowerCase().trim())) {
        return res.status(200).json({ verified: true, message: 'Verified via whitelist.' });
    }

    // 2. CHECK LOCAL DATABASE (Populated by Zapier/Webhooks)
    // We look for any waiver record matching this email.
    const { data: waivers, error } = await supabase
        .from('waivers')
        .select('*')
        .ilike('email', email.trim());

    if (error) {
        console.error("DB Error checking waiver:", error);
        throw error;
    }

    if (waivers && waivers.length > 0) {
        // Optional: We could do fuzzy name matching here, but usually email match is sufficient
        // if the parent signed it.
        return res.status(200).json({ verified: true });
    }

    // 3. Not found
    return res.status(200).json({ 
        verified: false, 
        message: 'No waiver found for this email. If you just signed, please wait 2 minutes for the system to sync, or use the manual override below.' 
    });

  } catch (error) {
      console.error("[WaiverCheck] Critical Error:", error);
      return res.status(200).json({ 
          verified: false, 
          message: 'System error. Please use manual confirmation.' 
      });
  }
}