import React, { useState, useMemo } from 'react';
import { useFirebase } from '../context/FirebaseContext';
import { LineChart, Line, BarChart, Bar, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { BarChart2, Download, Table as TableIcon, Footprints, Droplets, Moon, Flame, X, FileSpreadsheet, FileType, Settings2, Check } from 'lucide-react';
import { format, parseISO, startOfWeek, endOfWeek, eachDayOfInterval, isSameDay, startOfMonth, endOfMonth, startOfYear, endOfYear, eachMonthOfInterval, isSameMonth } from 'date-fns';
import { uz, ru, enUS } from 'date-fns/locale';
import { motion, AnimatePresence } from 'motion/react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

type ChartType = 'line' | 'bar' | 'area';
type ColorTheme = {
  name: string;
  stroke: string;
  fill: string;
};

const Statistics: React.FC = () => {
  const { healthHistory, t, profile } = useFirebase();

  const colorThemes: Record<string, ColorTheme> = {
    emerald: { name: t('emerald'), stroke: '#10b981', fill: '#10b98133' },
    blue: { name: t('blue'), stroke: '#3b82f6', fill: '#3b82f633' },
    purple: { name: t('purple'), stroke: '#8b5cf6', fill: '#8b5cf633' },
    orange: { name: t('orange'), stroke: '#f59e0b', fill: '#f59e0b33' },
    rose: { name: t('rose'), stroke: '#f43f5e', fill: '#f43f5e33' },
    teal: { name: t('teal'), stroke: '#14b8a6', fill: '#14b8a633' },
  };
  const [period, setPeriod] = useState('week');
  const [isDownloadModalOpen, setIsDownloadModalOpen] = useState(false);
  
  const currentLocale = useMemo(() => {
    const lang = profile?.settings?.language || 'uz';
    if (lang === 'ru') return ru;
    if (lang === 'en') return enUS;
    return uz;
  }, [profile?.settings?.language]);

  const [chartConfigs, setChartConfigs] = useState<Record<string, { type: ChartType, color: string }>>({
    steps: { type: 'line', color: 'emerald' },
    water: { type: 'line', color: 'blue' },
    sleep: { type: 'line', color: 'purple' },
    calories: { type: 'line', color: 'orange' },
  });

  const [activeSettings, setActiveSettings] = useState<string | null>(null);

  const processedData = useMemo(() => {
    const now = new Date();
    
    if (period === 'week') {
      const start = startOfWeek(now, { weekStartsOn: 1 });
      const end = endOfWeek(now, { weekStartsOn: 1 });
      const days = eachDayOfInterval({ start, end });
      
      return days.map(day => {
        const dayData = healthHistory.find(h => isSameDay(parseISO(h.date), day));
        return {
          date: format(day, 'yyyy-MM-dd'),
          name: format(day, 'EEEE', { locale: currentLocale }),
          steps: dayData?.steps || 0,
          water: dayData?.water || 0,
          sleep: dayData?.sleep || 0,
          calories: dayData?.calories || 0,
          isPlaceholder: !dayData
        };
      });
    } else if (period === 'month') {
      const start = startOfMonth(now);
      const end = endOfMonth(now);
      const days = eachDayOfInterval({ start, end });
      
      return days.map(day => {
        const dayData = healthHistory.find(h => isSameDay(parseISO(h.date), day));
        return {
          date: format(day, 'yyyy-MM-dd'),
          name: format(day, 'dd.MM'),
          steps: dayData?.steps || 0,
          water: dayData?.water || 0,
          sleep: dayData?.sleep || 0,
          calories: dayData?.calories || 0,
          isPlaceholder: !dayData
        };
      });
    } else {
      const start = startOfYear(now);
      const end = endOfYear(now);
      const months = eachMonthOfInterval({ start, end });
      
      return months.map(month => {
        const monthEntries = healthHistory.filter(h => isSameMonth(parseISO(h.date), month));
        const totals = monthEntries.reduce((acc, curr) => ({
          steps: acc.steps + (curr.steps || 0),
          water: acc.water + curr.water,
          sleep: acc.sleep + curr.sleep,
          calories: acc.calories + curr.calories,
        }), { steps: 0, water: 0, sleep: 0, calories: 0 });
        
        return {
          date: format(month, 'yyyy-MM'),
          name: format(month, 'MMMM', { locale: currentLocale }),
          steps: totals.steps,
          water: Number(totals.water.toFixed(1)),
          sleep: Number(totals.sleep.toFixed(1)),
          calories: totals.calories,
          isPlaceholder: monthEntries.length === 0
        };
      });
    }
  }, [healthHistory, period, currentLocale]);

  const handleDownload = (type: 'excel' | 'pdf') => {
    const fileName = `statistika_${period}_${format(new Date(), 'yyyyMMdd')}`;
    const headers = [
      period === 'year' ? t('month') : t('day'), 
      t('steps'), 
      `${t('water')} (L)`, 
      `${t('sleep')} (${t('hours')})`, 
      t('calories'), 
      t('status')
    ];
    
    const rows = [...processedData].reverse().map(row => [
      period === 'year' ? row.name : format(parseISO(row.date), 'dd.MM.yyyy'),
      row.steps,
      `${row.water} L`,
      `${row.sleep} s`,
      row.calories,
      row.steps >= (period === 'year' ? 300000 : 10000) ? t('good') : t('average')
    ]);

    if (type === 'excel') {
      const worksheet = XLSX.utils.aoa_to_sheet([headers, ...rows]);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Statistika");
      XLSX.writeFile(workbook, `${fileName}.xlsx`);
    } else {
      const doc = new jsPDF();
      doc.text(t('detailedStats'), 14, 15);
      autoTable(doc, {
        head: [headers],
        body: rows,
        startY: 20,
        theme: 'grid',
        styles: { fontSize: 8, cellPadding: 2 },
        headStyles: { fillColor: [26, 83, 92] }
      });
      doc.save(`${fileName}.pdf`);
    }
    setIsDownloadModalOpen(false);
  };

  const summary = useMemo(() => {
    const activeData = processedData.filter(d => !d.isPlaceholder);
    if (!activeData.length) return [
      { label: t('steps'), value: '0', trend: '0%', icon: Footprints, color: 'text-primary' },
      { label: t('avgWater'), value: '0 L', trend: '0%', icon: Droplets, color: 'text-secondary' },
      { label: t('avgSleep'), value: `0 ${t('hours')}`, trend: '0%', icon: Moon, color: 'text-purple-500' },
      { label: t('avgCalories'), value: '0', trend: '0%', icon: Flame, color: 'text-warning' },
    ];

    const count = activeData.length;
    const totals = activeData.reduce((acc, curr) => ({
      steps: acc.steps + curr.steps,
      water: acc.water + curr.water,
      sleep: acc.sleep + curr.sleep,
      calories: acc.calories + curr.calories,
    }), { steps: 0, water: 0, sleep: 0, calories: 0 });

    return [
      { label: t('steps'), value: Math.round(totals.steps / count).toLocaleString(), trend: '+0%', icon: Footprints, color: 'text-primary' },
      { label: t('avgWater'), value: `${(totals.water / count).toFixed(1)} L`, trend: '+0%', icon: Droplets, color: 'text-secondary' },
      { label: t('avgSleep'), value: `${(totals.sleep / count).toFixed(1)} ${t('hours')}`, trend: '+0%', icon: Moon, color: 'text-purple-500' },
      { label: t('avgCalories'), value: Math.round(totals.calories / count).toLocaleString(), trend: '+0%', icon: Flame, color: 'text-warning' },
    ];
  }, [processedData, t]);

  const renderChart = (metric: string, dataKey: string) => {
    const config = chartConfigs[metric];
    const theme = colorThemes[config.color];
    const ChartComponent = config.type === 'bar' ? BarChart : config.type === 'area' ? AreaChart : LineChart;

    return (
      <ResponsiveContainer width="100%" height="100%">
        <ChartComponent data={processedData} margin={{ bottom: 60 }}>
          <CartesianGrid strokeDasharray="0" vertical={false} stroke="#e5e7eb" />
          <XAxis 
            dataKey="name" 
            axisLine={{ stroke: '#e5e7eb' }} 
            tickLine={false} 
            tick={{ fontSize: 11, fill: '#6b7280', angle: -90, textAnchor: 'end' }}
            interval={period === 'month' ? 2 : 0}
            height={60}
          />
          <YAxis 
            axisLine={false} 
            tickLine={false} 
            tick={{ fontSize: 12, fill: '#6b7280' }}
            domain={[0, 'auto']}
          />
          <Tooltip 
            contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
          />
          {config.type === 'line' && (
            <Line 
              type="monotone" 
              dataKey={dataKey} 
              stroke={theme.stroke} 
              strokeWidth={4} 
              dot={false}
              activeDot={{ r: 6, fill: theme.stroke }}
            />
          )}
          {config.type === 'bar' && (
            <Bar 
              dataKey={dataKey} 
              fill={theme.stroke} 
              radius={[4, 4, 0, 0]}
            />
          )}
          {config.type === 'area' && (
            <Area 
              type="monotone" 
              dataKey={dataKey} 
              stroke={theme.stroke} 
              fill={theme.fill}
              strokeWidth={4}
            />
          )}
        </ChartComponent>
      </ResponsiveContainer>
    );
  };

  const renderSettings = (metric: string) => (
    <div className="absolute top-12 right-0 z-20 w-48 bg-white dark:bg-[#3d3d3d] rounded-2xl shadow-xl border border-gray-100 dark:border-gray-700 p-4 space-y-4">
      <div>
        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">{t('chartType')}</p>
        <div className="flex gap-1">
          {(['line', 'bar', 'area'] as ChartType[]).map(type => (
            <button
              key={type}
              onClick={() => setChartConfigs(prev => ({ ...prev, [metric]: { ...prev[metric], type } }))}
              className={`flex-1 py-1.5 rounded-lg text-[10px] font-bold capitalize transition-all ${
                chartConfigs[metric].type === type 
                  ? 'bg-primary text-white' 
                  : 'bg-gray-50 dark:bg-gray-800 text-gray-400'
              }`}
            >
              {type === 'line' ? t('line') : type === 'bar' ? t('bar') : t('area')}
            </button>
          ))}
        </div>
      </div>
      <div>
        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">{t('colorTheme')}</p>
        <div className="grid grid-cols-3 gap-2">
          {Object.entries(colorThemes).map(([key, theme]) => (
            <button
              key={key}
              onClick={() => setChartConfigs(prev => ({ ...prev, [metric]: { ...prev[metric], color: key } }))}
              className={`w-full aspect-square rounded-lg flex items-center justify-center transition-all border-2 ${
                chartConfigs[metric].color === key ? 'border-primary' : 'border-transparent'
              }`}
              style={{ backgroundColor: theme.stroke }}
            >
              {chartConfigs[metric].color === key && <Check className="w-4 h-4 text-white" />}
            </button>
          ))}
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-4">
          <div className="p-4 bg-primary/10 rounded-2xl">
            <BarChart2 className="w-8 h-8 text-primary" />
          </div>
          <div>
            <h2 className="text-3xl font-black dark:text-white tracking-tight">{t('statistics')}</h2>
            <p className="text-gray-500 font-medium">{t('healthAnalysis')}</p>
          </div>
        </div>
        <div className="flex items-center p-1 bg-[#1a1a1a] rounded-[20px] shadow-lg border border-white/5">
          {[
            { id: 'week', label: t('weekly') },
            { id: 'month', label: t('monthly') },
            { id: 'year', label: t('yearly') }
          ].map((p) => (
            <button
              key={p.id}
              onClick={() => setPeriod(p.id)}
              className={`px-6 py-2.5 rounded-[16px] text-sm font-bold transition-all duration-300 ${
                period === p.id 
                  ? 'bg-[#4CAF50] text-white shadow-[0_4px_12px_rgba(76,175,80,0.3)]' 
                  : 'text-[#808080] hover:text-white'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {summary.map((item, i) => (
          <div key={i} className="bg-white dark:bg-[#2d2d2d] p-6 rounded-2xl shadow-sm flex items-center gap-4 transition-colors">
            <div className={`w-12 h-12 rounded-full bg-gray-50 dark:bg-gray-800 flex items-center justify-center ${item.color}`}>
              <item.icon className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400">{item.label}</p>
              <div className="flex items-baseline gap-2">
                <span className="text-xl font-bold dark:text-white">{item.value}</span>
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                  item.trend.startsWith('+') ? 'bg-primary/10 text-primary' : 'bg-danger/10 text-danger'
                }`}>
                  {item.trend}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Steps Chart */}
        <div className="bg-white dark:bg-[#2d2d2d] p-8 rounded-3xl shadow-sm transition-colors border border-gray-100 dark:border-gray-800 relative">
          <div className="flex justify-between items-start mb-8">
            <h3 className="text-lg font-bold dark:text-white flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Footprints className="w-5 h-5 text-primary" />
              </div>
              {t('steps')}
            </h3>
            <button 
              onClick={() => setActiveSettings(activeSettings === 'steps' ? null : 'steps')}
              className={`p-2 rounded-lg transition-all ${activeSettings === 'steps' ? 'bg-primary text-white' : 'bg-gray-50 dark:bg-gray-800 text-gray-400 hover:text-primary'}`}
            >
              <Settings2 className="w-5 h-5" />
            </button>
            <AnimatePresence>
              {activeSettings === 'steps' && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: -10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: -10 }}
                >
                  {renderSettings('steps')}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          <div className="h-80">
            {renderChart('steps', 'steps')}
          </div>
        </div>

        {/* Water Chart */}
        <div className="bg-white dark:bg-[#2d2d2d] p-8 rounded-3xl shadow-sm transition-colors border border-gray-100 dark:border-gray-800 relative">
          <div className="flex justify-between items-start mb-8">
            <h3 className="text-lg font-bold dark:text-white flex items-center gap-3">
              <div className="p-2 bg-secondary/10 rounded-lg">
                <Droplets className="w-5 h-5 text-secondary" />
              </div>
              {t('waterStats')}
            </h3>
            <button 
              onClick={() => setActiveSettings(activeSettings === 'water' ? null : 'water')}
              className={`p-2 rounded-lg transition-all ${activeSettings === 'water' ? 'bg-primary text-white' : 'bg-gray-50 dark:bg-gray-800 text-gray-400 hover:text-primary'}`}
            >
              <Settings2 className="w-5 h-5" />
            </button>
            <AnimatePresence>
              {activeSettings === 'water' && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: -10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: -10 }}
                >
                  {renderSettings('water')}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          <div className="h-80">
            {renderChart('water', 'water')}
          </div>
        </div>

        {/* Sleep Chart */}
        <div className="bg-white dark:bg-[#2d2d2d] p-8 rounded-3xl shadow-sm transition-colors border border-gray-100 dark:border-gray-800 relative">
          <div className="flex justify-between items-start mb-8">
            <h3 className="text-lg font-bold dark:text-white flex items-center gap-3">
              <div className="p-2 bg-purple-500/10 rounded-lg">
                <Moon className="w-5 h-5 text-purple-500" />
              </div>
              {t('sleepQuality')}
            </h3>
            <button 
              onClick={() => setActiveSettings(activeSettings === 'sleep' ? null : 'sleep')}
              className={`p-2 rounded-lg transition-all ${activeSettings === 'sleep' ? 'bg-primary text-white' : 'bg-gray-50 dark:bg-gray-800 text-gray-400 hover:text-primary'}`}
            >
              <Settings2 className="w-5 h-5" />
            </button>
            <AnimatePresence>
              {activeSettings === 'sleep' && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: -10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: -10 }}
                >
                  {renderSettings('sleep')}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          <div className="h-80">
            {renderChart('sleep', 'sleep')}
          </div>
        </div>

        {/* Calories Chart */}
        <div className="bg-white dark:bg-[#2d2d2d] p-8 rounded-3xl shadow-sm transition-colors border border-gray-100 dark:border-gray-800 relative">
          <div className="flex justify-between items-start mb-8">
            <h3 className="text-lg font-bold dark:text-white flex items-center gap-3">
              <div className="p-2 bg-warning/10 rounded-lg">
                <Flame className="w-5 h-5 text-warning" />
              </div>
              {t('calorieBalance')}
            </h3>
            <button 
              onClick={() => setActiveSettings(activeSettings === 'calories' ? null : 'calories')}
              className={`p-2 rounded-lg transition-all ${activeSettings === 'calories' ? 'bg-primary text-white' : 'bg-gray-50 dark:bg-gray-800 text-gray-400 hover:text-primary'}`}
            >
              <Settings2 className="w-5 h-5" />
            </button>
            <AnimatePresence>
              {activeSettings === 'calories' && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: -10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: -10 }}
                >
                  {renderSettings('calories')}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          <div className="h-80">
            {renderChart('calories', 'calories')}
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-[#2d2d2d] p-8 rounded-3xl shadow-sm transition-colors overflow-hidden">
        <div className="flex justify-between items-center mb-8">
          <h3 className="text-lg font-bold dark:text-white flex items-center gap-3">
            <TableIcon className="w-5 h-5 text-primary" />
            {t('detailedStats')}
          </h3>
          <div className="flex gap-2">
            <button 
              onClick={() => setIsDownloadModalOpen(true)}
              className="p-2 bg-gray-50 dark:bg-gray-800 text-gray-500 rounded-lg hover:text-primary transition-all"
            >
              <Download className="w-5 h-5" />
            </button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="text-xs font-bold text-gray-400 uppercase tracking-wider border-b border-gray-50 dark:border-gray-800">
                <th className="pb-4 px-4">{period === 'year' ? t('month') : t('day')}</th>
                <th className="pb-4 px-4">{t('steps')}</th>
                <th className="pb-4 px-4">{t('water')}</th>
                <th className="pb-4 px-4">{t('sleep')}</th>
                <th className="pb-4 px-4">{t('calories')}</th>
                <th className="pb-4 px-4">{t('status')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
              {[...processedData].reverse().map((row, i) => (
                <tr key={i} className={`group hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors ${row.isPlaceholder ? 'opacity-40' : ''}`}>
                  <td className="py-4 px-4 text-sm font-semibold dark:text-white">
                    {row.name}
                  </td>
                  <td className="py-4 px-4 text-sm text-gray-600 dark:text-gray-400">{row.steps}</td>
                  <td className="py-4 px-4 text-sm text-gray-600 dark:text-gray-400">{row.water} L</td>
                  <td className="py-4 px-4 text-sm text-gray-600 dark:text-gray-400">{row.sleep} s</td>
                  <td className="py-4 px-4 text-sm text-gray-600 dark:text-gray-400">{row.calories}</td>
                  <td className="py-4 px-4">
                    <span className={`text-[10px] font-bold px-2 py-1 rounded-full ${
                      row.steps >= (period === 'year' ? 300000 : 10000) ? 'bg-primary/10 text-primary' : 'bg-warning/10 text-warning'
                    }`}>
                      {row.steps >= (period === 'year' ? 300000 : 10000) ? t('good') : t('average')}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Download Modal */}
      <AnimatePresence>
        {isDownloadModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white dark:bg-[#2d2d2d] w-full max-w-md rounded-3xl p-8 shadow-2xl"
            >
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold dark:text-white">{t('downloadFile')}</h3>
                <button 
                  onClick={() => setIsDownloadModalOpen(false)}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"
                >
                  <X className="w-6 h-6 dark:text-white" />
                </button>
              </div>

              <p className="text-gray-500 dark:text-gray-400 mb-8">
                {t('downloadFormat')}
              </p>

              <div className="grid grid-cols-2 gap-4 mb-8">
                <button
                  onClick={() => handleDownload('excel')}
                  className="flex flex-col items-center gap-3 p-6 rounded-2xl border-2 border-gray-100 dark:border-gray-800 hover:border-primary dark:hover:border-primary hover:bg-primary/5 transition-all group"
                >
                  <div className="p-3 bg-green-100 dark:bg-green-900/30 text-green-600 rounded-xl group-hover:scale-110 transition-transform">
                    <FileSpreadsheet className="w-8 h-8" />
                  </div>
                  <span className="font-bold dark:text-white">Excel</span>
                  <span className="text-xs text-gray-400">{t('excelFormat')}</span>
                </button>

                <button
                  onClick={() => handleDownload('pdf')}
                  className="flex flex-col items-center gap-3 p-6 rounded-2xl border-2 border-gray-100 dark:border-gray-800 hover:border-primary dark:hover:border-primary hover:bg-primary/5 transition-all group"
                >
                  <div className="p-3 bg-red-100 dark:bg-red-900/30 text-red-600 rounded-xl group-hover:scale-110 transition-transform">
                    <FileType className="w-8 h-8" />
                  </div>
                  <span className="font-bold dark:text-white">PDF</span>
                  <span className="text-xs text-gray-400">{t('pdfFormat')}</span>
                </button>
              </div>

              <button
                onClick={() => setIsDownloadModalOpen(false)}
                className="w-full py-4 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 font-bold rounded-2xl hover:bg-gray-200 dark:hover:bg-gray-700 transition-all"
              >
                {t('cancel')}
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Statistics;
