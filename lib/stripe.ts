import { loadStripe } from '@stripe/stripe-js';

// Safely access environment variable
// @ts-ignore
const env = import.meta.env || {};

// Check for TEST key first, then fall back to LIVE key
// This allows you to easily switch to test mode by defining VITE_STRIPE_TEST_PUBLISHABLE_KEY
// @ts-ignore
const STRIPE_KEY = env.VITE_STRIPE_TEST_PUBLISHABLE_KEY || env.VITE_STRIPE_PUBLISHABLE_KEY;

if (!STRIPE_KEY) {
  console.warn('Stripe Key Missing: Checkout features will be disabled. Set VITE_STRIPE_TEST_PUBLISHABLE_KEY or VITE_STRIPE_PUBLISHABLE_KEY.');
} else if (STRIPE_KEY.startsWith('pk_test_')) {
    console.log('Ascend Academy: Stripe initialized in TEST mode.');
}

export const stripePromise = STRIPE_KEY ? loadStripe(STRIPE_KEY) : Promise.resolve(null);