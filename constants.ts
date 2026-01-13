
import { TrainingPackage, User, Event } from './types';

export const POPULAR_SPORTS = [
  "Football", "Basketball", "Soccer", "Track & Field", 
  "Baseball", "Volleyball", "Lacrosse", "Wrestling", 
  "Cross Country", "Tennis", "Gymnastics", "Hockey",
  "Boxing", "MMA", "Powerlifting", "Rugby"
];

export const WAIVER_CONFIG = {
  liability: {
    url: 'https://app.waiversign.com/e/693223c22919426586c36778/doc/693225b12606e000127945da?event=none',
    id: '32183'
  },
  photo: {
    url: 'https://app.waiversign.com/e/693223c22919426586c36778/doc/695d80b968f64c0012434882?event=none',
    id: '32390'
  }
};

// --- AGE CONFIGURATION ---
export const AGE_BRACKETS = [
  { label: 'All Ages', min: 0, max: 99 },
  { label: 'Rookie (5-8)', min: 5, max: 8 },
  { label: 'Pro (9-12)', min: 9, max: 12 },
  { label: 'Elite (13-19)', min: 13, max: 19 }
];

export const calculateAge = (dob: string): number => {
  if (!dob) return 0;
  const birthDate = new Date(dob);
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const m = today.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      age--;
  }
  return age;
};

// --- STRIPE CONFIGURATION ---
// @ts-ignore
const env = import.meta.env || {};
// Check if the app is initialized with a Test Key
// Prioritize LIVE key
// @ts-ignore
const stripeKey = env.VITE_STRIPE_LIVE_PUBLISHABLE_KEY || env.VITE_STRIPE_PUBLISHABLE_KEY || env.VITE_STRIPE_TEST_PUBLISHABLE_KEY || '';
const isTestMode = stripeKey.startsWith('pk_test');

// Console log for debugging production vs test environment
if (isTestMode) {
  console.log('%c Ascend Academy: Running in Stripe TEST MODE ', 'background: #222; color: #ffeb3b; font-weight: bold; border: 1px solid #ffeb3b;');
} else {
  console.log('%c Ascend Academy: Running in Stripe LIVE MODE ', 'background: #222; color: #4ade80; font-weight: bold; border: 1px solid #4ade80;');
}

// DEFINITION: Price IDs for both environments.
// ACTION REQUIRED: Fill in the 'test' fields with IDs from your Stripe Test Dashboard.
const PRICE_IDS = {
  elite: {
    live: 'price_1SgU61IQ7QGupvoPTnwh2LCN',
    test: 'price_1SguwgIQ7QGupvoP9udmnyo5'
  },
  all_pro: {
    live: 'price_1SgU5ZIQ7QGupvoP2XQ6JvOB',
    test: 'price_1SguwqIQ7QGupvoPeseEUBqR'
  },
  pro: {
    live: 'price_1SgU5DIQ7QGupvoPjxNtibuT',
    test: 'price_1SguwzIQ7QGupvoPkRbBW25a'
  },
  rookie: {
    live: 'price_1SgU4sIQ7QGupvoPibE6fbry',
    test: 'price_1SguxAIQ7QGupvoPktEZ4PgY'
  }
};

const getPrice = (key: keyof typeof PRICE_IDS) => {
  // Option 1: Override via Environment Variable (Best for CI/CD)
  // Example: VITE_PRICE_ELITE=price_12345
  // @ts-ignore
  const envOverride = env[`VITE_PRICE_${key.toUpperCase()}`];
  if (envOverride) return envOverride;

  // Option 2: Use the dictionary defined above based on mode
  return isTestMode ? PRICE_IDS[key].test : PRICE_IDS[key].live;
};

export const PACKAGES: TrainingPackage[] = [
  {
    id: 'p_elite',
    stripePriceId: getPrice('elite'),
    name: 'Elite',
    price: 310,
    billingPeriod: 'Monthly',
    maxSessions: 12,
    description: 'The ultimate performance package.',
    color: 'border-co-yellow',
    features: [
      '12 Sessions / Month',
      '4 Opportunities/Week (MWF + 2 Fri)',
      '2x 30min 1-on-1 Sessions',
      'Physical Analysis',
      'Physical Assessment'
    ]
  },
  {
    id: 'p_all_pro',
    stripePriceId: getPrice('all_pro'),
    name: 'All-Pro',
    price: 215,
    billingPeriod: 'Monthly',
    maxSessions: 8,
    description: 'High-intensity training.',
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
    stripePriceId: getPrice('pro'),
    name: 'Pro',
    price: 120,
    billingPeriod: 'Monthly',
    maxSessions: 4,
    description: 'Consistent training foundation.',
    color: 'border-zinc-500',
    features: [
      '4 Sessions / Month',
      '1hr 15min Sessions',
      '4 Opportunities/Week (MWF)'
    ]
  },
  {
    id: 'p_rookie',
    stripePriceId: getPrice('rookie'),
    name: 'Rookie',
    price: 100,
    billingPeriod: 'Monthly',
    maxSessions: 2, // 2 sessions per month
    description: 'Intro to sports fitness.',
    color: 'border-white',
    features: [
      '2 Sessions / Month',
      '45min Sessions',
      'Monday & Wednesday Only',
      'Fundamentals Focus'
    ]
  }
];

// MOCK DATA for Demo Purposes
export const MOCK_ADMIN: User = {
  id: 'admin_123',
  firstName: 'Roderrick',
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
    startTime: '4:00 PM',
    endTime: '5:15 PM',
    startTime24: '16:00',
    endTime24: '17:15',
    isoStart: '2023-11-20T16:00:00.000Z',
    isoEnd: '2023-11-20T17:15:00.000Z',
    location: 'Main Field',
    maxSlots: 20,
    bookedSlots: 15,
    registeredKidIds: [],
    checkedInKidIds: [],
    minAge: 13,
    maxAge: 19
  },
  {
    id: 'evt_2',
    title: 'Rookie Foundations',
    description: 'Basic motor skills and fun drills.',
    date: '2023-11-20',
    startTime: '5:30 PM',
    endTime: '6:15 PM',
    startTime24: '17:30',
    endTime24: '18:15',
    isoStart: '2023-11-20T17:30:00.000Z',
    isoEnd: '2023-11-20T18:15:00.000Z',
    location: 'Gym A',
    maxSlots: 15,
    bookedSlots: 5,
    registeredKidIds: [],
    checkedInKidIds: [],
    minAge: 5,
    maxAge: 8
  },
    {
    id: 'evt_3',
    title: 'Physical Assessment',
    description: 'Quarterly physical assessment stats measurement.',
    date: '2023-11-24',
    startTime: '9:00 AM',
    endTime: '12:00 PM',
    startTime24: '09:00',
    endTime24: '12:00',
    isoStart: '2023-11-24T09:00:00.000Z',
    isoEnd: '2023-11-24T12:00:00.000Z',
    location: 'Stadium Track',
    maxSlots: 50,
    bookedSlots: 42,
    registeredKidIds: [],
    checkedInKidIds: []
  }
];
