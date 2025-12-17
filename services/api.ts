import { supabase } from '../lib/supabase';
import { User, Child, Event } from '../types';

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

export const api = {
  auth: {
    getUser: async (): Promise<User | null> => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      // Fetch profile details
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (!profile) return null;

      return {
        id: user.id,
        email: user.email!,
        firstName: profile.first_name,
        lastName: profile.last_name,
        phone: profile.phone,
        role: profile.role,
        stripeCustomerId: profile.stripe_customer_id
      };
    },

    signIn: async (email: string, password: string) => {
      return await supabase.auth.signInWithPassword({ email, password });
    },

    signUp: async (email: string, password: string, meta: { firstName: string, lastName: string, phone: string }) => {
      return await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            first_name: meta.firstName,
            last_name: meta.lastName,
            phone: meta.phone // Note: Profile trigger handles mapping these to the profiles table
          }
        }
      });
    },

    signOut: async () => {
      return await supabase.auth.signOut();
    }
  },

  children: {
    list: async (parentId: string): Promise<Child[]> => {
      const { data, error } = await supabase
        .from('children')
        .select('*')
        .eq('parent_id', parentId);
      
      if (error) throw error;

      return data.map((c: any) => ({
        id: c.id,
        parentId: c.parent_id,
        firstName: c.first_name,
        lastName: c.last_name,
        dob: c.dob,
        sports: c.sports || [],
        qrCode: c.qr_code
      }));
    },

    create: async (childData: { parentId: string, firstName: string, lastName: string, dob: string, sports: string[] }) => {
      // Generate a unique string for QR code
      const qrCode = `ascend_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      const { data, error } = await supabase
        .from('children')
        .insert({
          parent_id: childData.parentId,
          first_name: childData.firstName,
          last_name: childData.lastName,
          dob: childData.dob,
          sports: childData.sports,
          qr_code: qrCode
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    }
  },

  events: {
    list: async (): Promise<Event[]> => {
      // Fetch events with registrations to calculate slots
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
      // Check if full first (Backend policy could enforce this, but simple check here)
      // For now, simply insert. RLS or DB constraints can handle duplicates.
      const { error } = await supabase.from('registrations').insert({
        event_id: eventId,
        child_id: childId
      });
      if (error) throw error;
    },

    checkIn: async (eventId: string, qrCode: string) => {
      // 1. Find child by QR
      const { data: child, error: childError } = await supabase
        .from('children')
        .select('id, first_name, last_name')
        .eq('qr_code', qrCode)
        .single();

      if (childError || !child) return { success: false, message: 'Invalid QR Code' };

      // 2. Find registration
      const { data: reg, error: regError } = await supabase
        .from('registrations')
        .select('*')
        .eq('event_id', eventId)
        .eq('child_id', child.id)
        .maybeSingle();

      if (regError) return { success: false, message: 'Lookup error' };
      
      // Strict: Must be registered
      if (!reg) return { success: false, message: 'Athlete not registered for this session.' };
      
      if (reg.checked_in) return { success: false, message: 'Already checked in.', childName: child.first_name };

      // 3. Update check-in
      const { error: updateError } = await supabase
        .from('registrations')
        .update({ checked_in: true, checked_in_at: new Date().toISOString() })
        .eq('id', reg.id);

      if (updateError) return { success: false, message: 'Check-in failed.' };

      return { success: true, message: 'Check-in Successful!', childName: `${child.first_name} ${child.last_name}` };
    },

    sendReminder: async (eventId: string) => {
        // In production, this would call a Supabase Edge Function that triggers Twilio
        // For now, we simulate success
        return true;
    }
  }
};
