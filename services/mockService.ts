import { User, Child, Event } from '../types';
import { MOCK_ADMIN, MOCK_PARENT, MOCK_EVENTS } from '../constants';

// In-memory storage for the session
let currentUser: User | null = null;
let events = [...MOCK_EVENTS];
let children: Child[] = [
  {
    id: 'kid_1',
    parentId: 'user_456',
    firstName: 'John',
    lastName: 'Connor',
    dob: '2010-05-12',
    sports: ['Football', 'Track & Field'],
    qrCode: 'kid_1_uuid_code'
  }
];

export const AuthService = {
  login: async (email: string): Promise<User> => {
    // Simulating auth delay
    await new Promise(resolve => setTimeout(resolve, 500));
    if (email.includes('admin')) {
      currentUser = MOCK_ADMIN;
      return MOCK_ADMIN;
    }
    currentUser = MOCK_PARENT;
    return MOCK_PARENT;
  },
  logout: () => {
    currentUser = null;
  },
  getCurrentUser: () => currentUser
};

export const DataService = {
  getChildren: async (parentId: string): Promise<Child[]> => {
    return children.filter(c => c.parentId === parentId);
  },
  
  getAllChildren: async (): Promise<Child[]> => {
    return children;
  },

  addChild: async (childData: Omit<Child, 'id' | 'qrCode'>): Promise<Child> => {
    const newChild: Child = {
      ...childData,
      id: `kid_${Date.now()}`,
      qrCode: `ascend_${Date.now()}_${Math.random().toString(36).substring(7)}`
    };
    children.push(newChild);
    return newChild;
  },

  getEvents: async (): Promise<Event[]> => {
    return events.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  },

  registerForEvent: async (eventId: string, childId: string) => {
    events = events.map(e => {
      if (e.id === eventId) {
        if (e.registeredKidIds.includes(childId)) return e;
        return {
          ...e,
          bookedSlots: e.bookedSlots + 1,
          registeredKidIds: [...e.registeredKidIds, childId]
        };
      }
      return e;
    });
  },

  // Admin Functions
  createEvent: async (eventData: Omit<Event, 'id' | 'bookedSlots' | 'registeredKidIds' | 'checkedInKidIds'>) => {
    const newEvent: Event = {
      ...eventData,
      id: `evt_${Date.now()}`,
      bookedSlots: 0,
      registeredKidIds: [],
      checkedInKidIds: []
    };
    events.push(newEvent);
  },

  checkInChild: async (eventId: string, qrCodeOrId: string): Promise<{ success: boolean; message: string; childName?: string }> => {
    // Find child
    const child = children.find(c => c.qrCode === qrCodeOrId || c.id === qrCodeOrId);
    if (!child) return { success: false, message: 'Child not found' };

    const eventIndex = events.findIndex(e => e.id === eventId);
    if (eventIndex === -1) return { success: false, message: 'Event not found' };

    const event = events[eventIndex];
    
    // Check if registered
    // In a strict system, we require registration. Here we might allow walk-ins? 
    // Let's assume strict registration for the demo.
    // if (!event.registeredKidIds.includes(child.id)) {
    //   return { success: false, message: 'Child not registered for this event' };
    // }

    if (event.checkedInKidIds.includes(child.id)) {
      return { success: false, message: 'Already checked in', childName: child.firstName };
    }

    events[eventIndex] = {
      ...event,
      checkedInKidIds: [...event.checkedInKidIds, child.id]
    };

    return { success: true, message: 'Check-in successful', childName: `${child.firstName} ${child.lastName}` };
  },

  sendReminder: async (eventId: string) => {
    // Mock Twilio Integration
    console.log(`[Twilio Mock] Sending SMS to all participants of event ${eventId}...`);
    return true;
  }
};
