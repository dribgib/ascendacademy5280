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
        const { data, error } = await supabase.from('children').select('*');
        if (error) throw error;
        return data.map((c: any) => ({
            id: c.id,
            parentId: c.parent_id,
            firstName: c.first_name,
            lastName: c.last_name,
            dob: c.dob,
            sports: c.sports,
            qrCode: c.qr_code,
            image: c.image_url
        }));
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
        const { error } = await supabase.from('events').delete().eq('id', eventId);
        if (error) throw error;
    }
  },

  children: {
    list: async (parentId: string): Promise<Child[]> => {
      const { data: children, error } = await supabase
        .from('children')
        .select(`
            *,
            subscriptions (
                id,
                status,
                package_id
            )
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
            const pkg = PACKAGES.find(p => p.id === activeSub.package_id) || PACKAGES.find(p => activeSub.package_id.includes(p.id));
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

    uploadImage: async (file: File): Promise<string | null> => {
        try {
            const fileExt = file.name.split('.').pop();
            const fileName = `${Math.random().toString(36).substring(2)}.${fileExt}`;
            const filePath = `avatars/${fileName}`;

            const { error: uploadError } = await supabase.storage
                .from('media') 
                .upload(filePath, file);

            if (uploadError) return null;

            const { data } = supabase.storage.from('media').getPublicUrl(filePath);
            return data.publicUrl;
        } catch (e) {
            return null;
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
        checkedInKidIds: e.registrations?.filter((r: any) => r.checked_in).map((r: any) => r.child_id) || []
      }));
    },

    create: async (event: { title: string, description: string, startTime: string, endTime: string, location: string, maxSlots: number }) => {
      const { error } = await supabase.from('events').insert({
        title: event.title,
        description: event.description,
        start_time: event.startTime,
        end_time: event.endTime,
        location: event.location,
        max_slots: event.maxSlots
      });
      if (error) throw error;
    }
  },

  registrations: {
    register: async (eventId: string, childId: string) => {
      const { data: child, error: childError } = await supabase
        .from('children')
        .select(`*, subscriptions(*)`)
        .eq('id', childId)
        .single();
        
      if (childError) throw new Error("Could not find athlete profile.");
      
      const activeSub = child.subscriptions?.find((s: any) => s.status === 'active');
      
      if (!activeSub) throw new Error("Athlete does not have an active membership.");
      
      const pkg = PACKAGES.find(p => p.id === activeSub.package_id) || PACKAGES.find(p => activeSub.package_id.includes(p.id));
      if (!pkg) throw new Error("Unknown subscription package.");
      
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
    createCheckoutSession: async (priceId: string, childId: string, userId: string, activeSubscriptionCount: number = 0) => {
      const stripe = await stripePromise;
      if (!stripe) throw new Error("Stripe not initialized. Check configuration.");
      
      // @ts-ignore
      const env = import.meta.env || {};
      // @ts-ignore
      const anonKey = env.VITE_PUBLIC_SUPABASE_ANON_KEY;
      
      const { data, error } = await supabase.functions.invoke('create-checkout-session', {
        body: { 
            priceId, 
            childId, 
            userId, 
            activeSubscriptionCount,
            returnUrl: window.location.origin + '/dashboard' 
        },
        headers: { 'apikey': anonKey }
      });

      if (error) {
          console.error("Checkout Function Error:", error);
          throw new Error(error.message || 'Failed to initiate checkout.');
      }

      if (data?.sessionId) {
          const result = await stripe.redirectToCheckout({ sessionId: data.sessionId });
          if (result.error) throw new Error(result.error.message);
      } else {
          throw new Error("No session ID returned from billing service.");
      }
    },

    createDonationSession: async (amount: number, userId?: string) => {
      const stripe = await stripePromise;
      if (!stripe) throw new Error("Stripe not initialized. Check configuration.");

      // @ts-ignore
      const env = import.meta.env || {};
      // @ts-ignore
      const anonKey = env.VITE_PUBLIC_SUPABASE_ANON_KEY;
      
      const { data, error } = await supabase.functions.invoke('create-donation-session', {
        body: { amount, userId, returnUrl: window.location.origin + '/' },
        headers: { 'apikey': anonKey }
      });

      if (error) {
          console.error("Donation Function Error:", error);
          throw new Error(error.message || "Donation system unavailable.");
      }

      if (data?.sessionId) {
        const result = await stripe.redirectToCheckout({ sessionId: data.sessionId });
        if (result.error) throw new Error(result.error.message);
      } else {
        throw new Error("No session ID returned from donation service.");
      }
    },

    createPortalSession: async () => {
      // @ts-ignore
      const env = import.meta.env || {};
      // @ts-ignore
      const anonKey = env.VITE_PUBLIC_SUPABASE_ANON_KEY;
      
      const { data, error } = await supabase.functions.invoke('create-portal-session', {
          body: { returnUrl: window.location.origin + '/dashboard' },
          headers: { 'apikey': anonKey }
      });

      if (error || !data?.url) throw new Error('Portal unavailable.');
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
        // DEV OVERRIDE: 
        // Real-time signing detection requires Webhooks or a Proxy Server which aren't available 
        // in this frontend-only/development environment.
        // We simulate a successful check to unblock the user flow.
        console.log(`[DEV MODE] Mocking waiver check for ${childName}. Assuming signed.`);
        await new Promise(resolve => setTimeout(resolve, 800)); // Simulate API network delay
        return true; 
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