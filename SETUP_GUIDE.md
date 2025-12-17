# Ascend Academy 5280 - System Setup Guide

## 1. Security & Keys (READ CAREFULLY)

### A. Finding the Right Keys in Supabase
Supabase has two types of keys. You need the **Project API Keys** (sometimes labeled "Legacy").

1. Go to **Settings > API**.
2. Look for **"Project API Keys"** or **"Legacy anon, service_role API keys"**.
3. Copy the `anon` `public` key. **It must start with `ey...`**.
   * *Do NOT use the `sb_publishable` key.*

### B. Adding Keys to Vercel (Production)
1. Go to Vercel Dashboard -> Settings -> Environment Variables.
2. Add the following:
   * `VITE_PUBLIC_SUPABASE_URL`: Your project URL (e.g., `https://xyz.supabase.co`).
   * `VITE_PUBLIC_SUPABASE_ANON_KEY`: The key starting with `ey...`.
   * `VITE_PUBLIC_STRIPE_PUBLISHABLE_KEY`: From Stripe (starts with `pk_test_` or `pk_live_`).
3. **CRITICAL STEP:** Go to the **Deployments** tab and click **Redeploy**. New variables only load on a fresh build.

---

## 2. Quick Troubleshooting

**"Target URL: MISSING"**
*   This means Vercel hasn't injected the variables yet.
*   **Fix:** Did you Redeploy after adding the variables?

**"AuthApiError: Invalid API Key"**
*   Your `VITE_PUBLIC_SUPABASE_ANON_KEY` is wrong.
*   Ensure it starts with `ey`.

## 3. Admin Setup
To make yourself an admin:
1. Sign up on the site normally.
2. Go to Supabase > Table Editor > `profiles`.
3. Find your user row and change `role` from 'PARENT' to 'ADMIN'.
4. Refresh the app.
