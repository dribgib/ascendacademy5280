import { loadStripe } from '@stripe/stripe-js';

// Safely access environment variable
// @ts-ignore
const env = import.meta.env || {};

// Check for LIVE key first, then fall back to TEST key
// @ts-ignore
const STRIPE_KEY = env.VITE_STRIPE_PUBLISHABLE_KEY || env.VITE_STRIPE_TEST_PUBLISHABLE_KEY;

if (!STRIPE_KEY) {
  console.warn('Stripe Key Missing: Checkout features will be disabled in demo. Set VITE_STRIPE_PUBLISHABLE_KEY or VITE_STRIPE_TEST_PUBLISHABLE_KEY.');
}

export const stripePromise = STRIPE_KEY ? loadStripe(STRIPE_KEY) : Promise.resolve(null);