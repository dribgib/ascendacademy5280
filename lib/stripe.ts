import { loadStripe } from '@stripe/stripe-js';

// Access environment variable directly for Vite replacement
// @ts-ignore
const STRIPE_KEY = import.meta.env.VITE_STRIPE_TEST_PUBLISHABLE_KEY;

if (!STRIPE_KEY) {
  console.warn('Stripe Key Missing: Checkout features will be disabled in demo.');
}

export const stripePromise = STRIPE_KEY ? loadStripe(STRIPE_KEY) : Promise.resolve(null);