export interface User {
  id: string;
  name: string;
  age: number;
  location: string;
  bio: string;
  imageUrl: string;
  photos?: string[]; // Array of photo URLs
  distance: number; // in km
  isOnline?: boolean;
  // Extended fields
  gender?: string;
  occupation?: string;
  relationshipStatus?: string;
  height?: string;
  bodyType?: string;
  ethnicity?: string;
  lookingFor?: string[];
  about?: string;
  city?: string;
  nationality?: string;
  zipCode?: string;
}

export interface CurrentUser extends User {
  email: string;
  isVip: boolean;
  isVerified: boolean;
  locationGranted: boolean;
  photoUrl?: string; // Verification selfie URL
  // Daily swipe tracking
  swipesToday: number;
  matchesToday: number;
  lastSwipeDate: number;
  // Privacy Settings
  readReceiptsEnabled: boolean;
}

export enum AppScreen {
  SPLASH = 'SPLASH',
  AUTH = 'AUTH',
  PROFILE_SETUP = 'PROFILE_SETUP',
  EMAIL_VERIFY = 'EMAIL_VERIFY',
  ADD_PHOTO = 'ADD_PHOTO',
  LOCATION = 'LOCATION',
  VERIFY = 'VERIFY',
  MAIN = 'MAIN'
}

export enum MainTab {
  HOME = 'HOME',
  CONNECT = 'CONNECT',
  CHAT = 'CHAT',
  PROFILE = 'PROFILE'
}

export interface ChatMessage {
  id: string;
  senderId: string;
  text?: string;
  mediaUrl?: string;
  mediaType?: 'image' | 'audio';
  timestamp: number;
  reactions: string[]; // e.g., ['❤️', '👍']
  status: 'sent' | 'delivered' | 'read';
}