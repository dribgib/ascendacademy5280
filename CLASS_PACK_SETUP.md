# Class Pack Setup Checklist

## 🎯 Implementation Complete!

Your class pack system is fully built. Here's what you need to do to activate it:

---

## ✅ Step 1: Create Stripe Products

### Test Mode (Do this first for testing)
Go to: https://dashboard.stripe.com/test/products

Create these 4 products as **One-time payments**:

1. **In-Season 10-Pack (45 min)** - $150
2. **In-Season 20-Pack (45 min)** - $300  
3. **Performance 10-Pack (75 min)** - $300
4. **Performance 20-Pack (75 min)** - $600

Copy each **Price ID** (looks like `price_1abc123...`)

### Live Mode (After testing)
Go to: https://dashboard.stripe.com/products

Repeat the above 4 products and copy Price IDs

---

## ✅ Step 2: Update Price IDs

Open: `constants.ts` (lines 60-76)

Replace these placeholder values:

```typescript
pack_10_45min: {
  live: 'price_REPLACE_WITH_LIVE_ID_1',  // ← Paste your live Price ID
  test: 'price_REPLACE_WITH_TEST_ID_1'   // ← Paste your test Price ID
},
pack_20_45min: {
  live: 'price_REPLACE_WITH_LIVE_ID_2',
  test: 'price_REPLACE_WITH_TEST_ID_2'
},
pack_10_75min: {
  live: 'price_REPLACE_WITH_LIVE_ID_3',
  test: 'price_REPLACE_WITH_TEST_ID_3'
},
pack_20_75min: {
  live: 'price_REPLACE_WITH_LIVE_ID_4',
  test: 'price_REPLACE_WITH_TEST_ID_4'
}
```

---

## ✅ Step 3: Run Database Migration

### Option A: Supabase Dashboard
1. Go to your Supabase project
2. Click "SQL Editor"
3. Copy/paste contents of: `supabase/migrations/create_class_packs_table.sql`
4. Click "Run"

### Option B: Supabase CLI
```bash
supabase db push
```

This creates the `class_packs` table and updates the `registrations` table.

---

## ✅ Step 4: Test It!

1. **Visit Homepage**: Should see class packs in separate section
2. **Click "Buy Pack"**: Should go to checkout
3. **Complete Purchase**: Use Stripe test card: `4242 4242 4242 4242`
4. **Check Dashboard**: Credits should appear
5. **Register for Session**: Should use credits properly

---

## 🎉 That's It!

Once you complete these 3 steps, your class pack system will be live!

---

## 📋 What Was Built

### Backend
- ✅ Database table for class pack tracking
- ✅ Stripe webhook handler for pack purchases
- ✅ Registration logic to use credits
- ✅ Credit expiration tracking
- ✅ Duration-based pack matching (45min vs 75min)

### Frontend
- ✅ Homepage displays class packs
- ✅ Checkout flow supports one-time payments
- ✅ Dashboard shows remaining credits
- ✅ Credits display with expiration countdown

### Smart Features
- ✅ Auto-fallback to packs when subscription limit reached
- ✅ Prevents using wrong pack type for sessions
- ✅ Multiple packs per athlete supported
- ✅ Works alongside monthly subscriptions

---

## ⚠️ Important Notes

1. **Test Mode First**: Always test with Stripe test mode before going live
2. **Webhook Setup**: Ensure your Stripe webhook is configured to send to `/api/stripe-webhook`
3. **Price IDs**: Test and Live price IDs are different - you need both
4. **Session Duration**: Make sure events have correct start/end times for pack matching

---

## 🆘 Need Help?

Check `CLASS_PACK_GUIDE.md` for detailed documentation, troubleshooting, and future enhancement ideas.
