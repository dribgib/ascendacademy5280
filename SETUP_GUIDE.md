# Ascend Academy 5280 - System Setup Guide

## 1. Architecture
This is a standard React application (Vite) using **Vercel Serverless Functions** for the backend logic and **Supabase** for the Database.

## 2. Environment Variables (Vercel)

Go to your Vercel Project Settings > Environment Variables and add these:

1.  `VITE_PUBLIC_SUPABASE_URL`: Your Supabase Project URL.
2.  `VITE_PUBLIC_SUPABASE_ANON_KEY`: Your Supabase Anon Public Key.
3.  `VITE_STRIPE_PUBLISHABLE_KEY`: Your Stripe Public Key (starts with pk_).
4.  `STRIPE_SECRET_KEY`: Your Stripe Secret Key (starts with sk_). **(Do not prefix with VITE_)**

## 3. Database Setup (Supabase)

1.  Go to Supabase Dashboard > SQL Editor.
2.  Run the contents of `supabase_schema.sql` to create basic tables.
3.  **IMPORTANT:** Run the contents of `supabase/fix_schema.sql` to fix the "missing column" error and create the waivers table.
4.  Run the contents of `supabase/fix_storage_rls.sql` to enable image uploads.

## 4. Webhooks (Optional but Recommended)
To automatically update subscription status when a payment succeeds:
1.  Create a file `api/stripe-webhook.js`.
2.  Add a Webhook endpoint in Stripe Dashboard pointing to `https://your-site.vercel.app/api/stripe-webhook`.
3.  Select events: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`.

## 5. Zapier Setup (Waivers)
To integrate WaiverSign/DocuSign via Zapier:
1.  **Action:** POST
2.  **URL:** `https://your-site.vercel.app/api/webhook-waiver`
3.  **Payload Type:** JSON
4.  **Wrap Request in Array:** No
5.  **Unflatten:** Yes
6.  **Data:** Map `email`, `firstName`, `lastName`.

## 6. Admin Setup
To make a user an Admin:
1.  Sign up on the site.
2.  Run `admin_roles.sql` in Supabase SQL Editor.
