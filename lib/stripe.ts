import { loadStripe } from '@stripe/stripe-js';

// Safely access environment variable
// @ts-ignore
const env = import.meta.env || {};
// @ts-ignore
const STRIPE_KEY = env.VITE_STRIPE_TEST_PUBLISHABLE_KEY;

if (!STRIPE_KEY) {
  console.warn('Stripe Key Missing: Checkout features will be disabled in demo.');
}

export const stripePromise = STRIPE_KEY ? loadStripe(STRIPE_KEY) : Promise.resolve(null);