
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

export interface ClassPack {
  id: string;
  packType: '10pack_45min' | '20pack_45min' | '10pack_75min' | '20pack_75min';
  creditsRemaining: number;
  creditsTotal: number;
  purchaseDate: string;
  expiresAt: string;
  stripePaymentId?: string;
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
  classPacks?: ClassPack[]; // Class pack credits
}

export interface TrainingPackage {
  id: string;
  stripePriceId: string; // ID from Stripe Dashboard
  name: string;
  price: number;
  description: string;
  features: string[];
  color: string;
  billingPeriod: 'Monthly' | 'Weekly' | 'Per Session' | 'One-Time';
  maxSessions: number; // Max sessions allowed per billing period
  isClassPack?: boolean; // True for class packs (one-time purchases)
  packType?: '10pack_45min' | '20pack_45min' | '10pack_75min' | '20pack_75min';
  expirationMonths?: number; // Months until expiration for class packs
  sessionDuration?: '45min' | '75min'; // Duration for class pack sessions
}

export interface Event {
  id: string;
  title: string;
  description: string;
  date: string; // Formatted date string for UI (YYYY-MM-DD) in Denver Time
  startTime: string; // Formatted time string (h:mm A) for Display
  endTime: string; // Formatted time string (h:mm A) for Display
  startTime24?: string; // Formatted time string (HH:mm) for Input Controls
  endTime24?: string; // Formatted time string (HH:mm) for Input Controls
  isoStart: string; // Full ISO timestamp for logic
  isoEnd: string; // Full ISO timestamp for logic
  location: string;
  maxSlots: number;
  bookedSlots: number;
  registeredKidIds: string[]; // List of IDs of kids registered
  checkedInKidIds: string[]; // List of IDs of kids who attended
  allowedPackages?: string[]; // IDs of packages allowed to register (e.g. ['p_elite', 'p_pro'])
  minAge?: number; // Optional age restriction (inclusive)
  maxAge?: number; // Optional age restriction (inclusive)
}

export interface Donation {
  amount: number;
  isSponsorship: boolean;
  athleteName?: string;
  donorEmail: string;
}