import React, { useState } from 'react';
import { useFirebase } from '../context/FirebaseContext';
import { Footprints, Droplets, Moon, Flame, Calendar, Plus, Filter, Clock, Tag, CheckCircle, Trash2, Edit2, RefreshCw, Smartphone } from 'lucide-react';
import { motion } from 'motion/react';
import Modal from './Modal';
import { ScheduleItem } from '../types';

import { celebrate, getRandomMotivation } from '../lib/CelebrationService';

interface DashboardProps {
  showToast?: (message: string) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ showToast }) => {
  const { profile, dailyHealth, schedule, addScheduleItem, updateScheduleItem, deleteScheduleItem, updateDailyHealth, connectGoogleFit, syncGoogleFitData, t } = useFirebase();
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isStatModalOpen, setIsStatModalOpen] = useState(false);
  const [editingStat, setEditingStat] = useState<{ id: string; title: string; unit: string; key: any } | null>(null);
  const [statValue, setStatValue] = useState<string>('');
  const [newTask, setNewTask] = useState<Partial<ScheduleItem>>({
    time: '',
    type: 'meal',
    title: '',
    completed: false
  });

  const stats = [
    {
      id: 'steps',
      title: t('steps'),
      key: 'steps',
      value: dailyHealth?.steps || 0,
      target: 10000,
      unit: '',
      icon: Footprints,
      color: 'text-primary',
      bgColor: 'bg-primary/10',
      progressColor: 'bg-primary',
      isAuto: true
    },
    {
      id: 'water',
      title: t('waterConsumption'),
      key: 'waterConsumption',
      value: dailyHealth?.water || 0,
      target: 2.5,
      unit: 'L',
      icon: Droplets,
      color: 'text-secondary',
      bgColor: 'bg-secondary/10',
      progressColor: 'bg-secondary',
      isAuto: true
    },
    {
      id: 'sleep',
      title: t('sleep'),
      key: 'sleep',
      value: dailyHealth?.sleep || 0,
      target: 8,
      unit: t('hours'),
      icon: Moon,
      color: 'text-purple-500',
      bgColor: 'bg-purple-500/10',
      progressColor: 'bg-purple-500',
      isAuto: true
    },
    {
      id: 'calories',
      title: t('calories'),
      key: 'calories',
      value: dailyHealth?.calories || 0,
      target: 2200,
      unit: 'kcal',
      icon: Flame,
      color: 'text-warning',
      bgColor: 'bg-warning/10',
      progressColor: 'bg-warning',
      isAuto: true
    }
  ];

  const handleQuickWater = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!dailyHealth) return;
    const newWater = Math.round((dailyHealth.water + 0.25) * 100) / 100;
    await updateDailyHealth({ water: newWater });
    celebrate();
    showToast?.(`+250ml ${t('waterConsumption')}`);
  };

  const handleAddTask = async () => {
    if (!newTask.title || !newTask.time) return;
    await addScheduleItem(newTask as Omit<ScheduleItem, 'id'>);
    setIsTaskModalOpen(false);
    celebrate();
    showToast?.(getRandomMotivation(t));
    setNewTask({ time: '', type: 'meal', title: '', completed: false });
    showToast?.(t('taskAdded'));
  };

  const handleStatClick = (stat: any) => {
    if (stat.isAuto) return; // Prevent manual editing of automatic stats
    setEditingStat({ id: stat.id, title: stat.title, unit: stat.unit, key: stat.key });
    setStatValue(stat.value.toString());
    setIsStatModalOpen(true);
  };

  const handleUpdateStat = async () => {
    if (!editingStat) return;
    const value = parseFloat(statValue);
    if (isNaN(value)) return;

    await updateDailyHealth({ [editingStat.id]: value });
    setIsStatModalOpen(false);
    celebrate();
    showToast?.(getRandomMotivation(t));
    showToast?.(`${editingStat.title} ${t('statUpdated')}`);
  };

  const toggleTask = async (task: ScheduleItem) => {
    const newCompleted = !task.completed;
    await updateScheduleItem(task.id, { completed: newCompleted });
    if (newCompleted) {
      celebrate();
      showToast?.(getRandomMotivation(t));
    }
  };

  const handleSync = async () => {
    setIsSyncing(true);
    try {
      await syncGoogleFitData();
      showToast?.(t('syncSuccess') || 'Ma\'lumotlar yangilandi');
      celebrate();
    } catch (error) {
      showToast?.(t('syncError') || 'Xatolik yuz berdi');
    } finally {
      setIsSyncing(false);
    }
  };

  const healthScore = Math.min(100, Math.round(
    (stats.reduce((acc, stat) => acc + Math.min(stat.value / stat.target, 1), 0) / 4) * 100
  ));

  const circumference = 2 * Math.PI * 54;
  const offset = circumference - (healthScore / 100) * circumference;

  return (
    <div className="space-y-8">
      {/* Welcome Card */}
      <div className="bg-white dark:bg-[#2d2d2d] rounded-2xl p-8 shadow-sm flex flex-col md:flex-row justify-between items-center gap-6 transition-colors">
        <div className="flex-1 text-center md:text-left">
          <h1 className="text-3xl font-black dark:text-white tracking-tight">
            {t('welcomeMessage')}, {profile?.fullName.split(' ')[0]}! 👋
          </h1>
          <p className="text-gray-500 font-medium mb-6">{t('trackingHealth')}</p>
          
          {profile?.googleFitTokens ? (
            <button 
              onClick={handleSync}
              disabled={isSyncing}
              className="flex items-center gap-2 px-6 py-3 bg-green-500/10 text-green-600 rounded-xl font-bold hover:bg-green-500/20 transition-all disabled:opacity-50"
            >
              <RefreshCw className={`w-5 h-5 ${isSyncing ? 'animate-spin' : ''}`} />
              <span>{isSyncing ? 'Sinxronlanmoqda...' : 'Google Fit bilan yangilash'}</span>
            </button>
          ) : (
            <button 
              onClick={connectGoogleFit}
              className="flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-xl font-bold hover:bg-primary-dark transition-all shadow-lg shadow-primary/20"
            >
              <Smartphone className="w-5 h-5" />
              <span>Health Connect (Google Fit) ulanish</span>
            </button>
          )}
        </div>

        <div className="flex flex-col items-center gap-2">
          <div className="relative w-32 h-32">
            <svg className="w-full h-full -rotate-90">
              <circle
                cx="64"
                cy="64"
                r="54"
                className="fill-none stroke-gray-100 dark:stroke-gray-700 stroke-[8]"
              />
              <motion.circle
                cx="64"
                cy="64"
                r="54"
                className="fill-none stroke-primary stroke-[8] stroke-linecap-round"
                initial={{ strokeDashoffset: circumference }}
                animate={{ strokeDashoffset: offset }}
                transition={{ duration: 1, ease: "easeOut" }}
                style={{ strokeDasharray: circumference }}
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-3xl font-bold text-primary">{healthScore}</span>
            </div>
          </div>
          <span className="text-sm font-medium text-gray-500 dark:text-gray-400">{t('healthIndex')}</span>
        </div>
      </div>

      {/* Quick Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat) => (
          <motion.div
            key={stat.id}
            whileHover={stat.isAuto ? {} : { y: -5 }}
            onClick={() => handleStatClick(stat)}
            className={`bg-white dark:bg-[#2d2d2d] rounded-2xl p-6 shadow-sm transition-colors border-2 border-transparent relative overflow-hidden group ${stat.isAuto ? 'cursor-default' : 'cursor-pointer hover:border-primary/20'}`}
          >
            {stat.isAuto && (
              <div className="absolute top-2 right-2 flex items-center gap-1 px-2 py-0.5 bg-green-500/10 text-green-500 rounded-full text-[10px] font-bold uppercase tracking-wider">
                <div className="w-1 h-1 bg-green-500 rounded-full animate-pulse" />
                Live
              </div>
            )}
            
            <div className="flex items-center gap-4 mb-4">
              <div className={`w-12 h-12 rounded-full ${stat.bgColor} flex items-center justify-center`}>
                <stat.icon className={`w-6 h-6 ${stat.color}`} />
              </div>
              <div className="flex-1">
                <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">{stat.title}</h3>
                <div className="flex items-baseline gap-1">
                  <span className="text-2xl font-bold dark:text-white">{stat.value}</span>
                  <span className="text-xs text-gray-400">{stat.unit} / {stat.target} {stat.unit}</span>
                </div>
              </div>
            </div>

            <div className="w-full h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${Math.min((stat.value / stat.target) * 100, 100)}%` }}
                className={`h-full ${stat.progressColor}`}
              />
            </div>
          </motion.div>
        ))}
      </div>

      {/* Schedule Section */}
      <div className="bg-white dark:bg-[#2d2d2d] rounded-2xl p-8 shadow-sm transition-colors">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-primary/10 rounded-xl">
              <Calendar className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h2 className="text-xl font-bold dark:text-white">{t('schedule')}</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">{t('plannedTasks')}</p>
            </div>
          </div>
          
          <div className="flex gap-3 w-full sm:w-auto">
            <button 
              onClick={() => showToast?.(t('filterSoon'))}
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-primary/10 text-primary rounded-xl font-medium hover:bg-primary/20 transition-colors"
            >
              <Filter className="w-4 h-4" />
              <span>{t('filter')}</span>
            </button>
            <button 
              onClick={() => setIsTaskModalOpen(true)}
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-primary text-white rounded-xl font-medium hover:bg-primary-dark transition-all shadow-lg shadow-primary/20"
            >
              <Plus className="w-4 h-4" />
              <span>{t('newTask')}</span>
            </button>
          </div>
        </div>

        <div className="space-y-4">
          {schedule.length > 0 ? (
            <div className="grid grid-cols-1 gap-4">
              {schedule.map((item) => (
                <div 
                  key={item.id}
                  className={`flex items-center justify-between p-4 rounded-2xl border transition-all ${
                    item.completed 
                      ? 'bg-gray-50 dark:bg-gray-800/50 border-transparent opacity-60' 
                      : 'bg-white dark:bg-[#333] border-gray-100 dark:border-gray-700 hover:border-primary/30'
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      item.completed ? 'bg-gray-200 text-gray-400' : 'bg-primary/10 text-primary'
                    }`}>
                      <Clock className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className={`font-bold text-sm ${item.completed ? 'line-through text-gray-400' : 'dark:text-white'}`}>
                        {item.title}
                      </h4>
                      <p className="text-xs text-gray-400 font-medium">{item.time}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => toggleTask(item)}
                      className={`p-2 rounded-lg transition-all ${
                        item.completed ? 'text-primary bg-primary/10' : 'text-gray-300 hover:text-primary hover:bg-primary/5'
                      }`}
                    >
                      <CheckCircle className="w-5 h-5" />
                    </button>
                    <button 
                      onClick={() => deleteScheduleItem(item.id)}
                      className="p-2 text-gray-300 hover:text-danger hover:bg-danger/5 rounded-lg transition-all"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-12 flex flex-col items-center justify-center text-gray-400 space-y-4">
              <Calendar className="w-16 h-16 opacity-20" />
              <p className="text-lg font-medium opacity-50">{t('noTasks')}</p>
              <button 
                onClick={() => setIsTaskModalOpen(true)}
                className="text-primary font-semibold hover:underline"
              >
                {t('addTask')}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Task Modal */}
      <Modal 
        isOpen={isTaskModalOpen} 
        onClose={() => setIsTaskModalOpen(false)} 
        title={t('addTaskTitle')}
      >
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-2">
                <Clock className="w-3 h-3" /> {t('time')}
              </label>
              <input
                type="time"
                value={newTask.time}
                onChange={(e) => setNewTask({ ...newTask, time: e.target.value })}
                className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border-none rounded-xl focus:ring-2 focus:ring-primary/20 dark:text-white outline-none transition-all"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-2">
                <Tag className="w-3 h-3" /> {t('type')}
              </label>
              <select
                value={newTask.type}
                onChange={(e) => setNewTask({ ...newTask, type: e.target.value as any })}
                className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border-none rounded-xl focus:ring-2 focus:ring-primary/20 dark:text-white outline-none transition-all appearance-none"
              >
                <option value="meal">{t('meal')}</option>
                <option value="exercise">{t('exercise')}</option>
                <option value="water">{t('water')}</option>
                <option value="rest">{t('rest')}</option>
                <option value="work">{t('work')}</option>
                <option value="other">{t('other')}</option>
              </select>
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">{t('taskName')}</label>
            <input
              type="text"
              value={newTask.title}
              onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
              placeholder={t('taskPlaceholder')}
              className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border-none rounded-xl focus:ring-2 focus:ring-primary/20 dark:text-white outline-none transition-all"
            />
          </div>
          <button 
            onClick={handleAddTask}
            className="w-full py-4 bg-primary text-white rounded-xl font-bold hover:bg-primary-dark transition-all shadow-lg shadow-primary/20"
          >
            {t('save')}
          </button>
        </div>
      </Modal>

      {/* Stat Update Modal */}
      <Modal
        isOpen={isStatModalOpen}
        onClose={() => setIsStatModalOpen(false)}
        title={`${editingStat?.title} ${t('updateStat')}`}
      >
        <div className="space-y-6">
          <div className="space-y-2">
            <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">
              {t('newValue')} ({editingStat?.unit})
            </label>
            <input
              type="number"
              step="0.1"
              value={statValue}
              onChange={(e) => setStatValue(e.target.value)}
              className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border-none rounded-xl focus:ring-2 focus:ring-primary/20 dark:text-white outline-none transition-all"
              autoFocus
            />
          </div>
          <button
            onClick={handleUpdateStat}
            className="w-full py-4 bg-primary text-white rounded-xl font-bold hover:bg-primary-dark transition-all shadow-lg shadow-primary/20"
          >
            {t('update')}
          </button>
        </div>
      </Modal>
    </div>
  );
};

export default Dashboard;
