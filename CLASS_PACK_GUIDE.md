# Class Pack Implementation Guide

## Overview
Your Ascend Academy system now supports **in-season class packs** alongside monthly subscriptions. Athletes can purchase packs of classes that expire after a set period, perfect for in-season training.

## Class Pack Options

### 45-Minute Sessions (In-Season)
- **10-Pack**: $150 ($15/class) - 2 months to use
- **20-Pack**: $300 ($15/class) - 3 months to use

### 1hr 15min Sessions (Performance)
- **10-Pack**: $300 ($30/class) - 2 months to use
- **20-Pack**: $600 ($30/class) - 3 months to use

## Setup Required

### 1. Create Stripe Products (REQUIRED)

In your Stripe Dashboard, create 4 new products:

**Test Mode Products:**
1. **In-Season 10-Pack (45 min)**
   - Price: $150
   - Type: One-time payment
   - Copy the Price ID (e.g., `price_xxxxx`)

2. **In-Season 20-Pack (45 min)**
   - Price: $300
   - Type: One-time payment
   - Copy the Price ID

3. **Performance 10-Pack (1hr 15min)**
   - Price: $300
   - Type: One-time payment
   - Copy the Price ID

4. **Performance 20-Pack (1hr 15min)**
   - Price: $600
   - Type: One-time payment
   - Copy the Price ID

**Live Mode Products:**
Repeat the above for live mode.

### 2. Update constants.ts

Replace the placeholder price IDs in `constants.ts`:

```typescript
pack_10_45min: {
  live: 'price_YOUR_LIVE_ID_HERE',
  test: 'price_YOUR_TEST_ID_HERE'
},
// ... repeat for other 3 packs
```

### 3. Run Database Migration

Execute the SQL migration to create the class_packs table:

```bash
# In your Supabase dashboard SQL editor, run:
supabase/migrations/create_class_packs_table.sql
```

Or if using CLI:
```bash
supabase db push
```

This creates:
- `class_packs` table for tracking credits
- `class_pack_id` column in `registrations` table
- Proper RLS policies
- Indexes for performance

## How It Works

### Purchase Flow
1. Parent selects a class pack on homepage
2. Goes to checkout page, selects athlete
3. Completes one-time Stripe payment
4. Webhook adds credits to athlete's account with expiration date
5. Credits appear in dashboard immediately

### Using Credits
1. Parent/athlete registers for a session
2. System checks:
   - Session duration (45min or 75min)
   - Available matching class pack credits
   - Expiration dates
3. If subscription monthly limit is reached, automatically uses class pack credits
4. Credits are decremented after successful registration
5. Athletes can use subscriptions + class packs together

### Smart Credit Logic
- **Subscription Priority**: Uses monthly subscription slots first
- **Automatic Fallback**: When subscription limit reached, uses class pack credits
- **Duration Matching**: 45min packs only work for 45min sessions, 75min packs for 75min sessions
- **No Wasted Credits**: System prevents using wrong pack type for a session

## User Interface

### Homepage
- Separated "Monthly Memberships" and "In-Season Class Packs"
- Class packs show expiration period badge
- Clear "one-time" pricing label

### User Dashboard
Athletes with class packs see:
- Credit count and pack type
- Days remaining until expiration
- "Buy More Credits" button
- Credits display alongside subscription info

### Admin View
Admins can see all athletes' class packs including:
- Credits remaining
- Purchase date
- Expiration date
- Pack type

## Database Schema

### class_packs Table
```sql
- id: UUID (primary key)
- child_id: UUID (references children)
- pack_type: TEXT ('10pack_45min', '20pack_45min', etc.)
- credits_remaining: INTEGER
- credits_total: INTEGER
- purchase_date: TIMESTAMPTZ
- expires_at: TIMESTAMPTZ
- stripe_payment_id: TEXT
```

### registrations Table (Updated)
```sql
- class_pack_id: UUID (references class_packs)
  - NULL for subscription-based registrations
  - Set when using class pack credit
```

## Testing Checklist

- [ ] Create test mode Stripe products
- [ ] Update price IDs in constants.ts
- [ ] Run database migration
- [ ] Test class pack purchase flow
- [ ] Verify credits appear in dashboard
- [ ] Test session registration with class pack
- [ ] Verify credits decrement properly
- [ ] Test expiration (manually set expires_at in past)
- [ ] Test with both subscription + class pack
- [ ] Test 45min vs 75min pack matching

## Common Issues

**"No class pack credits available"**
- Check athlete has active pack (not expired, has credits > 0)
- Verify pack type matches session duration

**Credits not showing in dashboard**
- Check webhook processed successfully
- Verify database migration ran
- Check RLS policies allow parent to view

**Wrong price on checkout**
- Verify price IDs in constants.ts match Stripe
- Check test/live mode matches

## Future Enhancements

Potential additions you might want:
- Pack gifting (sponsor buys pack for athlete)
- Family packs (credits shared across siblings)
- Auto-refill when credits run low
- Pack transfer between athletes
- Bulk purchase discounts
- Email notifications for expiring packs

## Support

If you encounter issues:
1. Check Stripe webhook logs for payment processing
2. Check Supabase logs for database errors
3. Verify all migrations ran successfully
4. Confirm RLS policies allow proper access
