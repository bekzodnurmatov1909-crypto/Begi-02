import React, { useState } from 'react';
import { useFirebase } from '../context/FirebaseContext';
import { Target, Plus, Edit2, Trash2, CheckCircle, ArrowUpCircle, Tag, Filter, Calendar, TrendingUp, Award, Zap, Quote, ChevronRight, Hash } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Goal } from '../types';
import { celebrate, getRandomMotivation } from '../lib/CelebrationService';

const MOTIVATIONAL_QUOTES = [
  "Muvaffaqiyat — bu har kuni takrorlanadigan kichik harakatlar yig'indisidir.",
  "Bugungi harakatingiz — ertangi natijangiz poydevori.",
  "Maqsadga erishish uchun birinchi qadam — bu boshlash.",
  "Sizning yagona raqibingiz — bu kechagi o'zingiz.",
  "Intizom — bu xohlagan narsangiz va eng ko'p xohlagan narsangiz o'rtasidagi tanlovdir."
];

interface GoalsProps {
  showToast?: (message: string) => void;
}

const Goals: React.FC<GoalsProps> = ({ showToast }) => {
  const { goals, addGoal, updateGoal, deleteGoal, t } = useFirebase();
  const [isAdding, setIsAdding] = useState(false);
  const [updateAmount, setUpdateAmount] = useState<{ [key: string]: number }>({});
  const [newGoal, setNewGoal] = useState<Partial<Goal>>({
    title: '',
    type: 'vazn',
    target: 0,
    current: 0,
    deadline: '',
    unit: 'kg',
    icon: 'Target',
    color: '#4CAF50',
    completed: false,
    priority: 'o\'rta',
    category: 'Salomatlik'
  });

  const quote = MOTIVATIONAL_QUOTES[Math.floor(Math.random() * MOTIVATIONAL_QUOTES.length)];

  const stats = {
    total: goals.length,
    completed: goals.filter(g => g.completed).length,
    active: goals.filter(g => !g.completed).length,
    avgProgress: goals.length ? Math.round(goals.reduce((acc, g) => acc + (g.current / g.target), 0) / goals.length * 100) : 0
  };

  const handleAdd = async () => {
    if (!newGoal.title || !newGoal.target) return;
    await addGoal(newGoal as Omit<Goal, 'id'>);
    setIsAdding(false);
    celebrate();
    showToast?.(getRandomMotivation(t));
    setNewGoal({
      title: '',
      type: 'vazn',
      target: 0,
      current: 0,
      deadline: '',
      unit: 'kg',
      icon: 'Target',
      color: '#4CAF50',
      completed: false,
      priority: 'o\'rta',
      category: 'Salomatlik'
    });
  };

  const handleUpdateProgress = async (id: string, current: number, target: number, amount: number) => {
    const newCurrent = Math.max(0, current + amount);
    const completed = newCurrent >= target;
    const wasCompleted = current >= target;
    
    await updateGoal(id, { current: newCurrent, completed });
    
    if (completed && !wasCompleted) {
      celebrate();
      showToast?.(t('goalCompleted'));
      setTimeout(() => {
        showToast?.(getRandomMotivation(t));
      }, 2000);
    }
    setUpdateAmount({ ...updateAmount, [id]: 0 });
  };

  return (
    <div className="max-w-6xl mx-auto space-y-10">
      {/* Header & Stats Section */}
      <div className="space-y-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
          <div className="flex items-center gap-4">
            <div className="p-4 bg-primary/10 rounded-2xl">
              <Target className="w-8 h-8 text-primary" />
            </div>
            <div>
              <h2 className="text-3xl font-black dark:text-white tracking-tight">Maqsadlar Markazi</h2>
            </div>
          </div>
          <button 
            onClick={() => setIsAdding(!isAdding)}
            className="flex items-center gap-3 px-8 py-3.5 bg-primary text-white rounded-2xl font-bold hover:bg-primary-dark transition-all shadow-xl shadow-primary/20 hover:scale-105 active:scale-95"
          >
            <Plus className="w-5 h-5" />
            <span>Yangi maqsad qo'shish</span>
          </button>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Jami', value: stats.total, icon: Hash, color: 'text-blue-500', bg: 'bg-blue-50' },
            { label: 'Bajarildi', value: stats.completed, icon: Award, color: 'text-emerald-500', bg: 'bg-emerald-50' },
            { label: 'Faol', value: stats.active, icon: Zap, color: 'text-warning', bg: 'bg-warning/10' },
            { label: 'O\'rtacha', value: `${stats.avgProgress}%`, icon: TrendingUp, color: 'text-primary', bg: 'bg-primary/5' },
          ].map((stat, i) => (
            <div key={i} className="bg-white dark:bg-[#2d2d2d] p-5 rounded-3xl border border-gray-100 dark:border-gray-800 flex items-center gap-4">
              <div className={`p-3 rounded-xl ${stat.bg} ${stat.color}`}>
                <stat.icon className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{stat.label}</p>
                <p className="text-xl font-black dark:text-white">{stat.value}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Motivational Quote */}
        <div className="bg-gradient-to-r from-primary/5 to-transparent p-6 rounded-3xl border-l-4 border-primary flex items-start gap-4 italic">
          <Quote className="w-6 h-6 text-primary/40 flex-shrink-0" />
          <p className="text-gray-600 dark:text-gray-300 font-medium leading-relaxed">
            {quote}
          </p>
        </div>
      </div>

      <AnimatePresence>
        {isAdding && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="bg-white dark:bg-[#2d2d2d] p-8 rounded-3xl shadow-sm border border-primary/10 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-2">
                    <Tag className="w-3 h-3" /> Maqsad nomi
                  </label>
                  <input
                    type="text"
                    value={newGoal.title}
                    onChange={(e) => setNewGoal({ ...newGoal, title: e.target.value })}
                    placeholder="Masalan: 10 kg yo'qotish"
                    className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border-none rounded-xl focus:ring-2 focus:ring-primary/20 dark:text-white outline-none transition-all"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-2">
                    <Filter className="w-3 h-3" /> Turi
                  </label>
                  <select
                    value={newGoal.type}
                    onChange={(e) => {
                      const type = e.target.value as any;
                      const units: any = { vazn: 'kg', suv: 'L', qadamlar: 'qadam', uyqu: 'soat', kaloriya: 'kkal', boshqa: 'birlik' };
                      setNewGoal({ ...newGoal, type, unit: units[type] || 'birlik' });
                    }}
                    className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border-none rounded-xl focus:ring-2 focus:ring-primary/20 dark:text-white outline-none transition-all appearance-none"
                  >
                    <option value="vazn">Vazn</option>
                    <option value="suv">Suv</option>
                    <option value="qadamlar">Qadamlar</option>
                    <option value="uyqu">Uyqu</option>
                    <option value="kaloriya">Kaloriya</option>
                    <option value="boshqa">Boshqa</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-2">
                    <Zap className="w-3 h-3" /> Prioritet
                  </label>
                  <select
                    value={newGoal.priority}
                    onChange={(e) => setNewGoal({ ...newGoal, priority: e.target.value as any })}
                    className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border-none rounded-xl focus:ring-2 focus:ring-primary/20 dark:text-white outline-none transition-all appearance-none"
                  >
                    <option value="past">Past</option>
                    <option value="o'rta">O'rta</option>
                    <option value="yuqori">Yuqori</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-2">
                    <Award className="w-3 h-3" /> Kategoriya
                  </label>
                  <input
                    type="text"
                    value={newGoal.category}
                    onChange={(e) => setNewGoal({ ...newGoal, category: e.target.value })}
                    placeholder="Masalan: Sport"
                    className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border-none rounded-xl focus:ring-2 focus:ring-primary/20 dark:text-white outline-none transition-all"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-2">
                    <Target className="w-3 h-3" /> Maqsad qiymati
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      value={newGoal.target}
                      onChange={(e) => setNewGoal({ ...newGoal, target: Number(e.target.value) })}
                      className="flex-1 px-4 py-3 bg-gray-50 dark:bg-gray-800 border-none rounded-xl focus:ring-2 focus:ring-primary/20 dark:text-white outline-none transition-all"
                    />
                    <input
                      type="text"
                      value={newGoal.unit}
                      onChange={(e) => setNewGoal({ ...newGoal, unit: e.target.value })}
                      placeholder="Birlik"
                      className="w-20 px-4 py-3 bg-gray-50 dark:bg-gray-800 border-none rounded-xl focus:ring-2 focus:ring-primary/20 dark:text-white outline-none transition-all"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-2">
                    <Calendar className="w-3 h-3" /> Muddat
                  </label>
                  <input
                    type="date"
                    value={newGoal.deadline}
                    onChange={(e) => setNewGoal({ ...newGoal, deadline: e.target.value })}
                    className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border-none rounded-xl focus:ring-2 focus:ring-primary/20 dark:text-white outline-none transition-all"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-3">
                <button 
                  onClick={() => setIsAdding(false)}
                  className="px-6 py-2.5 text-gray-500 font-semibold hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-all"
                >
                  Bekor qilish
                </button>
                <button 
                  onClick={handleAdd}
                  className="px-8 py-2.5 bg-primary text-white rounded-xl font-bold hover:bg-primary-dark transition-all shadow-lg shadow-primary/20"
                >
                  Qo'shish
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {goals.map((goal) => {
          const progress = Math.min(Math.round((goal.current / goal.target) * 100), 100);
          return (
            <motion.div
              key={goal.id}
              layout
              className="bg-white dark:bg-[#2d2d2d] p-8 rounded-3xl shadow-sm border-l-[8px] transition-all hover:translate-x-1"
              style={{ borderLeftColor: goal.color }}
            >
              <div className="flex justify-between items-start mb-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-gray-50 dark:bg-gray-800 flex items-center justify-center" style={{ color: goal.color }}>
                    <Target className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-xl font-bold dark:text-white">{goal.title}</h3>
                      {goal.priority && (
                        <span className={`text-[8px] font-black px-2 py-0.5 rounded-full uppercase tracking-tighter ${
                          goal.priority === 'yuqori' ? 'bg-danger/10 text-danger' :
                          goal.priority === 'o\'rta' ? 'bg-warning/10 text-warning' :
                          'bg-primary/10 text-primary'
                        }`}>
                          {goal.priority}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3">
                      <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider flex items-center gap-1">
                        <Calendar className="w-3 h-3" /> {goal.deadline}
                      </p>
                      {goal.category && (
                        <p className="text-[10px] text-primary/60 font-bold uppercase tracking-wider flex items-center gap-1">
                          <Tag className="w-3 h-3" /> {goal.category}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex gap-1">
                  <button className="p-2 text-gray-400 hover:text-primary hover:bg-primary/5 rounded-lg transition-all">
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={() => deleteGoal(goal.id)}
                    className="p-2 text-gray-400 hover:text-danger hover:bg-danger/5 rounded-lg transition-all"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex justify-between items-end">
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-black dark:text-white" style={{ color: goal.color }}>{goal.current}</span>
                    <span className="text-sm text-gray-400 font-bold">/ {goal.target} {goal.unit}</span>
                  </div>
                  <span className="text-sm font-black" style={{ color: goal.color }}>{progress}%</span>
                </div>

                <div className="w-full h-3 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${progress}%` }}
                    className="h-full rounded-full"
                    style={{ backgroundColor: goal.color }}
                  />
                </div>

                <div className="flex flex-col sm:flex-row gap-3 pt-4">
                  <div className="flex-1 flex gap-2">
                    <input
                      type="number"
                      value={updateAmount[goal.id] || ''}
                      onChange={(e) => setUpdateAmount({ ...updateAmount, [goal.id]: Number(e.target.value) })}
                      placeholder="Miqdor"
                      className="w-24 px-3 py-2 bg-gray-50 dark:bg-gray-800 border-none rounded-xl focus:ring-2 focus:ring-primary/20 dark:text-white outline-none text-sm"
                    />
                    <button 
                      onClick={() => handleUpdateProgress(goal.id, goal.current, goal.target, updateAmount[goal.id] || 1)}
                      className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-primary/10 text-primary rounded-xl font-bold hover:bg-primary hover:text-white transition-all"
                    >
                      <ArrowUpCircle className="w-4 h-4" />
                      <span>Yangilash</span>
                    </button>
                  </div>
                  {progress >= 100 && (
                    <div className="flex items-center justify-center gap-2 text-emerald-500 font-bold px-4 bg-emerald-50 dark:bg-emerald-500/10 rounded-xl py-2">
                      <CheckCircle className="w-5 h-5" />
                      <span className="text-xs uppercase tracking-widest">Bajarildi</span>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {goals.length === 0 && !isAdding && (
        <div className="py-20 flex flex-col items-center justify-center text-gray-400 space-y-4 opacity-50">
          <Target className="w-20 h-20" />
          <p className="text-xl font-medium">Hozircha maqsadlar mavjud emas</p>
          <button onClick={() => setIsAdding(true)} className="text-primary font-bold hover:underline">Birinchi maqsadni qo'shing</button>
        </div>
      )}
    </div>
  );
};

export default Goals;
