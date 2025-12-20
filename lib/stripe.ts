import { loadStripe } from '@stripe/stripe-js';

// Access environment variables safely
const env = (import.meta as any).env || {};

// Use Test Key for now, or Live key if configured for production
const STRIPE_KEY = env.VITE_STRIPE_TEST_PUBLISHABLE_KEY || env.STRIPE_TEST_PUBLISHABLE_KEY || '';

if (!STRIPE_KEY) {
  console.warn('Stripe Publishable Key is missing. Checkout will not function.');
}

export const stripePromise = loadStripe(STRIPE_KEY);