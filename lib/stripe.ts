import { loadStripe } from '@stripe/stripe-js';

// Safe access to environment variables
const env = (import.meta as any).env || {};
const STRIPE_KEY = env.VITE_STRIPE_TEST_PUBLISHABLE_KEY || '';

if (!STRIPE_KEY) {
  console.warn('Stripe Key Missing: Checkout features will be disabled in demo.');
}

export const stripePromise = STRIPE_KEY ? loadStripe(STRIPE_KEY) : Promise.resolve(null);