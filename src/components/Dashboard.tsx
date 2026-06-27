/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, FormEvent } from "react";
import { 
  Users, 
  UserCheck, 
  BookOpen, 
  Calendar, 
  AlertTriangle, 
  GraduationCap, 
  Activity, 
  CheckCircle,
  Clock,
  Search,
  Sliders,
  Check,
  TrendingUp,
  FileText,
  Info,
  ChevronRight,
  Plus,
  Minus,
  Briefcase,
  HelpCircle,
  Layers,
  Sparkles
} from "lucide-react";
import { Teacher, ClassUnit, Classroom, Exam, CounselingSession, ConstraintViolation, PlanItem, Course } from "../types";
import { CURRICULUM_TEMPLATES } from "../data/initialData";
import { SchoolScheduleConfig, DEFAULT_SCHEDULE_CONFIG } from "../utils/timeSettings";
import CognitiveLoadReport from "./CognitiveLoadReport";
import TeacherLimitReport from "./TeacherLimitReport";

interface DashboardProps {
  teachers: Teacher[];
  classes: ClassUnit[];
  classrooms: Classroom[];
  exams: Exam[];
  counselings: CounselingSession[];
  violations: ConstraintViolation[];
  onNavigate: (tab: string, params?: { targetPlanIds?: string[] }) => void;
  onUpdateClasses?: (classes: ClassUnit[]) => void;
  plans?: PlanItem[];
  courses?: Course[];
  config?: SchoolScheduleConfig;
}

// All possible curriculum subjects that can be assigned
const SYSTEM_SUBJECT_OPTIONS = [
  "Matematik",
  "TYT Matematik",
  "AYT Matematik",
  "Geometri",
  "Fizik",
  "Kimya",
  "Biyoloji",
  "Türkçe",
  "Türkçe-Edebiyat",
  "Edebiyat",
  "Tarih",
  "Coğrafya",
  "Felsefe",
  "Rehberlik",
  "Fen Bilgisi",
  "Sosyal Bilgiler",
  "İngilizce",
];

