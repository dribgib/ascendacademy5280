import { TrainingPackage, User, Event } from './types';

export const POPULAR_SPORTS = [
  "Football", "Basketball", "Soccer", "Track & Field", 
  "Baseball", "Volleyball", "Lacrosse", "Wrestling", 
  "Cross Country", "Tennis", "Gymnastics", "Hockey",
  "Boxing", "MMA", "Powerlifting", "Rugby"
];

export const PACKAGES: TrainingPackage[] = [
  {
    id: 'p_elite',
    name: 'Elite',
    price: 310,
    billingPeriod: 'Monthly',
    description: 'The ultimate performance package for dedicated athletes.',
    color: 'border-co-yellow',
    features: [
      '12 Sessions / Month',
      '4 Opportunities/Week (MWF + 2 Fri)',
      '2x 30min 1-on-1 Sessions',
      'Physical Analysis',
      'Individual Combine Testing'
    ]
  },
  {
    id: 'p_all_pro',
    name: 'All-Pro',
    price: 215,
    billingPeriod: 'Monthly',
    description: 'High-intensity training to maintain peak condition.',
    color: 'border-co-red',
    features: [
      '8 Sessions / Month',
      '1hr 15min Sessions',
      '4 Opportunities/Week (MWF)',
      '1x 30min 1-on-1 Session'
    ]
  },
  {
    id: 'p_pro',
    name: 'Pro',
    price: 120,
    billingPeriod: 'Monthly',
    description: 'Consistent training foundation.',
    color: 'border-co-blue',
    features: [
      '4 Sessions / Month',
      '1hr 15min Sessions',
      '4 Opportunities/Week (MWF)'
    ]
  },
  {
    id: 'p_rookie',
    name: 'Rookie',
    price: 100,
    billingPeriod: 'Monthly',
    description: 'Intro to sports fitness (Grades 6 & Under).',
    color: 'border-white',
    features: [
      '2 Sessions / Week',
      '45min Sessions',
      'Monday & Wednesday Only',
      'Fundamentals Focus'
    ]
  }
];

// MOCK DATA for Demo Purposes
export const MOCK_ADMIN: User = {
  id: 'admin_123',
  firstName: 'Roderick',
  lastName: 'Jackson',
  email: 'admin@ascend5280.com',
  role: 'ADMIN',
  phone: '555-0199'
};

export const MOCK_PARENT: User = {
  id: 'user_456',
  firstName: 'Sarah',
  lastName: 'Connor',
  email: 'sarah@example.com',
  role: 'PARENT',
  phone: '555-0123'
};

export const MOCK_EVENTS: Event[] = [
  {
    id: 'evt_1',
    title: 'Elite/Pro Performance Session',
    description: 'Speed and agility focus.',
    date: '2023-11-20',
    startTime: '16:00',
    endTime: '17:15',
    isoStart: '2023-11-20T16:00:00.000Z',
    isoEnd: '2023-11-20T17:15:00.000Z',
    location: 'Main Field',
    maxSlots: 20,
    bookedSlots: 15,
    registeredKidIds: [],
    checkedInKidIds: []
  },
  {
    id: 'evt_2',
    title: 'Rookie Foundations',
    description: 'Basic motor skills and fun drills.',
    date: '2023-11-20',
    startTime: '17:30',
    endTime: '18:15',
    isoStart: '2023-11-20T17:30:00.000Z',
    isoEnd: '2023-11-20T18:15:00.000Z',
    location: 'Gym A',
    maxSlots: 15,
    bookedSlots: 5,
    registeredKidIds: [],
    checkedInKidIds: []
  },
    {
    id: 'evt_3',
    title: 'Open Combine Testing',
    description: 'Quarterly combine stats measurement.',
    date: '2023-11-24',
    startTime: '09:00',
    endTime: '12:00',
    isoStart: '2023-11-24T09:00:00.000Z',
    isoEnd: '2023-11-24T12:00:00.000Z',
    location: 'Stadium Track',
    maxSlots: 50,
    bookedSlots: 42,
    registeredKidIds: [],
    checkedInKidIds: []
  }
];