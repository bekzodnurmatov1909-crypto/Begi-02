import React, { useState } from 'react';
import { FirebaseProvider, useFirebase } from './context/FirebaseContext';
import Layout from './components/Layout';
import Dashboard from './components/Dashboard';
import AIChat from './components/AIChat';
import Profile from './components/Profile';
import BMICalculator from './components/BMICalculator';
import Statistics from './components/Statistics';
import Goals from './components/Goals';
import FitnessPlans from './components/FitnessPlans';
import Login from './components/Login';
import { RefreshCw } from 'lucide-react';

const AppContent: React.FC = () => {
  const { user, loading, isAuthReady } = useFirebase();
  const [activeSection, setActiveSection] = useState('dashboard');

  if (loading || !isAuthReady) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#f5f5f5] space-y-4">
        <RefreshCw className="w-12 h-12 text-primary animate-spin" />
        <p className="font-medium text-gray-500">Yuklanmoqda...</p>
      </div>
    );
  }

  if (!user) {
    return <Login />;
  }

  const renderSection = () => {
    switch (activeSection) {
      case 'dashboard': return <Dashboard />;
      case 'statistics': return <Statistics />;
      case 'bmi': return <BMICalculator />;
      case 'ai-tips': return <AIChat />;
      case 'fitness': return <FitnessPlans />;
      case 'goals': return <Goals />;
      case 'profile': return <Profile />;
      default: return <Dashboard />;
    }
  };

  return (
    <Layout activeSection={activeSection} setActiveSection={setActiveSection}>
      {renderSection()}
    </Layout>
  );
};

export default function App() {
  return (
    <FirebaseProvider>
      <AppContent />
    </FirebaseProvider>
  );
}
