/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from "react";
import { 
  Brain, 
  Activity, 
  Flame, 
  Zap, 
  Sparkles, 
  ThumbsUp, 
  AlertTriangle, 
  CheckCircle2, 
  TrendingUp, 
  Gauge, 
  Lightbulb, 
  SlidersHorizontal, 
  Save, 
  Undo2,
  Clock,
  Layers,
  HelpCircle,
  TrendingDown,
  Info
} from "lucide-react";
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  ReferenceLine, 
  BarChart, 
  Bar, 
  Cell 
} from "recharts";
import { Teacher, ClassUnit, Classroom, PlanItem, Course, ConstraintViolation } from "../types";
import { SchoolScheduleConfig } from "../utils/timeSettings";

interface CognitiveLoadReportProps {
  classes: ClassUnit[];
  plans: PlanItem[];
  courses: Course[];
  config: SchoolScheduleConfig;
  onNavigate: (tab: string) => void;
}

interface DailyLoadDetail {
  day: string;
  totalPeriods: number;
  lessons: {
    periodNo: number;
    courseName: string;
    difficulty: number;
    planId: string;
    isHeavy: boolean;
  }[];
  consecutiveHeavyStreak: number;
  hasConsecutiveViolation: boolean;
  baseDifficultySum: number;
  penalty: number;
  cognitiveLoadScore: number;
  overloadStatus: "Düşük" | "Dengeli" | "Yoğun" | "Aşırı Yük";
  warnings: string[];
}

