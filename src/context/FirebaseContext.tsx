import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, onAuthStateChanged } from 'firebase/auth';
import { doc, onSnapshot, setDoc, getDoc, collection, addDoc, updateDoc, deleteDoc, query, orderBy, getDocFromServer } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { UserProfile, DailyHealth, Goal, ScheduleItem } from '../types';
import { format } from 'date-fns';
import { translations, Language, TranslationKey } from '../lib/translations';

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

const handleFirestoreError = (error: unknown, operationType: OperationType, path: string | null) => {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
};

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
  isSyncing: boolean;
  updateProfile: (data: Partial<UserProfile>) => Promise<void>;
  updateDailyHealth: (data: Partial<DailyHealth>) => Promise<void>;
  addGoal: (goal: Omit<Goal, 'id'>) => Promise<void>;
  updateGoal: (id: string, data: Partial<Goal>) => Promise<void>;
  deleteGoal: (id: string) => Promise<void>;
  addScheduleItem: (item: Omit<ScheduleItem, 'id'>) => Promise<void>;
  updateScheduleItem: (id: string, data: Partial<ScheduleItem>) => Promise<void>;
  deleteScheduleItem: (id: string) => Promise<void>;
  logout: () => Promise<void>;
  connectHealthConnect: () => Promise<void>;
  syncHealthConnectData: () => Promise<void>;
  t: (key: TranslationKey) => string;
}

const FirebaseContext = createContext<FirebaseContextType | undefined>(undefined);

