import React, { useState, useEffect, useRef, useCallback } from 'react';

// Custom hook for localStorage
function useLocalStorage(key, initialValue) {
  const [storedValue, setStoredValue] = useState(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.error(error);
      return initialValue;
    }
  });

  const setValue = (value) => {
    try {
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      setStoredValue(valueToStore);
      window.localStorage.setItem(key, JSON.stringify(valueToStore));
    } catch (error) {
      console.error(error);
    }
  };
  return [storedValue, setValue];
}

const DEFAULT_ZEKRS = [
  { id: '1', name: 'استغفر الله', phrases: ['استغفر الله', 'استغفرالله'], count: 0 },
  { id: '2', name: 'سبحان الله', phrases: ['سبحان الله', 'سبحانالله'], count: 0 },
  { id: '3', name: 'الحمد لله', phrases: ['الحمد لله', 'الحمدلله'], count: 0 },
  { id: '4', name: 'الله أكبر', phrases: ['الله اكبر', 'اللهأكبر', 'الله اكبر'], count: 0 },
  { id: '5', name: 'الصلاة على النبي', phrases: ['صلى الله عليه وسلم', 'اللهم صل على محمد', 'صل الله عليه وسلم'], count: 0 }
];

function normalizeArabic(text) {
  if (!text) return "";
  return text.replace(/[أإآ]/g, 'ا')
             .replace(/ة/g, 'ه')
             .replace(/ى/g, 'ي')
             .replace(/[\u064B-\u065F\u0651\u0654]/g, '')
             .trim();
}

