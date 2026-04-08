import React from 'react';
import { Home, BarChart2, Calculator, Bot, Dumbbell, Target, User, Heart, LogOut, Sun, Moon } from 'lucide-react';
import { useFirebase } from '../context/FirebaseContext';
import { logout } from '../lib/firebase';
import { format } from 'date-fns';
import { uz, ru, enUS } from 'date-fns/locale';

interface SidebarProps {
  activeSection: string;
  setActiveSection: (section: string) => void;
  isOpen: boolean;
}

const Sidebar: React.FC<SidebarProps> = ({ activeSection, setActiveSection, isOpen }) => {
  const { profile, logout, updateProfile, t } = useFirebase();
  
  const navItems = [
    { id: 'dashboard', label: t('dashboard'), icon: Home },
    { id: 'statistics', label: t('statistics'), icon: BarChart2 },
    { id: 'bmi', label: t('bmi'), icon: Calculator },
    { id: 'ai-tips', label: t('aiTips'), icon: Bot },
    { id: 'fitness', label: t('fitness'), icon: Dumbbell },
    { id: 'goals', label: t('goals'), icon: Target },
    { id: 'profile', label: t('profile'), icon: User },
  ];

  const getLocale = () => {
    if (profile?.settings?.language === 'ru') return ru;
    if (profile?.settings?.language === 'en') return enUS;
    return uz;
  };

  return (
    <aside className={`w-72 bg-white dark:bg-[#2d2d2d] shadow-lg flex flex-col fixed top-0 left-0 h-screen z-50 transition-all duration-300 transform lg:translate-x-0 ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}>
      <div className="p-6 border-b border-gray-100 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 text-primary font-bold text-xl">
            <Heart className="w-8 h-8 fill-primary" />
            <span>{t('appName')}</span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-4 p-6 border-b border-gray-100 dark:border-gray-700">
        <div className="w-12 h-12 rounded-full bg-primary/10 border-2 border-primary flex items-center justify-center overflow-hidden">
          {profile?.photoUrl ? (
            <img src={profile.photoUrl} alt="Avatar" className="w-full h-full object-cover" />
          ) : (
            <User className="w-8 h-8 text-primary" />
          )}
        </div>
        <div className="flex flex-col">
          <span className="font-semibold text-sm dark:text-white">{profile?.fullName || t('user')}</span>
        </div>
      </div>

      <nav className="flex-1 py-6">
        <ul>
          {navItems.map((item) => (
            <li key={item.id}>
              <button
                onClick={() => setActiveSection(item.id)}
                className={`w-full flex items-center gap-4 px-6 py-3 transition-all border-l-4 ${
                  activeSection === item.id
                    ? 'bg-primary/10 border-primary text-primary'
                    : 'border-transparent text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'
                }`}
              >
                <item.icon className="w-5 h-5" />
                <span className="font-medium">{item.label}</span>
              </button>
            </li>
          ))}
        </ul>
      </nav>

      <div className="p-6 border-t border-gray-100 dark:border-gray-700/50">
        <div className="text-center text-xs text-gray-400">
          {format(new Date(), 'EEEE, d-MMMM', { locale: getLocale() })}
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
