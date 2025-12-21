import { loadStripe } from '@stripe/stripe-js';

// Safely access environment variable
// @ts-ignore
const env = import.meta.env || {};

// LOGIC: Check for TEST key first, then LIVE key.
// @ts-ignore
const STRIPE_KEY = env.VITE_STRIPE_TEST_PUBLISHABLE_KEY || env.VITE_STRIPE_LIVE_PUBLISHABLE_KEY || env.VITE_STRIPE_PUBLISHABLE_KEY;

if (!STRIPE_KEY) {
  console.warn('Stripe Key Missing: Checkout features will be disabled. Check your Vercel Environment Variables.');
} else {
  if (STRIPE_KEY.startsWith('pk_test_')) {
    console.log('Ascend Academy: Stripe initialized in TEST mode.');
  } else {
    console.log('Ascend Academy: Stripe initialized in LIVE mode.');
  }
}

export const stripePromise = STRIPE_KEY ? loadStripe(STRIPE_KEY) : Promise.resolve(null);