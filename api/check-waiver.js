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

    if (!email || !name) {
        return res.status(200).json({ verified: false, message: 'Missing email or name' });
    }

    const apiKey = process.env.WAIVERSIGN_API_KEY;
    if (!apiKey) {
        return res.status(200).json({ 
            verified: false, 
            message: 'Server Config Error: WAIVERSIGN_API_KEY missing.' 
        });
    }

    // Attempt the API call
    try {
        const searchUrl = `https://api.waiversign.com/v1/signatures?email=${encodeURIComponent(email)}`;
        console.log(`[WaiverCheck] Fetching: ${searchUrl}`);

        const response = await fetch(searchUrl, {
            method: 'GET',
            headers: {
                'X-API-KEY': apiKey,
                'Accept': 'application/json'
            }
        });

        if (!response.ok) {
             const errorText = await response.text();
             console.error(`[WaiverCheck] API Error ${response.status}: ${errorText}`);
             // If 403/401, key is likely wrong. If 404, endpoint wrong.
             return res.status(200).json({ 
                 verified: false, 
                 message: `WaiverSign Connection Error: ${response.status}. The API Key or Endpoint might be incorrect.` 
             });
        }

        const data = await response.json();

        if (!Array.isArray(data)) {
            return res.status(200).json({ verified: false, message: 'Invalid response from WaiverSign.' });
        }

        // Logic to match name
        const targetName = name.toLowerCase().trim();
        const match = data.find(sig => {
            const fname = (sig.fname || '').toLowerCase().trim();
            const lname = (sig.lname || '').toLowerCase().trim();
            const fullName = `${fname} ${lname}`;
            
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

            return res.status(200).json({ 
                verified: false, 
                message: foundNames 
                  ? `Found waivers for ${email} but names didn't match "${name}". Found: ${foundNames}` 
                  : `No waivers found for ${email}.`
            });
        }

    } catch (networkError) {
        console.error("[WaiverCheck] Network/Fetch Error:", networkError);
        return res.status(200).json({ 
            verified: false, 
            message: `Connection failed: ${networkError.message}. (API might be unreachable)`
        });
    }

  } catch (error) {
      console.error("[WaiverCheck] Critical Error:", error);
      return res.status(200).json({ verified: false, message: `Internal Error: ${error.message}` });
  }
}