export default function Dashboard({
  teachers = [],
  classes = [],
  classrooms = [],
  exams = [],
  counselings = [],
  violations = [],
  onNavigate,
  onUpdateClasses,
  plans = [],
  courses = [],
  config,
}: DashboardProps) {
  // Page Metrics
  const totalStudents = classes.reduce((acc, c) => acc + (c.mevcutOgrenciSayisi || 0), 0);
  const yksTeachersCount = teachers.filter((t) => t.kademe === "YKS").length;
  const lgsTeachersCount = teachers.filter((t) => t.kademe === "LGS").length;
  const rehTeachersCount = teachers.filter((t) => t.brans === "Rehberlik").length;
  
  const totalCapacity = classrooms.reduce((acc, r) => acc + (r.aktifPasif ? r.kapasite : 0), 0);
  const classroomDoluluğuPercent = Math.min(100, Math.round((totalStudents / (totalCapacity || 1)) * 100));

  const hardViolations = violations.filter((v) => v.seviye === "Zorunlu");
  const softViolations = violations.filter((v) => v.seviye === "Esnek");

  // Visualizer Tab Selection State
  const [visualTab, setVisualTab] = useState<"teachers" | "classes" | "cognitive" | "limitCheck">("classes");
  const [gradeFilter, setGradeFilter] = useState<"ALL" | "YKS" | "LGS">("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  // Target Curriculum Configurator State
  const [selectedConfigClassId, setSelectedConfigClassId] = useState<string>(classes[0]?.id || "");
  const [showConfigSuccess, setShowConfigSuccess] = useState(false);
  const [customSubject, setCustomSubject] = useState("");
  const [customHours, setCustomHours] = useState(2);

  const selectedConfigClass = classes.find((c) => c.id === selectedConfigClassId);

  // Calculates data variables
  const teacherScheduledData = teachers
    .filter((t) => {
      if (gradeFilter !== "ALL" && t.kademe !== gradeFilter) return false;
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        return t.adSoyad.toLowerCase().includes(query) || t.brans.toLowerCase().includes(query);
      }
      return true;
    })
    .map((t) => {
      const scheduledCount = plans.filter((p) => p.ogretmenId === t.id && p.planTuru !== "Boş Periyot").length;
      const progressPercent = Math.min(120, Math.round((scheduledCount / (t.haftalikMaksimumDers || 1)) * 100));
      return {
        ...t,
        scheduledCount,
        progressPercent,
      };
    });

  const classScheduledData = classes
    .filter((c) => {
      if (gradeFilter !== "ALL" && c.kademe !== gradeFilter) return false;
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        return c.sinifAdi.toLowerCase().includes(query) || c.merkez.toLowerCase().includes(query);
      }
      return true;
    })
    .map((c) => {
      const classPlans = plans.filter((p) => p.sinifId === c.id && p.planTuru !== "Boş Periyot");
      const scheduledCount = classPlans.length;
      const targetCount = Object.values(c.haftalikDersIhtiyaci || {}).reduce((sum, h) => sum + h, 0);
      const progressPercent = Math.min(100, Math.round((scheduledCount / (targetCount || 1)) * 100));

      // Calculate details per subject
      const subjectBreakdowns = Object.entries(c.haftalikDersIhtiyaci || {}).map(([sub, req]) => {
        const actHours = classPlans.filter((p) => {
          const course = courses.find((co) => co.id === p.dersId);
          return course?.dersAdi === sub;
        }).length;
        return {
          subject: sub,
          required: req,
          actual: actHours,
        };
      });

      return {
        ...c,
        scheduledCount,
        targetCount,
        progressPercent,
        subjectBreakdowns,
      };
    });

  // Action: Apply pre-defined template to configured class
  const handleApplyTemplate = (templateIndex: number) => {
    if (!selectedConfigClass || !onUpdateClasses) return;
    const template = CURRICULUM_TEMPLATES[templateIndex];
    
    const updatedClasses = classes.map((c) => {
      if (c.id === selectedConfigClass.id) {
        return {
          ...c,
          haftalikDersIhtiyaci: { ...template.curriculum },
        };
      }
      return c;
    });

    onUpdateClasses(updatedClasses);
    flashSuccess();
  };

  // Action: Modify specific course hour inside custom configuration
  const handleUpdateHours = (subName: string, addHours: number) => {
    if (!selectedConfigClass || !onUpdateClasses) return;
    const currentNeed = selectedConfigClass.haftalikDersIhtiyaci || {};
    const oldVal = currentNeed[subName] || 0;
    const newVal = Math.max(0, oldVal + addHours);

    const updatedNeed = { ...currentNeed };
    if (newVal === 0) {
      delete updatedNeed[subName];
    } else {
      updatedNeed[subName] = newVal;
    }

    const updatedClasses = classes.map((c) => {
      if (c.id === selectedConfigClass.id) {
        return {
          ...c,
          haftalikDersIhtiyaci: updatedNeed,
        };
      }
      return c;
    });

    onUpdateClasses(updatedClasses);
  };

  // Action: Add custom subject manually or edit
  const handleAddCustomSubject = (e: FormEvent) => {
    e.preventDefault();
    if (!selectedConfigClass || !customSubject || !onUpdateClasses) return;
    
    const currentNeed = selectedConfigClass.haftalikDersIhtiyaci || {};
    const updatedNeed = {
      ...currentNeed,
      [customSubject]: (currentNeed[customSubject] || 0) + customHours,
    };

    const updatedClasses = classes.map((c) => {
      if (c.id === selectedConfigClass.id) {
        return {
          ...c,
          haftalikDersIhtiyaci: updatedNeed,
        };
      }
      return c;
    });

    onUpdateClasses(updatedClasses);
    setCustomSubject("");
    flashSuccess();
  };

  const flashSuccess = () => {
    setShowConfigSuccess(true);
    setTimeout(() => {
      setShowConfigSuccess(false);
    }, 2500);
  };

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-slate-900 to-indigo-950 text-white rounded-2xl p-6 shadow-xl border border-slate-800 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl -mr-16 -mt-16"></div>
        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <span className="bg-indigo-500/20 text-indigo-300 text-xs px-3 py-1 rounded-full border border-indigo-500/30 font-medium">
              Ataşehir Belediyesi
            </span>
            <h1 className="text-3xl font-bold tracking-tight mt-2 text-white font-sans">Ata Akademi Planlama Sistemi</h1>
            <p className="text-slate-300 text-sm mt-1 max-w-xl">
              YKS ve LGS hazırlık müfredat çizelgeleme, Deneme Kulübü sınav takvimi, yoklama ve rehberlik takibini optimize eden algoritmik kontrol paneli.
            </p>
          </div>
          <button 
            onClick={() => onNavigate("program")}
            className="bg-white text-indigo-950 font-semibold px-5 py-2.5 rounded-xl shadow-lg hover:bg-slate-100 transition duration-150 text-sm font-sans flex items-center gap-2"
          >
            <Calendar className="w-4 h-4" />
            Ders Programını Yönet
          </button>
        </div>
      </div>

      {/* 2026-2027 Hedefler ve Vizyon Rapor Özeti */}
      <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-6">
        <div>
          <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight font-sans">2026-2027 Hedefler ve Vizyon</h2>
        </div>

        {/* 2026 Orta Hedef */}
        <div className="space-y-4">
          <h3 className="text-base font-bold text-slate-800 font-sans border-b border-slate-100 pb-1.5">2026 Orta Hedef</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-slate-50/60 p-4 rounded-xl border border-slate-100 flex flex-col items-center justify-center text-center">
              <span className="text-4xl font-extrabold text-slate-950 font-sans tracking-tight">125</span>
              <span className="text-xs font-bold text-slate-800 mt-1">Yerleşen</span>
              <span className="text-[10px] text-slate-400 mt-0.5">Öğrenci sayısı</span>
            </div>
            
            <div className="bg-slate-50/60 p-4 rounded-xl border border-slate-100 flex flex-col items-center justify-center text-center">
              <span className="text-4xl font-extrabold text-slate-950 font-sans tracking-tight">62%</span>
              <span className="text-xs font-bold text-slate-800 mt-1">Yerleşme Oranı</span>
              <span className="text-[10px] text-slate-400 mt-0.5">&nbsp;</span>
            </div>

            <div className="bg-slate-50/60 p-4 rounded-xl border border-slate-100 flex flex-col items-center justify-center text-center">
              <span className="text-4xl font-extrabold text-slate-950 font-sans tracking-tight">7</span>
              <span className="text-xs font-bold text-slate-800 mt-1">400+ Öğrenci</span>
              <span className="text-[10px] text-slate-400 mt-0.5">%5 hedefi</span>
            </div>

            <div className="bg-slate-50/60 p-4 rounded-xl border border-slate-100 flex flex-col items-center justify-center text-center">
              <span className="text-4xl font-extrabold text-slate-950 font-sans tracking-tight">85%</span>
              <span className="text-xs font-bold text-slate-800 mt-1">Süreklilik</span>
              <span className="text-[10px] text-slate-400 mt-0.5">&nbsp;</span>
            </div>
          </div>
        </div>

        {/* 2027 Üst Hedef: 10. Yıl Vizyonu */}
        <div className="space-y-4 pt-2">
          <h3 className="text-base font-bold text-slate-800 font-sans border-b border-slate-100 pb-1.5">2027 Üst Hedef: 10. Yıl Vizyonu</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-slate-50/60 p-4 rounded-xl border border-slate-100 flex flex-col items-center justify-center text-center">
              <span className="text-4xl font-extrabold text-slate-950 font-sans tracking-tight">140</span>
              <span className="text-xs font-bold text-slate-800 mt-1">Yerleşen</span>
              <span className="text-[10px] text-slate-400 mt-0.5">Öğrenci sayısı</span>
            </div>
            
            <div className="bg-slate-50/60 p-4 rounded-xl border border-slate-100 flex flex-col items-center justify-center text-center">
              <span className="text-4xl font-extrabold text-slate-950 font-sans tracking-tight">70%</span>
              <span className="text-xs font-bold text-slate-800 mt-1">Yerleşme Oranı</span>
              <span className="text-[10px] text-slate-400 mt-0.5">&nbsp;</span>
            </div>

            <div className="bg-slate-50/60 p-4 rounded-xl border border-slate-100 flex flex-col items-center justify-center text-center">
              <span className="text-4xl font-extrabold text-slate-950 font-sans tracking-tight">10</span>
              <span className="text-xs font-bold text-slate-800 mt-1">400+ Öğrenci</span>
              <span className="text-[10px] text-slate-400 mt-0.5">%8 hedefi</span>
            </div>

            <div className="bg-slate-50/60 p-4 rounded-xl border border-slate-100 flex flex-col items-center justify-center text-center">
              <span className="text-4xl font-extrabold text-slate-950 font-sans tracking-tight">90%</span>
              <span className="text-xs font-bold text-slate-800 mt-1">Süreklilik</span>
              <span className="text-[10px] text-slate-400 mt-0.5">&nbsp;</span>
            </div>
          </div>
        </div>
      </div>

      {/* Bento Grid Analytics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Students Card */}
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex items-center justify-between hover:shadow-md transition">
          <div className="space-y-1">
            <span className="text-slate-500 text-xs font-semibold uppercase tracking-wider">Toplam Öğrenci</span>
            <h3 className="text-3xl font-bold text-slate-900 font-sans">{totalStudents}</h3>
            <p className="text-xs text-indigo-600 font-medium">LGS ve YKS Grupları</p>
          </div>
          <div className="p-3 bg-indigo-50 rounded-xl text-indigo-600">
            <Users className="w-6 h-6" />
          </div>
        </div>

        {/* Teachers Pool Card */}
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex items-center justify-between hover:shadow-md transition">
          <div className="space-y-1">
            <span className="text-slate-500 text-xs font-semibold uppercase tracking-wider">Öğretmen Havuzu</span>
            <h3 className="text-3xl font-bold text-slate-900 font-sans">{teachers.length}</h3>
            <p className="text-xs text-slate-500">
              {yksTeachersCount} YKS | {lgsTeachersCount} LGS | {rehTeachersCount} Rehber
            </p>
          </div>
          <div className="p-3 bg-teal-50 rounded-xl text-teal-600">
            <UserCheck className="w-6 h-6" />
          </div>
        </div>

        {/* Classroom Load Card */}
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex items-center justify-between hover:shadow-md transition">
          <div className="space-y-1">
            <span className="text-slate-500 text-xs font-semibold uppercase tracking-wider">Sınıf/Derslik Doluluğu</span>
            <h3 className="text-3xl font-bold text-slate-900 font-sans">%{classroomDoluluğuPercent}</h3>
            <div className="w-24 bg-slate-100 rounded-full h-1.5 mt-1.5 overflow-hidden">
              <div 
                className={`h-1.5 rounded-full ${classroomDoluluğuPercent > 90 ? "bg-amber-500" : "bg-teal-500"}`}
                style={{ width: `${classroomDoluluğuPercent}%` }}
              ></div>
            </div>
          </div>
          <div className="p-3 bg-amber-50 rounded-xl text-amber-600">
            <BookOpen className="w-6 h-6" />
          </div>
        </div>

        {/* Conflict Warning Card */}
        <div className={
          hardViolations.length > 0 
          ? "bg-rose-50 p-5 rounded-2xl shadow-sm border border-rose-100 flex items-center justify-between animate-pulse" 
          : "bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex items-center justify-between"
        }>
          <div className="space-y-1">
            <span className="text-slate-500 text-xs font-semibold uppercase tracking-wider">Kısıt & Çakışma Durumu</span>
            <h3 className={`text-3xl font-bold font-sans ${hardViolations.length > 0 ? "text-rose-600" : "text-emerald-600"}`}>
              {hardViolations.length} Çakışma
            </h3>
            <p className="text-xs text-slate-500">{softViolations.length} Tercih/Yük Uyarısı</p>
          </div>
          <div className={`p-3 rounded-xl ${hardViolations.length > 0 ? "bg-rose-100 text-rose-600" : "bg-emerald-50 text-emerald-600"}`}>
            <AlertTriangle className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Main Stats Split Room */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Side: Conflict Analyzer List */}
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-center mb-4">
              <div>
                <h2 className="text-lg font-bold text-slate-950 font-sans flex items-center gap-2">
                  <Activity className="w-4 h-4 text-indigo-600" />
                  Otomatik Çakışma & Kural Denetleme (Real-time Solver)
                </h2>
                <p className="text-xs text-slate-500">
                  Ders planına eklenen her veri, kurumun zorunlu kısıtlarına göre eş zamanlı olarak analiz edilir.
                </p>
              </div>
              <span className="text-xs font-mono bg-slate-100 px-2 py-1 rounded text-slate-600 font-medium">
                Aktif Denetçi: Açık
              </span>
            </div>

            {violations.length === 0 ? (
              <div className="border border-emerald-100 bg-emerald-50/50 rounded-xl p-8 flex flex-col items-center justify-center text-center space-y-3">
                <CheckCircle className="w-10 h-10 text-emerald-600" />
                <h4 className="text-emerald-950 font-bold font-sans text-sm">Harika! Hiçbir Kısıt İhlali Yok</h4>
                <p className="text-emerald-800 text-xs max-w-sm">
                  Tüm öğretmen, derslik ve sınıf periyotları çakışmasız biçimde optimize edilmiş durumda.
                </p>
              </div>
            ) : (
              <div className="space-y-4 max-h-[360px] overflow-y-auto pr-1">
                {Object.entries(
                  violations.reduce((acc, v) => {
                    const t = v.tip || "Diğer";
                    if (!acc[t]) acc[t] = [];
                    acc[t].push(v);
                    return acc;
                  }, {} as Record<string, ConstraintViolation[]>)
                ).map(([gTip, gViolations]) => (
                  <div key={gTip} className="space-y-2">
                    <h5 className="font-bold text-xs uppercase text-slate-500 bg-slate-100 inline-block px-2 py-1 rounded tracking-wider">{gTip} İhlalleri ({gViolations.length})</h5>
                    <div className="space-y-2">
                      {gViolations.map((violation) => (
                        <div 
                          key={violation.id} 
                          className={`flex items-start gap-3 p-3.5 rounded-xl border text-sm transition ${
                            violation.seviye === "Zorunlu"
                              ? "bg-rose-50/50 border-rose-100 text-rose-950"
                              : "bg-amber-50/50 border-amber-100 text-amber-950"
                          }`}
                        >
                          <span className={`inline-block text-xs px-2 py-0.5 rounded-full font-bold mt-0.5 shrink-0 ${
                            violation.seviye === "Zorunlu" ? "bg-rose-100 text-rose-700" : "bg-amber-100 text-amber-700"
                          }`}>
                            {violation.seviye}
                          </span>
                          <div className="flex-1 space-y-1">
                            <p className="text-xs text-slate-700 leading-relaxed font-sans">{violation.mesaj}</p>
                            {(violation.bilesenIds && violation.bilesenIds.length > 0) && (
                              <button 
                                onClick={() => onNavigate("program", { targetPlanIds: violation.bilesenIds })}
                                className={`mt-2 text-xs font-bold underline transition ${
                                  violation.seviye === "Zorunlu" ? "text-rose-600 hover:text-rose-800" : "text-amber-700 hover:text-amber-900"
                                }`}
                              >
                                Programda Git & Düzelt &rsaquo;
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="mt-4 pt-4 border-t border-slate-100 flex justify-end gap-3">
            <button 
              onClick={() => onNavigate("program")}
              className="text-xs text-indigo-600 font-semibold hover:underline"
            >
              Hemen Çözümle &rsaquo;
            </button>
          </div>
        </div>

        {/* Right Side: Quick Action & Indicators Dashboard Panel */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 space-y-5">
          <div>
            <h2 className="text-lg font-bold text-slate-950 font-sans">Ata Akademi Göstergeleri</h2>
            <p className="text-xs text-slate-500">Hızlı operasyonel takvim ve son durum göstergeleri.</p>
          </div>

          <div className="space-y-3">
            {/* Indicator item */}
            <div className="flex justify-between items-center p-3 rounded-xl bg-slate-50 border border-slate-100 text-xs">
              <span className="text-slate-600 font-medium">Toplam Aktif Ders Saati (Haftalık)</span>
              <span className="font-bold text-slate-900 font-mono">{plans.filter(p => p.planTuru !== "Boş Periyot").length} Saat</span>
            </div>

            {/* Indicator item */}
            <div className="flex justify-between items-center p-3 rounded-xl bg-slate-50 border border-slate-100 text-xs">
              <span className="text-slate-600 font-medium">Planlanan Sınavlar (Deneme Kulübü)</span>
              <span className="font-bold text-slate-900 bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded font-mono">
                {exams.length} Aktif Sınav
              </span>
            </div>

            {/* Indicator item */}
            <div className="flex justify-between items-center p-3 rounded-xl bg-slate-50 border border-slate-100 text-xs">
              <span className="text-slate-600 font-medium font-sans">Aktif Rehberlik Görüşmeleri (Bu Ay)</span>
              <span className="font-bold text-teal-700 font-mono">{counselings.length} Görüşme</span>
            </div>

            {/* Indicator item */}
            <div className="flex justify-between items-center p-3 rounded-xl bg-slate-50 border border-slate-100 text-xs">
              <span className="text-slate-600 font-medium flex items-center gap-1">
                Riskli Öğrenci Sayısı (Devamsızlık)
              </span>
              <span className="font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded font-mono">
                3 Kritik
              </span>
            </div>
          </div>

          <div className="p-4 bg-slate-900 text-white rounded-xl space-y-2">
            <div className="flex items-center gap-2 text-indigo-300 text-xs font-semibold uppercase tracking-wider">
              <Clock className="w-3.5 h-3.5 text-indigo-400" />
              Sistem Durumu (MVP Faz 1)
            </div>
            <p className="text-xs text-slate-300">
              Temel ders programı planlayıcı, öğretmen ve sınıf çakışmasız yerleştirme algoritmaları aktif durumdadır.
            </p>
          </div>
        </div>
      </div>

      {/* --- ADDED SECTION 1: DERS PROGRAMI HAFTALIK DERS SAATLERI VERİ GÖRSELLEŞTİRME BÖLÜMÜ --- */}
      <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-6">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
          <div>
            <h2 className="text-xl font-bold text-slate-950 font-sans flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-indigo-600 animate-pulse" />
              Haftalık Ders Saatleri Dağılım Analizleri (Veri Görselleştirme)
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Tüm öğretmenlerin haftalık ders yükü doluluk oranlarını ve sınıfların hedeflenen ders saatlerine ulaşım düzeylerini karşılaştırmalı olarak analiz edin.
            </p>
          </div>

          {/* Quick Tab control */}
          <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl text-xs font-medium border border-slate-250">
            <button
              onClick={() => { setVisualTab("classes"); }}
              className={`px-4.5 py-2 rounded-lg transition-all ${
                visualTab === "classes" ? "bg-white text-indigo-950 font-bold shadow-sm" : "text-slate-500 hover:text-slate-800"
              }`}
            >
              Sınıf / Şube Dağılımları
            </button>
            <button
              onClick={() => { setVisualTab("teachers"); }}
              className={`px-4.5 py-2 rounded-lg transition-all ${
                visualTab === "teachers" ? "bg-white text-indigo-950 font-bold shadow-sm" : "text-slate-500 hover:text-slate-800"
              }`}
            >
              Öğretmen Ders Yükleri
            </button>
            <button
              onClick={() => { setVisualTab("cognitive"); }}
              className={`px-4.5 py-2 rounded-lg transition-all ${
                visualTab === "cognitive" ? "bg-white text-indigo-950 font-bold shadow-sm" : "text-slate-500 hover:text-slate-800"
              }`}
            >
              Bilişsel Yük Analizi
            </button>
            <button
              onClick={() => { setVisualTab("limitCheck"); }}
              className={`px-4.5 py-2 rounded-lg transition-all ${
                visualTab === "limitCheck" ? "bg-white text-indigo-950 font-bold shadow-sm" : "text-slate-500 hover:text-slate-800"
              }`}
            >
              Öğretmen Limit Kontrolü
            </button>
          </div>
        </div>

        {/* Global filter bars inside the visualizer */}
        {visualTab !== "cognitive" && visualTab !== "limitCheck" && (
          <div className="bg-slate-50 rounded-2xl p-4 flex flex-col md:flex-row items-center justify-between gap-4 border border-slate-200/55">
            <div className="flex items-center gap-2 self-stretch flex-1">
              <Search className="w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder={visualTab === "classes" ? "Sınıf veya merkez adına göre filtreleyin..." : "Öğretmen veya branş adına göre filtreleyin..."}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-transparent text-xs w-full text-slate-800 placeholder-slate-400 outline-none focus:ring-0"
              />
            </div>

            <div className="flex items-center gap-1.5">
              <span className="text-xs text-slate-500 font-medium">Bölüm Filtre:</span>
              {["ALL", "YKS", "LGS"].map((k) => (
                <button
                  key={k}
                  onClick={() => setGradeFilter(k as any)}
                  className={`text-xs px-2.5 py-1 rounded-lg border font-semibold transition ${
                    gradeFilter === k
                      ? "bg-indigo-600 text-white border-indigo-600 shadow-sm"
                      : "bg-white text-slate-600 border-slate-200 hover:bg-slate-100"
                  }`}
                >
                  {k === "ALL" ? "Tümü" : k}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Dynamic visual grids */}
        {visualTab === "classes" ? (
          /* Class visualization view */
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {classScheduledData.length === 0 ? (
              <div className="md:col-span-2 text-center py-12 bg-slate-50 border border-dashed rounded-2xl text-slate-400 text-xs">
                Filtreye uygun sınıf bulunamadı.
              </div>
            ) : (
              classScheduledData.map((c) => {
                const totalTarget = c.targetCount;
                const totalActual = c.scheduledCount;
                const isComplete = totalActual >= totalTarget && totalTarget > 0;
                
                return (
                  <div key={c.id} className="border border-slate-100 bg-slate-50/20 rounded-2xl p-5 hover:border-slate-300 hover:bg-white transition duration-200 shadow-sm space-y-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold text-sm text-slate-900 font-sans">{c.sinifAdi}</h4>
                          <span className="text-[10px] bg-slate-100 px-2 py-0.5 rounded-full text-slate-600 border font-semibold">
                            {c.kademe} {c.alan !== "Genel" ? `| ${c.alan}` : ""}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 mt-0.5 font-sans">{c.merkez}</p>
                      </div>
                      
                      {/* Status indicator badge */}
                      <span className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold border ${
                        isComplete
                          ? "bg-emerald-50 border-emerald-100 text-emerald-700" 
                          : totalActual > 0 
                            ? "bg-amber-50 border-amber-100 text-amber-700" 
                            : "bg-slate-50 border-slate-150 text-slate-500"
                      }`}>
                        {isComplete ? "Tamamlandı" : totalActual > 0 ? "Eksik Saat Var" : "Planlanmamış"}
                      </span>
                    </div>

                    {/* Progress visual bar chart */}
                    <div className="space-y-1.5">
                      <div className="flex justify-between text-xs font-semibold">
                        <span className="text-slate-500">Haftalık Kota / Müfredat Gerçekleşimi:</span>
                        <span className="text-slate-900 font-mono">{totalActual} / {totalTarget} Saat (%{c.progressPercent})</span>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden border border-slate-200 flex">
                        <div 
                          className={`h-full rounded-full transition-all duration-300 ${
                            isComplete ? "bg-emerald-500" : "bg-indigo-500"
                          }`}
                          style={{ width: `${c.progressPercent}%` }}
                        ></div>
                      </div>
                    </div>

                    {/* Class's individual subject assignment list comparison bars */}
                    <div className="bg-slate-50/50 border rounded-xl p-3.5 space-y-2">
                      <h5 className="text-[10px] font-extrabold text-slate-600 uppercase tracking-widest mb-1.5">Branş Dağılım Analizi</h5>
                      {c.subjectBreakdowns.length === 0 ? (
                        <p className="text-[10px] text-slate-400 italic">Müfredat belirlenmemiş.</p>
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2 text-xs">
                          {c.subjectBreakdowns.map((b) => {
                            const isAtMatch = b.actual === b.required;
                            return (
                              <div key={b.subject} className="flex items-center justify-between py-1 border-b border-slate-100">
                                <span className="text-slate-700 font-medium truncate shrink-0 max-w-[130px]">{b.subject}</span>
                                <div className="flex items-center gap-1.5 font-mono">
                                  <span className={`font-bold ${isAtMatch ? "text-emerald-600" : b.actual < b.required ? "text-amber-600" : "text-rose-600"}`}>
                                    {b.actual}
                                  </span>
                                  <span className="text-slate-400">/</span>
                                  <span className="text-slate-500">{b.required} s.</span>
                                  <span className="ml-1 shrink-0">
                                    {isAtMatch ? (
                                      <CheckCircle className="w-3.5 h-3.5 text-emerald-500 inline" />
                                    ) : b.actual < b.required ? (
                                      <span className="text-[10px] bg-amber-100 px-1.5 py-0.5 rounded font-sans font-bold text-amber-700">-{b.required - b.actual}s</span>
                                    ) : (
                                      <span className="text-[10px] bg-rose-100 px-1.5 py-0.5 rounded font-sans font-bold text-rose-700">+{b.actual - b.required}s</span>
                                    )}
                                  </span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        ) : visualTab === "teachers" ? (
          /* Teacher visualization view */
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {teacherScheduledData.length === 0 ? (
              <div className="md:col-span-2 text-center py-12 bg-slate-50 border border-dashed rounded-2xl text-slate-400 text-xs">
                Filtreye uygun öğretmen bulunamadı.
              </div>
            ) : (
              teacherScheduledData.map((t) => {
                const totalMax = t.haftalikMaksimumDers;
                const scheduledObjCount = t.scheduledCount;
                const isOverloaded = scheduledObjCount > totalMax;
                const progressWidth = Math.min(100, t.progressPercent);

                return (
                  <div key={t.id} className="border border-slate-100 bg-slate-50/20 rounded-2xl p-5 hover:border-slate-300 hover:bg-white transition duration-200 shadow-sm flex flex-col justify-between">
                    <div>
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="flex items-center gap-1.5">
                            <h4 className="font-bold text-sm text-slate-900 font-sans">{t.adSoyad}</h4>
                            <span className="text-[9px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded border uppercase font-extrabold font-mono">
                              {t.brans}
                            </span>
                          </div>
                          <p className="text-[10px] text-slate-500 mt-1 flex items-center gap-1">
                            <span className="font-semibold text-indigo-600">{t.merkez}</span>
                            <span>• Kademe: {t.kademe}</span>
                          </p>
                        </div>

                        {/* Status Badge */}
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${
                          isOverloaded 
                            ? "bg-rose-50 border-rose-200 text-rose-700 font-extrabold" 
                            : scheduledObjCount === totalMax 
                              ? "bg-teal-50 border-teal-200 text-teal-700 font-bold" 
                              : scheduledObjCount > 0 
                                ? "bg-slate-50 border-slate-200 text-slate-600" 
                                : "bg-slate-50 border-dashed border-slate-200 text-slate-400"
                        }`}>
                          {isOverloaded ? "Aşırı Yük" : scheduledObjCount === totalMax ? "Tam Kapasite" : scheduledObjCount > 0 ? "Çalışıyor" : "Boşta"}
                        </span>
                      </div>

                      {/* Horizontal progress representation */}
                      <div className="space-y-1.5 mt-5">
                        <div className="flex justify-between text-xs font-semibold">
                          <span className="text-slate-500">Mevcut Haftalık Ders Yükü:</span>
                          <span className="text-slate-900 font-mono">
                            {scheduledObjCount} / {totalMax} Saat (%{t.progressPercent})
                          </span>
                        </div>
                        <div className="w-full bg-slate-150 rounded-full h-3.5 overflow-hidden border border-slate-200 flex">
                          <div 
                            className={`h-full rounded-full transition-all duration-300 ${
                              isOverloaded ? "bg-rose-500 animate-pulse" : t.progressPercent > 80 ? "bg-amber-500" : "bg-teal-500"
                            }`}
                            style={{ width: `${progressWidth}%` }}
                          ></div>
                        </div>
                      </div>
                    </div>

                    <p className="text-[10px] text-slate-400 mt-3 italic font-sans">
                      * Günlük maksimum sınır: {t.gunlukMaksimumDers} saat, Boş Gün Tercihi: {t.bosGunTercihi}.
                    </p>
                  </div>
                );
              })
            )}
          </div>
        ) : visualTab === "cognitive" ? (
          <CognitiveLoadReport 
            classes={classes}
            plans={plans}
            courses={courses}
            config={config || DEFAULT_SCHEDULE_CONFIG}
            onNavigate={(tab) => onNavigate(tab)}
          />
        ) : (
          <TeacherLimitReport 
            teachers={teachers}
            plans={plans}
            config={config || DEFAULT_SCHEDULE_CONFIG}
          />
        )}
      </div>

      {/* --- ADDED SECTION 2: GRUPLAR İÇİN DERS SAYISI HAZIRLAMA VE MÜFREDAT GİRİŞ MODÜLÜ --- */}
      <div className="bg-slate-900 text-white p-6 rounded-2xl border border-slate-800 shadow-xl space-y-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl -mr-20 -mt-20"></div>
        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-800 pb-4">
          <div>
            <h2 className="text-xl font-bold text-slate-100 font-sans flex items-center gap-2">
              <Sliders className="w-5 h-5 text-indigo-400" />
              Grup Ders Saati Hazırlama Modülü (Müfredat Belirleme)
            </h2>
            <p className="text-xs text-indigo-300">
              YKS veya LGS akademik gruplarının haftalık ders kriter şablonlarını resmi standartlara göre tanımlayın veya kendi özel lesson allocation planınızı oluşturun.
            </p>
          </div>

          <div className="flex items-center gap-1.5 bg-slate-950 p-2 border border-slate-800 rounded-xl max-w-sm w-full md:w-auto self-stretch">
            <span className="text-xs text-slate-400 font-bold uppercase tracking-wider shrink-0 ml-1">Grup:</span>
            <select
              value={selectedConfigClassId}
              onChange={(e) => setSelectedConfigClassId(e.target.value)}
              className="bg-transparent text-xs text-indigo-200 font-bold focus:ring-0 outline-none w-full border-0"
            >
              {classes.map((cls) => (
                <option key={cls.id} value={cls.id} className="bg-slate-900 text-slate-200 text-xs">
                  {cls.sinifAdi} ({cls.merkez})
                </option>
              ))}
            </select>
          </div>
        </div>

        {selectedConfigClass ? (
          <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left side: Pre-configured load templates */}
            <div className="lg:col-span-5 space-y-4">
              <div className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-widest text-indigo-400">
                <Sparkles className="w-4 h-4" />
                Resmi Müfredat Şablonunu Uygula
              </div>
              <p className="text-xs text-slate-400 italic">
                Aşağıdaki butonları kullanarak seçili sınıfa, talep edilen haftalık ders saatleri planını anında uygulayabilirsiniz:
              </p>

              <div className="space-y-2">
                {CURRICULUM_TEMPLATES.map((tmpl, idx) => (
                  <button
                    key={tmpl.name}
                    onClick={() => handleApplyTemplate(idx)}
                    className="w-full bg-slate-950/60 p-3.5 text-left rounded-xl border border-slate-800 hover:border-slate-600 transition group flex flex-col justify-between text-xs"
                  >
                    <div className="flex justify-between items-center w-full">
                      <span className="font-bold text-slate-200 group-hover:text-amber-300 transition">{tmpl.name}</span>
                      <span className="bg-indigo-900 text-indigo-300 font-extrabold text-[9px] px-2 py-0.5 rounded">{tmpl.tag}</span>
                    </div>
                    <span className="text-[11px] text-slate-400 mt-1 font-sans">{tmpl.description}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Right side: Detailed subject counters manual management */}
            <div className="lg:col-span-7 bg-slate-950 p-5 rounded-2xl border border-slate-850 space-y-4 font-sans">
              <div className="flex justify-between items-center pb-2 border-b border-slate-850">
                <span className="text-xs font-extrabold text-slate-400 uppercase tracking-widest">
                  Özel Müfredat Ayarlama Deck
                </span>
                <span className="text-[11px] text-amber-300 bg-amber-950/40 border border-amber-900 px-2 py-0.5 rounded font-mono font-bold">
                  Hedef: {Object.values(selectedConfigClass.haftalikDersIhtiyaci || {}).reduce((sum, h) => sum + h, 0)} Saat
                </span>
              </div>

              {showConfigSuccess && (
                <div className="bg-emerald-950 border border-emerald-800 text-emerald-300 p-2 rounded-xl text-xs flex items-center gap-2 font-bold justify-center font-sans">
                  <Check className="w-4 h-4" />
                  Miras Müfredat Başarıyla Güncellendi!
                </div>
              )}

              {/* Grid of Subjects in Class */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {SYSTEM_SUBJECT_OPTIONS.map((subName) => {
                  const hours = selectedConfigClass.haftalikDersIhtiyaci?.[subName] || 0;
                  return (
                    <div key={subName} className="flex justify-between items-center bg-slate-900 p-2 px-3 rounded-xl border border-slate-800">
                      <div>
                        <span className="text-[11px] font-bold text-slate-300 block leading-tight">{subName}</span>
                        {hours === 0 ? (
                          <span className="text-[9px] text-slate-500 font-medium">Bileşen Yok</span>
                        ) : (
                          <span className="text-[9px] text-emerald-400 font-bold">{hours} Saat / Hafta</span>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleUpdateHours(subName, -1)}
                          className="bg-slate-950 hover:bg-slate-805 text-white w-7 h-7 flex items-center justify-center rounded-lg border border-slate-800 hover:text-rose-400 transition"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="font-bold text-xs w-5 text-center font-mono">{hours}</span>
                        <button
                          onClick={() => handleUpdateHours(subName, 1)}
                          className="bg-slate-950 hover:bg-slate-805 text-white w-7 h-7 flex items-center justify-center rounded-lg border border-slate-800 hover:text-emerald-400 transition"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Extra Dynamic subject adder form inside dashboard */}
              <form onSubmit={handleAddCustomSubject} className="border-t border-slate-850 pt-4 mt-2 flex flex-col sm:flex-row gap-2">
                <input
                  type="text"
                  placeholder="Başka bir branş veya ders ismi yazın (örn: Geometri, Bilgisayar)"
                  value={customSubject}
                  onChange={(e) => setCustomSubject(e.target.value)}
                  className="bg-slate-900 border border-slate-800 text-xs rounded-xl px-3 py-2 text-slate-200 outline-none focus:border-slate-600 flex-1"
                />
                
                <div className="flex items-center gap-1 shrink-0">
                  <input
                    type="number"
                    min="1"
                    max="10"
                    value={customHours}
                    onChange={(e) => setCustomHours(parseInt(e.target.value) || 2)}
                    className="bg-slate-900 border border-slate-800 text-xs rounded-xl px-2 py-2 text-slate-200 outline-none w-14 font-mono font-bold text-center"
                    placeholder="Saat"
                  />
                  <button
                    type="submit"
                    className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs px-4 py-2 rounded-xl border border-indigo-500 hover:border-indigo-600 transition shrink-0"
                  >
                    Ders Ekle
                  </button>
                </div>
              </form>
            </div>
          </div>
        ) : (
          <div className="text-center py-6 text-slate-400 text-xs italic">
            Düzenlenebilecek henüz hiçbir sınıf tanımlanmamış.
          </div>
        )}
      </div>
    </div>
  );
}
