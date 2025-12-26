export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');

  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    // 1. Robust Body Parsing
    // Vercel sometimes passes body as string or object depending on content-type header
    let body = req.body;
    if (typeof body === 'string') {
        try {
            body = JSON.parse(body);
        } catch (e) {
            console.error("JSON Parse Error:", e);
        }
    }
    const { email, name } = body || {};

    if (!email || !name) {
        return res.status(400).json({ error: 'Missing required fields: name and email', verified: false });
    }

    const apiKey = process.env.WAIVERSIGN_API_KEY;
    if (!apiKey) {
        console.error("Missing WAIVERSIGN_API_KEY");
        return res.status(500).json({ 
            error: 'Server Error: WaiverSign API Key is not configured.', 
            verified: false 
        });
    }

    // 2. Ensure Fetch Availability
    if (typeof fetch === 'undefined') {
         throw new Error("Fetch API not available. Ensure Vercel is using Node 18+.");
    }

    const searchUrl = `https://api.waiversign.com/v1/signatures?email=${encodeURIComponent(email)}`;
    console.log(`Searching Waivers for: ${email}`);

    const response = await fetch(searchUrl, {
        method: 'GET',
        headers: {
            'X-API-KEY': apiKey,
            'Accept': 'application/json'
        }
    });

    if (!response.ok) {
         const errorText = await response.text();
         console.error(`WaiverSign API Error (${response.status}):`, errorText);
         return res.status(200).json({ 
             verified: false, 
             message: `Provider returned error: ${response.status} ${response.statusText}` 
         });
    }

    const data = await response.json();

    if (!Array.isArray(data)) {
        console.error("Invalid Response Data:", data);
        return res.status(200).json({ verified: false, message: 'Invalid response format from waiver provider.' });
    }

    // 3. Flexible Name Matching
    const targetName = name.toLowerCase().trim();
    
    const match = data.find(sig => {
        const fname = (sig.fname || '').toLowerCase().trim();
        const lname = (sig.lname || '').toLowerCase().trim();
        const fullName = `${fname} ${lname}`;
        
        // Match: Exact, Contains, or Reversed (Parent Name check logic if child name not present)
        return fullName === targetName || 
               fullName.includes(targetName) || 
               targetName.includes(fullName) ||
               `${lname} ${fname}` === targetName;
    });

    if (match) {
        return res.status(200).json({ verified: true });
    } else {
        const foundNames = data
          .map(s => `${s.fname} ${s.lname}`)
          .filter(n => n.trim().length > 0)
          .join(', ');

        const msg = foundNames 
          ? `Waivers found for ${email}, but names did not match "${name}". Found: ${foundNames}.` 
          : `No waivers found for ${email}. Please ensure you signed using this email address.`;

        console.log(`Verification Mismatch. Looking for: ${targetName}. Found: ${foundNames}`);
        
        return res.status(200).json({ verified: false, message: msg });
    }

  } catch (error) {
      console.error("Waiver Verification Crash:", error);
      // Return actual error message for debugging
      return res.status(500).json({ error: error.message || 'Internal Server Error', verified: false });
  }
}