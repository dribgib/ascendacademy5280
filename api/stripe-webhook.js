
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

// Configuration
const stripeKey = process.env.STRIPE_LIVE_SECRET_KEY || process.env.STRIPE_SECRET_KEY || process.env.STRIPE_TEST_SECRET_KEY;
const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET; 
const supabaseUrl = process.env.VITE_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY; 

if (!stripeKey || !supabaseUrl || !supabaseServiceKey) {
  console.error('Webhook Error: Missing Env Variables');
}

const stripe = new Stripe(stripeKey);
// Must use Service Role Key to bypass RLS and write to tables
const supabase = createClient(supabaseUrl, supabaseServiceKey);

export const config = {
  api: {
    bodyParser: false,
  },
};

async function buffer(readable) {
  const chunks = [];
  for await (const chunk of readable) {
    chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
  }
  return Buffer.concat(chunks);
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).end('Method Not Allowed');
  }

  const buf = await buffer(req);
  let event;

  try {
    if (endpointSecret) {
        const sig = req.headers['stripe-signature'];
        event = stripe.webhooks.constructEvent(buf, sig, endpointSecret);
    } else {
        event = JSON.parse(buf.toString());
    }
  } catch (err) {
    console.error(`Webhook signature verification failed: ${err.message}`);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  try {
      switch (event.type) {
        // 1. Session Completed: Sync Customer ID & Handle Class Pack Purchases
        case 'checkout.session.completed': {
            const session = event.data.object;
            const userId = session.client_reference_id; // Passed from create-checkout-session
            const customerId = session.customer;
            const isClassPack = session.metadata?.isClassPack === 'true';
            const packType = session.metadata?.packType;
            const childId = session.metadata?.childId;

            if (userId && customerId) {
                const { error } = await supabase
                    .from('profiles')
                    .update({ stripe_customer_id: customerId })
                    .eq('id', userId);
                
                if (error) console.error('Error syncing customer ID:', error);
            }

            // Handle class pack purchase
            if (isClassPack && packType && childId && session.payment_status === 'paid') {
                const packConfig = {
                  pack_10_45min: { credits: 10, expirationMonths: 2 },
                  pack_20_45min: { credits: 20, expirationMonths: 3 },
                  pack_10_75min: { credits: 10, expirationMonths: 2 },
                  pack_20_75min: { credits: 20, expirationMonths: 3 }
                };

                const config = packConfig[packType];
                if (config) {
                    const purchaseDate = new Date();
                    const expiresAt = new Date(purchaseDate);
                    expiresAt.setMonth(expiresAt.getMonth() + config.expirationMonths);

                    const { error: packError } = await supabase
                        .from('class_packs')
                        .insert({
                            child_id: childId,
                            pack_type: packType,
                            credits_remaining: config.credits,
                            credits_total: config.credits,
                            purchase_date: purchaseDate.toISOString(),
                            expires_at: expiresAt.toISOString(),
                            stripe_payment_id: session.payment_intent
                        });

                    if (packError) console.error('Class Pack Insert Error:', packError);
                }
            }
            break;
        }

        // 2. Subscription Created / Updated
        case 'customer.subscription.created':
        case 'customer.subscription.updated': {
            const subscription = event.data.object;
            const status = subscription.status; 
            const priceId = subscription.items.data[0]?.price.id;
            
            // Metadata propagates from Subscription Data
            const childId = subscription.metadata?.childId;
            const userId = subscription.metadata?.userId;

            if (childId && userId) {
                // Upsert using stripe_subscription_id as unique key
                const { error } = await supabase
                    .from('subscriptions')
                    .upsert({
                        stripe_subscription_id: subscription.id, // Unique Key
                        user_id: userId,
                        child_id: childId,
                        package_id: priceId,
                        status: status,
                        current_period_end: new Date(subscription.current_period_end * 1000).toISOString()
                    }, { onConflict: 'stripe_subscription_id' }); 

                if (error) console.error('Subscription Upsert Error:', error);
            }
            break;
        }

        // 3. Subscription Deleted
        case 'customer.subscription.deleted': {
             const subscription = event.data.object;
             const subId = subscription.id;
             
             await supabase
                .from('subscriptions')
                .update({ status: 'canceled' })
                .eq('stripe_subscription_id', subId);
             break;
        }
      }
  } catch (err) {
      console.error('Webhook Processing Error:', err);
      return res.status(500).json({ error: err.message });
  }

  res.json({ received: true });
}
