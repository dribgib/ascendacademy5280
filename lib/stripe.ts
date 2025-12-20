import { loadStripe } from '@stripe/stripe-js';

// Access environment variables safely
const env = (import.meta as any).env || {};

// Use Test Key for now, or Live key if configured for production
const STRIPE_KEY = env.VITE_STRIPE_TEST_PUBLISHABLE_KEY || env.STRIPE_TEST_PUBLISHABLE_KEY || '';

if (!STRIPE_KEY) {
  console.warn('Stripe Publishable Key is missing. Checkout will not function.');
}

// Only call loadStripe if we have a key, otherwise return a null promise
export const stripePromise = STRIPE_KEY ? loadStripe(STRIPE_KEY) : Promise.resolve(null);