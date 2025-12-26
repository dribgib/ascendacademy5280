export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');

  if (req.method === 'OPTIONS') return res.status(200).end();

  const { email, name } = req.body;

  // STRICT VALIDATION
  if (!email || !name) {
      return res.status(400).json({ error: 'Missing required fields: name and email', verified: false });
  }

  // PRODUCTION READY LOGIC
  // This connects to the WaiverSign API.
  // Requirement: Env Var WAIVERSIGN_API_KEY must be set in Vercel.
  
  const apiKey = process.env.WAIVERSIGN_API_KEY;

  if (!apiKey) {
      return res.status(500).json({ 
          error: 'Server Error: WaiverSign API Key is not configured. Please contact support.', 
          verified: false 
      });
  }

  try {
      // WaiverSign API Search
      // Logic: Search for a signature matching Email AND Name
      const searchUrl = `https://api.waiversign.com/v1/signatures?email=${encodeURIComponent(email)}&signerName=${encodeURIComponent(name)}`;
      
      const response = await fetch(searchUrl, {
          headers: {
              'X-API-KEY': apiKey,
              'Accept': 'application/json'
          }
      });

      if (!response.ok) {
           // If API returns 404 or error, we assume not found/valid
           console.error("WaiverSign API Error", response.status);
           return res.status(200).json({ verified: false, message: 'Waiver record not found.' });
      }

      const data = await response.json();

      // Check if we have results
      // Assuming API returns array of matches
      if (Array.isArray(data) && data.length > 0) {
          return res.status(200).json({ verified: true });
      } else {
          return res.status(200).json({ verified: false });
      }

  } catch (error) {
      console.error("Waiver Verification Exception:", error);
      return res.status(500).json({ error: 'Failed to verify waiver status with provider.', verified: false });
  }
}