
import { User, Child, Event } from '../types';
import { MOCK_ADMIN, MOCK_PARENT, MOCK_EVENTS } from '../constants';

// --- In-Memory Mock Database ---
const STORAGE_KEY = 'ascend_mock_user';

// Helper to get user from local storage to persist session on refresh
const getStoredUser = (): User | null => {
  try {
    const item = localStorage.getItem(STORAGE_KEY);
    return item ? JSON.parse(item) : null;
  } catch {
    return null;
  }
};

let currentUser: User | null = getStoredUser();

let events = JSON.parse(JSON.stringify(MOCK_EVENTS)); // Deep copy to reset on reload
let children: Child[] = [
  {
    id: 'kid_1',
    parentId: 'user_456',
    firstName: 'John',
    lastName: 'Connor',
    dob: '2010-05-12',
    sports: ['Football', 'Track & Field'],
    qrCode: 'ascend_mock_qr_1'
  },
  {
    id: 'kid_2',
    parentId: 'user_999',
    firstName: 'Billy',
    lastName: 'Hope',
    dob: '2012-08-20',
    sports: ['Boxing'],
    qrCode: 'ascend_mock_qr_2'
  }
];
let users: User[] = [MOCK_ADMIN, MOCK_PARENT, {
    id: 'user_999',
    email: 'billys_dad@example.com',
    firstName: 'James',
    lastName: 'Hope',
    phone: '555-9999',
    role: 'PARENT'
}];
let subscriptions: any[] = [];

