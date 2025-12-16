export type UserRole = 'ADMIN' | 'PARENT';

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
  role: UserRole;
  stripeCustomerId?: string; // Placeholder for Stripe integration
}

export interface Child {
  id: string;
  parentId: string;
  firstName: string;
  lastName: string;
  dob: string;
  sports: string[]; // List of favorite sports
  qrCode: string; // The UUID string used for the QR code
}

export interface TrainingPackage {
  id: string;
  name: string;
  price: number;
  description: string;
  features: string[];
  color: string; // Tailwind color class helper
  billingPeriod: 'Monthly' | 'Weekly' | 'Per Session';
}

export interface Event {
  id: string;
  title: string;
  description: string;
  date: string; // ISO string
  startTime: string;
  endTime: string;
  location: string;
  maxSlots: number;
  bookedSlots: number;
  registeredKidIds: string[]; // List of IDs of kids registered
  checkedInKidIds: string[]; // List of IDs of kids who attended
}

export interface Donation {
  amount: number;
  isSponsorship: boolean;
  athleteName?: string; // If sponsoring specific athlete (optional)
  donorEmail: string;
}

// Database / Integration Notes (For the Developer):
/*
  Supabase Schema Recommendations:
  - users: id (uuid), email, role, phone, etc.
  - children: id (uuid), user_id (fk), name, dob, sports (jsonb)
  - events: id (uuid), title, start_time, end_time, capacity, location
  - registrations: id, event_id, child_id, checked_in (bool)
  - payments: Stripe webhook logs

  Stripe Integration:
  - Use Stripe Checkout for subscriptions (Elite, All-Pro, etc.)
  - Use Stripe Payment Links or custom intent for One-time donations.
  - Store 'stripe_customer_id' in Supabase 'users' table.
*/