export const FirebaseProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
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
          await syncHealthConnectData();
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
      await syncHealthConnectData();
    }, 60000); // Sync every 1 minute

    return () => clearInterval(interval);
  }, [user, profile?.googleFitTokens]);

  useEffect(() => {
    const testConnection = async () => {
      try {
        await getDocFromServer(doc(db, 'test', 'connection'));
      } catch (error) {
        if (error instanceof Error && error.message.includes('the client is offline')) {
          console.error("Please check your Firebase configuration. The client is offline.");
        }
      }
    };
    testConnection();

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
          const data = profileSnap.data() as UserProfile;
          // Ensure settings exist even for old profiles
          if (!data.settings) {
            data.settings = {
              notificationsEnabled: true,
              waterReminder: true,
              waterInterval: 60,
              workoutReminder: true,
              workoutInterval: 1440,
              darkMode: false,
              fontSize: 'medium',
              language: 'uz'
            };
            await updateDoc(profileRef, { settings: data.settings });
          }
          currentProfile = data;
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
    const path = `users/${user.uid}`;
    try {
      await setDoc(doc(db, 'users', user.uid), data, { merge: true });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  };

  const updateDailyHealth = async (data: Partial<DailyHealth>) => {
    if (!user) return;
    const path = `users/${user.uid}/dailyHealth/${today}`;
    try {
      await setDoc(doc(db, 'users', user.uid, 'dailyHealth', today), data, { merge: true });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  };

  const addGoal = async (goal: Omit<Goal, 'id'>) => {
    if (!user) return;
    const path = `users/${user.uid}/goals`;
    try {
      await addDoc(collection(db, 'users', user.uid, 'goals'), goal);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, path);
    }
  };

  const updateGoal = async (id: string, data: Partial<Goal>) => {
    if (!user) return;
    const path = `users/${user.uid}/goals/${id}`;
    try {
      await updateDoc(doc(db, 'users', user.uid, 'goals', id), data);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  };

  const deleteGoal = async (id: string) => {
    if (!user) return;
    const path = `users/${user.uid}/goals/${id}`;
    try {
      await deleteDoc(doc(db, 'users', user.uid, 'goals', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
    }
  };

  const addScheduleItem = async (item: Omit<ScheduleItem, 'id'>) => {
    if (!user) return;
    const path = `users/${user.uid}/schedule`;
    try {
      await addDoc(collection(db, 'users', user.uid, 'schedule'), item);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, path);
    }
  };

  const updateScheduleItem = async (id: string, data: Partial<ScheduleItem>) => {
    if (!user) return;
    const path = `users/${user.uid}/schedule/${id}`;
    try {
      await updateDoc(doc(db, 'users', user.uid, 'schedule', id), data);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  };

  const deleteScheduleItem = async (id: string) => {
    if (!user) return;
    const path = `users/${user.uid}/schedule/${id}`;
    try {
      await deleteDoc(doc(db, 'users', user.uid, 'schedule', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
    }
  };

  const logout = async () => {
    await auth.signOut();
  };

  const connectHealthConnect = async () => {
    try {
      const response = await fetch('/api/auth/google/url');
      const contentType = response.headers.get('content-type');
      
      if (!response.ok || !contentType?.includes('application/json')) {
        const text = await response.text();
        console.error('Server returned non-JSON response:', text.substring(0, 100));
        throw new Error(`Server error: ${response.status}. Expected JSON but got ${contentType}`);
      }
      
      const { url } = await response.json();
      window.open(url, 'health_connect_auth', 'width=600,height=700');
    } catch (error: any) {
      console.error('Failed to get Health Connect Auth URL:', error);
    }
  };

  const syncHealthConnectData = async () => {
    if (!user || !profile?.googleFitTokens) return;
    setIsSyncing(true);

    try {
      let currentAccessToken = profile.googleFitTokens.accessToken;
      
      // Check if token is expired or will expire in the next 5 minutes
      if (Date.now() + 300000 > profile.googleFitTokens.expiresAt) {
        console.log('Health Connect token expired or expiring soon, refreshing...');
        const refreshResponse = await fetch('/api/auth/google/refresh', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refreshToken: profile.googleFitTokens.refreshToken })
        });

        if (refreshResponse.ok) {
          const refreshData = await refreshResponse.json();
          currentAccessToken = refreshData.access_token;
          
          // Update tokens in profile
          await updateProfile({
            googleFitTokens: {
              ...profile.googleFitTokens,
              accessToken: refreshData.access_token,
              expiresAt: Date.now() + refreshData.expires_in * 1000
            }
          });
          console.log('Health Connect token refreshed successfully');
        } else {
          console.error('Failed to refresh Health Connect token');
          setIsSyncing(false);
          return;
        }
      }

      const now = new Date();
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 45000); // Increased to 45 second timeout

      try {
        const response = await fetch('/api/health/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            accessToken: currentAccessToken,
            startTimeMillis: startOfDay.getTime(),
            endTimeMillis: now.getTime()
          }),
          signal: controller.signal
        });
        clearTimeout(timeoutId);

        const contentType = response.headers.get('content-type');
        if (!response.ok || !contentType?.includes('application/json')) {
          const text = await response.text();
          console.error('Sync server returned non-JSON response:', text.substring(0, 200));
          throw new Error(`Server xatosi: ${response.status}. Kutilgan JSON o'rniga ${contentType} qaytdi. Iltimos, server jurnallarini tekshiring.`);
        }

        let data;
        const text = await response.text();
        try {
          data = JSON.parse(text);
        } catch (jsonErr) {
          console.error('Failed to parse JSON response:', text.substring(0, 200));
          throw new Error('Serverdan noto\'g\'ri formatdagi ma\'lumot keldi. Iltimos, qaytadan urinib ko\'ring.');
        }

        await updateDailyHealth({
          steps: Math.max(dailyHealth?.steps || 0, data.steps),
          calories: Math.max(dailyHealth?.calories || 0, data.calories),
          water: Math.max(dailyHealth?.water || 0, data.water),
          sleep: Math.max(dailyHealth?.sleep || 0, data.sleep),
          distance: Math.max(dailyHealth?.distance || 0, data.distance),
          activeMinutes: Math.max(dailyHealth?.activeMinutes || 0, data.activeMinutes),
          activityCalories: Math.max(dailyHealth?.activityCalories || 0, data.activityCalories),
          lastSync: Date.now()
        });
      } catch (err: any) {
        if (err.name === 'AbortError') {
          throw new Error('Sinxronizatsiya vaqti tugadi (Timeout). Iltimos, qaytadan urinib ko\'ring.');
        }
        throw err;
      }
    } catch (error) {
      console.error('Failed to sync Health Connect data:', error);
    } finally {
      setIsSyncing(false);
    }
  };

  const t = (key: TranslationKey): string => {
    const lang: Language = profile?.settings?.language || 'uz';
    return translations[lang][key] || key;
  };

  return (
    <FirebaseContext.Provider value={{
      user, loading, profile, dailyHealth, healthHistory, goals, schedule, isAuthReady, isSyncing,
      updateProfile, updateDailyHealth, addGoal, updateGoal, deleteGoal,
      addScheduleItem, updateScheduleItem, deleteScheduleItem, logout, connectHealthConnect, syncHealthConnectData, t
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
