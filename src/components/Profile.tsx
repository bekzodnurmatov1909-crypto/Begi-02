import React, { useState, useRef, useEffect } from 'react';
import { useFirebase } from '../context/FirebaseContext';
import { User, Mail, Phone, Calendar, MapPin, Ruler, Weight, Calculator, Baby, Edit2, Settings, Camera, Heart, X, Loader2, Bell, Droplets, Dumbbell, Moon, Type, Globe, Check, Footprints, Flame, BarChart2, LogOut } from 'lucide-react';
import { motion } from 'motion/react';
import Modal from './Modal';

interface ProfileProps {
  showToast?: (message: string, type?: 'success' | 'info') => void;
}

const Profile: React.FC<ProfileProps> = ({ showToast }) => {
  const { profile, updateProfile, dailyHealth, logout, t } = useFirebase();
  const [isEditing, setIsEditing] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [editData, setEditData] = useState({
    fullName: '',
    phone: '',
    birthday: '',
    address: '',
    height: 0,
    weight: 0,
    bloodType: '',
    allergies: ''
  });

  const [settingsData, setSettingsData] = useState(profile?.settings || {
    notificationsEnabled: true,
    waterReminder: true,
    waterInterval: 60,
    workoutReminder: true,
    workoutInterval: 1440,
    darkMode: false,
    fontSize: 'medium' as const,
    language: 'uz' as const
  });

  const [isSaving, setIsSaving] = useState(false);

  // Live preview for font size and dark mode
  useEffect(() => {
    const root = document.documentElement;
    const body = document.body;
    
    if (isSettingsOpen) {
      // Font size
      switch (settingsData.fontSize) {
        case 'small': root.style.fontSize = '14px'; break;
        case 'medium': root.style.fontSize = '16px'; break;
        case 'large': root.style.fontSize = '20px'; break;
        default: root.style.fontSize = '16px';
      }

      // Dark mode
      if (settingsData.darkMode) {
        root.classList.add('dark');
        body.classList.add('dark');
      } else {
        root.classList.remove('dark');
        body.classList.remove('dark');
      }
    } else if (profile?.settings) {
      // Revert to saved settings when modal is closed
      // Font size
      switch (profile.settings.fontSize) {
        case 'small': root.style.fontSize = '14px'; break;
        case 'medium': root.style.fontSize = '16px'; break;
        case 'large': root.style.fontSize = '20px'; break;
        default: root.style.fontSize = '16px';
      }

      // Dark mode
      if (profile.settings.darkMode) {
        root.classList.add('dark');
        body.classList.add('dark');
      } else {
        root.classList.remove('dark');
        body.classList.remove('dark');
      }
    }
  }, [settingsData.fontSize, settingsData.darkMode, isSettingsOpen, profile?.settings]);

  if (!profile) return null;

  const handleSettingsClick = () => {
    setSettingsData(profile.settings);
    setIsSettingsOpen(true);
  };

  const handleSettingsSave = async () => {
    setIsSaving(true);
    try {
      await updateProfile({ settings: settingsData });
      setIsSettingsOpen(false);
      if (showToast) showToast(t('settingsUpdated'));
    } catch (error) {
      console.error('Settings save error:', error);
      if (showToast) showToast(t('saveError'), 'info');
    } finally {
      setIsSaving(false);
    }
  };

  const handlePhotoClick = () => {
    fileInputRef.current?.click();
  };

  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check file size (limit to 1MB for Firestore base64 storage)
    if (file.size > 1024 * 1024) {
      if (showToast) showToast(t('photoSizeError'), 'info');
      return;
    }

    setIsUploading(true);
    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64String = reader.result as string;
      try {
        await updateProfile({ photoUrl: base64String });
      } catch (error) {
        console.error("Photo upload failed:", error);
      } finally {
        setIsUploading(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleEditClick = () => {
    setEditData({
      fullName: profile.fullName,
      phone: profile.phone || '',
      birthday: profile.birthday || '',
      address: profile.address || '',
      height: profile.height,
      weight: profile.weight,
      bloodType: profile.bloodType || '',
      allergies: profile.allergies || ''
    });
    setIsEditing(true);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await updateProfile(editData);
      setIsEditing(false);
      if (showToast) showToast(t('profileUpdated'));
    } catch (error) {
      console.error('Profile save error:', error);
      if (showToast) showToast(t('saveError'), 'info');
    } finally {
      setIsSaving(false);
    }
  };

  const bmi = (profile.weight / ((profile.height / 100) ** 2)).toFixed(1);
  
  const getAge = (birthday: string) => {
    if (!birthday) return 'N/A';
    const birthDate = new Date(birthday);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) age--;
    return age;
  };

  const infoItems = [
    { icon: Mail, label: 'Email', value: profile.email },
    { icon: Phone, label: t('phone'), value: profile.phone || 'N/A' },
    { icon: Calendar, label: t('birthday'), value: profile.birthday || 'N/A' },
    { icon: MapPin, label: t('address'), value: profile.address || 'N/A' },
    { icon: Heart, label: t('bloodType'), value: profile.bloodType || 'N/A' },
    { icon: X, label: t('allergies'), value: profile.allergies || 'N/A' },
  ];

  const healthItems = [
    { icon: Ruler, label: t('height'), value: `${profile.height} sm` },
    { icon: Weight, label: t('weight'), value: `${profile.weight} kg` },
    { icon: Calculator, label: 'BMI', value: bmi },
    { icon: Baby, label: t('year'), value: getAge(profile.birthday) },
  ];

  const dailyStats = [
    { icon: Footprints, label: t('distance'), value: `${dailyHealth?.distance || 0} km`, color: 'text-primary', bgColor: 'bg-primary/10' },
    { icon: Droplets, label: t('water'), value: `${dailyHealth?.water || 0} L`, color: 'text-secondary', bgColor: 'bg-secondary/10' },
    { icon: Moon, label: t('sleep'), value: `${dailyHealth?.sleep || 0} ${t('hours')}`, color: 'text-purple-500', bgColor: 'bg-purple-500/10' },
    { icon: Flame, label: t('calories'), value: `${dailyHealth?.calories || 0} kcal`, color: 'text-warning', bgColor: 'bg-warning/10' },
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="bg-white dark:bg-[#2d2d2d] rounded-3xl shadow-sm overflow-hidden transition-colors">
        <div className="h-32 bg-gradient-to-r from-primary to-green-400" />
        <div className="px-8 pb-8">
          <div className="relative -mt-16 mb-6 flex flex-col items-center sm:items-start sm:flex-row gap-6">
            <div className="relative group">
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handlePhotoChange} 
                className="hidden" 
                accept="image/*"
              />
              <div className="w-32 h-32 rounded-full bg-white dark:bg-[#2d2d2d] p-1 shadow-xl overflow-hidden relative">
                {profile.photoUrl ? (
                  <img src={profile.photoUrl} alt="Profile" className="w-full h-full object-cover rounded-full" />
                ) : (
                  <div className="w-full h-full bg-primary/10 rounded-full flex items-center justify-center text-primary">
                    <User className="w-16 h-16" />
                  </div>
                )}
                {isUploading && (
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center rounded-full">
                    <Loader2 className="w-8 h-8 text-white animate-spin" />
                  </div>
                )}
              </div>
              <button 
                onClick={handlePhotoClick}
                disabled={isUploading}
                className="absolute bottom-1 right-1 p-2 bg-primary text-white rounded-full shadow-lg hover:scale-110 transition-transform disabled:opacity-50 disabled:scale-100"
              >
                <Camera className="w-4 h-4" />
              </button>
            </div>
            
            <div className="flex-1 text-center sm:text-left pt-16 sm:pt-20">
              <h1 className="text-3xl font-bold dark:text-white">{profile.fullName}</h1>
            </div>

            <div className="flex gap-3 pt-16 sm:pt-20">
              <button 
                onClick={handleEditClick}
                className="flex items-center gap-2 px-6 py-2.5 bg-primary text-white rounded-xl font-semibold hover:bg-primary-dark transition-all shadow-lg shadow-primary/20"
              >
                <Edit2 className="w-4 h-4" />
                <span>{t('edit')}</span>
              </button>
              <button 
                onClick={handleSettingsClick}
                className="p-2.5 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-700 transition-all"
              >
                <Settings className="w-6 h-6" />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Personal Info */}
            <div className="space-y-6">
              <h3 className="text-lg font-bold flex items-center gap-3 text-primary border-b border-gray-100 dark:border-gray-700 pb-4">
                <User className="w-5 h-5" />
                {t('fullName')}
              </h3>
              <div className="space-y-4">
                {infoItems.map((item, i) => (
                  <div key={i} className="flex items-center gap-4 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-2xl hover:translate-x-1 transition-all">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                      <item.icon className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{item.label}</p>
                      <p className="font-semibold dark:text-white">{item.value}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Health Info */}
            <div className="space-y-6">
              <h3 className="text-lg font-bold flex items-center gap-3 text-primary border-b border-gray-100 dark:border-gray-700 pb-4">
                <Heart className="w-5 h-5" />
                {t('dailyProgress')}
              </h3>
              <div className="grid grid-cols-2 gap-4">
                {healthItems.map((item, i) => (
                  <div key={i} className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-2xl text-center hover:scale-105 transition-all">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary mx-auto mb-3">
                      <item.icon className="w-5 h-5" />
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">{item.label}</p>
                    <p className="text-xl font-bold dark:text-white">{item.value}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Daily Statistics */}
          <div className="mt-12 space-y-6">
            <h3 className="text-lg font-bold flex items-center gap-3 text-primary border-b border-gray-100 dark:border-gray-700 pb-4">
              <BarChart2 className="w-5 h-5" />
              {t('activity')}
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {dailyStats.map((stat, i) => (
                <div key={i} className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-2xl text-center hover:scale-105 transition-all">
                  <div className={`w-10 h-10 rounded-full ${stat.bgColor} flex items-center justify-center ${stat.color} mx-auto mb-3`}>
                    <stat.icon className="w-5 h-5" />
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-1 font-medium">{stat.label}</p>
                  <p className="text-xl font-bold dark:text-white">{stat.value}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Edit Profile Modal */}
      <Modal 
        isOpen={isEditing} 
        onClose={() => setIsEditing(false)} 
        title={t('edit')}
      >
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-xs font-bold text-gray-400 uppercase">{t('fullName')}</label>
            <input
              type="text"
              value={editData.fullName}
              onChange={(e) => setEditData({ ...editData, fullName: e.target.value })}
              className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-800 border-none rounded-xl focus:ring-2 focus:ring-primary/20 dark:text-white outline-none"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-400 uppercase">{t('phone')}</label>
              <input
                type="tel"
                value={editData.phone}
                onChange={(e) => setEditData({ ...editData, phone: e.target.value })}
                className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-800 border-none rounded-xl focus:ring-2 focus:ring-primary/20 dark:text-white outline-none"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-400 uppercase">{t('birthday')}</label>
              <input
                type="date"
                value={editData.birthday}
                onChange={(e) => setEditData({ ...editData, birthday: e.target.value })}
                className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-800 border-none rounded-xl focus:ring-2 focus:ring-primary/20 dark:text-white outline-none"
              />
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-xs font-bold text-gray-400 uppercase">{t('address')}</label>
            <input
              type="text"
              value={editData.address}
              onChange={(e) => setEditData({ ...editData, address: e.target.value })}
              className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-800 border-none rounded-xl focus:ring-2 focus:ring-primary/20 dark:text-white outline-none"
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-bold text-gray-400 uppercase">{t('bloodType')}</label>
            <input
              type="text"
              value={editData.bloodType}
              onChange={(e) => setEditData({ ...editData, bloodType: e.target.value })}
              placeholder="Masalan: A+"
              className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-800 border-none rounded-xl focus:ring-2 focus:ring-primary/20 dark:text-white outline-none"
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-bold text-gray-400 uppercase">{t('allergies')}</label>
            <textarea
              value={editData.allergies}
              onChange={(e) => setEditData({ ...editData, allergies: e.target.value })}
              placeholder={t('allergies')}
              className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-800 border-none rounded-xl focus:ring-2 focus:ring-primary/20 dark:text-white outline-none min-h-[80px]"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-400 uppercase">{t('height')}</label>
              <input
                type="number"
                value={editData.height}
                onChange={(e) => setEditData({ ...editData, height: Number(e.target.value) })}
                className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-800 border-none rounded-xl focus:ring-2 focus:ring-primary/20 dark:text-white outline-none"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-400 uppercase">{t('weight')}</label>
              <input
                type="number"
                value={editData.weight}
                onChange={(e) => setEditData({ ...editData, weight: Number(e.target.value) })}
                className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-800 border-none rounded-xl focus:ring-2 focus:ring-primary/20 dark:text-white outline-none"
              />
            </div>
          </div>
          <button 
            onClick={handleSave}
            disabled={isSaving}
            className="w-full py-3 bg-primary text-white rounded-xl font-bold hover:bg-primary-dark transition-all shadow-lg shadow-primary/20 mt-4 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isSaving ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                {t('saving')}
              </>
            ) : (
              t('save')
            )}
          </button>
        </div>
      </Modal>

      {/* Settings Modal */}
      <Modal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        title={t('settings')}
      >
        <div className="space-y-6">
          <div className="space-y-4">
            <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest">{t('notifications')}</h4>
            <div className="space-y-3">
              {[
                { id: 'notificationsEnabled', label: t('notifications'), icon: Bell },
                { id: 'waterReminder', label: t('waterReminder'), icon: Droplets, hasInterval: true, intervalId: 'waterInterval', unit: t('interval') },
                { id: 'workoutReminder', label: t('workoutReminder'), icon: Dumbbell, hasInterval: true, intervalId: 'workoutInterval', unit: t('interval') },
              ].map((item) => (
                <div key={item.id} className="space-y-2">
                  <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800/50 rounded-xl">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-white dark:bg-gray-700 rounded-lg text-primary shadow-sm">
                        <item.icon className="w-4 h-4" />
                      </div>
                      <span className="text-sm font-semibold dark:text-white">{item.label}</span>
                    </div>
                    <button
                      onClick={() => setSettingsData({ ...settingsData, [item.id]: !settingsData[item.id as keyof typeof settingsData] })}
                      className={`w-12 h-6 rounded-full transition-all relative ${settingsData[item.id as keyof typeof settingsData] ? 'bg-primary' : 'bg-gray-300 dark:bg-gray-600'}`}
                    >
                      <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${settingsData[item.id as keyof typeof settingsData] ? 'right-1' : 'left-1'}`} />
                    </button>
                  </div>
                  {item.hasInterval && settingsData[item.id as keyof typeof settingsData] && (
                    <div className="flex items-center gap-3 px-3 animate-in fade-in slide-in-from-top-1">
                      <span className="text-xs font-medium text-gray-500 dark:text-gray-400">{t('today')}</span>
                      <input
                        type="number"
                        value={settingsData[item.intervalId as keyof typeof settingsData] as number}
                        onChange={(e) => setSettingsData({ ...settingsData, [item.intervalId!]: Number(e.target.value) })}
                        className="w-20 px-2 py-1 text-xs bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg outline-none focus:ring-1 focus:ring-primary/30 dark:text-white"
                      />
                      <span className="text-xs font-medium text-gray-500 dark:text-gray-400">{item.unit}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest">{t('appName')}</h4>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800/50 rounded-xl">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-white dark:bg-gray-700 rounded-lg text-primary shadow-sm">
                    <Moon className="w-4 h-4" />
                  </div>
                  <span className="text-sm font-semibold dark:text-white">{t('darkMode')}</span>
                </div>
                <button
                  onClick={() => setSettingsData({ ...settingsData, darkMode: !settingsData.darkMode })}
                  className={`w-12 h-6 rounded-full transition-all relative ${settingsData.darkMode ? 'bg-primary' : 'bg-gray-300 dark:bg-gray-600'}`}
                >
                  <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${settingsData.darkMode ? 'right-1' : 'left-1'}`} />
                </button>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-3 px-3">
                  <Type className="w-4 h-4 text-gray-400" />
                  <span className="text-xs font-bold text-gray-400 uppercase">{t('fontSize')}</span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {(['small', 'medium', 'large'] as const).map((size) => (
                    <button
                      key={size}
                      onClick={() => setSettingsData({ ...settingsData, fontSize: size })}
                      style={{ fontSize: size === 'small' ? '0.7rem' : size === 'medium' ? '0.85rem' : '1rem' }}
                      className={`py-2 font-bold rounded-xl border-2 transition-all ${
                        settingsData.fontSize === size 
                          ? 'border-primary bg-primary/5 text-primary' 
                          : 'border-transparent bg-gray-50 dark:bg-gray-800 text-gray-500'
                      }`}
                    >
                      {t(size as any)}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest">{t('language')}</h4>
            <div className="space-y-2">
              <div className="flex items-center gap-3 px-3">
                <Globe className="w-4 h-4 text-gray-400" />
                <span className="text-xs font-bold text-gray-400 uppercase">{t('language')}</span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {(['uz', 'ru', 'en'] as const).map((lang) => (
                  <button
                    key={lang}
                    onClick={() => setSettingsData({ ...settingsData, language: lang })}
                    className={`py-2 text-xs font-bold rounded-xl border-2 transition-all ${
                      settingsData.language === lang 
                        ? 'border-primary bg-primary/5 text-primary' 
                        : 'border-transparent bg-gray-50 dark:bg-gray-800 text-gray-500'
                    }`}
                  >
                    {lang === 'uz' ? 'O\'zbek' : lang === 'ru' ? 'Русский' : 'English'}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <button
            onClick={handleSettingsSave}
            disabled={isSaving}
            className="w-full py-3 bg-primary text-white rounded-xl font-bold hover:bg-primary-dark transition-all shadow-lg shadow-primary/20 mt-4 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSaving ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                {t('saving')}
              </>
            ) : (
              <>
                <Check className="w-5 h-5" />
                {t('save')}
              </>
            )}
          </button>

          <div className="pt-4 border-t border-gray-100 dark:border-gray-700/50 mt-6">
            <button
              onClick={logout}
              className="w-full py-3 bg-danger/10 text-danger rounded-xl font-bold hover:bg-danger/20 transition-all flex items-center justify-center gap-2"
            >
              <LogOut className="w-5 h-5" />
              {t('logout')}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default Profile;
