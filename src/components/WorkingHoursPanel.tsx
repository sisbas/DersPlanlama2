/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from "react";
import { 
  Calendar, 
  Clock, 
  Check, 
  HelpCircle, 
  AlertCircle, 
  RefreshCw, 
  Sliders, 
  CheckCircle,
  TrendingUp,
  SlidersHorizontal
} from "lucide-react";
import { SchoolScheduleConfig, generateSlotsForHours, getMasterTimeSlots } from "../utils/timeSettings";

const ALL_WEEK_DAYS = ["Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi", "Pazar"];

interface WorkingHoursPanelProps {
  config: SchoolScheduleConfig;
  onUpdateConfig: (newConfig: SchoolScheduleConfig) => void;
}

export default function WorkingHoursPanel({ config, onUpdateConfig }: WorkingHoursPanelProps) {
  const [activeDays, setActiveDays] = useState<string[]>(config.activeDays);
  const [longDays, setLongDays] = useState<string[]>(config.longDays);
  
  const [longStart, setLongStart] = useState(config.longDaysHours.start);
  const [longEnd, setLongEnd] = useState(config.longDaysHours.end);
  
  const [regStart, setRegStart] = useState(config.regularDaysHours.start);
  const [regEnd, setRegEnd] = useState(config.regularDaysHours.end);
  
  const [lessonDuration, setLessonDuration] = useState<number>(config.lessonDuration);
  const [recessDuration, setRecessDuration] = useState<number>(config.recessDuration);

  const [notification, setNotification] = useState<string | null>(null);

  const handleToggleDay = (day: string) => {
    if (activeDays.includes(day)) {
      if (activeDays.length > 1) {
        setActiveDays(activeDays.filter((d) => d !== day));
      }
    } else {
      setActiveDays([...activeDays, day]);
    }
  };

  const handleToggleLongDay = (day: string) => {
    if (longDays.includes(day)) {
      setLongDays(longDays.filter((d) => d !== day));
    } else {
      setLongDays([...longDays, day]);
    }
  };

  const handleResetToDefault = () => {
    setActiveDays(["Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi", "Pazar"]);
    setLongDays(["Salı", "Perşembe", "Cuma"]);
    setLongStart("08:30");
    setLongEnd("20:00");
    setRegStart("08:30");
    setRegEnd("17:00");
    setLessonDuration(40);
    setRecessDuration(10);
    
    setNotification("Varsayılan kurumsal zaman ayarları yüklendi.");
    setTimeout(() => setNotification(null), 3000);
  };

  const handleSave = () => {
    const updated: SchoolScheduleConfig = {
      activeDays,
      longDays,
      longDaysHours: { start: longStart, end: longEnd },
      regularDaysHours: { start: regStart, end: regEnd },
      lessonDuration: Number(lessonDuration) || 40,
      recessDuration: Number(recessDuration) || 10,
    };
    
    onUpdateConfig(updated);
    setNotification("Zaman çizelgesi ve işletme saatleri başarıyla kaydedildi! Haftalık periyotlar otomatik olarak güncellendi.");
    setTimeout(() => setNotification(null), 4000);
  };

  // Previews
  const sampleLongSlots = generateSlotsForHours(longStart, longEnd, lessonDuration, recessDuration);
  const sampleRegSlots = generateSlotsForHours(regStart, regEnd, lessonDuration, recessDuration);

  return (
    <div id="working-hours-panel" className="space-y-6">
      
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-indigo-850 to-slate-900 text-white rounded-2xl p-6 shadow-xl border border-indigo-950/20 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-indigo-400 font-semibold text-xs uppercase tracking-wider">
            <SlidersHorizontal className="w-4 h-4" />
            <span>Kurumsal Zaman Yönetimi</span>
          </div>
          <h2 className="text-xl font-bold font-sans tracking-tight">İşletme Saatleri & Çizelge Planlama Sistemi</h2>
          <p className="text-xs text-slate-300 max-w-xl">
            Kurumun haftalık ders günlerini, günlük çalışma saatlerini, ders döküm süresini (blok dersler) ve teneffüs aralıklarını buradan planlayabilir ve periyotları tam uyumlu hale getirebilirsiniz.
          </p>
        </div>
        <div>
          <button
            onClick={handleResetToDefault}
            className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-white px-4 py-2.5 rounded-xl text-xs font-semibold border border-slate-700 transition"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Varsayılana Sıfırla
          </button>
        </div>
      </div>

      {notification && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-4 rounded-xl flex items-center gap-2.5 text-xs font-medium animate-fade-in shadow-sm">
          <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{notification}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: Inputs & Choices */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Section 1: Working Days */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200/80 space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
              <Calendar className="w-4 h-4 text-indigo-600" />
              <h3 className="font-bold text-sm text-slate-950">1. Haftalık Aktif Günler</h3>
            </div>
            
            <p className="text-xs text-slate-500">
              Kurumunun haftanın hangi günlerinde açık ve ders planlamasına açık olduğunu belirleyin:
            </p>

            <div className="flex flex-wrap gap-2.5 py-1">
              {ALL_WEEK_DAYS.map((day) => {
                const isActive = activeDays.includes(day);
                return (
                  <button
                    key={day}
                    onClick={() => handleToggleDay(day)}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
                      isActive
                        ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/10 border border-indigo-600"
                        : "bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200"
                    }`}
                  >
                    {isActive && <Check className="w-3.5 h-3.5" />}
                    {day}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Section 2: Lesson Block & Break Duration Settings */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200/80 space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
              <Clock className="w-4 h-4 text-indigo-600" />
              <h3 className="font-bold text-sm text-slate-950">2. Ders & Mola Blok Süreleri</h3>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block">
                  Ders Blok Süresi (Dakika)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="10"
                    max="180"
                    value={lessonDuration}
                    onChange={(e) => setLessonDuration(parseInt(e.target.value) || 0)}
                    className="w-full text-xs font-semibold p-3 border border-slate-200 rounded-xl bg-slate-50/50 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none pr-12"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] uppercase font-bold text-slate-400">
                    Dakika
                  </span>
                </div>
                <p className="text-[10px] text-slate-400 leading-tight">
                  Tavsiye edilen standart ders bloğu süresi 40 dakikadır.
                </p>
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block">
                  Teneffüs (Mola-Ara) Süresi (Dakika)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    max="60"
                    value={recessDuration}
                    onChange={(e) => setRecessDuration(parseInt(e.target.value) || 0)}
                    className="w-full text-xs font-semibold p-3 border border-slate-200 rounded-xl bg-slate-50/50 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none pr-12"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] uppercase font-bold text-slate-400">
                    Dakika
                  </span>
                </div>
                <p className="text-[10px] text-slate-400 leading-tight">
                  Her ders bloğu arasında uygulanacak dinlenme süresidir (Tavsiye edilen: 10 dk).
                </p>
              </div>
            </div>
          </div>

          {/* Section 3: Daily Working Hours */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200/80 space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
              <Sliders className="w-4 h-4 text-indigo-600" />
              <h3 className="font-bold text-sm text-slate-950">3. Çalışma & İşletme Saatleri</h3>
            </div>

            <p className="text-xs text-slate-500 leading-relaxed">
              Belirli günlerde kurum daha uzun süre açık kalabilir (Örn: Haftasonu ve yoğun günler). Salı, Perşembe ve Cuma günleri için geç saatlere özel çalışma aralığı ayarlayabilirsiniz:
            </p>

            {/* Special Long Days Toggles */}
            <div className="space-y-1.5">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Geç Kapanış Günleri (Örn: Salı, Perşembe, Cuma)
              </span>
              <div className="flex flex-wrap gap-2 pt-1 border border-dashed border-slate-200 p-2.5 rounded-xl bg-slate-50/20">
                {activeDays.map((day) => {
                  const isLong = longDays.includes(day);
                  return (
                    <button
                      key={day}
                      onClick={() => handleToggleLongDay(day)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                        isLong
                          ? "bg-amber-150 text-amber-900 border border-amber-300"
                          : "bg-white text-slate-500 hover:bg-slate-50 border border-slate-200"
                      }`}
                    >
                      {day} {isLong ? "🔥 (Geç)" : ""}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Time Settings Inputs */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
              {/* Long Days hours block */}
              <div className="p-3 border border-slate-200 rounded-xl bg-slate-50/50 space-y-3">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
                  <span className="text-xs font-bold text-slate-800">Geç Kapanış Günleri Saatleri</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <span className="text-[10px] text-slate-400 block font-semibold">Giriş Saati</span>
                    <input
                      type="text"
                      placeholder="08:30"
                      value={longStart}
                      onChange={(e) => setLongStart(e.target.value)}
                      className="w-full text-xs font-bold p-2 border border-slate-200 rounded-lg bg-white"
                    />
                  </div>
                  <div className="space-y-1">
                    <span className="text-[10px] text-slate-400 block font-semibold">Çıkış Saati</span>
                    <input
                      type="text"
                      placeholder="20:00"
                      value={longEnd}
                      onChange={(e) => setLongEnd(e.target.value)}
                      className="w-full text-xs font-bold p-2 border border-slate-200 rounded-lg bg-white"
                    />
                  </div>
                </div>
                <div className="text-[10px] text-slate-400">
                  Önerilen işletim saatleri: <strong className="text-slate-600">08:30 - 20:00</strong>
                </div>
              </div>

              {/* Regular Days hours block */}
              <div className="p-3 border border-slate-200 rounded-xl bg-slate-50/50 space-y-3">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-indigo-500"></span>
                  <span className="text-xs font-bold text-slate-800">Diğer Günler Çalışma Saatleri</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <span className="text-[10px] text-slate-400 block font-semibold">Giriş Saati</span>
                    <input
                      type="text"
                      placeholder="08:30"
                      value={regStart}
                      onChange={(e) => setRegStart(e.target.value)}
                      className="w-full text-xs font-bold p-2 border border-slate-200 rounded-lg bg-white"
                    />
                  </div>
                  <div className="space-y-1">
                    <span className="text-[10px] text-slate-400 block font-semibold">Çıkış Saati</span>
                    <input
                      type="text"
                      placeholder="17:00"
                      value={regEnd}
                      onChange={(e) => setRegEnd(e.target.value)}
                      className="w-full text-xs font-bold p-2 border border-slate-200 rounded-lg bg-white"
                    />
                  </div>
                </div>
                <div className="text-[10px] text-slate-400">
                  Önerilen standart çalışma saatleri: <strong className="text-slate-600">08:30 - 17:00</strong>
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              onClick={handleSave}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs font-sans px-8 py-3.5 rounded-xl shadow-lg shadow-indigo-600/20 hover:shadow-indigo-600/30 transition flex items-center gap-2"
            >
              <Check className="w-4 h-4" />
              Zaman Planlamasını Uygula & Kaydet
            </button>
          </div>

        </div>

        {/* Right Column: Previews, Analytics & Quick Stats */}
        <div className="space-y-6">
          
          {/* Preview Panel */}
          <div className="bg-slate-900 text-white rounded-2xl p-6 shadow-md border border-slate-800 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-emerald-400 animate-spin-slow" />
                <h3 className="font-bold text-sm">Canlı Çizelge Analizi</h3>
              </div>
              <span className="text-[9px] bg-emerald-500/10 text-emerald-400 font-extrabold px-1.5 py-0.5 rounded uppercase">
                Aktif
              </span>
            </div>

            <div className="space-y-4">
              
              {/* Stats values */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-slate-850 p-3 rounded-xl border border-slate-800 flex flex-col justify-between">
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
                    Geç Gün Periyot
                  </span>
                  <span className="text-2xl font-black text-amber-400 font-mono mt-1">
                    {sampleLongSlots.length} <span className="text-xs font-normal">Ders</span>
                  </span>
                  <span className="text-[9px] text-slate-500 mt-0.5 leading-none">
                    {longStart} - {longEnd} arası
                  </span>
                </div>

                <div className="bg-slate-850 p-3 rounded-xl border border-slate-800 flex flex-col justify-between">
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
                    Standart Periyot
                  </span>
                  <span className="text-2xl font-black text-indigo-400 font-mono mt-1">
                    {sampleRegSlots.length} <span className="text-xs font-normal">Ders</span>
                  </span>
                  <span className="text-[9px] text-slate-500 mt-0.5 leading-none">
                    {regStart} - {regEnd} arası
                  </span>
                </div>
              </div>

              {/* Dynamic preview list */}
              <div className="space-y-2">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Günlük generated Akış Detayları
                </span>
                
                <div className="space-y-2 mt-1 max-h-[300px] overflow-y-auto pr-1">
                  {ALL_WEEK_DAYS.map((day) => {
                    const isActive = activeDays.includes(day);
                    const isLong = longDays.includes(day);
                    
                    if (!isActive) {
                      return (
                        <div key={day} className="flex justify-between items-center text-xs p-2.5 rounded-xl bg-slate-850/40 border border-slate-900 text-slate-500 line-through">
                          <span className="font-bold">{day}</span>
                          <span className="text-[10px] font-bold text-rose-500/80 uppercase">Kurum Kapalı</span>
                        </div>
                      );
                    }

                    const slotsCount = isLong ? sampleLongSlots.length : sampleRegSlots.length;
                    const endPlannedTime = isLong ? longEnd : regEnd;
                    
                    return (
                      <div 
                        key={day} 
                        className={`text-xs p-2.5 rounded-xl flex items-center justify-between border transition ${
                          isLong 
                            ? "bg-amber-950/20 border-amber-900/30 text-slate-200" 
                            : "bg-slate-850/80 border-slate-800 text-slate-200"
                        }`}
                      >
                        <div>
                          <div className="font-bold flex items-center gap-1.5 text-xs text-white">
                            <span>{day}</span>
                            {isLong && (
                              <span className="bg-amber-400 text-slate-950 text-[8px] font-extrabold px-1 rounded uppercase tracking-wider">
                                Geç Gün
                              </span>
                            )}
                          </div>
                          <div className="text-[10px] text-slate-400 mt-0.5 font-mono">
                            {isLong ? longStart : regStart} - {endPlannedTime} | {lessonDuration}dk ders + {recessDuration}dk ara
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="text-xs font-bold font-mono text-indigo-300 bg-white/5 py-1 px-2.5 rounded-md border border-white/5">
                            {slotsCount} Periyot
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

            </div>
          </div>

          {/* Quick Warning/Rule */}
          <div className="bg-amber-50 border border-amber-200 p-4 rounded-2xl flex gap-3 text-xs text-amber-850 leading-relaxed">
            <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold">Önemli Çakışma Önleme Notu:</span>
              <p className="mt-1 text-[11px] text-amber-700/90 font-medium">
                Süreyi değiştirip kaydettiğinizde, eski ders programı kayıtları yeni periyot saatlerine otomatik olarak adapte edilir. Eğer eski periyot sayısı yenisinden fazla ise ve dersler dışarıda kalırsa, "Zorunlu Kural İhlali" uyarı sistemi çakışmaları anında algılayarak Ders Programı Editör panelinde size gösterecektir.
              </p>
            </div>
          </div>

        </div>

      </div>

    </div>
  );
}
