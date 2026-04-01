import React, { useState, useEffect } from 'react';
import { useFirebase } from '../context/FirebaseContext';
import { Bot, Sparkles, RefreshCw, Zap, Brain, ShieldCheck, ChevronRight, Footprints, Droplets, Activity } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { getHealthTips } from '../services/geminiService';
import AIAssistant from './AIAssistant';

const AIChat: React.FC = () => {
  const { profile, dailyHealth, t } = useFirebase();
  const [tips, setTips] = useState<any[]>([]);
  const [loadingTips, setLoadingTips] = useState(false);

  useEffect(() => {
    if (profile) {
      fetchTips();
    }
  }, [profile]);

  const fetchTips = async () => {
    if (!profile) return;
    setLoadingTips(true);
    const newTips = await getHealthTips(dailyHealth, profile, profile.settings.language);
    setTips(newTips);
    setLoadingTips(false);
  };

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'high': return <Zap className="w-5 h-5 text-rose-500" />;
      case 'medium': return <Zap className="w-5 h-5 text-amber-500" />;
      default: return <Zap className="w-5 h-5 text-emerald-500" />;
    }
  };

  const getPriorityStyles = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-white dark:bg-gray-800 border-rose-500/30 text-rose-700 dark:text-rose-300 hover:border-rose-500 shadow-rose-500/5';
      case 'medium': return 'bg-white dark:bg-gray-800 border-amber-500/30 text-amber-700 dark:text-amber-300 hover:border-amber-500 shadow-amber-500/5';
      default: return 'bg-white dark:bg-gray-800 border-emerald-500/30 text-emerald-700 dark:text-emerald-300 hover:border-emerald-500 shadow-emerald-500/5';
    }
  };

  return (
    <div className="relative space-y-8">
      {/* Stats Section - Separate at the top */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Distance Card */}
        <div className="bg-gradient-to-br from-primary to-primary-dark rounded-[2.5rem] p-8 text-white shadow-xl relative overflow-hidden group hover:scale-[1.02] transition-transform duration-300">
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-3 opacity-80">
              <div className="p-2 bg-white/20 rounded-lg">
                <Footprints className="w-5 h-5" />
              </div>
              <span className="text-xs font-bold uppercase tracking-widest">{t('distance')}</span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-black">{dailyHealth?.distance || 0}</span>
              <span className="text-lg opacity-60">km</span>
            </div>
          </div>
          <div className="absolute -right-6 -bottom-6 w-32 h-32 bg-white/10 rounded-full blur-3xl group-hover:scale-150 transition-transform duration-700" />
        </div>

        {/* Water Card */}
        <div className="bg-gradient-to-br from-secondary to-secondary-dark rounded-[2.5rem] p-8 text-white shadow-xl relative overflow-hidden group hover:scale-[1.02] transition-transform duration-300">
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-3 opacity-80">
              <div className="p-2 bg-white/20 rounded-lg">
                <Droplets className="w-5 h-5" />
              </div>
              <span className="text-xs font-bold uppercase tracking-widest">{t('water')}</span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-black">{dailyHealth?.water || 0}</span>
              <span className="text-lg opacity-60">L</span>
            </div>
          </div>
          <div className="absolute -right-6 -bottom-6 w-32 h-32 bg-white/10 rounded-full blur-3xl group-hover:scale-150 transition-transform duration-700" />
        </div>

        {/* BMI Card */}
        <div className="bg-white dark:bg-gray-800 rounded-[2.5rem] p-8 border border-gray-100 dark:border-gray-700 shadow-xl group hover:border-primary/30 hover:scale-[1.02] transition-all duration-300">
          <div className="flex items-center gap-3 mb-3 text-gray-400 dark:text-gray-500">
            <div className="p-2 bg-gray-100 dark:bg-gray-700 rounded-lg">
              <Activity className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold uppercase tracking-widest">{t('bmiIndex')}</span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-4xl font-black dark:text-white">
              {profile ? (profile.weight / ((profile.height/100)**2)).toFixed(1) : '0.0'}
            </span>
            <span className="text-sm text-gray-400 font-medium">kg/m²</span>
          </div>
        </div>

        {/* Calories Card */}
        <div className="bg-white dark:bg-gray-800 rounded-[2.5rem] p-8 border border-gray-100 dark:border-gray-700 shadow-xl group hover:border-primary/30 hover:scale-[1.02] transition-all duration-300">
          <div className="flex items-center gap-3 mb-3 text-gray-400 dark:text-gray-500">
            <div className="p-2 bg-gray-100 dark:bg-gray-700 rounded-lg">
              <Zap className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold uppercase tracking-widest">{t('calories')}</span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-4xl font-black dark:text-white">{dailyHealth?.calories || 0}</span>
            <span className="text-sm text-gray-400 font-medium">kcal</span>
          </div>
        </div>
      </div>

      {/* Unified AI Advice Section */}
      <div className="bg-white dark:bg-[#1a1a1a] rounded-[2.5rem] shadow-xl flex flex-col transition-all border border-gray-100 dark:border-gray-800 overflow-hidden">
        {/* Header */}
        <div className="p-8 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center bg-gray-50/50 dark:bg-gray-900/50 flex-shrink-0">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-amber-500/10 rounded-2xl text-amber-500 shadow-inner">
              <Sparkles className="w-8 h-8" />
            </div>
            <div>
              <h2 className="font-bold text-2xl dark:text-white tracking-tight">{t('aiAnalysis')}</h2>
              <p className="text-sm text-gray-400 font-medium">{t('aiAnalysisDesc')}</p>
            </div>
          </div>
          <button 
            onClick={fetchTips}
            disabled={loadingTips}
            className="p-3 text-gray-400 hover:text-primary hover:bg-primary/10 rounded-2xl transition-all"
          >
            <RefreshCw className={`w-6 h-6 ${loadingTips ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* Tips Section */}
        <div className="p-8 space-y-6">
          <div className="flex items-center gap-3 mb-2">
            <Brain className="w-5 h-5 text-amber-500" />
            <h3 className="text-xs font-bold uppercase tracking-widest text-gray-400">{t('personalTips')}</h3>
          </div>
          
          {loadingTips ? (
            <div className="flex flex-col items-center justify-center py-24 space-y-6 opacity-50">
              <RefreshCw className="w-20 h-20 animate-spin text-primary" />
              <p className="text-lg text-gray-400 font-medium uppercase tracking-widest">{t('aiAnalyzing')}</p>
            </div>
          ) : tips.length > 0 ? (
            <div className="grid grid-cols-1 gap-6">
              {tips.map((tip, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.1 }}
                  className={`group p-8 rounded-[2rem] border-2 transition-all hover:shadow-2xl hover:-translate-y-1 cursor-pointer shadow-md ${getPriorityStyles(tip.priority)}`}
                >
                  <div className="flex items-start gap-8">
                    <div className={`p-6 rounded-2xl shadow-sm group-hover:scale-110 transition-transform ${
                      tip.priority === 'high' ? 'bg-rose-500/10 text-rose-500' :
                      tip.priority === 'medium' ? 'bg-amber-500/10 text-amber-500' :
                      'bg-emerald-500/10 text-emerald-500'
                    }`}>
                      {getPriorityIcon(tip.priority)}
                    </div>
                    <div className="flex-1">
                      <div className="flex justify-between items-center mb-4">
                        <h3 className="font-bold text-2xl tracking-tight">{tip.title}</h3>
                        <ChevronRight className="w-8 h-8 opacity-0 group-hover:opacity-100 transition-all translate-x-[-10px] group-hover:translate-x-0" />
                      </div>
                      <p className="text-lg opacity-90 leading-relaxed font-medium">{tip.desc}</p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-24 text-gray-400 space-y-8 opacity-30">
              <Brain className="w-24 h-24" />
              <p className="text-xl font-medium">{t('waitingData')}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 bg-gray-50/50 dark:bg-gray-900/50 border-t border-gray-100 dark:border-gray-800 rounded-b-[2.5rem]">
          <p className="text-sm text-gray-500 dark:text-gray-400 italic text-center">
            {t('healthQuote')}
          </p>
        </div>
      </div>

      <AIAssistant />
    </div>
  );
};

export default AIChat;
