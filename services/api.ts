
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { User, Child, Event } from '../types';
import { stripePromise } from '../lib/stripe';
import { PACKAGES } from '../constants';

// Helper to format ISO timestamp to h:mm A (12-hour) in Denver Time
const formatTime = (isoString: string) => {
  if (!isoString) return '';
  return new Date(isoString).toLocaleTimeString('en-US', { 
    hour: 'numeric', 
    minute: '2-digit', 
    hour12: true,
    timeZone: 'America/Denver' 
  });
};

// Helper to format ISO timestamp to HH:mm (24-hour) in Denver Time for Inputs
const formatTime24 = (isoString: string) => {
  if (!isoString) return '';
  // en-GB forces 24h format "HH:mm" usually
  return new Date(isoString).toLocaleTimeString('en-GB', { 
    hour: '2-digit', 
    minute: '2-digit', 
    hour12: false,
    timeZone: 'America/Denver' 
  });
};

// Helper to format ISO timestamp to YYYY-MM-DD in Denver Time
const formatDate = (isoString: string) => {
  if (!isoString) return '';
  // en-CA format is YYYY-MM-DD
  return new Intl.DateTimeFormat('en-CA', {
      timeZone: 'America/Denver',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
  }).format(new Date(isoString));
};

// --- REAL SUPABASE IMPLEMENTATION ---
const supabaseApi = {
  auth: {
    // 1. FAST USER LOAD (Metadata Preference)
    getUser: async (sessionUser?: any): Promise<User | null> => {
      let user = sessionUser;
      
      if (!user) {
        try {
            const { data } = await supabase.auth.getSession();
            user = data.session?.user;
        } catch (e) {
            return null;
        }
      }

      if (!user) return null;

      const meta = user.user_metadata || {};
      
      const appUser: User = {
        id: user.id,
        email: user.email!,
        firstName: meta.first_name || meta.firstName || '',
        lastName: meta.last_name || meta.lastName || '',
        phone: meta.phone || '',
        role: meta.role || 'PARENT', 
        stripeCustomerId: meta.stripe_customer_id
      };

      try {
        const dbPromise = supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();
          
        const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('TIMEOUT')), 1500));
        
        // @ts-ignore
        const { data } = await Promise.race([dbPromise, timeoutPromise]);
        
        if (data) {
          appUser.firstName = data.first_name || appUser.firstName;
          appUser.lastName = data.last_name || appUser.lastName;
          appUser.phone = data.phone || appUser.phone;
          appUser.role = data.role || appUser.role;
          appUser.stripeCustomerId = data.stripe_customer_id || appUser.stripeCustomerId;
        }
      } catch (e) {
        // Ignore timeout/error, return basic user immediately
      }

      return appUser;
    },

    refreshProfile: async (userId: string): Promise<Partial<User> | null> => {
        const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', userId)
            .single();
            
        if (error || !data) return null;
        
        return {
            firstName: data.first_name,
            lastName: data.last_name,
            phone: data.phone,
            role: data.role,
            stripeCustomerId: data.stripe_customer_id
        };
    },

    signIn: async (email: string, password: string) => {
      return await supabase.auth.signInWithPassword({ email, password });
    },

    signInWithOtp: async (email: string, meta?: any, redirectTo?: string) => {
      return await supabase.auth.signInWithOtp({
        email,
        options: {
          data: meta ? {
            first_name: meta.firstName,
            last_name: meta.lastName,
            phone: meta.phone
          } : undefined,
          emailRedirectTo: redirectTo
        }
      });
    },

    signUp: async (email: string, password: string, meta: { firstName: string, lastName: string, phone: string }) => {
      return await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            first_name: meta.firstName,
            last_name: meta.lastName,
            phone: meta.phone
          }
        }
      });
    },
    
    resetPasswordForEmail: async (email: string, redirectTo: string) => {
      return await supabase.auth.resetPasswordForEmail(email, { redirectTo });
    },

    updateUser: async (attributes: { password?: string }) => {
      return await supabase.auth.updateUser(attributes);
    },

    signOut: async () => {
      return await supabase.auth.signOut();
    }
  },

  admin: {
    getAllUsers: async (): Promise<User[]> => {
        const { data, error } = await supabase.from('profiles').select('*');
        if (error) throw error;
        return data.map((p: any) => ({
            id: p.id,
            email: p.email,
            firstName: p.first_name,
            lastName: p.last_name,
            phone: p.phone,
            role: p.role,
            stripeCustomerId: p.stripe_customer_id
        }));
    },
    
    getAllChildren: async (): Promise<Child[]> => {
        // 1. Fetch children with explicit subscription join
        // We use !inner join to filter or left join to include all
        // Here we want all children, so standard join.
        // We select all fields from subscriptions to ensure we can filter by status in JS
        const { data: children, error } = await supabase.from('children').select(`
            *,
            subscriptions (*),
            class_packs (*)
        `);
        if (error) throw error;

        // 2. Fetch usage stats
        const startOfMonth = new Date();
        startOfMonth.setDate(1);
        startOfMonth.setHours(0,0,0,0);
        const startIso = startOfMonth.toISOString();

        const { data: registrations } = await supabase
            .from('registrations')
            .select('child_id, event_id, events(start_time)')
            .gte('events.start_time', startIso);

        // 3. Map Data
        const now = new Date();
        return children.map((c: any) => {
            // Fix: subscriptions comes as an array. Sort by created_at desc or filter active.
            const subs = c.subscriptions || [];
            // We now check for 'active', 'trialing', AND 'paused'
            const activeSub = subs.find((s: any) => ['active', 'trialing', 'paused'].includes(s.status));
            
            let usageStats = undefined;

            if (activeSub) {
                const pkg = PACKAGES.find(p => p.id === activeSub.package_id || p.stripePriceId === activeSub.package_id);
                const limit = pkg ? pkg.maxSessions : 0;
                const planName = pkg ? pkg.name : 'Unknown Plan';
                const used = registrations?.filter((r: any) => r.child_id === c.id).length || 0;

                usageStats = { used, limit, planName };
            }

            // Map class packs (filter active ones)
            const classPacks = (c.class_packs || [])
                .filter((pack: any) => {
                    const expiresAt = new Date(pack.expires_at);
                    return pack.credits_remaining > 0 && expiresAt > now;
                })
                .map((pack: any) => ({
                    id: pack.id,
                    packType: pack.pack_type,
                    creditsRemaining: pack.credits_remaining,
                    creditsTotal: pack.credits_total,
                    purchaseDate: pack.purchase_date,
                    expiresAt: pack.expires_at,
                    stripePaymentId: pack.stripe_payment_id
                }));

            return {
                id: c.id,
                parentId: c.parent_id,
                firstName: c.first_name,
                lastName: c.last_name,
                dob: c.dob,
                sports: c.sports,
                qrCode: c.qr_code,
                image: c.image_url,
                subscriptionId: activeSub?.package_id,
                subscriptionStatus: activeSub ? activeSub.status : 'none', // Pass through specific status (active/paused)
                usageStats,
                classPacks
            };
        });
    },

    addRegistration: async (eventId: string, childId: string) => {
        const { error } = await supabase.from('registrations').insert({
            event_id: eventId,
            child_id: childId
        });
        if (error) throw error;
    },

    removeRegistration: async (eventId: string, childId: string) => {
        const { error } = await supabase.from('registrations')
            .delete()
            .match({ event_id: eventId, child_id: childId });
        if (error) throw error;
    },

    deleteEvent: async (eventId: string) => {
        const { error: regError } = await supabase
            .from('registrations')
            .delete()
            .eq('event_id', eventId);
        
        if (regError) throw regError;

        const { error } = await supabase.from('events').delete().eq('id', eventId);
        if (error) throw error;
    },

    deleteFutureSeries: async (baseEvent: Event) => {
        // 1. Find all matching future events (Same title, start_time >= current)
        const { data: futureEvents, error: fetchError } = await supabase
            .from('events')
            .select('id')
            .eq('title', baseEvent.title)
            .gte('start_time', baseEvent.isoStart);
        
        if (fetchError) throw fetchError;
        
        const idsToDelete = futureEvents.map((e: any) => e.id);
        
        if (idsToDelete.length === 0) return 0;

        // 2. Delete Registrations for these events
        const { error: regError } = await supabase
            .from('registrations')
            .delete()
            .in('event_id', idsToDelete);
        
        if (regError) throw regError;

        // 3. Delete Events
        const { error: delError } = await supabase
            .from('events')
            .delete()
            .in('id', idsToDelete);
            
        if (delError) throw delError;
        
        return idsToDelete.length;
    },

    deleteUser: async (userId: string) => {
        const { error } = await supabase.from('profiles').delete().eq('id', userId);
        if (error) throw error;
    }
  },

  children: {
    list: async (parentId: string): Promise<Child[]> => {
      const { data: children, error } = await supabase
        .from('children')
        .select(`
            *,
            subscriptions (*),
            class_packs (*)
        `)
        .eq('parent_id', parentId);
      
      if (error) throw error;

      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0,0,0,0);
      const startIso = startOfMonth.toISOString();

      const { data: registrations } = await supabase
        .from('registrations')
        .select('child_id, event_id, events(start_time)')
        .gte('events.start_time', startIso);

      return children.map((c: any) => {
        const subs = c.subscriptions || [];
        // Check for active, trialing, OR paused
        const activeSub = subs.find((s: any) => ['active', 'trialing', 'paused'].includes(s.status));
        
        let usageStats = undefined;

        if (activeSub) {
            const pkg = PACKAGES.find(p => p.id === activeSub.package_id || p.stripePriceId === activeSub.package_id);
            
            const limit = pkg ? pkg.maxSessions : 0;
            const planName = pkg ? pkg.name : 'Unknown';
            const used = registrations?.filter((r: any) => r.child_id === c.id).length || 0;

            usageStats = { used, limit, planName };
        }

        // Map class packs (filter active ones)
        const now = new Date();
        const classPacks = (c.class_packs || [])
            .filter((pack: any) => {
                const expiresAt = new Date(pack.expires_at);
                return pack.credits_remaining > 0 && expiresAt > now;
            })
            .map((pack: any) => ({
                id: pack.id,
                packType: pack.pack_type,
                creditsRemaining: pack.credits_remaining,
                creditsTotal: pack.credits_total,
                purchaseDate: pack.purchase_date,
                expiresAt: pack.expires_at,
                stripePaymentId: pack.stripe_payment_id
            }));

        return {
            id: c.id,
            parentId: c.parent_id,
            firstName: c.first_name,
            lastName: c.last_name,
            dob: c.dob,
            sports: c.sports || [],
            qrCode: c.qr_code,
            image: c.image_url,
            subscriptionId: activeSub?.package_id,
            subscriptionStatus: activeSub ? activeSub.status : 'none', // Return 'active' or 'paused'
            usageStats,
            classPacks
        };
      });
    },

    create: async (childData: { parentId: string, firstName: string, lastName: string, dob: string, sports: string[], imageUrl?: string }) => {
      const qrCode = `ascend_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      const { data, error } = await supabase
        .from('children')
        .insert({
          parent_id: childData.parentId,
          first_name: childData.firstName,
          last_name: childData.lastName,
          dob: childData.dob,
          sports: childData.sports,
          qr_code: qrCode,
          image_url: childData.imageUrl
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },

    delete: async (childId: string) => {
        // 1. Cancel Billing & Delete Subscription Records (Backend)
        try {
            await supabaseApi.billing.cancelSubscription(childId);
        } catch (e) {
            console.warn("Subscription cancellation/cleanup failed:", e);
        }

        // 2. Delete Registrations
        const { error: regError } = await supabase.from('registrations').delete().eq('child_id', childId);
        if (regError) console.error("Registration cleanup warning:", regError);

        // 3. Delete Child
        const { error } = await supabase.from('children').delete().eq('id', childId);
        if (error) throw error;
    },

    uploadImage: async (file: File, userId: string): Promise<string | null> => {
        try {
            const fileExt = file.name.split('.').pop();
            const fileName = `${Math.random().toString(36).substring(2)}.${fileExt}`;
            const filePath = `avatars/${userId}/${fileName}`;

            const { error: uploadError } = await supabase.storage
                .from('media') 
                .upload(filePath, file, {
                    upsert: true 
                });

            if (uploadError) {
                console.error("Image upload error detail:", uploadError);
                throw uploadError;
            }

            const { data } = supabase.storage.from('media').getPublicUrl(filePath);
            return data.publicUrl;
        } catch (e) {
            console.error("Image upload exception", e);
            throw e; 
        }
    }
  },

  events: {
    list: async (): Promise<Event[]> => {
      const { data: events, error } = await supabase
        .from('events')
        .select(`
          *,
          registrations (
            child_id,
            checked_in
          )
        `)
        .order('start_time', { ascending: true });

      if (error) throw error;

      return events.map((e: any) => ({
        id: e.id,
        title: e.title,
        description: e.description,
        date: formatDate(e.start_time),
        startTime: formatTime(e.start_time), // h:mm A (12h)
        endTime: formatTime(e.end_time),     // h:mm A (12h)
        startTime24: formatTime24(e.start_time), // HH:mm (24h) for inputs
        endTime24: formatTime24(e.end_time),     // HH:mm (24h) for inputs
        isoStart: e.start_time,
        isoEnd: e.end_time,
        location: e.location,
        maxSlots: e.max_slots,
        bookedSlots: e.registrations?.length || 0,
        registeredKidIds: e.registrations?.map((r: any) => r.child_id) || [],
        checkedInKidIds: e.registrations?.filter((r: any) => r.checked_in).map((r: any) => r.child_id) || [],
        allowedPackages: e.allowed_packages,
        minAge: e.min_age,
        maxAge: e.max_age
      }));
    },

    create: async (event: { title: string, description: string, startTime: string, endTime: string, location: string, maxSlots: number, allowedPackages?: string[], minAge?: number, maxAge?: number }) => {
      const { error } = await supabase.from('events').insert({
        title: event.title,
        description: event.description,
        start_time: event.startTime,
        end_time: event.endTime,
        location: event.location,
        max_slots: event.maxSlots,
        allowed_packages: event.allowedPackages,
        min_age: event.minAge,
        max_age: event.maxAge
      });
      if (error) throw error;
    },

    createBulk: async (events: { title: string, description: string, startTime: string, endTime: string, location: string, maxSlots: number, allowedPackages?: string[], minAge?: number, maxAge?: number }[]) => {
      const dbEvents = events.map(event => ({
        title: event.title,
        description: event.description,
        start_time: event.startTime,
        end_time: event.endTime,
        location: event.location,
        max_slots: event.maxSlots,
        allowed_packages: event.allowedPackages,
        min_age: event.minAge,
        max_age: event.maxAge
      }));
      
      const { error } = await supabase.from('events').insert(dbEvents);
      if (error) throw error;
    },
    
    update: async (id: string, event: { title: string, description: string, startTime: string, endTime: string, location: string, maxSlots: number, allowedPackages?: string[], minAge?: number, maxAge?: number }) => {
      const { error } = await supabase.from('events').update({
        title: event.title,
        description: event.description,
        start_time: event.startTime,
        end_time: event.endTime,
        location: event.location,
        max_slots: event.maxSlots,
        allowed_packages: event.allowedPackages,
        min_age: event.minAge,
        max_age: event.maxAge
      }).eq('id', id);
      
      if (error) throw error;
    }
  },

  registrations: {
    register: async (eventId: string, childId: string) => {
      const { data: child, error: childError } = await supabase
        .from('children')
        .select(`*, subscriptions(*), class_packs(*)`)
        .eq('id', childId)
        .single();
        
      if (childError) throw new Error("Could not find athlete profile.");
      
      const activeSub = child.subscriptions?.find((s: any) => s.status === 'active' || s.status === 'trialing');
      
      // Get active class packs (not expired, has credits)
      const now = new Date();
      const activePacks = (child.class_packs || []).filter((pack: any) => {
        const expiresAt = new Date(pack.expires_at);
        return pack.credits_remaining > 0 && expiresAt > now;
      });

      // Must have either active subscription OR class pack credits
      if (!activeSub && activePacks.length === 0) {
        throw new Error("Athlete does not have an active membership or class pack.");
      }

      const { data: evt, error: evtError } = await supabase
        .from('events')
        .select('allowed_packages, min_age, max_age, start_time, end_time')
        .eq('id', eventId)
        .single();

      if (evtError) throw new Error("Event not found.");

      // Check Age (Backend Validation)
      if (evt.min_age !== null && evt.max_age !== null && child.dob) {
           const birthDate = new Date(child.dob);
           const today = new Date();
           let age = today.getFullYear() - birthDate.getFullYear();
           const m = today.getMonth() - birthDate.getMonth();
           if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
              age--;
           }
           if (age < evt.min_age || age > evt.max_age) {
               throw new Error(`Age restriction: ${evt.min_age}-${evt.max_age}. Athlete is ${age}.`);
           }
      }

      let useClassPack = false;
      let selectedPackId = null;

      // Determine session duration from event times
      const eventStart = new Date(evt.start_time);
      const eventEnd = new Date(evt.end_time);
      const durationMinutes = (eventEnd.getTime() - eventStart.getTime()) / (1000 * 60);
      const is45MinSession = durationMinutes <= 50; // Allow some buffer

      // If subscription is active, check limits and restrictions
      if (activeSub) {
        const pkg = PACKAGES.find(p => p.id === activeSub.package_id || p.stripePriceId === activeSub.package_id);
        
        if (!pkg) throw new Error("Unknown subscription package.");

        // Check restrictions (Plan)
        if (evt.allowed_packages && evt.allowed_packages.length > 0) {
            const isAllowed = evt.allowed_packages.includes(pkg.id);
            if (!isAllowed) {
                const allowedNames = evt.allowed_packages
                  .map((pid: string) => PACKAGES.find(p => p.id === pid)?.name || pid)
                  .join(' or ');
                throw new Error(`Restricted session. Requires: ${allowedNames}. Your plan: ${pkg.name}.`);
            }
        }
        
        // Check usage limits for subscription
        const startOfMonth = new Date();
        startOfMonth.setDate(1);
        startOfMonth.setHours(0,0,0,0);
        const startIso = startOfMonth.toISOString();
        
        const { count } = await supabase
          .from('registrations')
          .select('id', { count: 'exact' })
          .eq('child_id', childId)
          .is('class_pack_id', null) // Only count subscription-based registrations
          .gte('created_at', startIso); 
          
        if ((count || 0) >= pkg.maxSessions) {
            // Subscription limit reached, try to use class pack instead
            if (activePacks.length > 0) {
                useClassPack = true;
            } else {
                throw new Error(`Plan limit reached! ${pkg.name} allows ${pkg.maxSessions} sessions per month.`);
            }
        }
      } else {
        // No active subscription, must use class pack
        useClassPack = true;
      }

      // If using class pack, find appropriate pack based on session duration
      if (useClassPack) {
        if (activePacks.length === 0) {
          throw new Error("No class pack credits available.");
        }

        // Find matching pack by duration (45min or 75min)
        const matchingPack = activePacks.find((pack: any) => {
          if (is45MinSession) {
            return pack.pack_type.includes('45min');
          } else {
            return pack.pack_type.includes('75min');
          }
        });

        if (!matchingPack) {
          const requiredDuration = is45MinSession ? '45-minute' : '75-minute';
          throw new Error(`This ${requiredDuration} session requires a matching class pack. Your available packs don't match this session type.`);
        }

        selectedPackId = matchingPack.id;
      }

      // Create registration
      const { error } = await supabase.from('registrations').insert({
        event_id: eventId,
        child_id: childId,
        class_pack_id: selectedPackId
      });
      
      if (error) throw error;

      // If using class pack, decrement credits
      if (selectedPackId) {
        const { error: updateError } = await supabase
          .from('class_packs')
          .update({ 
            credits_remaining: supabase.rpc('decrement_credits', { pack_id: selectedPackId })
          })
          .eq('id', selectedPackId);

        // Fallback if RPC doesn't exist - direct decrement
        if (updateError) {
          const pack = activePacks.find((p: any) => p.id === selectedPackId);
          if (pack) {
            await supabase
              .from('class_packs')
              .update({ credits_remaining: pack.credits_remaining - 1 })
              .eq('id', selectedPackId);
          }
        }
      }
    },
    
    unregister: async (eventId: string, childId: string) => {
        const { error } = await supabase.from('registrations')
            .delete()
            .match({ event_id: eventId, child_id: childId });
        if (error) throw error;
    },

    checkIn: async (eventId: string, qrCode: string) => {
      const { data: child, error: childError } = await supabase
        .from('children')
        .select('id, first_name, last_name')
        .eq('qr_code', qrCode)
        .single();

      if (childError || !child) return { success: false, message: 'Invalid QR Code' };

      const { data: reg, error: regError } = await supabase
        .from('registrations')
        .select('*')
        .eq('event_id', eventId)
        .eq('child_id', child.id)
        .maybeSingle();

      if (regError) return { success: false, message: 'Lookup error' };
      if (!reg) return { success: false, message: 'Athlete not registered.' };
      if (reg.checked_in) return { success: false, message: 'Already checked in.', childName: child.first_name };

      const { error: updateError } = await supabase
        .from('registrations')
        .update({ checked_in: true, checked_in_at: new Date().toISOString() })
        .eq('id', reg.id);

      if (updateError) return { success: false, message: 'Check-in failed.' };

      return { success: true, message: 'Check-in Successful!', childName: `${child.first_name} ${child.last_name}` };
    },

    sendReminder: async (eventId: string) => {
        return true;
    }
  },

  billing: {
    createCheckoutSession: async (priceId: string, childId: string, userId: string, activeSubscriptionCount: number = 0, returnUrl: string, userEmail: string, isClassPack: boolean = false, packType?: string) => {
      const stripe = await stripePromise;
      if (!stripe) throw new Error("Stripe not initialized.");
      
      const response = await fetch('/api/create-checkout-session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
              priceId, 
              childId, 
              userId, 
              userEmail,
              activeSubscriptionCount,
              returnUrl: returnUrl,
              isClassPack,
              packType
          })
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Checkout failed.');

      if (data?.sessionId) {
          const result = await stripe.redirectToCheckout({ sessionId: data.sessionId });
          if (result.error) throw new Error(result.error.message);
      }
    },
    
    syncSession: async (sessionId: string) => {
        const response = await fetch('/api/sync-stripe-session', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sessionId })
        });
        return await response.json();
    },

    switchSubscription: async (childId: string, newPriceId: string) => {
        const response = await fetch('/api/switch-subscription', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ childId, newPriceId })
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Failed to update subscription.');
        return data;
    },
    
    cancelSubscription: async (childId: string) => {
        const response = await fetch('/api/cancel-subscription', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ childId })
        });
        if (!response.ok) {
            // We allow partial failure (e.g. no sub found) but log it
            console.warn("Cancel subscription API reported an error (might be already cancelled).");
        }
    },
    
    pauseSubscription: async (childId: string) => {
        const response = await fetch('/api/pause-subscription', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ childId })
        });
        if (!response.ok) throw new Error('Failed to pause subscription');
    },

    resumeSubscription: async (childId: string) => {
        const response = await fetch('/api/resume-subscription', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ childId })
        });
        if (!response.ok) throw new Error('Failed to resume subscription');
    },

    createDonationSession: async (amount: number, userId?: string) => {
      const stripe = await stripePromise;
      if (!stripe) throw new Error("Stripe not initialized.");

      const response = await fetch('/api/create-donation-session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
              amount, 
              userId, 
              returnUrl: window.location.origin + '/' 
          })
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Donation failed.");
      if (data?.sessionId) {
        const result = await stripe.redirectToCheckout({ sessionId: data.sessionId });
        if (result.error) throw new Error(result.error.message);
      }
    },

    createPortalSession: async () => {
      let { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
         const { data } = await supabase.auth.refreshSession();
         session = data.session;
      }
      
      if (!session?.access_token) {
          throw new Error("Please sign in again.");
      }

      const response = await fetch('/api/create-portal-session', {
          method: 'POST',
          headers: { 
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${session.access_token}`
          },
          body: JSON.stringify({ returnUrl: window.location.origin + '/dashboard' })
      });

      const data = await response.json();
      if (!response.ok || !data.url) throw new Error(data.error || 'Portal unavailable.');
      window.location.href = data.url;
    }
  },

  subscriptions: {
    create: async (userId: string, childId: string | null, packageId: string) => {
      const { error } = await supabase.from('subscriptions').insert({
        user_id: userId,
        child_id: childId,
        package_id: packageId,
        status: 'active'
      });
      if (error) throw error;
    }
  },

  waivers: {
    checkStatus: async (parentEmail: string, childName: string): Promise<{verified: boolean, message?: string}> => {
        try {
            const response = await fetch('/api/check-waiver', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: parentEmail, name: childName })
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'Verification failed');
            return { verified: data.verified === true, message: data.message };
        } catch (e) {
            console.error("Waiver check failed:", e);
            throw e;
        }
    }
  },

  general: {
      sendSponsorshipInquiry: async (formData: any) => {
          const { error } = await supabase.from('inquiries').insert({
                name: formData.name,
                email: formData.email,
                company: formData.company,
                message: formData.message,
                type: 'sponsorship'
            });
          return !error;
      }
  }
};

export const api = supabaseApi;