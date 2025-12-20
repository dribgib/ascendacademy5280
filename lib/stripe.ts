import { loadStripe } from '@stripe/stripe-js';

// Access environment variables safely
const env = (import.meta as any).env || {};

/**
 * STRIPE SECURITY NOTE:
 * 
 * 1. Publishable Keys (pk_test_..., pk_live_...) are PUBLIC by design. 
 *    They are required in the browser to create secure tokens.
 *    They cannot be used to charge cards without a Secret Key on the server.
 *    
 * 2. Secret Keys (sk_test_..., sk_live_...) are PRIVATE.
 *    These should NEVER be exposed in this file or any frontend code.
 *    Only use them in Supabase Edge Functions.
 * 
 * 3. Vite Requirement:
 *    For this app to see the key, the environment variable MUST start with "VITE_".
 *    Example: VITE_STRIPE_TEST_PUBLISHABLE_KEY
 */

// Try to find the key in various common locations
const STRIPE_KEY = 
  env.VITE_STRIPE_TEST_PUBLISHABLE_KEY || 
  env.STRIPE_TEST_PUBLISHABLE_KEY || 
  '';

if (!STRIPE_KEY) {
  console.warn(
    'Stripe Publishable Key is missing.\n' + 
    'Please add VITE_STRIPE_TEST_PUBLISHABLE_KEY to your environment variables.\n' +
    'It is safe and necessary to expose the "pk_test_..." key to the browser.'
  );
}

// Only call loadStripe if we have a key, otherwise return a null promise
// This prevents the "empty string" error from crashing the app
export const stripePromise = STRIPE_KEY ? loadStripe(STRIPE_KEY) : Promise.resolve(null);