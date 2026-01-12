
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY || process.env.VITE_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// IDs from WaiverSign (must match constants.ts/Zapier)
const LIABILITY_DOC_ID = '32183';
const PHOTO_DOC_ID = '32390';

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
    const { email } = body || {};

    if (!email) {
        return res.status(200).json({ verified: false, message: 'Missing email.' });
    }

    // 1. CHECK LOCAL DATABASE
    const { data: waivers, error } = await supabase
        .from('waivers')
        .select('document_id')
        .ilike('email', email.trim());

    if (error) {
        console.error("DB Error checking waiver:", error);
        throw error;
    }

    const foundIDs = waivers?.map(w => String(w.document_id)) || [];
    
    // Check strict requirements if we have doc IDs stored, otherwise fallback to finding any 2 waivers (legacy support)
    const hasLiability = foundIDs.includes(LIABILITY_DOC_ID);
    const hasPhoto = foundIDs.includes(PHOTO_DOC_ID);
    
    // Fallback: If document_id is missing in DB (legacy records), count records
    const legacyCount = waivers?.filter(w => !w.document_id).length || 0;
    
    // Logic: Verified if we have specific IDs OR enough legacy records
    // Assuming if we found 2 records total, user is likely good, but specific IDs are safer for new flow.
    const isVerified = (hasLiability && hasPhoto) || (foundIDs.length + legacyCount >= 2);

    if (isVerified) {
        return res.status(200).json({ verified: true });
    }

    // Partial status logic
    let msg = 'Waivers missing.';
    if (hasLiability && !hasPhoto) msg = 'Liability signed. Photo waiver missing.';
    if (!hasLiability && hasPhoto) msg = 'Photo signed. Liability waiver missing.';
    if (!hasLiability && !hasPhoto) msg = 'No waivers found.';

    return res.status(200).json({ 
        verified: false, 
        message: `${msg} Please allow up to 2 minutes for processing.` 
    });

  } catch (error) {
      console.error("[WaiverCheck] Critical Error:", error);
      return res.status(200).json({ 
          verified: false, 
          message: 'System error. Please use manual confirmation.' 
      });
  }
}
