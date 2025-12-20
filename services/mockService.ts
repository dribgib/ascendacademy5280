import { User, Child, Event } from '../types';
import { MOCK_ADMIN, MOCK_PARENT, MOCK_EVENTS } from '../constants';

// --- In-Memory Mock Database ---
let currentUser: User | null = null;
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
  }
];
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
      if (email.includes('admin')) {
        currentUser = MOCK_ADMIN;
      } else {
        currentUser = MOCK_PARENT;
      }
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
      return { data: { user: newUser }, error: null };
    },
    signOut: async () => {
      await delay(300);
      currentUser = null;
      return { error: null };
    }
  },

  children: {
    list: async (parentId: string): Promise<Child[]> => {
      await delay(400);
      return children.filter(c => c.parentId === parentId);
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
    }
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
        // Simple formatting for mock
        date: eventData.startTime.split('T')[0], 
        isoStart: eventData.startTime,
        isoEnd: eventData.endTime
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

      // In mock mode, we skip the strict "must be registered" check for easier testing
      // unless you want to enforce it.
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
  }
};