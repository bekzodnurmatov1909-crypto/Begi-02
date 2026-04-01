export interface UserProfile {
  fullName: string;
  email: string;
  phone: string;
  birthday: string;
  address: string;
  height: number;
  weight: number;
  gender: 'male' | 'female';
  photoUrl?: string;
  bloodType?: string;
  allergies?: string;
  emergencyContact?: string;
  settings: UserSettings;
}

export interface UserSettings {
  notificationsEnabled: boolean;
  waterReminder: boolean;
  waterInterval: number; // in minutes
  workoutReminder: boolean;
  workoutInterval: number; // in minutes
  darkMode: boolean;
  fontSize: 'small' | 'medium' | 'large';
  language: 'uz' | 'ru' | 'en';
}

export interface DailyHealth {
  date: string;
  distance: number;
  water: number;
  sleep: number;
  calories: number;
}

export interface Goal {
  id: string;
  title: string;
  type: 'vazn' | 'suv' | 'masofa' | 'uyqu' | 'kaloriya' | 'boshqa';
  current: number;
  target: number;
  deadline: string;
  unit: string;
  icon: string;
  color: string;
  completed: boolean;
  priority?: 'past' | 'o\'rta' | 'yuqori';
  category?: string;
}

export interface ScheduleItem {
  id: string;
  time: string;
  type: 'meal' | 'exercise' | 'water' | 'rest' | 'work' | 'other';
  title: string;
  calories?: number;
  distance?: number;
  duration?: number;
  description?: string;
  completed: boolean;
}

export interface ChatMessage {
  id: string;
  text: string;
  sender: 'user' | 'ai';
  timestamp: number;
}
