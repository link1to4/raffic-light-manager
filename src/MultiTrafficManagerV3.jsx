import React, { useState, useEffect, useRef } from 'react';
import { Plus, Trash2, Clock, Activity, Power, Save, X, Settings, Edit3, Play, MousePointerClick, CheckCircle, Timer, MapPin, Locate, Loader2, AlertCircle, Database } from 'lucide-react';

// ... (getLocationName 函式保持不變) ...
// ==========================================
// 共用工具：取得 GPS 位置並轉換為地址 (增強版 + 狀態回報)
// ==========================================
const getLocationName = (onStatus, onSuccess, onError) => {
  if (!navigator.geolocation) {
    onError("您的瀏覽器不支援地理位置功能");
    return;
  }

  onStatus("正在取得 GPS 座標...");

  // 設定定位參數
  const geoOptions = {
    enableHighAccuracy: true,
    timeout: 10000, 
    maximumAge: 0
  };

  navigator.geolocation.getCurrentPosition(async (position) => {
    const { latitude, longitude } = position.coords;
    
    onStatus("座標取得成功，正在查詢路名...");
    
    // 預設名稱：萬一 API 失敗，至少回傳座標
    let resultName = `GPS座標 (${latitude.toFixed(4)}, ${longitude.toFixed(4)})`;

    try {
      // 設定 Fetch 逾時 (5秒)
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1&accept-language=zh-TW`, {
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (!res.ok) throw new Error(`API error: ${res.status}`);
      
      const data = await res.json();
      
      if (data && data.address) {
         const addr = data.address;
         const city = addr.city || addr.county || addr.town || addr.district || addr.village || "";
         const road = addr.road || addr.street || addr.pedestrian || addr.highway || addr.path || addr.suburb || addr.neighbourhood || "";
         const landmark = addr.amenity || addr.building || addr.shop || "";

         if (road) {
           resultName = `${city} ${road}`;
         } else if (landmark) {
           resultName = `${city} ${landmark}附近`;
         } else if (data.display_name) {
           resultName = data.display_name.split(',')[0];
         }
      }
      onSuccess(resultName);
      
    } catch (error) {
      console.error("Geocoding failed:", error);
      // API 失敗時，回傳座標但標記為成功 (因為至少有座標)
      onSuccess(resultName); 
    }
  }, (err) => {
    console.warn("Geolocation error:", err.message);
    let msg = "無法取得位置";
    switch(err.code) {
      case 1: msg = "存取被拒：請允許瀏覽器取得位置"; break;
      case 2: msg = "訊號不良：無法偵測目前位置"; break;
      case 3: msg = "連線逾時：請檢查網路或至戶外"; break;
      default: msg = `定位錯誤: ${err.message}`;
    }
    onError(msg);
  }, geoOptions);
};

// ... (InlineRecorder 元件保持不變) ...
// ==========================================
// 1. 內嵌錄製器 (Embedded Recorder)
// ==========================================
const InlineRecorder = ({ onComplete, onCancel, onStart }) => {
  const [step, setStep] = useState(0); 
  const [startTime, setStartTime] = useState(null);
  const [elapsed, setElapsed] = useState(0);
  const [durations, setDurations] = useState({ green: 0, yellow: 0, red: 0 });
  const intervalRef = useRef(null);

  useEffect(() => {
    if (step > 0 && startTime) {
      intervalRef.current = setInterval(() => {
        setElapsed(((Date.now() - startTime) / 1000).toFixed(1));
      }, 100);
    }
    return () => clearInterval(intervalRef.current);
  }, [step, startTime]);

  const handleClick = () => {
    const now = Date.now();
    if (step === 0) {
      setStep(1);
      setStartTime(now);
      // 當開始錄製(綠燈)時，觸發 onStart
      if (onStart) onStart();
    } else if (step === 1) {
      const d = Math.max(1, Math.round((now - startTime) / 1000));
      setDurations(p => ({ ...p, green: d }));
      setStep(2);
      setStartTime(now);
      setElapsed(0);
    } else if (step === 2) {
      const d = Math.max(1, Math.round((now - startTime) / 1000));
      setDurations(p => ({ ...p, yellow: d }));
      setStep(3);
      setStartTime(now);
      setElapsed(0);
    } else if (step === 3) {
      const d = Math.max(1, Math.round((now - startTime) / 1000));
      onComplete({ ...durations, red: d });
    }
  };

  const getStatus = () => {
    switch(step) {
      case 0: return { t: "點擊開始 (綠燈)", c: "bg-green-600", light: 'off' };
      case 1: return { t: "點擊轉黃燈", c: "bg-green-500 animate-pulse", light: 'green' };
      case 2: return { t: "點擊轉紅燈", c: "bg-yellow-500 text-black animate-pulse", light: 'yellow' };
      case 3: return { t: "點擊完成", c: "bg-red-500 animate-pulse", light: 'red' };
      default: return { t: "", c: "" };
    }
  };

  const status = getStatus();

  return (
    <div className="bg-black/40 rounded-xl p-4 text-center border border-gray-600">
      <div className="text-4xl font-mono font-bold mb-4">{elapsed}s</div>
      <div className="flex justify-center gap-2 mb-4">
         <div className={`w-3 h-3 rounded-full ${status.light === 'red' ? 'bg-red-500 shadow-[0_0_10px_red]' : 'bg-red-900'}`}></div>
         <div className={`w-3 h-3 rounded-full ${status.light === 'yellow' ? 'bg-yellow-400 shadow-[0_0_10px_yellow]' : 'bg-yellow-900'}`}></div>
         <div className={`w-3 h-3 rounded-full ${status.light === 'green' ? 'bg-green-500 shadow-[0_0_10px_lime]' : 'bg-green-900'}`}></div>
      </div>
      <button onClick={handleClick} className={`w-full py-3 rounded-lg font-bold text-sm mb-2 transition-all active:scale-95 ${status.c}`}>{status.t}</button>
      {step > 0 && <div className="text-xs text-gray-400 mb-2">G: {step > 1 ? durations.green : '--'} / Y: {step > 2 ? durations.yellow : '--'}</div>}
      <button onClick={onCancel} className="text-xs text-gray-500 hover:text-white underline">取消錄製</button>
    </div>
  );
};

// ... (TrafficLightCard 元件保持不變) ...
// ==========================================
// 2. 紅綠燈卡片
// ==========================================
const TrafficLightCard = ({ data, onDelete, onUpdate }) => {
  const [status, setStatus] = useState('standby'); 
  const [currentLight, setCurrentLight] = useState('standby-yellow');
  const [timeLeft, setTimeLeft] = useState(0);
  
  const [isEditing, setIsEditing] = useState(false);
  const [activeTab, setActiveTab] = useState('basic'); 
  const [editFormData, setEditFormData] = useState(data);
  const [isRecording, setIsRecording] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [gpsMsg, setGpsMsg] = useState({ text: '', type: '' }); // 'info' or 'error'

  const timerRef = useRef(null);

  useEffect(() => { setEditFormData(data); }, [data]);

  useEffect(() => {
    const checkSchedule = () => {
      const now = new Date();
      if (!data.scheduleTime) return;
      const parts = data.scheduleTime.split(':').map(p => parseInt(p) || 0);
      const targetDate = new Date(now);
      targetDate.setHours(parts[0] || 0, parts[1] || 0, parts[2] || 0, 0);
      const diffInMinutes = (now - targetDate) / 1000 / 60;
      const isWithin = diffInMinutes >= -30 && diffInMinutes <= 30;

      if (isWithin && status === 'standby') {
        setStatus('active');
        setCurrentLight('green');
        setTimeLeft(data.durations?.green || 15);
      } else if (!isWithin && status === 'active') {
        setStatus('standby');
        setCurrentLight('standby-yellow');
        setTimeLeft(0);
      }
    };
    checkSchedule();
    const interval = setInterval(checkSchedule, 1000);
    return () => clearInterval(interval);
  }, [data.scheduleTime, status, data.durations]);

  useEffect(() => {
    if (status !== 'active') return;
    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          const dur = data.durations || { green: 15, yellow: 3, red: 15 };
          if (currentLight === 'green') { setCurrentLight('yellow'); return dur.yellow; }
          else if (currentLight === 'yellow') { setCurrentLight('red'); return dur.red; }
          else { setCurrentLight('green'); return dur.green; }
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [status, currentLight, data.durations]);

  const handleSave = () => {
    const cleanData = {
      ...editFormData,
      durations: {
        green: Math.max(1, Number(editFormData.durations?.green || 15)),
        yellow: Math.max(1, Number(editFormData.durations?.yellow || 3)),
        red: Math.max(1, Number(editFormData.durations?.red || 15)),
      }
    };
    onUpdate(data.id, cleanData);
    setIsEditing(false);
    setIsRecording(false);
    setGpsMsg({ text: '', type: '' });
    setActiveTab('basic');
  };

  const handleGPS = () => {
    setIsLocating(true);
    setGpsMsg({ text: '正在請求位置權限...', type: 'info' });
    
    getLocationName(
      (status) => setGpsMsg({ text: status, type: 'info' }),
      (name) => {
        setEditFormData(prev => ({ ...prev, name }));
        setIsLocating(false);
        setGpsMsg({ text: '定位成功！', type: 'success' });
        setTimeout(() => setGpsMsg({ text: '', type: '' }), 3000);
      },
      (errMessage) => {
        setGpsMsg({ text: errMessage, type: 'error' });
        setIsLocating(false);
      }
    );
  };

  const getLightClass = (color) => {
    const isActive = currentLight === color;
    const isBlink = status === 'standby' && color === 'yellow';
    let base = "w-12 h-12 rounded-full border-2 border-gray-900 transition-all duration-300 ";
    if (color === 'red') return base + (isActive ? "bg-red-500 shadow-[0_0_15px_red] scale-110" : "bg-red-950/30");
    if (color === 'green') return base + (isActive ? "bg-green-500 shadow-[0_0_15px_lime] scale-110" : "bg-green-950/30");
    if (color === 'yellow') return base + (isBlink ? "bg-yellow-400 animate-pulse shadow-[0_0_10px_gold]" : (isActive ? "bg-yellow-400 shadow-[0_0_15px_gold] scale-110" : "bg-yellow-950/30"));
  };

  const getRangeStr = (time) => {
    if (!time) return "--:--:-- ~ --:--:--";
    const parts = time.split(':').map(p => parseInt(p) || 0);
    const s = new Date(); s.setHours(parts[0], (parts[1] || 0)-30, parts[2] || 0);
    const e = new Date(); e.setHours(parts[0], (parts[1] || 0)+30, parts[2] || 0);
    const fmt = d => `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}:${String(d.getSeconds()).padStart(2,'0')}`;
    return `${fmt(s)}~${fmt(e)}`;
  };

  if (isEditing) {
    return (
      <div className="bg-gray-800 rounded-2xl border-2 border-blue-500/50 shadow-2xl relative p-0 flex flex-col overflow-hidden min-h-[300px] animate-in zoom-in-95 duration-200">
        <div className="bg-gray-900 border-b border-gray-700">
          <div className="p-3 flex justify-between items-center text-white font-bold border-b border-gray-800">
            <span className="flex items-center gap-2"><Settings size={16} className="text-blue-400"/> 路口設定</span>
            <button onClick={() => setIsEditing(false)} className="text-gray-500 hover:text-white"><X size={18}/></button>
          </div>
          <div className="flex text-sm">
            <button onClick={() => setActiveTab('basic')} className={`flex-1 py-2 text-center transition-colors ${activeTab === 'basic' ? 'bg-gray-800 text-blue-400 border-b-2 border-blue-400' : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800'}`}>基礎資訊</button>
            <button onClick={() => setActiveTab('timing')} className={`flex-1 py-2 text-center transition-colors ${activeTab === 'timing' ? 'bg-gray-800 text-green-400 border-b-2 border-green-400' : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800'}`}>燈號秒數</button>
          </div>
        </div>

        <div className="p-5 flex-grow flex flex-col justify-center">
          {activeTab === 'basic' && (
            <div className="space-y-4 animate-in fade-in slide-in-from-left-4 duration-300">
              <div>
                <label className="text-xs text-gray-400 mb-1 block flex items-center gap-1"><MapPin size={12}/> 路口名稱</label>
                <div className="flex gap-2">
                  <input type="text" value={editFormData.name} onChange={(e) => setEditFormData({...editFormData, name: e.target.value})} className="flex-1 bg-black/50 border border-gray-600 rounded-lg px-3 py-2 text-white focus:border-blue-500 outline-none" placeholder="輸入名稱或使用定位" />
                  <button onClick={handleGPS} disabled={isLocating} className="px-3 py-2 bg-gray-700 hover:bg-blue-600 rounded-lg text-white transition-colors disabled:opacity-50" title="使用 GPS 自動填入">
                    {isLocating ? <Loader2 size={16} className="animate-spin" /> : <Locate size={16} />}
                  </button>
                </div>
                {gpsMsg.text && (
                  <div className={`text-xs mt-1 flex items-center gap-1 ${gpsMsg.type === 'error' ? 'text-red-400' : gpsMsg.type === 'success' ? 'text-green-400' : 'text-blue-400'}`}>
                    {gpsMsg.type === 'error' && <AlertCircle size={10} />}
                    {gpsMsg.text}
                  </div>
                )}
              </div>
              <div>
                <label className="text-xs text-gray-400 mb-1 block flex items-center gap-1"><Clock size={12}/> 每日排程基準時間</label>
                <input type="time" step="1" value={editFormData.scheduleTime} onChange={(e) => setEditFormData({...editFormData, scheduleTime: e.target.value})} className="w-full bg-black/50 border border-gray-600 rounded-lg px-3 py-2 text-white focus:border-blue-500 outline-none" />
                <div className="text-xs text-gray-500 mt-1 text-right">運作區間: {getRangeStr(editFormData.scheduleTime)}</div>
              </div>
            </div>
          )}
          {activeTab === 'timing' && (
            <div className="animate-in fade-in slide-in-from-right-4 duration-300 h-full flex flex-col">
              {isRecording ? (
                <InlineRecorder 
                  onStart={() => {
                    // 編輯模式下的錄製，通常不改變排程時間，僅改秒數
                    // 但若有需要也可以在此處更新
                  }}
                  onComplete={(newDurations) => { setEditFormData(prev => ({ ...prev, durations: newDurations })); setIsRecording(false); }} 
                  onCancel={() => setIsRecording(false)} 
                />
              ) : (
                <>
                  <div className="grid grid-cols-3 gap-3 mb-4">
                    <div className="text-center"><label className="text-xs text-green-500 block mb-1">綠燈 (s)</label><input type="number" min="1" value={editFormData.durations?.green} onChange={(e) => setEditFormData({...editFormData, durations: {...editFormData.durations, green: e.target.value}})} className="w-full bg-green-900/20 border border-green-800 rounded px-2 py-2 text-center text-white focus:border-green-500 outline-none"/></div>
                    <div className="text-center"><label className="text-xs text-yellow-500 block mb-1">黃燈 (s)</label><input type="number" min="1" value={editFormData.durations?.yellow} onChange={(e) => setEditFormData({...editFormData, durations: {...editFormData.durations, yellow: e.target.value}})} className="w-full bg-yellow-900/20 border border-yellow-800 rounded px-2 py-2 text-center text-white focus:border-yellow-500 outline-none"/></div>
                    <div className="text-center"><label className="text-xs text-red-500 block mb-1">紅燈 (s)</label><input type="number" min="1" value={editFormData.durations?.red} onChange={(e) => setEditFormData({...editFormData, durations: {...editFormData.durations, red: e.target.value}})} className="w-full bg-red-900/20 border border-red-800 rounded px-2 py-2 text-center text-white focus:border-red-500 outline-none"/></div>
                  </div>
                  <div className="flex items-center gap-2 my-2 before:content-[''] before:h-px before:flex-1 before:bg-gray-700 after:content-[''] after:h-px after:flex-1 after:bg-gray-700"><span className="text-xs text-gray-500">或</span></div>
                  <button onClick={() => setIsRecording(true)} className="w-full py-2 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-lg text-sm flex items-center justify-center gap-2 transition-colors"><MousePointerClick size={16} /> 互動式錄製秒數</button>
                </>
              )}
            </div>
          )}
        </div>
        <div className="p-4 bg-gray-900/50 border-t border-gray-700 flex gap-3">
           <button onClick={handleSave} className="flex-1 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-bold flex items-center justify-center gap-2"><Save size={16} /> 儲存設定</button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-800 rounded-2xl border border-gray-700 overflow-hidden shadow-lg hover:shadow-2xl transition-all relative group h-full flex flex-col">
      <div className="absolute top-3 right-3 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
        <button onClick={() => { setIsEditing(true); setActiveTab('basic'); }} className="p-1.5 text-gray-400 hover:text-blue-400 hover:bg-gray-700 rounded-lg" title="編輯路口資訊"><Edit3 size={18} /></button>
        <button onClick={() => { setIsEditing(true); setActiveTab('timing'); }} className="p-1.5 text-gray-400 hover:text-green-400 hover:bg-gray-700 rounded-lg" title="設定燈號秒數"><Timer size={18} /></button>
        <button onClick={() => onDelete(data.id)} className="p-1.5 text-gray-400 hover:text-red-400 hover:bg-gray-700 rounded-lg" title="刪除"><Trash2 size={18} /></button>
      </div>
      <div className="p-4 bg-gray-900/50 border-b border-gray-700">
        <h3 className="text-lg font-bold text-white truncate pr-20">{data.name}</h3>
        <div className="flex items-center gap-2 text-xs text-gray-400 mt-1">
          <Clock size={12} /> {data.scheduleTime}
          <span className="text-gray-700">|</span>
          <span className={status === 'active' ? 'text-green-500' : 'text-gray-500'}>{status === 'active' ? '● 排程進行中' : '○ 待機模式'}</span>
        </div>
      </div>
      <div className="p-5 flex items-center justify-between flex-grow">
        <div className="bg-black p-3 rounded-2xl border border-gray-800 flex gap-2 shadow-inner">
          <div className={getLightClass('red')}></div>
          <div className={getLightClass('yellow')}></div>
          <div className={getLightClass('green')}></div>
        </div>
        <div className="text-right">
          {status === 'active' ? (
            <div>
              <div className="text-4xl font-mono font-bold text-white tabular-nums">{timeLeft}</div>
              <div className="text-xs text-green-400 font-bold uppercase tracking-wider flex items-center justify-end gap-1"><Activity size={12} /> RUNNING</div>
            </div>
          ) : (
            <div>
              <div className="text-3xl font-mono font-bold text-gray-600">--</div>
              <div className="text-xs text-yellow-500/80 font-bold uppercase tracking-wider flex items-center justify-end gap-1"><Power size={12} /> STANDBY</div>
            </div>
          )}
        </div>
      </div>
      <div className="px-4 py-2 bg-gray-900/30 text-xs text-gray-500 flex justify-between border-t border-gray-700/50">
        <span className="flex items-center gap-1"><div className="w-1.5 h-1.5 rounded-full bg-green-500"></div> {data.durations?.green || 0}s</span>
        <span className="flex items-center gap-1"><div className="w-1.5 h-1.5 rounded-full bg-yellow-500"></div> {data.durations?.yellow || 0}s</span>
        <span className="flex items-center gap-1"><div className="w-1.5 h-1.5 rounded-full bg-red-500"></div> {data.durations?.red || 0}s</span>
      </div>
    </div>
  );
};

// ==========================================
// 3. 主管理介面
// ==========================================
const MultiTrafficManager = () => {
  const getCurrentTimeStr = () => new Date().toTimeString().split(' ')[0];

  const [lights, setLights] = useState(() => {
    try {
      const saved = localStorage.getItem('trafficLightsData');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      console.error("讀取存檔失敗:", e);
      return [];
    }
  });

  const [isCreating, setIsCreating] = useState(false);
  const [creationTab, setCreationTab] = useState('basic'); // 新增: 建立視窗的分頁狀態
  const [newName, setNewName] = useState('');
  const [newSchedule, setNewSchedule] = useState(getCurrentTimeStr());
  const [newDurations, setNewDurations] = useState({ green: 15, yellow: 3, red: 15 }); // 新增: 新路口的秒數狀態
  const [isLocating, setIsLocating] = useState(false);
  const [isRecordingNew, setIsRecordingNew] = useState(false); // 新增: 建立視窗的錄製狀態
  const [gpsMsg, setGpsMsg] = useState({ text: '', type: '' });

  useEffect(() => {
    localStorage.setItem('trafficLightsData', JSON.stringify(lights));
  }, [lights]);

  const handleCreate = () => {
    if (!newName.trim()) return;
    const newLight = {
      id: Date.now(),
      name: newName,
      scheduleTime: newSchedule,
      durations: newDurations // 使用狀態中的秒數
    };
    setLights([...lights, newLight]);
    
    // 重置所有狀態
    setIsCreating(false);
    setNewName('');
    setNewSchedule(getCurrentTimeStr());
    setNewDurations({ green: 15, yellow: 3, red: 15 });
    setCreationTab('basic');
    setIsRecordingNew(false);
    setGpsMsg({ text: '', type: '' });
  };

  const handleGPS = () => {
    setIsLocating(true);
    setGpsMsg({ text: '正在請求位置權限...', type: 'info' });
    
    getLocationName(
      (status) => setGpsMsg({ text: status, type: 'info' }),
      (name) => {
        setNewName(name);
        setIsLocating(false);
        setGpsMsg({ text: '定位成功！', type: 'success' });
      },
      (errMessage) => {
        setGpsMsg({ text: errMessage, type: 'error' });
        setIsLocating(false);
      }
    );
  };

  const deleteLight = (id) => setLights(lights.filter(l => l.id !== id));
  const updateLight = (id, data) => setLights(lights.map(l => l.id === id ? data : l));

  return (
    <div className="min-h-screen bg-gray-950 text-white font-sans p-6 md:p-10">
      <div className="max-w-6xl mx-auto mb-8 flex flex-col md:flex-row justify-between items-start md:items-end gap-4 border-b border-gray-800 pb-6">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-indigo-400 to-cyan-300 text-transparent bg-clip-text">智慧路口中控台 V3</h1>
          <p className="text-gray-400 mt-2 text-sm">已設定 {lights.length} 個路口 | 資料自動儲存於本機</p>
        </div>
        {!isCreating && (
          <button onClick={() => { setIsCreating(true); setNewSchedule(getCurrentTimeStr()); }} className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-3 rounded-xl font-bold shadow-lg shadow-indigo-900/20 transition-all active:scale-95"><Plus size={20} /> 快速新增路口</button>
        )}
      </div>

      {isCreating && (
        <div className="max-w-xl mx-auto bg-gray-900 border border-gray-700 rounded-3xl overflow-hidden mb-10 shadow-2xl relative animate-in fade-in slide-in-from-top-4">
          {/* Header */}
          <div className="bg-gray-800/50 border-b border-gray-700 p-4 flex justify-between items-center">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <MapPin className="text-indigo-400" /> 建立新路口
            </h2>
            <button onClick={() => { setIsCreating(false); setGpsMsg({text:'', type:''}); }} className="text-gray-500 hover:text-white"><X size={24} /></button>
          </div>

          {/* Tabs */}
          <div className="flex text-sm bg-gray-800/30 border-b border-gray-700">
            <button onClick={() => setCreationTab('basic')} className={`flex-1 py-3 text-center transition-colors font-medium ${creationTab === 'basic' ? 'bg-gray-800 text-blue-400 border-b-2 border-blue-400' : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800'}`}>基礎資訊</button>
            <button onClick={() => setCreationTab('timing')} className={`flex-1 py-3 text-center transition-colors font-medium ${creationTab === 'timing' ? 'bg-gray-800 text-green-400 border-b-2 border-green-400' : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800'}`}>燈號秒數</button>
          </div>

          <div className="p-6 min-h-[250px] flex flex-col justify-center">
            {creationTab === 'basic' && (
              <div className="space-y-6 animate-in fade-in slide-in-from-left-4 duration-300">
                <div>
                  <label className="block text-gray-400 text-sm mb-2">路口名稱</label>
                  <div className="flex gap-2">
                    <input autoFocus type="text" placeholder="例如: 市政路與文心路口" value={newName} onChange={e => setNewName(e.target.value)} className="flex-1 bg-black border border-gray-700 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-indigo-500 outline-none" />
                    <button onClick={handleGPS} disabled={isLocating} className="px-4 bg-gray-800 hover:bg-indigo-600 rounded-xl text-white transition-colors disabled:opacity-50 flex items-center justify-center min-w-[3rem]" title="使用 GPS 自動填入">
                      {isLocating ? <Loader2 size={20} className="animate-spin" /> : <Locate size={20} />}
                    </button>
                  </div>
                  {gpsMsg.text && (
                    <div className={`text-sm mt-2 flex items-center gap-1 ${gpsMsg.type === 'error' ? 'text-red-400' : gpsMsg.type === 'success' ? 'text-green-400' : 'text-blue-400'}`}>
                      {gpsMsg.type === 'error' && <AlertCircle size={14} />}
                      {gpsMsg.text}
                    </div>
                  )}
                </div>
                <div>
                  <label className="block text-gray-400 text-sm mb-2">每日啟動時間</label>
                  <input type="time" step="1" value={newSchedule} onChange={e => setNewSchedule(e.target.value)} className="w-full bg-black border border-gray-700 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-indigo-500 outline-none" />
                </div>
              </div>
            )}

            {creationTab === 'timing' && (
              <div className="animate-in fade-in slide-in-from-right-4 duration-300">
                {isRecordingNew ? (
                  <InlineRecorder 
                    onStart={() => {
                      // 錄製開始時，自動更新時間為現在
                      const nowStr = new Date().toTimeString().split(' ')[0];
                      setNewSchedule(nowStr);
                    }}
                    onComplete={(d) => { setNewDurations(d); setIsRecordingNew(false); }} 
                    onCancel={() => setIsRecordingNew(false)} 
                  />
                ) : (
                  <>
                    <div className="grid grid-cols-3 gap-4 mb-6">
                      <div className="text-center"><label className="text-xs text-green-500 block mb-2">綠燈 (s)</label><input type="number" min="1" value={newDurations.green} onChange={(e) => setNewDurations({...newDurations, green: Math.max(1, parseInt(e.target.value)||0)})} className="w-full bg-green-900/20 border border-green-800 rounded px-2 py-3 text-center text-white focus:border-green-500 outline-none text-lg font-bold"/></div>
                      <div className="text-center"><label className="text-xs text-yellow-500 block mb-2">黃燈 (s)</label><input type="number" min="1" value={newDurations.yellow} onChange={(e) => setNewDurations({...newDurations, yellow: Math.max(1, parseInt(e.target.value)||0)})} className="w-full bg-yellow-900/20 border border-yellow-800 rounded px-2 py-3 text-center text-white focus:border-yellow-500 outline-none text-lg font-bold"/></div>
                      <div className="text-center"><label className="text-xs text-red-500 block mb-2">紅燈 (s)</label><input type="number" min="1" value={newDurations.red} onChange={(e) => setNewDurations({...newDurations, red: Math.max(1, parseInt(e.target.value)||0)})} className="w-full bg-red-900/20 border border-red-800 rounded px-2 py-3 text-center text-white focus:border-red-500 outline-none text-lg font-bold"/></div>
                    </div>
                    <div className="flex items-center gap-2 my-4 before:content-[''] before:h-px before:flex-1 before:bg-gray-700 after:content-[''] after:h-px after:flex-1 after:bg-gray-700"><span className="text-xs text-gray-500">或</span></div>
                    <button onClick={() => setIsRecordingNew(true)} className="w-full py-3 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-xl text-sm flex items-center justify-center gap-2 transition-colors"><MousePointerClick size={16} /> 互動式錄製秒數</button>
                  </>
                )}
              </div>
            )}
          </div>

          <div className="p-4 bg-gray-800/50 border-t border-gray-700 flex gap-3">
            <button onClick={() => { setIsCreating(false); setGpsMsg({text:'', type:''}); }} className="flex-1 py-3 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-xl font-bold">取消</button>
            <button onClick={handleCreate} disabled={!newName.trim()} className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-xl font-bold shadow-lg">建立路口</button>
          </div>
        </div>
      )}

      <div className="max-w-6xl mx-auto">
        {lights.length === 0 && !isCreating ? (
          <div className="text-center py-20 text-gray-500 bg-gray-900/30 rounded-3xl border border-gray-800 border-dashed">
            <Activity className="w-16 h-16 mx-auto mb-4 opacity-20" />
            <p className="text-xl font-medium">系統閒置中</p>
            <p className="text-sm mt-2">點擊上方按鈕開始管理路口</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {lights.map(light => (
              <TrafficLightCard key={light.id} data={light} onDelete={deleteLight} onUpdate={updateLight} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default MultiTrafficManager;