export default function CognitiveLoadReport({
  classes = [],
  plans = [],
  courses = [],
  config,
  onNavigate,
}: CognitiveLoadReportProps) {
  // Course Custom Difficulty Overrides stored in local storage
  const [courseDifficulties, setCourseDifficulties] = useState<Record<string, number>>(() => {
    const saved = localStorage.getItem("ata_custom_course_difficulties");
    if (saved) return JSON.parse(saved);
    
    // Fallback to course's static difficulties or initial mappings
    const initial: Record<string, number> = {};
    courses.forEach(c => {
      initial[c.id] = c.zorlukDerecesi || 3;
    });
    return initial;
  });

  const [selectedClassId, setSelectedClassId] = useState<string>(classes[0]?.id || "");
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Sync state if courses change
  useEffect(() => {
    setCourseDifficulties(prev => {
      const updated = { ...prev };
      let updatedAny = false;
      courses.forEach(c => {
        if (updated[c.id] === undefined) {
          updated[c.id] = c.zorlukDerecesi || 3;
          updatedAny = true;
        }
      });
      return updatedAny ? updated : prev;
    });
  }, [courses]);

  const handleDifficultyChange = (courseId: string, val: number) => {
    setCourseDifficulties(prev => ({
      ...prev,
      [courseId]: val
    }));
  };

  const handleSaveDifficulties = () => {
    localStorage.setItem("ata_custom_course_difficulties", JSON.stringify(courseDifficulties));
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2000);
  };

  const handleResetDifficulties = () => {
    const initial: Record<string, number> = {};
    courses.forEach(c => {
      initial[c.id] = c.zorlukDerecesi || 3;
    });
    setCourseDifficulties(initial);
    localStorage.removeItem("ata_custom_course_difficulties");
  };

  // Helper to fetch difficulty
  const getDifficulty = (courseId: string) => {
    return courseDifficulties[courseId] || 3;
  };

  const getCourseObj = (planDersId: string) => {
    return courses.find(c => c.id === planDersId);
  };

  const bgConfigActiveDays = config.activeDays || ["Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma"];

  // Core Function: Calculates Cognitive Load for a specific Class across the week
  const calculateClassLoad = (cls: ClassUnit): DailyLoadDetail[] => {
    const classPlans = plans.filter(p => p.sinifId === cls.id && p.planTuru !== "Boş Periyot");

    return bgConfigActiveDays.map(day => {
      // Find plans for this class and active day
      const dayPlans = classPlans.filter(p => p.periyotId.startsWith(day + "-"));
      
      // Sort plans by period number
      const lessons = dayPlans.map(p => {
        const periodNo = parseInt(p.periyotId.split("-")[1], 10) || 1;
        const course = getCourseObj(p.dersId);
        const difficulty = course ? getDifficulty(course.id) : 3;
        return {
          periodNo,
          courseName: course ? course.dersAdi : "Bilinmeyen Ders",
          difficulty,
          planId: p.id,
          isHeavy: difficulty >= 4
        };
      }).sort((a, b) => a.periodNo - b.periodNo);

      // Max period active for today
      let maxPeriod = 8;
      if (config.longDays.includes(day)) {
        maxPeriod = 12; // Example long day period count
      }

      // Analyze consecutive heavy streaks
      let consecutiveHeavy = 0;
      let maxConsecutiveHeavy = 0;
      let hasConsecutiveViolation = false;
      const warnings: string[] = [];

      // Scan period-by-period sequentially
      const lessonByPeriodMap: Record<number, typeof lessons[0]> = {};
      lessons.forEach(l => {
        lessonByPeriodMap[l.periodNo] = l;
      });

      const maxConfiguredPeriod = Math.max(...lessons.map(l => l.periodNo), 8);

      for (let p = 1; p <= maxConfiguredPeriod; p++) {
        // Lunch Break resets consecutive count
        if (config.ogleArasiPeriyotNo !== undefined && p === config.ogleArasiPeriyotNo) {
          consecutiveHeavy = 0;
        }

        const lesson = lessonByPeriodMap[p];
        if (lesson && lesson.isHeavy) {
          consecutiveHeavy++;
          if (consecutiveHeavy > maxConsecutiveHeavy) {
            maxConsecutiveHeavy = consecutiveHeavy;
          }
          if (consecutiveHeavy >= 3) {
            hasConsecutiveViolation = true;
          }
        } else {
          // Break/light lesson resets consecutive heavy streak
          consecutiveHeavy = 0;
        }
      }

      // Calculate Sum & Penalties
      const baseDifficultySum = lessons.reduce((sum, l) => sum + l.difficulty, 0);
      let penalty = 0;
      if (maxConsecutiveHeavy >= 3) {
        // 4 load points added for each back-to-back heavy hour starting from the 3rd hour
        penalty = (maxConsecutiveHeavy - 2) * 5;
      }

      const cognitiveLoadScore = baseDifficultySum + penalty;

      // Status mapping
      // Düşük < 10, Dengeli: 10-22, Yoğun: 23-30, Aşırı Yük > 30
      let overloadStatus: DailyLoadDetail["overloadStatus"] = "Dengeli";
      if (cognitiveLoadScore < 10) overloadStatus = "Düşük";
      else if (cognitiveLoadScore <= 22) overloadStatus = "Dengeli";
      else if (cognitiveLoadScore <= 30) overloadStatus = "Yoğun";
      else overloadStatus = "Aşırı Yük";

      if (hasConsecutiveViolation) {
        warnings.push(`Pedagojik İhlal: Üst üste ağır dersler (${maxConsecutiveHeavy} saat ardışık $\ge 4$ zorluk). Önerilen sınır: En fazla 2.`);
      }
      if (cognitiveLoadScore > 30) {
        warnings.push(`Kritik Yoğunluk: Günlük toplam zihinsel yük seviyesi aşırı kritik (${cognitiveLoadScore} puan).`);
      }
      if (lessons.length > 8) {
        warnings.push(`Zaman Aşımı: Günlük ${lessons.length} saat ders planlanmış. Zihinsel yorulma riski.`);
      }

      return {
        day,
        totalPeriods: lessons.length,
        lessons,
        consecutiveHeavyStreak: maxConsecutiveHeavy,
        hasConsecutiveViolation,
        baseDifficultySum,
        penalty,
        cognitiveLoadScore,
        overloadStatus,
        warnings
      };
    });
  };

  // Compile calculations for all classes
  const classesAnalysis = classes.map(cls => {
    const dailyReport = calculateClassLoad(cls);
    const avgLoad = dailyReport.reduce((acc, d) => acc + d.cognitiveLoadScore, 0) / (dailyReport.length || 1);
    const maxLoad = Math.max(...dailyReport.map(d => d.cognitiveLoadScore));
    const totalViolations = dailyReport.filter(d => d.hasConsecutiveViolation).length;
    const overloadedDays = dailyReport.filter(d => d.cognitiveLoadScore > 22).length;
    
    return {
      classObj: cls,
      dailyReport,
      avgLoad,
      maxLoad,
      totalViolations,
      overloadedDays,
      status: avgLoad > 22 ? "⚠️ Yoğun" : avgLoad < 10 ? "🟢 Düşük" : "⚡ Dengeli"
    };
  });

  // Global statistical counters
  const totalOverloadedClasses = classesAnalysis.filter(c => c.overloadedDays > 0).length;
  const totalConsecutiveViolations = classesAnalysis.reduce((sum, c) => sum + c.totalViolations, 0);
  const schoolAverageCognitiveLoad = classesAnalysis.reduce((sum, c) => sum + c.avgLoad, 0) / (classesAnalysis.length || 1);

  const selectedAnalysis = classesAnalysis.find(c => c.classObj.id === selectedClassId) || classesAnalysis[0];

  // Advisor logic engine: reads the current class's schedule and comes up with precise balancing tips
  const generatePedagogicalRecommendations = (): string[] => {
    if (!selectedAnalysis) return [];
    const recs: string[] = [];
    const report = selectedAnalysis.dailyReport;
    const className = selectedAnalysis.classObj.sinifAdi;

    const highDays = report.filter(r => r.cognitiveLoadScore > 22);
    const lowDays = report.filter(r => r.cognitiveLoadScore < 10 && r.totalPeriods < 4);

    if (highDays.length > 0 && lowDays.length > 0) {
      recs.push(`🔄 Sınıf genelinde dengesiz dağılım mevcut. ${highDays.map(d => d.day).join(", ")} günleri aşırı yoğun yük altındayken, ${lowDays.map(d => d.day).join(", ")} günleri oldukça boş. Ders yükünün bir kısmını hafif günlere kaydırmayı değerlendirin.`);
    }

    report.forEach(r => {
      if (r.hasConsecutiveViolation) {
        const heavyLessonsList = r.lessons.filter(l => l.isHeavy).map(l => l.courseName);
        const uniqueHeavy = Array.from(new Set(heavyLessonsList));
        recs.push(`📌 ${r.day} günü planlanan ${uniqueHeavy.join(", ")} dersleri ardışık şekilde yerleşmiş. Araya zorluk derecesi düşük, sözel veya sanatsal bir ders yerleştirmek (buffer) öğrencinin konsantrasyonunu yeniler.`);
      }
      
      const mathFizMatch = r.lessons.some(l => l.courseName === "Matematik") && r.lessons.some(l => l.courseName === "Fizik");
      if (mathFizMatch && r.cognitiveLoadScore > 24) {
        recs.push(`⚠️ Matematik ve Fizik aynı gün planlanmış (${r.day}). İkisi de en zor kategoride (bilişsel puan 4-5) dersler olup, aynı günde birleşmeleri 'Zihinsel Aşırı Yük' (Cognitive Overload) yaratmaktadır. Bu iki daldan birini başka güne taşımak pedagojik verimi katlar.`);
      }
    });

    if (recs.length === 0) {
      recs.push(`✅ Harika! ${className} sınıfı için pedagojik olarak kusursuz dengelenmiş bir ders planı çizilmiş. Herhangi bir ağır ders yığılması bulunmamaktadır.`);
    }

    return recs;
  };

  const adviceList = generatePedagogicalRecommendations();

  // Recharts representation formatter
  const chartData = selectedAnalysis?.dailyReport.map(r => ({
    name: r.day,
    "Bilişsel Yük Skoru": parseFloat(r.cognitiveLoadScore.toFixed(1)),
    "Önerilen Sınır": 22,
    "Zorunlu Eşik": 30,
    base: r.baseDifficultySum,
    penalty: r.penalty
  })) || [];

  return (
    <div className="space-y-6" id="cognitive-load-dashboard-report">
      {/* Page Title Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
        <div>
          <h2 className="text-xl font-bold text-slate-900 font-sans flex items-center gap-2">
            <Brain className="w-5 h-5 text-indigo-600 animate-pulse" />
            Class Bilişsel Yük (Cognitive Load) Raporu
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Zor derslerin ardı ardına gelmesiyle oluşan pedagojik aşırı yükleri (Cognitive Overload) ölçer ve program dengesini optimize etmeniz için veri sunar.
          </p>
        </div>
        
        {/* Class switcher */}
        <div className="flex items-center gap-2 self-stretch md:self-auto">
          <label className="text-xs font-bold text-slate-600 uppercase tracking-wider shrink-0">Aktif Şube:</label>
          <select
            value={selectedClassId}
            onChange={(e) => setSelectedClassId(e.target.value)}
            className="text-xs font-semibold text-slate-800 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 outline-none focus:ring-1 focus:ring-indigo-500 max-w-xs w-full"
          >
            {classes.map(cls => (
              <option key={cls.id} value={cls.id}>
                {cls.sinifAdi} ({cls.merkez})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Bento Grid Analytics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* School Load index */}
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-slate-500 text-xs font-semibold uppercase tracking-wider">Kurum Ortalama Bilişsel Yükü</span>
            <h3 className="text-2xl font-bold text-slate-900 font-sans">{schoolAverageCognitiveLoad.toFixed(1)} / 50</h3>
            <span className="inline-flex items-center gap-1.5 text-xs text-emerald-600 font-medium">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Pedagojik Limitlerde (Limit &lt; 22)
            </span>
          </div>
          <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
            <Gauge className="w-6 h-6" />
          </div>
        </div>

        {/* Risk Classes index */}
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-slate-500 text-xs font-semibold uppercase tracking-wider">Dengesiz Dağılımlı Sınıflar</span>
            <h3 className={`text-2xl font-bold font-sans ${totalOverloadedClasses > 0 ? "text-amber-600" : "text-slate-900"}`}>
              {totalOverloadedClasses} Sınıf / Şube
            </h3>
            <span className="text-xs text-slate-500">Ağır/Yoğun günleri barındıran</span>
          </div>
          <div className="p-3 bg-amber-50 text-amber-600 rounded-xl">
            <Flame className="w-6 h-6" />
          </div>
        </div>

        {/* Block Violations count */}
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-slate-500 text-xs font-semibold uppercase tracking-wider">Ardışık Ağır Yük İhlalleri</span>
            <h3 className={`text-2xl font-bold font-sans ${totalConsecutiveViolations > 0 ? "text-rose-600 animate-pulse" : "text-emerald-600"}`}>
              {totalConsecutiveViolations} İhlal Tespit Edildi
            </h3>
            <span className="text-xs text-slate-400">Arka arkaya 3+ ağır ders</span>
          </div>
          <div className="p-3 bg-rose-50 text-rose-600 rounded-xl">
            <AlertTriangle className="w-6 h-6" />
          </div>
        </div>

        {/* Total Buffer Classes */}
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-slate-500 text-xs font-semibold uppercase tracking-wider">Sınıf Zihinsel Konfor Durumu</span>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold leading-none bg-emerald-50 text-emerald-700 border border-emerald-200 mt-2">
              <CheckCircle2 className="w-3.5 h-3.5" />
              {selectedAnalysis?.status === "🟢 Düşük" ? "Hafif / Rahat Program" : selectedAnalysis?.status === "⚠️ Yoğun" ? "Zihinsel Alarm" : "Dengeli ve Kararlı"}
            </span>
            <p className="text-[10px] text-slate-400 mt-1">Seçili şube ortalama: {selectedAnalysis?.avgLoad.toFixed(1)}</p>
          </div>
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
            <ThumbsUp className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Main Split Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Aspect: Graphic Visualization and Calendar Daily breakdown */}
        <div className="lg:col-span-8 space-y-6">
          
          {/* Recharts Area Chart of Class Cognitive Load */}
          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-sm font-bold text-slate-900 font-sans">
                  {selectedAnalysis?.classObj.sinifAdi} Günlük Bilişsel Yük Profili
                </h3>
                <p className="text-[11px] text-slate-500">Haftalık günlere göre dalgalanan zihinsel yorgunluk endeksi.</p>
              </div>
              <div className="flex items-center gap-4 text-[10px] font-semibold text-slate-600">
                <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 bg-indigo-500 rounded-full"></span> Bilişsel Yük</span>
                <span className="flex items-center gap-1"><span className="w-2.5 h-0.5 bg-emerald-500 inline-block border-t border-dashed"></span> Dengeli Limit</span>
                <span className="flex items-center gap-1"><span className="w-2.5 h-0.5 bg-rose-500 inline-block"></span> Kritik Sınır</span>
              </div>
            </div>

            <div className="h-64 mt-4">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                  <defs>
                    <linearGradient id="gradientLoad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} tickLine={false} />
                  <YAxis domain={[0, 45]} stroke="#94a3b8" fontSize={11} tickLine={false} />
                  <Tooltip 
                    contentStyle={{ borderRadius: "12px", border: "1px solid #e2e8f0", boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.05)" }}
                    formatter={(value: any, name: string) => {
                      if (name === "Bilişsel Yük Skoru") return [`${value} Puan`, name];
                      return [value, name];
                    }}
                  />
                  <ReferenceLine y={22} label={{ value: "Dengeli", fill: "#059669", position: "insideBottomRight", fontSize: 10 }} stroke="#10b981" strokeDasharray="4 4" />
                  <ReferenceLine y={30} label={{ value: "Kritik", fill: "#dc2626", position: "insideTopRight", fontSize: 10 }} stroke="#ef4444" strokeWidth={1} />
                  <Area type="monotone" dataKey="Bilişsel Yük Skoru" stroke="#4f46e5" strokeWidth={2.5} fillOpacity={1} fill="url(#gradientLoad)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Calendar weekly details with card-level load report */}
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-sm font-bold text-slate-900 font-sans">
                  Grup Ders Dağılım Kataloğu & Günlük Yargıç
                </h3>
                <p className="text-xs text-slate-500">Günlere bölünmüş ders planı zorluk derecelendirmesi.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {selectedAnalysis?.dailyReport.map(dayRep => {
                const isHeavy = dayRep.cognitiveLoadScore > 22;
                const isOverload = dayRep.cognitiveLoadScore > 30;

                return (
                  <div 
                    key={dayRep.day} 
                    className={`border rounded-2xl p-5 shadow-sm transition-all duration-200 flex flex-col justify-between bg-white hover:shadow-md ${
                      isOverload 
                        ? "border-rose-200 ring-1 ring-rose-50" 
                        : isHeavy 
                          ? "border-amber-200" 
                          : "border-slate-100"
                    }`}
                  >
                    <div>
                      {/* Day card header */}
                      <div className="flex justify-between items-start border-b border-slate-50 pb-3 mb-3">
                        <div>
                          <h4 className="font-bold text-slate-800 text-sm font-sans">{dayRep.day}</h4>
                          <span className="text-[10px] text-slate-400 font-medium font-sans">Toplam: {dayRep.totalPeriods} Saat Ders</span>
                        </div>
                        
                        {/* Cognitive load score badge */}
                        <div className="text-right">
                          <span className={`text-xs font-bold font-mono px-2.5 py-1 rounded-xl block ${
                            isOverload 
                              ? "bg-rose-50 text-rose-700 border border-rose-200" 
                              : isHeavy 
                                ? "bg-amber-50 text-amber-700 border border-amber-200" 
                                : "bg-emerald-50 text-emerald-700 border border-emerald-150"
                          }`}>
                            {dayRep.cognitiveLoadScore} Puan
                          </span>
                          <span className="text-[8px] uppercase tracking-wider font-extrabold text-slate-400 font-sans block mt-1">
                            {dayRep.overloadStatus === "Aşırı Yük" ? "🛑 Aşırı Yük" : dayRep.overloadStatus === "Yoğun" ? "⚠️ Yoğun Plan" : dayRep.overloadStatus === "Dengeli" ? "⚡ Dengeli" : "🟢 Hafif"}
                          </span>
                        </div>
                      </div>

                      {/* Scheduled Lessons list */}
                      {dayRep.lessons.length === 0 ? (
                        <div className="py-6 text-center text-[10px] text-slate-400 italic">
                          Ders planlaması yapılmamış.
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {dayRep.lessons.map(ls => {
                            // Badge colors based on difficulty
                            let diffColor = "bg-slate-100 text-slate-600";
                            if (ls.difficulty >= 5) diffColor = "bg-rose-500 text-white font-extrabold";
                            else if (ls.difficulty >= 4) diffColor = "bg-amber-500 text-white font-bold";
                            else if (ls.difficulty >= 3) diffColor = "bg-indigo-100 text-indigo-700 font-semibold";
                            else diffColor = "bg-emerald-100 text-emerald-800";

                            return (
                              <div key={`${ls.planId}-${ls.periodNo}`} className="flex items-center justify-between p-2 rounded-xl bg-slate-50 border border-slate-100 hover:bg-slate-100/50 transition">
                                <div className="flex items-center gap-2">
                                  <span className="text-[10px] font-mono text-slate-400 bg-white border rounded w-5 h-5 flex items-center justify-center font-bold">
                                    {ls.periodNo}
                                  </span>
                                  <span className="text-xs font-bold text-slate-700 truncate max-w-[130px] font-sans">
                                    {ls.courseName}
                                  </span>
                                </div>
                                <div className="flex items-center gap-1.5 shrink-0">
                                  <span className={`text-[9px] px-2 py-0.5 rounded-full font-mono ${diffColor}`}>
                                    Yük: {ls.difficulty}
                                  </span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    {/* Meal details reset & warnings inside day card */}
                    <div className="mt-4 pt-3 border-t border-slate-50 space-y-1.5">
                      {config.ogleArasiPeriyotNo !== undefined && dayRep.totalPeriods > config.ogleArasiPeriyotNo && (
                        <span className="inline-flex items-center gap-1 text-[9px] bg-sky-50 text-sky-800 px-2 py-0.5 rounded-full border border-sky-100 font-sans">
                          <Clock className="w-3 h-3" />
                          Öğle Arası (Periyot {config.ogleArasiPeriyotNo}) - Zihinsel Boşalım
                        </span>
                      )}

                      {dayRep.warnings.map((w, idx) => (
                        <div key={idx} className="flex items-start gap-1 p-1.5 bg-rose-50 rounded-lg text-[10px] text-rose-800 font-sans border border-rose-100">
                          <AlertTriangle className="w-3.5 h-3.5 text-rose-600 shrink-0 mt-0.5" />
                          <p className="leading-tight">{w}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Aspect: Automated Advisor Suggestions & Live Course Difficulty Modifiers */}
        <div className="lg:col-span-4 space-y-6">
          
          {/* Reorganization Pedagogical Advisor Recommendations component */}
          <div className="bg-gradient-to-br from-indigo-950 to-slate-900 text-white p-6 rounded-2xl shadow-lg border border-slate-800 space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
              <Lightbulb className="w-5 h-5 text-amber-400 animate-pulse" />
              <div>
                <h3 className="font-bold text-sm text-slate-100 font-sans">Ata Rehberlik Pedagojik Önerici</h3>
                <p className="text-[10px] text-indigo-200">Zihinsel yorgunluk ve program çakışma azaltma kılavuzu.</p>
              </div>
            </div>

            <div className="space-y-3.5 max-h-[300px] overflow-y-auto pr-1">
              {adviceList.map((adv, idx) => (
                <div key={idx} className="bg-white/5 border border-white/5 p-3.5 rounded-xl text-xs space-y-1 font-sans text-slate-200 leading-relaxed hover:bg-white/10 transition">
                  <p>{adv}</p>
                </div>
              ))}
            </div>

            <div className="pt-2 border-t border-slate-800 flex justify-between items-center text-[10px] text-slate-400">
              <span>* 2026-2027 Öğrenim İlkeleri</span>
              <button 
                onClick={() => onNavigate("program")}
                className="text-amber-400 font-bold hover:underline"
              >
                Derhal Optimize Et &rsaquo;
              </button>
            </div>
          </div>

          {/* Interactive sliders for courses weight adjustment */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 space-y-4">
            <div className="flex justify-between items-center pb-2 border-b">
              <div>
                <h3 className="text-sm font-bold text-slate-900 font-sans flex items-center gap-2">
                  <SlidersHorizontal className="w-4 h-4 text-indigo-600" />
                  Bilişsel Derece Ayar Decki
                </h3>
                <p className="text-[10px] text-slate-500">Müfredat derslerinin pedagojik yorulma ağırlıklarını belirleyin.</p>
              </div>
            </div>

            {saveSuccess && (
              <div className="p-2 border border-emerald-200 bg-emerald-50 text-emerald-800 text-xs font-bold rounded-xl text-center flex items-center gap-2 justify-center">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                Derecelendirmeler Kaydedildi!
              </div>
            )}

            <div className="space-y-4 max-h-[400px] overflow-y-auto pr-1">
              {courses.map(course => {
                const diffVal = getDifficulty(course.id);
                return (
                  <div key={course.id} className="space-y-1 bg-slate-50/50 p-2.5 rounded-xl border border-slate-100">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-bold text-slate-800 truncate max-w-[140px] font-sans">{course.dersAdi}</span>
                      <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full ${
                        diffVal >= 5 
                          ? "bg-rose-100 text-rose-700" 
                          : diffVal >= 4 
                            ? "bg-amber-100 text-amber-700" 
                            : diffVal >= 3 
                              ? "bg-indigo-50 text-indigo-600" 
                              : "bg-emerald-50 text-emerald-700"
                      }`}>
                        Zorluk: {diffVal} / 5
                      </span>
                    </div>

                    <div className="flex items-center gap-2 pt-1">
                      <span className="text-[9px] text-slate-400 font-medium font-sans">Kolay</span>
                      <input
                        type="range"
                        min="1"
                        max="5"
                        step="1"
                        value={diffVal}
                        onChange={(e) => handleDifficultyChange(course.id, parseInt(e.target.value, 10))}
                        className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                      />
                      <span className="text-[9px] text-slate-400 font-medium font-sans">Zor</span>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex gap-2 pt-2 border-t">
              <button
                onClick={handleSaveDifficulties}
                className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs py-2 rounded-xl border border-indigo-400 flex items-center justify-center gap-1.5 transition"
              >
                <Save className="w-3.5 h-3.5" />
                Kaydet
              </button>
              <button
                onClick={handleResetDifficulties}
                className="bg-slate-100 hover:bg-slate-200 text-slate-600 font-semibold text-xs px-3 py-2 rounded-xl border transition"
                title="Sıfırla"
              >
                <Undo2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

        </div>

      </div>

    </div>
  );
}
