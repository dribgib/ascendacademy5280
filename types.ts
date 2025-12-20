export type UserRole = 'ADMIN' | 'PARENT';

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
  role: UserRole;
  stripeCustomerId?: string;
}

export interface Child {
  id: string;
  parentId: string;
  firstName: string;
  lastName: string;
  dob: string;
  sports: string[];
  qrCode: string;
  image?: string; // Profile image URL
  subscriptionId?: string; // Optional: link to active subscription
  subscriptionStatus?: 'active' | 'past_due' | 'canceled' | 'none';
  // Usage tracking for plan enforcement
  usageStats?: {
    used: number;
    limit: number;
    planName: string;
  };
}

export interface TrainingPackage {
  id: string;
  stripePriceId: string; // ID from Stripe Dashboard
  name: string;
  price: number;
  description: string;
  features: string[];
  color: string;
  billingPeriod: 'Monthly' | 'Weekly' | 'Per Session';
  maxSessions: number; // Max sessions allowed per billing period
}

export interface Event {
  id: string;
  title: string;
  description: string;
  date: string; // Formatted date string for UI (YYYY-MM-DD)
  startTime: string; // Formatted time string (HH:MM)
  endTime: string; // Formatted time string (HH:MM)
  isoStart: string; // Full ISO timestamp for logic
  isoEnd: string; // Full ISO timestamp for logic
  location: string;
  maxSlots: number;
  bookedSlots: number;
  registeredKidIds: string[]; // List of IDs of kids registered
  checkedInKidIds: string[]; // List of IDs of kids who attended
}

export interface Donation {
  amount: number;
  isSponsorship: boolean;
  athleteName?: string;
  donorEmail: string;
}