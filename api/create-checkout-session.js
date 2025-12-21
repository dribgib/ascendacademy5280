import Stripe from 'stripe';

// Check for Test key first, then Live key, then generic key
const stripeKey = process.env.STRIPE_TEST_SECRET_KEY || process.env.STRIPE_LIVE_SECRET_KEY || process.env.STRIPE_SECRET_KEY;

if (!stripeKey) {
  throw new Error('Missing Stripe Secret Key in Environment Variables');
}

const stripe = new Stripe(stripeKey);

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const { priceId, userId, childId, returnUrl } = req.body;

    // Create the session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: `${returnUrl}?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${returnUrl}`,
      client_reference_id: userId,
      metadata: {
        childId: childId,
        userId: userId
      }
    });

    return res.status(200).json({ sessionId: session.id });
  } catch (error) {
    console.error('Stripe Error:', error);
    return res.status(400).json({ error: error.message });
  }
}