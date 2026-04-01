import React, { useState } from 'react';
import { useFirebase } from '../context/FirebaseContext';
import { Calculator, Ruler, Weight, CheckCircle, AlertTriangle, HeartPulse } from 'lucide-react';
import { motion } from 'motion/react';
import { celebrate, getRandomMotivation } from '../lib/CelebrationService';

interface BMICalculatorProps {
  showToast?: (message: string) => void;
}

const BMICalculator: React.FC<BMICalculatorProps> = ({ showToast }) => {
  const { profile, updateProfile, t } = useFirebase();
  const [height, setHeight] = useState(profile?.height || 175);
  const [weight, setWeight] = useState(profile?.weight || 75);
  const [gender, setGender] = useState<'male' | 'female'>(profile?.gender || 'male');

  const bmi = (weight / ((height / 100) ** 2)).toFixed(1);
  const bmiNum = parseFloat(bmi);

  let category = '';
  let desc = '';
  let color = '';
  let icon = null;

  if (bmiNum < 18.5) {
    category = 'Kam vazn';
    desc = "Sizning vazningiz me'yordan past. Sog'lom vazn olish uchun parhez va mushak massasini oshiruvchi mashqlar tavsiya etiladi.";
    color = 'text-secondary';
    icon = <AlertTriangle className="w-8 h-8 text-secondary" />;
  } else if (bmiNum < 25) {
    category = 'Normal vazn';
    desc = "Sizning vazningiz normal. Balansli mashqlar va sog'lom turmush tarzini davom ettiring!";
    color = 'text-primary';
    icon = <CheckCircle className="w-8 h-8 text-primary" />;
  } else if (bmiNum < 30) {
    category = 'Ortiqcha vazn';
    desc = "Sizda ortiqcha vazn bor. Kardio, tez yurish va kaloriya nazoratiga e'tibor qarating.";
    color = 'text-warning';
    icon = <AlertTriangle className="w-8 h-8 text-warning" />;
  } else {
    category = 'Semizlik';
    desc = "BMI yuqori. Past intensivlikdagi mashqlar, yurish va shifokor tavsiyasiga mos rejani tanlang.";
    color = 'text-danger';
    icon = <HeartPulse className="w-8 h-8 text-danger" />;
  }

  // Dynamic scale factor based on BMI (Normal is ~22)
  const bodyScaleX = Math.max(0.7, Math.min(1.5, 1 + (bmiNum - 22) / 30));

  // Category-specific animations
  const visualVariants: any = {
    initial: { opacity: 0, y: 20, scale: 0.8 },
    animate: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: {
        opacity: { duration: 0.5 },
        y: { type: 'spring', damping: 12 }
      }
    },
    shiver: {
      x: [0, -2, 2, -2, 2, 0],
      transition: { duration: 2, repeat: Infinity }
    },
    breathe: {
      scale: [1, 1.05, 1],
      transition: { duration: 3, repeat: Infinity, ease: "easeInOut" }
    },
    float: {
      y: [0, -5, 0],
      transition: { duration: 4, repeat: Infinity, ease: "easeInOut" }
    },
    pulse: {
      scale: [1, 1.02, 1],
      transition: { duration: 5, repeat: Infinity, ease: "easeInOut" }
    }
  };

  const getActiveVariant = () => {
    if (bmiNum < 18.5) return ['animate', 'shiver'];
    if (bmiNum < 25) return ['animate', 'breathe'];
    if (bmiNum < 30) return ['animate', 'float'];
    return ['animate', 'pulse'];
  };

  const handleSave = async () => {
    await updateProfile({ height, weight, gender });
    if (bmiNum >= 18.5 && bmiNum < 25) {
      celebrate();
      showToast?.(getRandomMotivation(t));
    }
  };

  const personEmoji = gender === 'male' ? '🧍‍♂️' : '🧍‍♀️';

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <div className="bg-white dark:bg-[#2d2d2d] rounded-[32px] shadow-xl shadow-black/5 p-8 md:p-12 transition-colors overflow-hidden relative">
        {/* Background Decorative Elements */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full -mr-32 -mt-32 blur-3xl" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-secondary/5 rounded-full -ml-32 -mb-32 blur-3xl" />

        <div className="relative z-10">
          <div className="flex items-center gap-4 mb-12">
            <div className="p-4 bg-primary/10 rounded-2xl">
              <Calculator className="w-8 h-8 text-primary" />
            </div>
            <div>
              <h2 className="text-3xl font-black dark:text-white tracking-tight">BMI Hisoblagich</h2>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
            {/* Inputs Section */}
            <div className="lg:col-span-4 space-y-8">
              <div className="space-y-6">
                <div className="space-y-3">
                  <label className="text-sm font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
                    Jins
                  </label>
                  <div className="flex p-1 bg-gray-50 dark:bg-gray-800/50 rounded-2xl">
                    <button
                      onClick={() => setGender('male')}
                      className={`flex-1 py-3 rounded-xl font-bold transition-all ${
                        gender === 'male' 
                          ? 'bg-white dark:bg-gray-700 text-primary shadow-sm' 
                          : 'text-gray-400 hover:text-gray-600'
                      }`}
                    >
                      Erkak
                    </button>
                    <button
                      onClick={() => setGender('female')}
                      className={`flex-1 py-3 rounded-xl font-bold transition-all ${
                        gender === 'female' 
                          ? 'bg-white dark:bg-gray-700 text-primary shadow-sm' 
                          : 'text-gray-400 hover:text-gray-600'
                      }`}
                    >
                      Ayol
                    </button>
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="text-sm font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
                    <Ruler className="w-4 h-4" />
                    Bo'y (sm)
                  </label>
                  <div className="relative group">
                    <input
                      type="number"
                      value={height}
                      onChange={(e) => setHeight(Number(e.target.value))}
                      className="w-full px-6 py-4 bg-gray-50 dark:bg-gray-800/50 border-2 border-transparent rounded-2xl focus:border-primary/30 focus:bg-white dark:focus:bg-gray-800 dark:text-white outline-none transition-all text-xl font-bold"
                    />
                    <div className="absolute right-6 top-1/2 -translate-y-1/2 text-gray-400 font-bold">cm</div>
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="text-sm font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
                    <Weight className="w-4 h-4" />
                    Vazn (kg)
                  </label>
                  <div className="relative group">
                    <input
                      type="number"
                      value={weight}
                      onChange={(e) => setWeight(Number(e.target.value))}
                      className="w-full px-6 py-4 bg-gray-50 dark:bg-gray-800/50 border-2 border-transparent rounded-2xl focus:border-primary/30 focus:bg-white dark:focus:bg-gray-800 dark:text-white outline-none transition-all text-xl font-bold"
                    />
                    <div className="absolute right-6 top-1/2 -translate-y-1/2 text-gray-400 font-bold">kg</div>
                  </div>
                </div>
              </div>

              <button 
                onClick={handleSave}
                className="w-full py-5 bg-primary text-white rounded-2xl font-black text-lg hover:scale-[1.02] active:scale-[0.98] transition-all shadow-xl shadow-primary/25"
              >
                Ma'lumotlarni saqlash
              </button>
            </div>

            {/* Visual Representation Section */}
            <div className="lg:col-span-4 flex flex-col items-center justify-center relative py-8">
              <motion.div
                key={gender}
                variants={visualVariants}
                initial="initial"
                animate={getActiveVariant()}
                className="relative w-full aspect-[3/4] max-w-[280px] flex items-center justify-center"
              >
                <div className="absolute inset-0 bg-gradient-to-b from-primary/5 to-transparent rounded-[40px] -z-10" />
                <motion.span 
                  animate={{ scaleX: bodyScaleX }}
                  transition={{ type: 'spring', stiffness: 50, damping: 10 }}
                  className="text-[180px] leading-none drop-shadow-2xl select-none inline-block"
                >
                  {personEmoji}
                </motion.span>
              </motion.div>
              
              {/* Floating Badge */}
              <motion.div 
                animate={{ y: [0, -10, 0] }}
                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                className={`absolute -top-4 -right-4 px-6 py-3 rounded-2xl shadow-xl font-black text-white ${color.replace('text-', 'bg-')} border-4 border-white dark:border-[#2d2d2d]`}
              >
                {bmi}
              </motion.div>
            </div>

            {/* Result Details Section */}
            <div className="lg:col-span-4 space-y-8">
              <div className="text-center lg:text-left space-y-2">
                <h3 className={`text-4xl font-black ${color}`}>{category}</h3>
                <p className="text-gray-500 font-medium leading-relaxed">
                  Sizning tana vazni indeksingiz (BMI) ko'rsatkichi
                </p>
              </div>

              <div className="w-full space-y-6">
                <div className="text-center">
                  <span className="text-5xl font-black dark:text-white tracking-tighter">
                    {bmi}
                  </span>
                </div>

                <div className="relative h-3 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                  {/* Background Gradient Track */}
                  <div className="absolute inset-0 bg-gradient-to-r from-secondary via-primary to-danger opacity-20" />
                  
                  {/* Animated Progress Fill */}
                  <motion.div
                    className="absolute top-0 left-0 h-full bg-gradient-to-r from-secondary via-primary to-danger rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.max(0, Math.min(((bmiNum - 10) / 30) * 100, 100))}%` }}
                    transition={{ type: 'spring', stiffness: 50, damping: 15 }}
                  />

                  {/* Indicator Dot */}
                  <motion.div 
                    className="absolute top-0 h-full w-1.5 bg-white shadow-lg z-10"
                    initial={{ left: 0 }}
                    animate={{ left: `${Math.max(0, Math.min(((bmiNum - 10) / 30) * 100, 100))}%` }}
                    transition={{ type: 'spring', stiffness: 50, damping: 15 }}
                    style={{ marginLeft: '-3px' }}
                  />
                </div>

                <div className="flex justify-between text-[10px] text-gray-400 font-black uppercase tracking-widest px-1">
                  <span>Kam</span>
                  <span>Normal</span>
                  <span>Ortiqcha</span>
                  <span>Semiz</span>
                </div>
              </div>

              <div className="p-8 bg-gray-50 dark:bg-gray-800/30 rounded-[32px] border border-gray-100 dark:border-gray-700/30 relative group overflow-hidden">
                <div className={`absolute top-0 left-0 w-2 h-full ${color.replace('text-', 'bg-')}`} />
                <div className="flex gap-5">
                  <div className="flex-shrink-0 p-3 bg-white dark:bg-gray-800 rounded-xl shadow-sm">
                    {icon}
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed font-medium italic">
                    {desc}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BMICalculator;
