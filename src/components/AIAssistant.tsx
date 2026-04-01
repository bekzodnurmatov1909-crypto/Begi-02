import React, { useState, useRef, useEffect } from 'react';
import { Bot, Send, User, Trash2, MessageSquare, X, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { GoogleGenAI } from "@google/genai";
import { useFirebase } from '../context/FirebaseContext';

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'ai';
  timestamp: Date;
}

const AIAssistant: React.FC = () => {
  const { profile, dailyHealth } = useFirebase();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      text: "Salom! Men sizning shaxsiy AI salomatlik yordamchingizman. Qanday yordam bera olaman?",
      sender: 'ai',
      timestamp: new Date()
    }
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      text: input,
      sender: 'user',
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsTyping(true);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const model = ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: [
          {
            role: "user",
            parts: [{ text: `
              Foydalanuvchi ma'lumotlari:
              Ism: ${profile?.fullName || "Noma'lum"}
              Vazn: ${profile?.weight || "Noma'lum"} kg
              Bo'y: ${profile?.height || "Noma'lum"} cm
              
              Hozirgi statistika:
              Suv: ${dailyHealth?.water || 0} ml
              Kaloriya: ${dailyHealth?.calories || 0} kcal
              Masofa: ${dailyHealth?.distance || 0} km
              
              Foydalanuvchi savoli: ${input}
              
              Iltimos, foydalanuvchiga qisqa, aniq va motivatsion javob bering. O'zbek tilida javob bering.
            ` }]
          }
        ],
        config: {
          systemInstruction: "Siz professional va mehribon AI salomatlik yordamchisiz. Foydalanuvchi ma'lumotlariga tayanib, shaxsiy maslahatlar bering."
        }
      });

      const response = await model;
      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: response.text || "Kechirasiz, hozirda javob bera olmayman.",
        sender: 'ai',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, aiMessage]);
    } catch (error) {
      console.error("AI Error:", error);
    } finally {
      setIsTyping(false);
    }
  };

  const clearChat = () => {
    setMessages([{
      id: '1',
      text: "Salom! Men sizning shaxsiy AI salomatlik yordamchingizman. Qanday yordam bera olaman?",
      sender: 'ai',
      timestamp: new Date()
    }]);
  };

  const suggestedQuestions = [
    "Qanday qilib vazn yo'qotish mumkin?",
    "Kunlik suv miqdori qancha?",
    "Sog'lom uyqu sirlari",
    "Mashqlar rejasi"
  ];

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-8 right-8 w-16 h-16 bg-primary text-white rounded-2xl shadow-2xl flex items-center justify-center hover:scale-110 active:scale-95 transition-all z-50 group"
      >
        <div className="absolute -top-12 right-0 bg-white dark:bg-[#2d2d2d] px-4 py-2 rounded-xl shadow-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap border border-primary/10">
          <p className="text-xs font-bold text-primary">AI Yordamchi</p>
        </div>
        <Bot className="w-8 h-8" />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20, x: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0, x: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20, x: 20 }}
            className="fixed bottom-20 right-8 w-[560px] max-w-[calc(100vw-4rem)] h-[75vh] min-h-[500px] max-h-[850px] bg-white dark:bg-[#1a1a1a] rounded-[2.5rem] shadow-2xl border border-gray-100 dark:border-gray-800 overflow-hidden flex flex-col z-50"
          >
            <div className="p-6 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center bg-gradient-to-r from-primary/5 to-transparent">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary shadow-inner">
                  <Bot className="w-7 h-7" />
                </div>
                <div>
                  <h2 className="text-lg font-bold dark:text-white tracking-tight">AI Yordamchi</h2>
                  <div className="flex items-center gap-1.5">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                    </span>
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Onlayn</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button 
                  onClick={clearChat}
                  title="Chatni tozalash"
                  className="p-2.5 text-gray-400 hover:text-rose-500 hover:bg-rose-500/10 rounded-xl transition-all"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
                <button 
                  onClick={() => setIsOpen(false)}
                  title="Yopish"
                  className="p-2.5 bg-gray-100 dark:bg-gray-800 text-gray-500 hover:text-rose-500 hover:bg-rose-500/10 rounded-xl transition-all border border-transparent hover:border-rose-500/20"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-thin scrollbar-thumb-gray-200 dark:scrollbar-thumb-gray-800">
              {messages.map((msg) => (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex gap-3 ${msg.sender === 'user' ? 'flex-row-reverse' : ''}`}
                >
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm ${
                    msg.sender === 'user' ? 'bg-secondary text-white' : 'bg-primary text-white'
                  }`}>
                    {msg.sender === 'user' ? <User className="w-5 h-5" /> : <Bot className="w-5 h-5" />}
                  </div>
                  <div className={`max-w-[85%] p-5 rounded-2xl shadow-sm ${
                    msg.sender === 'user' 
                      ? 'bg-secondary/5 text-gray-800 dark:text-gray-200 rounded-tr-none border border-secondary/10' 
                      : 'bg-primary/5 text-gray-800 dark:text-gray-200 rounded-tl-none border border-primary/10'
                  }`}>
                    <p className="text-base leading-relaxed whitespace-pre-wrap font-medium">{msg.text}</p>
                  </div>
                </motion.div>
              ))}
              {isTyping && (
                <div className="flex gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary text-white flex items-center justify-center shadow-sm">
                    <Bot className="w-5 h-5" />
                  </div>
                  <div className="bg-primary/5 p-5 rounded-2xl rounded-tl-none border border-primary/10">
                    <div className="flex gap-1">
                      <div className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce" />
                      <div className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce [animation-delay:0.2s]" />
                      <div className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce [animation-delay:0.4s]" />
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            <div className="p-6 border-t border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/50">
              <div className="flex gap-2 overflow-x-auto pb-3 scrollbar-hide">
                {suggestedQuestions.map((q, i) => (
                  <button
                    key={i}
                    onClick={() => setInput(q)}
                    className="whitespace-nowrap px-4 py-2 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl text-xs font-bold text-gray-500 hover:border-primary hover:text-primary transition-all shadow-sm"
                  >
                    {q}
                  </button>
                ))}
              </div>
              <div className="flex gap-3">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                  placeholder="Xabar yozing..."
                  className="flex-1 px-6 py-4 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl focus:ring-2 focus:ring-primary/20 outline-none dark:text-white font-medium transition-all shadow-inner"
                />
                <button
                  onClick={handleSend}
                  disabled={!input.trim() || isTyping}
                  className="w-14 h-14 bg-primary text-white rounded-2xl flex items-center justify-center hover:bg-primary-dark disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-primary/20"
                >
                  <Send className="w-6 h-6" />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default AIAssistant;
