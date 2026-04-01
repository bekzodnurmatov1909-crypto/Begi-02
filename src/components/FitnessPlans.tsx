import React, { useState } from 'react';
import { celebrate, getRandomMotivation } from '../lib/CelebrationService';
import { useFirebase } from '../context/FirebaseContext';
import { Dumbbell, Clock, Flame, Play, CheckCircle, Star, X, MapPin, Navigation, ExternalLink, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { getNearbyGyms } from '../services/geminiService';

interface FitnessPlansProps {
  showToast?: (message: string) => void;
}

const FitnessPlans: React.FC<FitnessPlansProps> = ({ showToast }) => {
  const { profile, t } = useFirebase();
  const [activeWorkout, setActiveWorkout] = useState<any>(null);
  const [selectedPlan, setSelectedPlan] = useState<any>(null);
  const [currentExerciseIndex, setCurrentExerciseIndex] = useState(0);
  const [gymsData, setGymsData] = useState<any>(null);
  const [loadingGyms, setLoadingGyms] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);

  const bmi = profile ? (profile.weight / ((profile.height / 100) ** 2)) : 22;

  const findNearbyGyms = () => {
    setLoadingGyms(true);
    setLocationError(null);

    if (!navigator.geolocation) {
      setLocationError("Brauzeringiz geolokatsiyani qo'llab-quvvatlamaydi.");
      setLoadingGyms(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const { latitude, longitude } = position.coords;
          const data = await getNearbyGyms(latitude, longitude);
          setGymsData(data);
        } catch (error) {
          console.error("Error fetching gyms:", error);
          setLocationError("Fitnes zallarni topishda xatolik yuz berdi.");
        } finally {
          setLoadingGyms(false);
        }
      },
      (error) => {
        console.error("Geolocation error:", error);
        setLocationError("Joylashuvingizni aniqlashga ruxsat berilmagan yoki xatolik yuz berdi.");
        setLoadingGyms(false);
      }
    );
  };

  const plans = [
    {
      id: 1,
      title: "Kam vazn uchun (Vazn yig'ish)",
      level: "beginner",
      duration: "6 hafta",
      difficulty: "O'rtacha",
      recommended: bmi < 18.5,
      goal: "Mushak massasini oshirish va kuchni rivojlantirish uchun maxsus dastur.",
      exercises: [
        { 
          name: "Og'ir vaznli mashqlar (Squats)", 
          calories: "150 kal", 
          time: "30 daqiqa",
          durationSeconds: 60,
          image: "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?auto=format&fit=crop&w=800&q=80",
          instructions: [
            "Oyoqlarni yelka kengligida oching.",
            "Orqangizni tekis tutib, xuddi stulga o'tirayotgandek pastga tushing.",
            "Tizalaringiz oyoq barmoqlaridan o'tib ketmasligiga e'tibor bering.",
            "Dastlabki holatga qayting va takrorlang."
          ]
        },
        { 
          name: "Push-ups (Otjimanie)", 
          calories: "120 kal", 
          time: "25 daqiqa",
          durationSeconds: 45,
          image: "https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?auto=format&fit=crop&w=800&q=80",
          instructions: [
            "Qo'llarni yerga yelka kengligida qo'ying.",
            "Badaningizni tekis chiziqda tuting.",
            "Tirsaklarni bukib, ko'kragingizni yerga yaqinlashtiring.",
            "Kuch bilan yuqoriga ko'tariling."
          ]
        },
        { 
          name: "Bicep Curls (Gantel ko'tarish)", 
          calories: "90 kal", 
          time: "15 daqiqa",
          durationSeconds: 50,
          image: "https://images.unsplash.com/photo-1583454110551-21f2fa2afe61?auto=format&fit=crop&w=800&q=80",
          instructions: [
            "Gantellarni qo'lingizga oling va tik turing.",
            "Tirsaklaringizni tanangizga yaqin tuting.",
            "Gantellarni yelkangizga qarab ko'taring.",
            "Sekin pastga tushiring va takrorlang."
          ]
        }
      ],
      color: "from-blue-500 to-blue-700"
    },
    {
      id: 2,
      title: "Normal vazn uchun (Sog'lom hayot)",
      level: "intermediate",
      duration: "4 hafta",
      difficulty: "Oson",
      recommended: bmi >= 18.5 && bmi < 25,
      goal: "Hozirgi holatni saqlash, chidamlilik va umumiy salomatlikni yaxshilash.",
      exercises: [
        { 
          name: "Yengil yugurish", 
          calories: "200 kal", 
          time: "20 daqiqa",
          durationSeconds: 120,
          image: "https://images.unsplash.com/photo-1452626038306-9aae5e071dd3?auto=format&fit=crop&w=800&q=80",
          instructions: [
            "To'g'ri qomatni saqlang.",
            "Yengil sur'atda yugurishni boshlang.",
            "Nafas olishni nazorat qiling (burun bilan nafas oling).",
            "To'xtashdan oldin sur'atni sekinlashtiring."
          ]
        },
        { 
          name: "Yoga (Salom quyosh)", 
          calories: "80 kal", 
          time: "15 daqiqa",
          durationSeconds: 90,
          image: "https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?auto=format&fit=crop&w=800&q=80",
          instructions: [
            "Tik turing va chuqur nafas oling.",
            "Qo'llaringizni yuqoriga ko'taring va orqaga biroz egiling.",
            "Sekin pastga egilib, barmoqlaringiz bilan yerga teging.",
            "Harakatlarni xotirjamlik bilan bajaring."
          ]
        },
        { 
          name: "Jumping Jacks (Sakrashlar)", 
          calories: "110 kal", 
          time: "10 daqiqa",
          durationSeconds: 60,
          image: "https://images.unsplash.com/photo-1517836357463-d25dfeac3438?auto=format&fit=crop&w=800&q=80",
          instructions: [
            "Tik turing, oyoqlar birga, qo'llar yonda.",
            "Sakrab oyoqlarni keng oching va qo'llarni tepada birlashtiring.",
            "Yana sakrab dastlabki holatga qayting.",
            "Mashqni ritmik tarzda davom ettiring."
          ]
        }
      ],
      color: "from-emerald-500 to-emerald-700"
    },
    {
      id: 3,
      title: "Ortiqcha vazn uchun (Ozish)",
      level: "advanced",
      duration: "8 hafta",
      difficulty: "Qiyin",
      recommended: bmi >= 25,
      goal: "Yog'larni yo'qotish, metabolizmni tezlashtirish va yurak faoliyatini yaxshilash.",
      exercises: [
        { 
          name: "Burpees", 
          calories: "350 kal", 
          time: "20 daqiqa",
          durationSeconds: 40,
          image: "https://images.unsplash.com/photo-1541534741688-6078c6bfb5c5?auto=format&fit=crop&w=800&q=80",
          instructions: [
            "Tik turgan holatdan o'tirib, qo'llarni yerga qo'ying.",
            "Oyoqlarni orqaga otib, push-up holatiga o'ting.",
            "Tezda oyoqlarni qaytarib, yuqoriga sakrang.",
            "Harakatni to'xtovsiz davom ettiring."
          ]
        },
        { 
          name: "Planka", 
          calories: "100 kal", 
          time: "5 daqiqa",
          durationSeconds: 60,
          image: "https://images.unsplash.com/photo-1566241142559-40e1bfc26ddc?auto=format&fit=crop&w=800&q=80",
          instructions: [
            "Tirsaklaringizga tayanib yerga yoting.",
            "Badaningizni tekis chiziq kabi tuting.",
            "Qorin mushaklarini taranglashtiring.",
            "Belgilangan vaqt davomida shu holatda turing."
          ]
        },
        { 
          name: "Mountain Climbers (Tog'ga chiqish)", 
          calories: "180 kal", 
          time: "15 daqiqa",
          durationSeconds: 45,
          image: "https://images.unsplash.com/photo-1434596922112-19c563067271?auto=format&fit=crop&w=800&q=80",
          instructions: [
            "Planka holatiga o'ting.",
            "Tizalaringizni navbatma-navbat ko'kragingizga tezlik bilan torting.",
            "Xuddi tog'ga yugurib chiqayotgandek harakat qiling.",
            "Orqangizni past tutishga harakat qiling."
          ]
        }
      ],
      color: "from-rose-500 to-rose-700"
    }
  ];

  const startWorkout = (plan: any) => {
    setActiveWorkout(plan);
    setCurrentExerciseIndex(0);
  };

  const nextExercise = () => {
    if (currentExerciseIndex < activeWorkout.exercises.length - 1) {
      const nextIndex = currentExerciseIndex + 1;
      setCurrentExerciseIndex(nextIndex);
    } else {
      celebrate();
      showToast?.(`${activeWorkout.title} muvaffaqiyatli yakunlandi!`);
      showToast?.(getRandomMotivation(t));
      setActiveWorkout(null);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-4">
          <div className="p-4 bg-primary/10 rounded-2xl">
            <Dumbbell className="w-8 h-8 text-primary" />
          </div>
          <div>
            <h2 className="text-3xl font-black dark:text-white tracking-tight">Fitnes Rejalar</h2>
            <p className="text-gray-500 font-medium">Siz uchun maxsus tayyorlangan mashqlar</p>
          </div>
        </div>
        <div className="flex items-center gap-3 px-6 py-3 bg-white dark:bg-[#2d2d2d] rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800">
          <div className="text-right">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Sizning BMI</p>
            <p className="text-xl font-black text-primary">{bmi.toFixed(1)}</p>
          </div>
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
            <Star className="w-5 h-5 fill-primary" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {plans.map((plan) => (
          <motion.div
            key={plan.id}
            whileHover={{ y: -5 }}
            className={`bg-white dark:bg-[#2d2d2d] rounded-3xl p-8 shadow-sm border-2 transition-all cursor-pointer flex flex-col ${
              selectedPlan?.id === plan.id ? 'border-primary' : 'border-transparent'
            } ${plan.recommended ? 'ring-2 ring-primary ring-offset-4 dark:ring-offset-[#1a1a1a]' : ''}`}
            onClick={() => setSelectedPlan(plan)}
          >
            <div className="flex-1 space-y-6">
              <div className="space-y-2">
                <div className="flex justify-between items-start">
                  <div className={`p-2 rounded-lg bg-gradient-to-br ${plan.color} text-white mb-2`}>
                    <Dumbbell className="w-5 h-5" />
                  </div>
                  {plan.recommended && (
                    <div className="flex items-center gap-1 px-3 py-1 bg-warning/10 text-warning rounded-full text-[10px] font-bold uppercase tracking-wider">
                      <Star className="w-3 h-3 fill-warning" />
                      Tavsiya etiladi
                    </div>
                  )}
                </div>
                <h3 className="text-xl font-bold dark:text-white">{plan.title}</h3>
                <div className="flex gap-3">
                  <span className="text-[10px] font-bold px-2 py-0.5 bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 rounded-full uppercase tracking-wider">
                    {plan.duration}
                  </span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                    plan.level === 'beginner' ? 'bg-primary/10 text-primary' : 
                    plan.level === 'intermediate' ? 'bg-warning/10 text-warning' : 
                    'bg-danger/10 text-danger'
                  }`}>
                    {plan.difficulty}
                  </span>
                </div>
              </div>

              <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed italic">
                "{plan.goal}"
              </p>

              <div className="space-y-3">
                {plan.exercises.map((ex, i) => (
                  <div key={i} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800/50 rounded-xl">
                    <span className="text-sm font-semibold dark:text-white">{ex.name}</span>
                    <div className="flex items-center gap-3 text-[10px] font-bold text-gray-400">
                      <span className="flex items-center gap-1"><Flame className="w-3 h-3 text-warning" /> {ex.calories}</span>
                      <span className="flex items-center gap-1"><Clock className="w-3 h-3 text-secondary" /> {ex.time}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <button 
              onClick={() => startWorkout(plan)}
              className="w-full mt-8 py-3 bg-primary text-white rounded-xl font-bold hover:bg-primary-dark transition-all shadow-lg shadow-primary/20 flex items-center justify-center gap-2"
            >
              <Play className="w-4 h-4 fill-white" />
              <span>Boshlash</span>
            </button>
          </motion.div>
        ))}
      </div>

      {/* Workout Modal */}
      <AnimatePresence>
        {activeWorkout && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-md flex items-center justify-center p-4 md:p-8"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-white dark:bg-[#1a1a1a] w-full max-w-4xl rounded-[3rem] overflow-hidden shadow-2xl flex flex-col md:flex-row max-h-[90vh]"
            >
              {/* Image Section */}
              <div className="md:w-1/2 relative h-64 md:h-auto">
                <img 
                  src={activeWorkout.exercises[currentExerciseIndex].image} 
                  alt={activeWorkout.exercises[currentExerciseIndex].name}
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                <div className="absolute bottom-8 left-8 text-white">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="px-3 py-1 bg-primary rounded-full text-[10px] font-bold uppercase tracking-widest">
                      Mashq {currentExerciseIndex + 1} / {activeWorkout.exercises.length}
                    </span>
                  </div>
                  <h2 className="text-3xl font-black">{activeWorkout.exercises[currentExerciseIndex].name}</h2>
                </div>
              </div>

              {/* Instructions Section */}
              <div className="md:w-1/2 p-8 md:p-12 flex flex-col overflow-y-auto">
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <h3 className="text-xs font-bold text-gray-400 uppercase tracking-[0.2em] mb-2">Bajarish tartibi</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Har bir bosqichni diqqat bilan bajaring</p>
                  </div>
                  <button 
                    onClick={() => setActiveWorkout(null)}
                    className="p-2 text-gray-400 hover:text-rose-500 transition-colors"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>

                {/* Progress Dots */}
                <div className="flex gap-2 mb-8">
                  {activeWorkout.exercises.map((_: any, idx: number) => (
                    <div 
                      key={idx}
                      className={`h-1.5 rounded-full transition-all duration-300 ${
                        idx === currentExerciseIndex ? 'w-8 bg-primary' : 
                        idx < currentExerciseIndex ? 'w-4 bg-primary/40' : 
                        'w-4 bg-gray-100 dark:bg-gray-800'
                      }`}
                    />
                  ))}
                </div>

                <div className="flex-1 space-y-6">
                  {activeWorkout.exercises[currentExerciseIndex].instructions.map((step: string, i: number) => (
                    <div key={i} className="flex gap-4 group">
                      <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-sm flex-shrink-0 group-hover:bg-primary group-hover:text-white transition-colors">
                        {i + 1}
                      </div>
                      <p className="text-gray-700 dark:text-gray-300 font-medium leading-relaxed">
                        {step}
                      </p>
                    </div>
                  ))}
                </div>

                <div className="mt-12 pt-8 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between">
                  <div className="flex items-center gap-6">
                    <div className="flex items-center gap-2">
                      <Flame className="w-5 h-5 text-warning" />
                      <span className="text-sm font-bold dark:text-white">{activeWorkout.exercises[currentExerciseIndex].calories}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="w-5 h-5 text-secondary" />
                      <span className="text-sm font-bold dark:text-white">{activeWorkout.exercises[currentExerciseIndex].time}</span>
                    </div>
                  </div>
                  <button
                    onClick={nextExercise}
                    className="px-8 py-4 bg-primary text-white rounded-2xl font-bold hover:bg-primary-dark transition-all shadow-lg shadow-primary/20 flex items-center gap-2"
                  >
                    <span>{currentExerciseIndex === activeWorkout.exercises.length - 1 ? "Tugatish" : "Keyingisi"}</span>
                    <Play className="w-4 h-4 fill-white" />
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Nearby Gyms Section */}
      <div className="mt-16 pt-16 border-t border-gray-100 dark:border-gray-800">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-12">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-secondary/10 rounded-xl text-secondary">
              <MapPin className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-2xl font-bold dark:text-white">Yaqin atrofdagi fitnes zallar</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">Google Maps orqali yaqin atrofdagi zallarni toping</p>
            </div>
          </div>
          <button
            onClick={findNearbyGyms}
            disabled={loadingGyms}
            className="px-6 py-3 bg-secondary text-white rounded-xl font-bold hover:bg-secondary-dark transition-all shadow-lg shadow-secondary/20 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loadingGyms ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Navigation className="w-5 h-5" />
            )}
            <span>Zallarni qidirish</span>
          </button>
        </div>

        {locationError && (
          <div className="p-4 bg-danger/10 text-danger rounded-xl text-sm font-medium mb-8">
            {locationError}
          </div>
        )}

        {gymsData && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="bg-white dark:bg-[#2d2d2d] rounded-3xl p-8 shadow-sm border border-gray-100 dark:border-gray-800">
              <h3 className="text-lg font-bold dark:text-white mb-6 flex items-center gap-2">
                <Star className="w-5 h-5 text-warning fill-warning" />
                Topilgan natijalar
              </h3>
              <div className="prose prose-sm dark:prose-invert max-w-none text-gray-600 dark:text-gray-400">
                <div className="whitespace-pre-wrap leading-relaxed">
                  {gymsData.text}
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-lg font-bold dark:text-white mb-6">Xaritadagi manzillar</h3>
              {gymsData.mapLinks.length > 0 ? (
                gymsData.mapLinks.map((link: any, idx: number) => (
                  <motion.a
                    key={idx}
                    href={link.uri}
                    target="_blank"
                    rel="noopener noreferrer"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.1 }}
                    className="flex items-center justify-between p-4 bg-white dark:bg-[#2d2d2d] rounded-2xl border border-gray-100 dark:border-gray-800 hover:border-primary hover:shadow-md transition-all group"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold">
                        {idx + 1}
                      </div>
                      <span className="font-bold dark:text-white group-hover:text-primary transition-colors">
                        {link.title}
                      </span>
                    </div>
                    <ExternalLink className="w-5 h-5 text-gray-400 group-hover:text-primary transition-colors" />
                  </motion.a>
                ))
              ) : (
                <div className="p-8 text-center bg-gray-50 dark:bg-gray-800/50 rounded-3xl border border-dashed border-gray-200 dark:border-gray-700">
                  <p className="text-gray-500 dark:text-gray-400">Xarita linklari topilmadi.</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default FitnessPlans;