// --- Helper Functions ---
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// --- Mock API Implementation ---
export const mockApi = {
  auth: {
    getUser: async (): Promise<User | null> => {
      await delay(300);
      return currentUser;
    },
    signIn: async (email: string, password: string) => {
      await delay(800);
      // Specific check for the requested Admin account
      if (email === 'colton.joseph@gmail.com' && password === 'newpassword123') {
         currentUser = { 
             ...MOCK_ADMIN, 
             id: 'admin_colton', 
             email: 'colton.joseph@gmail.com', 
             firstName: 'Colton', 
             lastName: 'Joseph' 
         };
      } else if (email.includes('admin')) {
        currentUser = MOCK_ADMIN;
      } else {
        currentUser = MOCK_PARENT;
      }
      // PERSIST SESSION
      localStorage.setItem(STORAGE_KEY, JSON.stringify(currentUser));
      
      return { data: { user: currentUser }, error: null };
    },
    signUp: async (email: string, password: string, meta: { firstName: string, lastName: string, phone: string }) => {
      await delay(800);
      const newUser: User = {
        id: `user_${Date.now()}`,
        email,
        firstName: meta.firstName,
        lastName: meta.lastName,
        phone: meta.phone,
        role: 'PARENT'
      };
      currentUser = newUser;
      users.push(newUser);
      
      // PERSIST SESSION
      localStorage.setItem(STORAGE_KEY, JSON.stringify(currentUser));

      return { data: { user: newUser }, error: null };
    },
    
    // MOCK MAGIC LINK
    signInWithOtp: async (email: string, meta?: any, redirectTo?: string) => {
      await delay(1000);
      console.log('Mock sending magic link to:', email);
      
      // Create user if meta exists (simulating signup)
      if (meta) {
        const newUser = {
           id: `user_${Date.now()}`,
           email,
           firstName: meta.firstName,
           lastName: meta.lastName,
           phone: meta.phone,
           role: 'PARENT' as const
        };
        currentUser = newUser;
        users.push(newUser);
      } else {
        currentUser = MOCK_PARENT; // Fallback login
      }

      // PERSIST SESSION (Simulated after link click)
      localStorage.setItem(STORAGE_KEY, JSON.stringify(currentUser));
      
      alert('MAGIC LINK SENT (Mock): In a real app, check your email. For this demo, clicking OK simulates clicking the link and setting your password.');
      
      if (redirectTo) {
        const path = redirectTo.split('#')[1] || '/dashboard';
        window.location.hash = path;
      }
      
      return { data: {}, error: null };
    },

    updateUser: async (attributes: any) => {
      await delay(500);
      console.log('Mock User updated:', attributes);
      if (currentUser) {
          currentUser = { ...currentUser, ...attributes };
          localStorage.setItem(STORAGE_KEY, JSON.stringify(currentUser));
      }
      return { data: { user: currentUser }, error: null };
    },

    signOut: async () => {
      await delay(300);
      currentUser = null;
      localStorage.removeItem(STORAGE_KEY);
      return { error: null };
    }
  },

  admin: {
    getAllUsers: async () => {
        await delay(500);
        return users;
    },
    getAllChildren: async () => {
        await delay(500);
        return children;
    },
    addRegistration: async (eventId: string, childId: string) => {
        await delay(300);
        const evt = events.find((e:Event) => e.id === eventId);
        if(evt && !evt.registeredKidIds.includes(childId)) {
            evt.registeredKidIds.push(childId);
            evt.bookedSlots++;
        }
    },
    removeRegistration: async (eventId: string, childId: string) => {
        await delay(300);
        const evt = events.find((e:Event) => e.id === eventId);
        if(evt) {
            evt.registeredKidIds = evt.registeredKidIds.filter((id:string) => id !== childId);
            evt.bookedSlots = Math.max(0, evt.bookedSlots - 1);
        }
    },
    deleteEvent: async (eventId: string) => {
        await delay(300);
        events = events.filter((e:Event) => e.id !== eventId);
    }
  },

  children: {
    list: async (parentId: string): Promise<Child[]> => {
      await delay(400);
      return children.filter(c => c.parentId === parentId).map(child => {
         const hasSub = subscriptions.some(s => s.childId === child.id && s.status === 'active');
         return {
           ...child,
           subscriptionStatus: hasSub ? 'active' : 'none'
         };
      });
    },
    create: async (childData: { parentId: string, firstName: string, lastName: string, dob: string, sports: string[] }) => {
      await delay(600);
      const newChild: Child = {
        id: `kid_${Date.now()}`,
        parentId: childData.parentId,
        firstName: childData.firstName,
        lastName: childData.lastName,
        dob: childData.dob,
        sports: childData.sports,
        qrCode: `ascend_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`
      };
      children.push(newChild);
      return newChild;
    },
    uploadImage: async (file: File) => { return null; }
  },

  events: {
    list: async (): Promise<Event[]> => {
      await delay(400);
      return events;
    },
    create: async (eventData: any) => {
      await delay(600);
      const newEvent: Event = {
        ...eventData,
        id: `evt_${Date.now()}`,
        bookedSlots: 0,
        registeredKidIds: [],
        checkedInKidIds: [],
        date: eventData.startTime.split('T')[0], 
        isoStart: eventData.startTime,
        isoEnd: eventData.endTime,
        startTime24: eventData.startTime.split('T')[1]?.substring(0,5) || '10:00',
        endTime24: eventData.endTime.split('T')[1]?.substring(0,5) || '11:00'
      };
      events.push(newEvent);
    }
  },

  registrations: {
    register: async (eventId: string, childId: string) => {
      await delay(500);
      const evt = events.find((e: Event) => e.id === eventId);
      if (evt) {
        if (!evt.registeredKidIds.includes(childId)) {
          evt.registeredKidIds.push(childId);
          evt.bookedSlots++;
        }
      }
    },
    checkIn: async (eventId: string, qrCode: string) => {
      await delay(400);
      const child = children.find(c => c.qrCode === qrCode);
      if (!child) return { success: false, message: 'Invalid QR Code' };
      
      const evt = events.find((e: Event) => e.id === eventId);
      if (!evt) return { success: false, message: 'Event not found' };

      if (evt.checkedInKidIds.includes(child.id)) {
        return { success: false, message: 'Already checked in', childName: child.firstName };
      }
      
      evt.checkedInKidIds.push(child.id);
      return { success: true, message: 'Check-in Successful!', childName: `${child.firstName} ${child.lastName}` };
    },
    sendReminder: async (eventId: string) => {
      await delay(1000);
      return true;
    }
  },

  billing: {
    createCheckoutSession: async (priceId: string, childId: string, userId: string, activeSubscriptionCount: number = 0) => {
      await delay(1000);
      subscriptions.push({
        id: `sub_${Date.now()}`,
        userId,
        childId,
        packageId: priceId,
        status: 'active',
        createdAt: new Date().toISOString()
      });
      window.location.href = '/#/dashboard';
    },
    createDonationSession: async (amount: number, userId?: string) => {
      await delay(1000);
      alert('Mock Donation Successful!');
    },
    createPortalSession: async () => {
      await delay(500);
      alert('Mock Billing Portal');
    }
  },

  subscriptions: {
    create: async (userId: string, childId: string | null, packageId: string) => {
      await delay(1000);
      subscriptions.push({
        id: `sub_${Date.now()}`,
        userId,
        childId,
        packageId,
        status: 'active',
        createdAt: new Date().toISOString()
      });
    }
  },
  
  waivers: {
    checkStatus: async (parentEmail: string, childName: string): Promise<{verified: boolean, message?: string}> => {
        await new Promise(resolve => setTimeout(resolve, 1000));
        return { verified: true, message: 'Mock Verification' }; 
    }
  },

  general: {
      sendSponsorshipInquiry: async (formData: any) => {
          await new Promise(resolve => setTimeout(resolve, 1000));
          return true;
      }
  }
};
