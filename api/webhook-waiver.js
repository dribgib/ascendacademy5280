import { createClient } from '@supabase/supabase-js';

// Initialize Supabase with Service Role Key to allow writing to DB
const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("Missing Supabase Config for Waiver Webhook");
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { email, firstName, lastName } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Missing email' });
    }

    console.log(`Received Waiver Webhook for: ${email}`);

    // Insert into Supabase 'waivers' table
    const { error } = await supabase
      .from('waivers')
      .insert({
        email: email.toLowerCase().trim(),
        first_name: firstName,
        last_name: lastName,
        signed_at: new Date().toISOString()
      });

    if (error) {
      console.error('Database Insert Error:', error);
      return res.status(500).json({ error: error.message });
    }

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('Webhook Error:', error);
    return res.status(500).json({ error: error.message });
  }
}