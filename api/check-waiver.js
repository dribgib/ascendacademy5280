export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');

  if (req.method === 'OPTIONS') return res.status(200).end();

  const { email, name } = req.body;

  if (!email || !name) {
      return res.status(400).json({ error: 'Missing required fields: name and email', verified: false });
  }

  const apiKey = process.env.WAIVERSIGN_API_KEY;

  if (!apiKey) {
      return res.status(500).json({ 
          error: 'Server Error: WaiverSign API Key is not configured.', 
          verified: false 
      });
  }

  try {
      // 1. Search by Email Only (Broad Search)
      // The API's signerName filter can be too strict or check the wrong field.
      // We fetch all waivers for this parent and filter in code.
      const searchUrl = `https://api.waiversign.com/v1/signatures?email=${encodeURIComponent(email)}`;
      
      const response = await fetch(searchUrl, {
          headers: {
              'X-API-KEY': apiKey,
              'Accept': 'application/json'
          }
      });

      if (!response.ok) {
           console.error("WaiverSign API Error", response.status);
           return res.status(200).json({ verified: false, message: 'Could not connect to WaiverSign provider.' });
      }

      const data = await response.json();

      if (!Array.isArray(data)) {
          return res.status(200).json({ verified: false, message: 'Invalid response from waiver provider.' });
      }

      // 2. Perform Matching Logic
      const targetName = name.toLowerCase().trim();
      
      const match = data.find(sig => {
          const fname = (sig.fname || '').toLowerCase().trim();
          const lname = (sig.lname || '').toLowerCase().trim();
          const fullName = `${fname} ${lname}`;
          
          // Check for exact match, inverted match, or partial containment
          return fullName === targetName || 
                 fullName.includes(targetName) || 
                 targetName.includes(fullName);
      });

      if (match) {
          return res.status(200).json({ verified: true });
      } else {
          // Helpful debug info for the user
          const foundNames = data
            .map(s => `${s.fname} ${s.lname}`)
            .filter(n => n.trim().length > 0)
            .join(', ');

          const msg = foundNames 
            ? `Waivers found for ${email}, but names did not match "${name}". Found: ${foundNames}.` 
            : `No waivers found for ${email}. Please ensure you signed using this email address.`;

          return res.status(200).json({ verified: false, message: msg });
      }

  } catch (error) {
      console.error("Waiver Verification Exception:", error);
      return res.status(500).json({ error: 'Internal verification error.', verified: false });
  }
}