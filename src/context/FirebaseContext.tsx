import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, onAuthStateChanged } from 'firebase/auth';
import { doc, onSnapshot, setDoc, getDoc, collection, addDoc, updateDoc, deleteDoc, query, orderBy } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { UserProfile, DailyHealth, Goal, ScheduleItem } from '../types';
import { format } from 'date-fns';
import { translations, Language, TranslationKey } from '../lib/translations';

import { startMovementTracking, calculateCaloriesBurned, estimateSleepDuration, calculateSteps, calculateWaterIntake, calculateBMR } from '../lib/HealthTrackerService';

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
  connectGoogleFit: () => Promise<void>;
  syncGoogleFitData: () => Promise<void>;
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

  // Movement Tracking Effect
  useEffect(() => {
    if (!user || !profile) return;

    const watchId = startMovementTracking(
      async (delta) => {
        if (dailyHealth) {
          const newDistance = Math.round((dailyHealth.distance + delta) * 100) / 100;
          const newSteps = calculateSteps(newDistance);
          const newCalories = dailyHealth.calories + calculateCaloriesBurned(delta, profile.weight || 70);
          
          // Calculate water based on new calories and time
          const now = new Date();
          const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          const hoursElapsed = (now.getTime() - startOfDay.getTime()) / (1000 * 60 * 60);
          const newWater = calculateWaterIntake(newCalories, hoursElapsed);
          
          await updateDailyHealth({ 
            distance: newDistance,
            steps: newSteps,
            calories: Math.round(newCalories),
            water: Math.max(dailyHealth.water, newWater)
          });
        }
      },
      (error) => console.warn('Movement tracking error:', error)
    );

    return () => {
      if (watchId !== null) navigator.geolocation.clearWatch(watchId);
    };
  }, [user, profile, dailyHealth?.date]); // Only restart if date changes or user changes

  // Last Active Tracking Effect
    useEffect(() => {
    if (!user) return;

    const updateLastActive = async () => {
      await setDoc(doc(db, 'users', user.uid), { 
        lastActive: Date.now() 
      }, { merge: true });
    };

    const interval = setInterval(updateLastActive, 60000); // Every minute
    updateLastActive();

    return () => clearInterval(interval);
  }, [user]);

  // Automatic Water & Sleep Periodic Sync
  useEffect(() => {
    if (!user || !profile || !dailyHealth) return;

    const periodicSync = async () => {
      const now = new Date();
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const hoursElapsed = (now.getTime() - startOfDay.getTime()) / (1000 * 60 * 60);
      
      const birthDate = profile.birthday ? new Date(profile.birthday) : new Date(1990, 0, 1);
      const age = now.getFullYear() - birthDate.getFullYear();
      const bmr = calculateBMR(profile.weight || 70, profile.height || 175, age, profile.gender || 'male');
      const bmrPerHour = bmr / 24;
      const basalCalories = Math.round(hoursElapsed * bmrPerHour);
      
      const newWater = calculateWaterIntake(dailyHealth.calories, hoursElapsed);
      
      const updates: Partial<DailyHealth> = {};
      
      if (newWater > dailyHealth.water) {
        updates.water = newWater;
      }

      // Add basal calories if they are higher than current (ensures minimum burn)
      if (basalCalories > dailyHealth.calories) {
        updates.calories = basalCalories;
      }

      if (Object.keys(updates).length > 0) {
        await updateDailyHealth(updates);
      }
    };

    const interval = setInterval(periodicSync, 60000 * 5); // Every 5 minutes
    periodicSync();

    return () => clearInterval(interval);
  }, [user, profile, dailyHealth?.date]);

  // Google Fit OAuth Message Listener
  useEffect(() => {
    const handleMessage = async (event: MessageEvent) => {
      if (event.data?.type === 'GOOGLE_AUTH_SUCCESS') {
        const { tokens } = event.data;
        if (user && tokens) {
          await updateProfile({
            googleFitTokens: {
              accessToken: tokens.access_token,
              refreshToken: tokens.refresh_token,
              expiresAt: Date.now() + tokens.expires_in * 1000
            }
          });
          // Initial sync
          await syncGoogleFitData();
        }
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [user]);

  // Periodic Google Fit Sync
  useEffect(() => {
    if (!user || !profile?.googleFitTokens) return;

    const interval = setInterval(async () => {
      await syncGoogleFitData();
    }, 60000 * 15); // Sync every 15 minutes

    return () => clearInterval(interval);
  }, [user, profile?.googleFitTokens]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setUser(user);
      setIsAuthReady(true);
      if (user) {
        // Profile
        const profileRef = doc(db, 'users', user.uid);
        const profileSnap = await getDoc(profileRef);
        
        let currentProfile: UserProfile;

        if (!profileSnap.exists()) {
          currentProfile = {
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
          await setDoc(profileRef, currentProfile);
        } else {
          currentProfile = profileSnap.data() as UserProfile;
        }

        onSnapshot(profileRef, (doc) => {
          if (doc.exists()) {
            const profileData = doc.data() as UserProfile;
            setProfile(profileData);
            
            // Apply dark mode class
            if (profileData.settings?.darkMode) {
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
        const healthSnap = await getDoc(healthRef);

        if (!healthSnap.exists()) {
          // Check for sleep estimation if it's the first time today
          let estimatedSleep = 0;
          const lastActive = (profileSnap.data() as any)?.lastActive;
          if (lastActive) {
            estimatedSleep = estimateSleepDuration(lastActive);
          }

          const initialHealth: DailyHealth = {
            date: today,
            distance: 0,
            steps: 0,
            water: 0,
            sleep: estimatedSleep,
            calories: 0
          };
          await setDoc(healthRef, initialHealth);
        }

        onSnapshot(healthRef, (doc) => {
          if (doc.exists()) {
            setDailyHealth(doc.data() as DailyHealth);
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

  const connectGoogleFit = async () => {
    try {
      const response = await fetch('/api/auth/google/url');
      const { url } = await response.json();
      window.open(url, 'google_fit_auth', 'width=600,height=700');
    } catch (error) {
      console.error('Failed to get Google Auth URL:', error);
    }
  };

  const syncGoogleFitData = async () => {
    if (!user || !profile?.googleFitTokens) return;

    try {
      const response = await fetch('/api/health/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accessToken: profile.googleFitTokens.accessToken })
      });

      if (response.ok) {
        const data = await response.json();
        await updateDailyHealth({
          steps: Math.max(dailyHealth?.steps || 0, data.steps),
          calories: Math.max(dailyHealth?.calories || 0, data.calories),
          water: Math.max(dailyHealth?.water || 0, data.water)
        });
      }
    } catch (error) {
      console.error('Failed to sync Google Fit data:', error);
    }
  };

  const t = (key: TranslationKey): string => {
    const lang: Language = profile?.settings.language || 'uz';
    return translations[lang][key] || key;
  };

  return (
    <FirebaseContext.Provider value={{
      user, loading, profile, dailyHealth, healthHistory, goals, schedule, isAuthReady,
      updateProfile, updateDailyHealth, addGoal, updateGoal, deleteGoal,
      addScheduleItem, updateScheduleItem, deleteScheduleItem, logout, connectGoogleFit, syncGoogleFitData, t
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
