import Stripe from 'stripe';

// Check for Live key, then Test key, then generic key
const stripeKey = process.env.STRIPE_LIVE_SECRET_KEY || process.env.STRIPE_TEST_SECRET_KEY || process.env.STRIPE_SECRET_KEY;

if (!stripeKey) {
  throw new Error('Missing Stripe Secret Key in Environment Variables');
}

const stripe = new Stripe(stripeKey);

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const { amount, userId, returnUrl } = req.body;

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: 'Donation to Ascend Academy',
              description: 'Thank you for supporting our young athletes.',
            },
            unit_amount: Math.round(amount * 100), // Convert to cents
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${returnUrl}?donation_success=true`,
      cancel_url: returnUrl,
      client_reference_id: userId,
      metadata: {
        type: 'donation',
        userId: userId
      }
    });

    return res.status(200).json({ sessionId: session.id });
  } catch (error) {
    console.error('Stripe Error:', error);
    return res.status(400).json({ error: error.message });
  }
}