export default function App() {
  const [zekrs, setZekrs] = useLocalStorage('zekr_cells_v1', DEFAULT_ZEKRS);
  const [activeZekrId, setActiveZekrId] = useLocalStorage('active_zekr_v1', DEFAULT_ZEKRS[0].id);
  
  const [isListening, setIsListening] = useState(false);
  const [lastHeard, setLastHeard] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [popCounter, setPopCounter] = useState(false);
  
  // Modal states
  const [isManageModalOpen, setIsManageModalOpen] = useState(false);
  const [newZekrName, setNewZekrName] = useState('');
  const [newZekrPhrases, setNewZekrPhrases] = useState('');
  
  const recognitionRef = useRef(null);
  const activeZekr = zekrs.find(z => z.id === activeZekrId) || zekrs[0];

  const updateCount = useCallback((increment) => {
    setZekrs(prev => prev.map(z => {
      if (z.id === activeZekrId) {
        return { ...z, count: z.count + increment };
      }
      return z;
    }));
    
    // Trigger animation
    setPopCounter(false);
    setTimeout(() => setPopCounter(true), 10);
    
    if (navigator.vibrate) {
      navigator.vibrate(50);
    }
  }, [activeZekrId, setZekrs]);

  const initRecognition = useCallback(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setErrorMsg("المتصفح لا يدعم التعرف على الصوت. استخدم جوجل كروم.");
      return null;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.lang = 'ar-SA';

    recognition.onstart = () => {
      setIsListening(true);
      setErrorMsg('');
      if ('wakeLock' in navigator) {
        navigator.wakeLock.request('screen').catch(console.error);
      }
    };

    recognition.onresult = (event) => {
      const transcript = event.results[event.results.length - 1][0].transcript;
      setLastHeard(transcript);
      
      const normalizedTranscript = normalizeArabic(transcript);
      const targets = activeZekr.phrases.map(normalizeArabic);
      
      let newMatches = 0;
      for (let target of targets) {
        if (!target) continue;
        const occurrences = normalizedTranscript.split(target).length - 1;
        if (occurrences > 0) {
          newMatches += occurrences;
        }
      }
      
      if (newMatches === 0) {
        const words = normalizedTranscript.split(/\s+/);
        for(let target of targets) {
             const targetWords = target.split(/\s+/);
             if(targetWords.length === 1) {
                 for(let w of words) {
                     if(w === target) newMatches++;
                 }
             }
        }
      }

      if (newMatches > 0) {
        updateCount(newMatches);
      }
    };

    recognition.onerror = (event) => {
      console.error("Speech error:", event.error);
      setIsListening(false);
      if (event.error === 'not-allowed') {
        setErrorMsg("المتصفح يمنع المايكروفون. يرجى السماح بالوصول.");
      } else {
        setErrorMsg(`حدث خطأ: ${event.error}`);
      }
    };

    recognition.onend = () => {
      if (isListening) {
        try { recognition.start(); } catch(e) { /* Ignore */ }
      } else {
        setIsListening(false);
      }
    };

    return recognition;
  }, [activeZekr, isListening, updateCount]);

  const toggleListening = () => {
    if (isListening) {
      setIsListening(false);
      if (recognitionRef.current) recognitionRef.current.stop();
    } else {
      const rec = initRecognition();
      if (rec) {
        recognitionRef.current = rec;
        rec.start();
      }
    }
  };

  const resetCount = () => {
    if (confirm("هل أنت متأكد من تصفير العداد؟")) {
      setZekrs(prev => prev.map(z => z.id === activeZekrId ? { ...z, count: 0 } : z));
      setLastHeard("");
    }
  };

  const handleAddZekr = () => {
    if (!newZekrName.trim() || !newZekrPhrases.trim()) {
      alert("الرجاء إدخال اسم الذكر والعبارات المستهدفة.");
      return;
    }
    
    const newZekr = {
      id: Date.now().toString(),
      name: newZekrName.trim(),
      phrases: newZekrPhrases.split('-').map(p => p.trim()).filter(p => p),
      count: 0
    };
    
    setZekrs(prev => [...prev, newZekr]);
    setNewZekrName('');
    setNewZekrPhrases('');
    setActiveZekrId(newZekr.id);
  };

  const handleDeleteZekr = (id) => {
    if (zekrs.length <= 1) {
      alert("لا يمكن حذف الذكر الوحيد المتبقي.");
      return;
    }
    if (confirm("هل أنت متأكد من حذف هذا الذكر من القائمة؟")) {
      setZekrs(prev => prev.filter(z => z.id !== id));
      if (activeZekrId === id) {
        const remaining = zekrs.filter(z => z.id !== id);
        setActiveZekrId(remaining[0].id);
      }
    }
  };

  useEffect(() => {
    if (isListening && recognitionRef.current) {
      recognitionRef.current.stop();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeZekrId]);

  return (
    <div className="flex flex-col min-h-screen max-w-lg mx-auto bg-slate-800 shadow-2xl p-6 relative overflow-hidden">
      <div className="absolute top-[-10%] right-[-10%] w-64 h-64 bg-emerald-600 rounded-full mix-blend-multiply filter blur-3xl opacity-20"></div>
      <div className="absolute bottom-[-10%] left-[-10%] w-64 h-64 bg-purple-600 rounded-full mix-blend-multiply filter blur-3xl opacity-20"></div>

      <header className="text-center z-10 mb-8 mt-4 relative">
        <button 
          onClick={() => setIsManageModalOpen(true)}
          className="absolute left-0 top-0 text-slate-400 hover:text-white p-2"
          title="إدارة الأذكار"
        >
          <i className="fas fa-cog text-xl"></i>
        </button>
        <h1 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-200 mb-2">المسبحة الصوتية الذكية</h1>
        <p className="text-slate-400 text-sm">اعمل بيدك والبرنامج يعد وراءك</p>
      </header>

      {errorMsg && (
        <div className="z-10 bg-red-900/50 border border-red-500/50 text-red-200 p-4 rounded-xl mb-6 text-sm text-center backdrop-blur-sm">
          <i className="fas fa-exclamation-triangle ml-2"></i>
          {errorMsg}
        </div>
      )}

      {/* Zekr Selector */}
      <div className="z-10 mb-8 bg-slate-900/60 backdrop-blur-md p-4 rounded-2xl border border-slate-700/50">
        <label className="block text-sm font-bold text-slate-300 mb-3">اختر الذكر:</label>
        <div className="flex gap-2 overflow-x-auto pb-2 custom-scrollbar">
          {zekrs.map(zekr => (
            <button 
              key={zekr.id}
              onClick={() => setActiveZekrId(zekr.id)}
              className={`whitespace-nowrap px-4 py-3 rounded-xl text-sm font-bold transition-all duration-300 ${activeZekrId === zekr.id ? 'bg-emerald-500 text-slate-900 shadow-lg shadow-emerald-500/30 transform scale-105' : 'bg-slate-800 text-slate-400 hover:bg-slate-700 border border-slate-700'}`}
            >
              {zekr.name}
            </button>
          ))}
          <button 
            onClick={() => setIsManageModalOpen(true)}
            className="whitespace-nowrap px-4 py-3 rounded-xl text-sm font-bold border border-dashed border-slate-600 text-slate-400 hover:text-emerald-400 hover:border-emerald-400 transition-colors"
          >
            <i className="fas fa-plus ml-1"></i> إضافة ذكر
          </button>
        </div>
      </div>

      {/* Counter Display */}
      <div className="z-10 flex-1 flex flex-col items-center justify-center py-8">
        <div className="relative">
          {isListening && <div className="absolute inset-0 pulse-animation rounded-full"></div>}
          <div className={`relative z-10 text-8xl md:text-9xl font-black tabular-nums tracking-tighter transition-colors duration-300 ${popCounter ? 'counter-pop text-emerald-400' : 'text-white'}`}>
            {activeZekr.count}
          </div>
        </div>
        <p className="text-emerald-500/80 font-bold mt-4 text-xl tracking-widest uppercase">مرات</p>
      </div>

      {/* Controls */}
      <div className="z-10 flex gap-4 justify-center mt-auto mb-6">
        <button 
          onClick={toggleListening}
          className={`flex-1 font-bold py-5 px-6 rounded-2xl shadow-lg transition-all duration-300 flex items-center justify-center gap-3 text-lg ${isListening ? 'bg-red-500/20 text-red-400 border border-red-500/50 hover:bg-red-500/30' : 'bg-gradient-to-r from-emerald-500 to-teal-400 text-slate-900 hover:shadow-emerald-500/25 hover:-translate-y-1'}`}
        >
          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${isListening ? 'bg-red-500/20 text-red-400' : 'bg-slate-900/20 text-slate-900'}`}>
            <i className={`fas ${isListening ? 'fa-stop' : 'fa-microphone'}`}></i>
          </div>
          <span>{isListening ? 'إيقاف الاستماع' : 'بدء الاستماع'}</span>
        </button>
        
        <button 
          onClick={resetCount}
          className="bg-slate-800/80 hover:bg-slate-700 backdrop-blur-md border border-slate-700 text-slate-300 font-bold w-16 rounded-2xl shadow-lg transition-all flex items-center justify-center"
          title="تصفير العداد"
        >
          <i className="fas fa-undo-alt"></i>
        </button>
      </div>

      {/* Status Bar */}
      <div className="z-10 flex items-center justify-between text-xs bg-slate-900/40 p-3 rounded-xl backdrop-blur-sm border border-slate-800">
        <div className="flex items-center gap-2 text-slate-400">
          <span className={`w-2.5 h-2.5 rounded-full ${isListening ? 'bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.8)]' : 'bg-slate-600'}`}></span>
          <span>{isListening ? 'يستمع الآن...' : 'متوقف'}</span>
        </div>
        <div className="text-slate-500 truncate max-w-[60%] font-mono" title={lastHeard}>
          {lastHeard ? `"${lastHeard}"` : 'لا يوجد كلام'}
        </div>
      </div>
      
      {/* Manage Zekr Modal */}
      {isManageModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-slate-800 border border-slate-700 rounded-3xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto custom-scrollbar shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-white">إدارة الأذكار</h2>
              <button onClick={() => setIsManageModalOpen(false)} className="text-slate-400 hover:text-white">
                <i className="fas fa-times text-xl"></i>
              </button>
            </div>
            
            <div className="mb-8 bg-slate-900/50 p-4 rounded-2xl border border-slate-700">
              <h3 className="text-emerald-400 font-bold mb-4 text-sm"><i className="fas fa-plus-circle ml-2"></i>إضافة ذكر جديد</h3>
              <input 
                type="text" 
                placeholder="اسم الذكر (مثال: لا إله إلا الله)" 
                className="w-full bg-slate-800 text-white border border-slate-600 rounded-lg p-3 mb-3 focus:outline-none focus:border-emerald-500 text-sm"
                value={newZekrName}
                onChange={(e) => setNewZekrName(e.target.value)}
              />
              <textarea 
                placeholder="العبارات المستهدفة (افصل بينها بشرطة - مثال: لا اله الا الله - لا إله إلا الله)" 
                className="w-full bg-slate-800 text-white border border-slate-600 rounded-lg p-3 mb-3 focus:outline-none focus:border-emerald-500 text-sm h-20 resize-none"
                value={newZekrPhrases}
                onChange={(e) => setNewZekrPhrases(e.target.value)}
              ></textarea>
              <button 
                onClick={handleAddZekr}
                className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2 px-4 rounded-lg transition-colors text-sm"
              >
                حفظ الذكر الجديد
              </button>
            </div>

            <div>
              <h3 className="text-slate-300 font-bold mb-4 text-sm">الأذكار المحفوظة</h3>
              <div className="space-y-3">
                {zekrs.map(zekr => (
                  <div key={zekr.id} className="flex justify-between items-center bg-slate-900 p-3 rounded-xl border border-slate-700/50">
                    <span className="font-bold text-sm text-slate-200">{zekr.name}</span>
                    <button 
                      onClick={() => handleDeleteZekr(zekr.id)}
                      className="text-red-400 hover:text-red-300 hover:bg-red-400/10 p-2 rounded-lg transition-colors"
                      title="حذف الذكر"
                    >
                      <i className="fas fa-trash"></i>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
      
    </div>
  );
}
