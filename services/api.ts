import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { User, Child, Event } from '../types';
import { stripePromise } from '../lib/stripe';
import { PACKAGES } from '../constants';

// Helper to format ISO timestamp to HH:MM
const formatTime = (isoString: string) => {
  if (!isoString) return '';
  return new Date(isoString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
};

// Helper to format ISO timestamp to YYYY-MM-DD
const formatDate = (isoString: string) => {
  if (!isoString) return '';
  return new Date(isoString).toISOString().split('T')[0];
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
    
    // UPDATED: Fetches all children AND calculates their usage stats
    getAllChildren: async (): Promise<Child[]> => {
        // 1. Fetch children with active subscriptions
        // Join with FULL subscription data to ensure we catch active status properly
        const { data: children, error } = await supabase.from('children').select(`
            *,
            subscriptions (*)
        `);
        if (error) throw error;

        // 2. Fetch all registrations for current month
        const startOfMonth = new Date();
        startOfMonth.setDate(1);
        startOfMonth.setHours(0,0,0,0);
        const startIso = startOfMonth.toISOString();

        const { data: registrations } = await supabase
            .from('registrations')
            .select('child_id, event_id, events(start_time)')
            .gte('events.start_time', startIso);

        // 3. Map and Calculate Usage
        return children.map((c: any) => {
            const activeSub = c.subscriptions?.find((s: any) => s.status === 'active');
            let usageStats = undefined;

            if (activeSub) {
                const pkg = PACKAGES.find(p => p.id === activeSub.package_id || p.stripePriceId === activeSub.package_id);
                const limit = pkg ? pkg.maxSessions : 0;
                const planName = pkg ? pkg.name : 'Unknown';
                // Count registrations for this child in this month
                const used = registrations?.filter((r: any) => r.child_id === c.id).length || 0;

                usageStats = { used, limit, planName };
            }

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
                subscriptionStatus: activeSub ? 'active' : 'none',
                usageStats // Now populated for Admin view
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

    // UPDATED: Explicitly delete registrations first to ensure usage count drops ("Refund")
    deleteEvent: async (eventId: string) => {
        // 1. Delete all registrations linked to this event
        const { error: regError } = await supabase
            .from('registrations')
            .delete()
            .eq('event_id', eventId);
        
        if (regError) throw regError;

        // 2. Delete the event itself
        const { error } = await supabase.from('events').delete().eq('id', eventId);
        if (error) throw error;
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
            subscriptions (*)
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
        const activeSub = c.subscriptions?.find((s: any) => s.status === 'active');
        let usageStats = undefined;

        if (activeSub) {
            // FIX: Check for match on local ID OR Stripe Price ID to ensure Plan Name resolves
            const pkg = PACKAGES.find(p => p.id === activeSub.package_id || p.stripePriceId === activeSub.package_id);
            
            const limit = pkg ? pkg.maxSessions : 0;
            const planName = pkg ? pkg.name : 'Unknown';
            const used = registrations?.filter((r: any) => r.child_id === c.id).length || 0;

            usageStats = { used, limit, planName };
        }

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
            subscriptionStatus: activeSub ? 'active' : 'none',
            usageStats
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
        startTime: formatTime(e.start_time),
        endTime: formatTime(e.end_time),
        isoStart: e.start_time,
        isoEnd: e.end_time,
        location: e.location,
        maxSlots: e.max_slots,
        bookedSlots: e.registrations?.length || 0,
        registeredKidIds: e.registrations?.map((r: any) => r.child_id) || [],
        checkedInKidIds: e.registrations?.filter((r: any) => r.checked_in).map((r: any) => r.child_id) || [],
        allowedPackages: e.allowed_packages // New field from DB
      }));
    },

    create: async (event: { title: string, description: string, startTime: string, endTime: string, location: string, maxSlots: number, allowedPackages?: string[] }) => {
      const { error } = await supabase.from('events').insert({
        title: event.title,
        description: event.description,
        start_time: event.startTime,
        end_time: event.endTime,
        location: event.location,
        max_slots: event.maxSlots,
        allowed_packages: event.allowedPackages // Save allowed packages
      });
      if (error) throw error;
    }
  },

  registrations: {
    register: async (eventId: string, childId: string) => {
      // 1. Fetch Child and active sub
      const { data: child, error: childError } = await supabase
        .from('children')
        .select(`*, subscriptions(*)`)
        .eq('id', childId)
        .single();
        
      if (childError) throw new Error("Could not find athlete profile.");
      
      const activeSub = child.subscriptions?.find((s: any) => s.status === 'active');
      
      if (!activeSub) throw new Error("Athlete does not have an active membership.");
      
      const pkg = PACKAGES.find(p => p.id === activeSub.package_id || p.stripePriceId === activeSub.package_id);
      
      if (!pkg) throw new Error("Unknown subscription package.");

      // 2. Fetch Event to check restrictions
      const { data: evt, error: evtError } = await supabase
        .from('events')
        .select('allowed_packages')
        .eq('id', eventId)
        .single();

      if (evtError) throw new Error("Event not found.");

      // 3. CHECK PACKAGE RESTRICTIONS
      if (evt.allowed_packages && evt.allowed_packages.length > 0) {
          // Check if user's package ID or name matches
          // We allow matching by internal ID (p_elite) or name (Elite)
          const isAllowed = evt.allowed_packages.includes(pkg.id);
          if (!isAllowed) {
              throw new Error(`This session is restricted to ${evt.allowed_packages.map(p => {
                  const matched = PACKAGES.find(pk => pk.id === p);
                  return matched ? matched.name : p;
              }).join(' or ')} packages.`);
          }
      }
      
      // 4. Check Usage Limits
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0,0,0,0);
      const startIso = startOfMonth.toISOString();
      
      const { count } = await supabase
        .from('registrations')
        .select('id', { count: 'exact' })
        .eq('child_id', childId)
        .gte('created_at', startIso); 
        
      if ((count || 0) >= pkg.maxSessions) {
          throw new Error(`Plan limit reached! ${pkg.name} allows ${pkg.maxSessions} sessions per month.`);
      }

      const { error } = await supabase.from('registrations').insert({
        event_id: eventId,
        child_id: childId
      });
      if (error) throw error;
    },
    
    // NEW UNREGISTER METHOD
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
      if (!reg) return { success: false, message: 'Athlete not registered for this session.' };
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
    createCheckoutSession: async (priceId: string, childId: string, userId: string, activeSubscriptionCount: number = 0, returnUrl: string, userEmail: string) => {
      const stripe = await stripePromise;
      if (!stripe) throw new Error("Stripe not initialized.");
      
      // Use Vercel /api route instead of Supabase function
      const response = await fetch('/api/create-checkout-session', {
          method: 'POST',
          headers: {
              'Content-Type': 'application/json'
          },
          body: JSON.stringify({
              priceId, 
              childId, 
              userId, 
              userEmail,
              activeSubscriptionCount,
              returnUrl: returnUrl
          })
      });

      const data = await response.json();

      if (!response.ok) {
          throw new Error(data.error || 'Failed to initiate checkout.');
      }

      if (data?.sessionId) {
          const result = await stripe.redirectToCheckout({ sessionId: data.sessionId });
          if (result.error) throw new Error(result.error.message);
      } else {
          throw new Error("No session ID returned.");
      }
    },
    
    // NEW METHOD to manually sync session (bypassing Webhook reliability issues)
    syncSession: async (sessionId: string) => {
        const response = await fetch('/api/sync-stripe-session', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sessionId })
        });
        if (!response.ok) {
            console.error("Sync failed, falling back to webhook.");
        }
        return await response.json();
    },

    // NEW METHOD to update subscription plan
    switchSubscription: async (childId: string, newPriceId: string) => {
        const response = await fetch('/api/switch-subscription', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ childId, newPriceId })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Failed to update subscription.');
        }

        return data;
    },

    createDonationSession: async (amount: number, userId?: string) => {
      const stripe = await stripePromise;
      if (!stripe) throw new Error("Stripe not initialized.");

      // Use Vercel /api route
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

      if (!response.ok) {
          throw new Error(data.error || "Donation system unavailable.");
      }

      if (data?.sessionId) {
        const result = await stripe.redirectToCheckout({ sessionId: data.sessionId });
        if (result.error) throw new Error(result.error.message);
      } else {
        throw new Error("No session ID returned.");
      }
    },

    createPortalSession: async () => {
      // Need auth headers to allow backend to verify user
      // 1. Force refresh session to ensure token is valid and present
      let { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
         // Attempt refresh if session is null
         const { data } = await supabase.auth.refreshSession();
         session = data.session;
      }
      
      if (!session?.access_token) {
          throw new Error("Please sign in again to access the billing portal.");
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
    checkStatus: async (parentEmail: string, childName: string): Promise<boolean> => {
        try {
            const response = await fetch('/api/check-waiver', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: parentEmail, name: childName })
            });
            const data = await response.json();
            return data.verified === true;
        } catch (e) {
            console.error("Waiver check failed:", e);
            return false;
        }
    }
  },

  general: {
      sendSponsorshipInquiry: async (formData: any) => {
          const { error } = await supabase
            .from('inquiries')
            .insert({
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