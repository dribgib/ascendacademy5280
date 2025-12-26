export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');

  if (req.method === 'OPTIONS') return res.status(200).end();

  const { email, name } = req.body;

  if (!email || !name) {
      return res.status(400).json({ error: 'Missing email or name', verified: false });
  }

  // --- WAIVER CHECK LOGIC ---
  // If you have a real API key for WaiverSign, use it here.
  // const waiverApiKey = process.env.WAIVER_API_KEY;
  
  // For now, we simulate a check.
  // IMPORTANT: The user said "It should check name AND email".
  // Since we don't have the real DB, we are mocking success, 
  // but validating that inputs were provided.
  
  // To verify this "fails" in testing, you could add logic like:
  // if (name.toLowerCase() === 'fail me') return res.status(200).json({ verified: false });

  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 800));

  // Return Verified
  return res.status(200).json({ verified: true });
}