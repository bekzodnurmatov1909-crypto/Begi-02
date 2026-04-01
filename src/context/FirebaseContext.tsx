import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, onAuthStateChanged } from 'firebase/auth';
import { doc, onSnapshot, setDoc, getDoc, collection, addDoc, updateDoc, deleteDoc, query, orderBy } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { UserProfile, DailyHealth, Goal, ScheduleItem } from '../types';
import { format } from 'date-fns';
import { translations, Language, TranslationKey } from '../lib/translations';

interface FirebaseContextType {
  user: User | null;
  loading: boolean;
  profile: UserProfile | null;
  dailyHealth: DailyHealth | null;
  healthHistory: DailyHealth[];
  goals: Goal[];
  schedule: ScheduleItem[];
  isAuthReady: boolean;
  updateProfile: (data: Partial<UserProfile>) => Promise<void>;
  updateDailyHealth: (data: Partial<DailyHealth>) => Promise<void>;
  addGoal: (goal: Omit<Goal, 'id'>) => Promise<void>;
  updateGoal: (id: string, data: Partial<Goal>) => Promise<void>;
  deleteGoal: (id: string) => Promise<void>;
  addScheduleItem: (item: Omit<ScheduleItem, 'id'>) => Promise<void>;
  updateScheduleItem: (id: string, data: Partial<ScheduleItem>) => Promise<void>;
  deleteScheduleItem: (id: string) => Promise<void>;
  logout: () => Promise<void>;
  t: (key: TranslationKey) => string;
}

const FirebaseContext = createContext<FirebaseContextType | undefined>(undefined);

export const FirebaseProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [dailyHealth, setDailyHealth] = useState<DailyHealth | null>(null);
  const [healthHistory, setHealthHistory] = useState<DailyHealth[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [schedule, setSchedule] = useState<ScheduleItem[]>([]);

  const today = format(new Date(), 'yyyy-MM-dd');

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setUser(user);
      setIsAuthReady(true);
      if (user) {
        // Profile
        const profileRef = doc(db, 'users', user.uid);
        const profileSnap = await getDoc(profileRef);
        if (!profileSnap.exists()) {
          const initialProfile: UserProfile = {
            fullName: user.displayName || user.email?.split('@')[0] || 'User',
            email: user.email || '',
            phone: '',
            birthday: '',
            address: '',
            height: 175,
            weight: 75,
            gender: 'male',
            bloodType: '',
            allergies: '',
            emergencyContact: '',
            settings: {
              notificationsEnabled: true,
              waterReminder: true,
              waterInterval: 60,
              workoutReminder: true,
              workoutInterval: 1440,
              darkMode: false,
              fontSize: 'medium',
              language: 'uz'
            }
          };
          await setDoc(profileRef, initialProfile);
        }
        onSnapshot(profileRef, (doc) => {
          if (doc.exists()) {
            const profileData = doc.data() as UserProfile;
            setProfile(profileData);
            
            // Apply dark mode class
            if (profileData.settings.darkMode) {
              document.documentElement.classList.add('dark');
              document.body.classList.add('dark');
            } else {
              document.documentElement.classList.remove('dark');
              document.body.classList.remove('dark');
            }
          }
        });

        // Daily Health
        const healthRef = doc(db, 'users', user.uid, 'dailyHealth', today);
        onSnapshot(healthRef, (doc) => {
          if (doc.exists()) {
            setDailyHealth(doc.data() as DailyHealth);
          } else {
            const initialHealth: DailyHealth = {
              date: today,
              distance: 0,
              water: 0,
              sleep: 0,
              calories: 0
            };
            setDoc(healthRef, initialHealth);
          }
        });

        // Health History
        const historyRef = collection(db, 'users', user.uid, 'dailyHealth');
        const historyQuery = query(historyRef, orderBy('date', 'desc'));
        onSnapshot(historyQuery, (snapshot) => {
          const historyData = snapshot.docs.map(doc => doc.data() as DailyHealth);
          setHealthHistory(historyData);
        });

        // Goals
        const goalsRef = collection(db, 'users', user.uid, 'goals');
        onSnapshot(goalsRef, (snapshot) => {
          const goalsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Goal));
          setGoals(goalsData);
        });

        // Schedule
        const scheduleRef = collection(db, 'users', user.uid, 'schedule');
        const q = query(scheduleRef, orderBy('time', 'asc'));
        onSnapshot(q, (snapshot) => {
          const scheduleData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ScheduleItem));
          setSchedule(scheduleData);
        });
      } else {
        setProfile(null);
        setDailyHealth(null);
        setGoals([]);
        setSchedule([]);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, [today]);

  const updateProfile = async (data: Partial<UserProfile>) => {
    if (!user) {
      console.warn('updateProfile called but no user is logged in');
      return;
    }
    console.log('Updating profile for user:', user.uid, 'with data:', data);
    try {
      await setDoc(doc(db, 'users', user.uid), data, { merge: true });
      console.log('Profile updated successfully in Firestore');
    } catch (error) {
      console.error('Firestore updateProfile error:', error);
      throw error;
    }
  };

  const updateDailyHealth = async (data: Partial<DailyHealth>) => {
    if (!user) return;
    await setDoc(doc(db, 'users', user.uid, 'dailyHealth', today), data, { merge: true });
  };

  const addGoal = async (goal: Omit<Goal, 'id'>) => {
    if (!user) return;
    await addDoc(collection(db, 'users', user.uid, 'goals'), goal);
  };

  const updateGoal = async (id: string, data: Partial<Goal>) => {
    if (!user) return;
    await updateDoc(doc(db, 'users', user.uid, 'goals', id), data);
  };

  const deleteGoal = async (id: string) => {
    if (!user) return;
    await deleteDoc(doc(db, 'users', user.uid, 'goals', id));
  };

  const addScheduleItem = async (item: Omit<ScheduleItem, 'id'>) => {
    if (!user) return;
    await addDoc(collection(db, 'users', user.uid, 'schedule'), item);
  };

  const updateScheduleItem = async (id: string, data: Partial<ScheduleItem>) => {
    if (!user) return;
    await updateDoc(doc(db, 'users', user.uid, 'schedule', id), data);
  };

  const deleteScheduleItem = async (id: string) => {
    if (!user) return;
    await deleteDoc(doc(db, 'users', user.uid, 'schedule', id));
  };

  const logout = async () => {
    await auth.signOut();
  };

  const t = (key: TranslationKey): string => {
    const lang: Language = profile?.settings.language || 'uz';
    return translations[lang][key] || key;
  };

  return (
    <FirebaseContext.Provider value={{
      user, loading, profile, dailyHealth, healthHistory, goals, schedule, isAuthReady,
      updateProfile, updateDailyHealth, addGoal, updateGoal, deleteGoal,
      addScheduleItem, updateScheduleItem, deleteScheduleItem, logout, t
    }}>
      {children}
    </FirebaseContext.Provider>
  );
};

export const useFirebase = () => {
  const context = useContext(FirebaseContext);
  if (context === undefined) {
    throw new Error('useFirebase must be used within a FirebaseProvider');
  }
  return context;
};
