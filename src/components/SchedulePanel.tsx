/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { 
  Play, 
  Sparkles, 
  Wand2,
  Trash2, 
  Plus, 
  AlertTriangle, 
  Terminal, 
  CheckCircle2, 
  RefreshCw, 
  Calendar, 
  MapPin, 
  User, 
  BookOpen, 
  Check, 
  SlidersHorizontal,
  RotateCcw,
  Copy,
  GraduationCap,
  X
} from "lucide-react";
import { PlanItem, Teacher, ClassUnit, Classroom, Course, PlanTuru, ConstraintViolation } from "../types";
import { runAlgorithmicOptimizer, runGeneticOptimizer } from "../utils/schedulerRunners";
import { validateSchedules, ClassOptimizerReport, UnassignedRequirement, getLevelPolicy, isSlotAllowedForClassPolicy } from "../utils/scheduler";
import { SchoolScheduleConfig, getMasterTimeSlots, getActivePeriodsCountForDay } from "../utils/timeSettings";

interface SchedulePanelProps {
  plans: PlanItem[];
  teachers: Teacher[];
  classes: ClassUnit[];
  classrooms: Classroom[];
  courses: Course[];
  violations: ConstraintViolation[];
  config: SchoolScheduleConfig;
  onUpdatePlans: (newPlans: PlanItem[]) => void;
  targetPlanIds?: string[];
  onClearTarget?: () => void;
}

export default function SchedulePanel({
  plans,
  teachers,
  classes,
  classrooms,
  courses,
  violations,
  config,
  onUpdatePlans,
  targetPlanIds,
  onClearTarget,
}: SchedulePanelProps) {
  // Views Configuration
  const [viewType, setViewType] = useState<"class" | "teacher" | "day" | "all" | "classroom">("class");
  const [selectedEntityId, setSelectedEntityId] = useState<string>(classes[0]?.id || "");
  const [selectedDayDayView, setSelectedDayDayView] = useState<string>(config.activeDays[0] || "Pazartesi");
  const [dayViewMode, setDayViewMode] = useState<"class" | "teacher">("class");
  const [allViewDayFilter, setAllViewDayFilter] = useState<string>("all");

  // Drag and drop state
  const [dragOverCell, setDragOverCell] = useState<string | null>(null); // "day-period-entityId"

  // Table dynamic width calculations
  const getAllViewMinWidth = () => {
    const activeDaysFiltered = config.activeDays.filter((day) => allViewDayFilter === "all" || day === allViewDayFilter);
    let totalSlotsCount = 0;
    activeDaysFiltered.forEach(day => {
      const dayActiveCount = getActivePeriodsCountForDay(day, config);
      const activeSlotsForDay = getMasterTimeSlots(config).filter(slot => slot.periyotNo <= dayActiveCount);
      totalSlotsCount += activeSlotsForDay.length;
    });
    return Math.max(1000, 208 + (totalSlotsCount * 180));
  };

  const getDayViewMinWidth = () => {
    const dayActiveCount = getActivePeriodsCountForDay(selectedDayDayView, config);
    const activeSlotsForDay = getMasterTimeSlots(config).filter(slot => slot.periyotNo <= dayActiveCount);
    return Math.max(1000, 208 + (activeSlotsForDay.length * 180));
  };

  useEffect(() => {
    if (targetPlanIds && targetPlanIds.length > 0) {
      const targetPlan = plans.find(p => targetPlanIds.includes(p.id));
      if (targetPlan) {
        setViewType("class");
        setSelectedEntityId(targetPlan.sinifId);
        // Maybe scroll to cell later. Just changing view brings it up.
      }
    }
  }, [targetPlanIds, plans]);

  const handleDragStart = (e: React.DragEvent, planId: string) => {
    e.dataTransfer.setData("text/plain", planId);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDropOnCell = (e: React.DragEvent, day: string, periodNo: number, targetEntityId: string) => {
    e.preventDefault();
    const planId = e.dataTransfer.getData("text/plain");
    if (!planId) return;

    const planItem = plans.find(p => p.id === planId);
    if (!planItem) return;

    const updatedPlans = plans.map(p => {
      if (p.id === planId) {
        const newSlot = `${day}-${periodNo}`;
        
        if (viewType === "class") {
          return {
            ...p,
            periyotId: newSlot,
            sinifId: selectedEntityId,
          };
        } else if (viewType === "teacher") {
          return {
            ...p,
            periyotId: newSlot,
            ogretmenId: selectedEntityId,
          };
        } else if (viewType === "all") {
          return {
            ...p,
            periyotId: newSlot,
            sinifId: targetEntityId,
          };
        } else if (viewType === "day") {
          if (dayViewMode === "class") {
            return {
              ...p,
              periyotId: newSlot,
              sinifId: targetEntityId,
            };
          } else {
            return {
              ...p,
              periyotId: newSlot,
              ogretmenId: targetEntityId,
            };
          }
        }
        return p;
      }
      return p;
    });

    const filteredPlans = updatedPlans.filter(p => {
      if (p.id === planId) return true;

      if (viewType === "class") {
        return !(p.sinifId === selectedEntityId && p.periyotId === `${day}-${periodNo}`);
      } else if (viewType === "teacher") {
        return !(p.ogretmenId === selectedEntityId && p.periyotId === `${day}-${periodNo}`);
      } else if (viewType === "all") {
        return !(p.sinifId === targetEntityId && p.periyotId === `${day}-${periodNo}`);
      } else if (viewType === "day") {
        if (dayViewMode === "class") {
          return !(p.sinifId === targetEntityId && p.periyotId === `${day}-${periodNo}`);
        } else {
          return !(p.ogretmenId === targetEntityId && p.periyotId === `${day}-${periodNo}`);
        }
      }
      return true;
    });

    onUpdatePlans(filteredPlans);
  };

  // Interactive Adding/Editing slot modal state
  const [activeSetupSlot, setActiveSetupSlot] = useState<string | null>(null); // "Day-PeriodNo-ClassId" or just "Day-PeriodNo"
  const [setupCourseId, setSetupCourseId] = useState("");
  const [setupTeacherId, setSetupTeacherId] = useState("");
  const [setupClassroomId, setSetupClassroomId] = useState("");
  const [setupClassId, setSetupClassId] = useState(""); // for Teacher/Room/All view additions
  const [setupError, setSetupError] = useState<string | null>(null);

  // Copy Schedule state
  const [isCopying, setIsCopying] = useState(false);
  const [copyTargetId, setCopyTargetId] = useState<string>("");

  // Modals state
  const [entityToReset, setEntityToReset] = useState<{ id: string, name: string, type: string } | null>(null);
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  // Optimizer solver state
  const [solverRunning, setSolverRunning] = useState(false);
  const [solverLogs, setSolverLogs] = useState<string[]>([]);
  const [showLogsPanel, setShowLogsPanel] = useState(false);
  const [unassignedReqs, setUnassignedReqs] = useState<UnassignedRequirement[]>([]);
  const [classReports, setClassReports] = useState<ClassOptimizerReport[]>([]);
  const [activeReportTab, setActiveReportTab] = useState<"logs" | "unassigned" | "classReports" | "aiFeedback">("logs");
  const [optimizationMode, setOptimizationMode] = useState<"completeness" | "pedagogical" | "balanced">("balanced");
  const [seed, setSeed] = useState<number>(42);

  // AI-Assisted Loop Genetic Algorithm States
  const [isAiLoopEnabled, setIsAiLoopEnabled] = useState(false);
  const [aiLoopStep, setAiLoopStep] = useState<"idle" | "ga1" | "ai_eval" | "ga2" | "completed">("idle");
  const [aiFeedbackResult, setAiFeedbackResult] = useState<{
    grade: string;
    generalFeedback: string;
    strengths: string[];
    weaknesses: string[];
    hints: Array<{
      sinifId?: string;
      ogretmenId?: string;
      dersId?: string;
      periyotId?: string;
      type: "penalty" | "reward";
      value: number;
      reason: string;
    }>;
  } | null>(null);

  // Genetic Algorithm (GA) States
  const [solverType, setSolverType] = useState<"heuristic" | "genetic">("heuristic");
  const [gaPopulationSize, setGaPopulationSize] = useState<number>(60);
  const [gaGenerations, setGaGenerations] = useState<number>(200);
  const [gaMutationRate, setGaMutationRate] = useState<number>(0.15);
  const [gaProgress, setGaProgress] = useState<{
    generation: number;
    bestScore: number;
    bestSchedule: PlanItem[];
  } | null>(null);

  const gaRunnerRef = React.useRef<{ terminate: () => void } | null>(null);

  // Suggested Teachers Sidebar state
  const [selectedSlotForSuggestions, setSelectedSlotForSuggestions] = useState<{ day: string; periodNo: number; classId: string } | null>(null);
  const [showSuggestionsSidebar, setShowSuggestionsSidebar] = useState<boolean>(false);

  // Auto-Resolve Suggestion State
  const [resolutionSuggestion, setResolutionSuggestion] = useState<{
    planItem: PlanItem;
    currentDay: string;
    currentPeriod: number;
    suggestions: {
      day: string;
      periodNo: number;
      violationsCount: number;
      hardViolationsCount: number;
      message: string;
      violationsList: string[];
    }[];
    selectedIndex: number;
  } | null>(null);

  const handleAutoResolve = (planItem: PlanItem) => {
    const suggestions: {
      day: string;
      periodNo: number;
      violationsCount: number;
      hardViolationsCount: number;
      message: string;
      violationsList: string[];
    }[] = [];

    const masterTimeSlots = getMasterTimeSlots(config);

    config.activeDays.forEach((day) => {
      const dayActiveCount = getActivePeriodsCountForDay(day, config);
      masterTimeSlots.forEach((slot) => {
        if (slot.periyotNo > dayActiveCount) return;
        if (config.ogleArasiPeriyotNo && slot.periyotNo === config.ogleArasiPeriyotNo) return;
        
        const slotId = `${day}-${slot.periyotNo}`;
        if (slotId === planItem.periyotId && planItem.durum !== "Conflict Detected") return;

        const hypotheticalPlans = plans.map((p) => {
          if (p.id === planItem.id) {
            return {
              ...p,
              periyotId: slotId,
              durum: "Onaylı" as const,
            };
          }
          return p;
        });

        const isClassBusy = plans.some(p => p.id !== planItem.id && p.sinifId === planItem.sinifId && p.periyotId === slotId && p.planTuru !== PlanTuru.BOS);
        const isTeacherBusy = plans.some(p => p.id !== planItem.id && p.ogretmenId === planItem.ogretmenId && p.periyotId === slotId && p.planTuru !== PlanTuru.BOS);
        const isRoomBusy = plans.some(p => p.id !== planItem.id && p.derslikId === planItem.derslikId && p.periyotId === slotId && p.planTuru !== PlanTuru.BOS);

        const allViolations = validateSchedules(
          hypotheticalPlans,
          teachers,
          classes,
          classrooms,
          courses,
          config
        );

        const relevantViolations = allViolations.filter((v) => 
          v.bilesenIds.includes(planItem.id)
        );

        const hardViolations = relevantViolations.filter((v) => v.seviye === "Zorunlu");
        const softViolations = relevantViolations.filter((v) => v.seviye === "Esnek");

        let hCount = hardViolations.length;
        let sCount = softViolations.length;

        if (isClassBusy) hCount += 1;
        if (isTeacherBusy) hCount += 1;
        if (isRoomBusy) hCount += 1;

        let message = "";
        const reasonsList: string[] = [];
        if (isClassBusy) reasonsList.push("Sınıf bu saatte meşgul.");
        if (isTeacherBusy) reasonsList.push("Öğretmenin bu saatte başka dersi var.");
        if (isRoomBusy) reasonsList.push("Derslik bu saatte meşgul.");

        relevantViolations.forEach((v) => {
          reasonsList.push(v.mesaj);
        });

        if (hCount === 0 && sCount === 0) {
          message = "✅ Mükemmel: 0 Çakışma / Sıfır Engel";
        } else if (hCount === 0) {
          message = `⚠️ Uygun (Sadece ${sCount} yumuşak esnek kural uyarısı var)`;
        } else {
          message = `❌ Çakışma var (${hCount} Zorunlu Engel, ${sCount} Esnek Tercih)`;
        }

        suggestions.push({
          day,
          periodNo: slot.periyotNo,
          violationsCount: hCount + sCount,
          hardViolationsCount: hCount,
          message,
          violationsList: reasonsList,
        });
      });
    });

    suggestions.sort((a, b) => {
      if (a.hardViolationsCount !== b.hardViolationsCount) {
        return a.hardViolationsCount - b.hardViolationsCount;
      }
      if (a.violationsCount !== b.violationsCount) {
        return a.violationsCount - b.violationsCount;
      }
      const dayOrder: Record<string, number> = {};
      config.activeDays.forEach((d, idx) => { dayOrder[d] = idx; });
      
      if (a.day !== b.day) {
        return (dayOrder[a.day] ?? 0) - (dayOrder[b.day] ?? 0);
      }
      return a.periodNo - b.periodNo;
    });

    const currentArr = planItem.periyotId ? planItem.periyotId.split("-") : ["Uzak", "0"];
    const currentDay = currentArr[0] || "";
    const currentPeriod = parseInt(currentArr[1] || "0", 10);

    setResolutionSuggestion({
      planItem,
      currentDay,
      currentPeriod,
      suggestions,
      selectedIndex: 0,
    });
  };

  const handleApplyResolution = () => {
    if (!resolutionSuggestion) return;
    const { planItem, suggestions, selectedIndex } = resolutionSuggestion;
    const chosen = suggestions[selectedIndex];
    if (!chosen) return;

    const targetSlotId = `${chosen.day}-${chosen.periodNo}`;
    
    const updatedPlans = plans.map(p => {
      if (p.id === planItem.id) {
        return {
          ...p,
          periyotId: targetSlotId,
          durum: "Onaylı" as const,
        };
      }
      return p;
    }).filter(p => {
      if (p.id === planItem.id) return true;
      return !(p.sinifId === planItem.sinifId && p.periyotId === targetSlotId && p.planTuru !== PlanTuru.BOS);
    });

    onUpdatePlans(updatedPlans);
    setResolutionSuggestion(null);
  };

  // Terminate GA worker on unmount
  useEffect(() => {
    return () => {
      if (gaRunnerRef.current) {
        gaRunnerRef.current.terminate();
      }
    };
  }, []);

  // Sync visible Selection when tabs changed
  const handleViewTypeChange = (type: "class" | "teacher" | "day" | "all") => {
    setViewType(type);
    setIsCopying(false);
    setCopyTargetId("");
    if (type === "class" && classes.length > 0) {
      setSelectedEntityId(classes[0].id);
    } else if (type === "teacher" && teachers.length > 0) {
      setSelectedEntityId(teachers[0].id);
    } else if (type === "all" || type === "day") {
      setSelectedEntityId("");
    }
  };

  // Run AI-Assisted Loop Genetic Algorithm
  const runAiFeedbackLoop = async (activeSeed: number) => {
    setSolverRunning(true);
    setAiFeedbackResult(null);
    setAiLoopStep("ga1");
    setSolverLogs([
      "🧬 Yapay Zeka Destekli Döngüsel Genetik Algoritma Başlatıldı.",
      "🚀 Aşama 1/3: Genetik Algoritma ilk popülasyonu türetiyor ve çakışmasız fiziksel yerleşim arıyor...",
    ]);

    try {
      // Step 1: Run standard GA to generate an initial valid schedule
      const firstSchedule = await new Promise<PlanItem[]>((resolve, reject) => {
        const runner = runGeneticOptimizer(
          teachers,
          classes,
          classrooms,
          courses,
          config,
          {
            populationSize: gaPopulationSize,
            generations: Math.min(80, gaGenerations === -1 ? 200 : gaGenerations),
            mutationRate: gaMutationRate,
            seed: activeSeed,
          },
          (progress) => {
            setGaProgress({
              generation: progress.generation,
              bestScore: progress.bestScore,
              bestSchedule: progress.bestSchedule,
            });
            setSolverLogs(progress.logs);
            onUpdatePlans(progress.bestSchedule);
          }
        );
        gaRunnerRef.current = runner;

        runner.then((res) => {
          resolve(res.plans);
        }).catch((err) => {
          reject(err);
        });
      });

      setSolverLogs(prev => [
        ...prev,
        "✅ Aşama 1 Tamamlandı. İlk geçerli plan taslağı oluşturuldu.",
        "🧠 Aşama 2/3: Program pedagojik açıdan değerlendirilmek üzere Gemini AI Koordinatör servisine gönderiliyor..."
      ]);
      setAiLoopStep("ai_eval");

      // Step 2: Send schedule to AI feedback endpoint
      const apiSecret = (import.meta as ImportMeta & { env?: Record<string, string | undefined> }).env?.VITE_INTERNAL_API_SECRET;
      const response = await fetch("/api/ai/feedback-loop", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(apiSecret ? { "x-api-key": apiSecret } : {}),
        },
        body: JSON.stringify({
          plans: firstSchedule,
          teachers,
          classes,
          classrooms,
          courses,
          config,
        }),
      });

      if (!response.ok) {
        throw new Error("Yapay zeka pedagojik koordinatör servisine ulaşılamadı.");
      }

      const feedback = await response.json();
      setAiFeedbackResult(feedback);

      setSolverLogs(prev => [
        ...prev,
        `🤖 Yapay Zeka Değerlendirmesi Alındı! Sınıf Notu: [ ${feedback.grade} ]`,
        `💡 ${feedback.hints?.length || 0} adet pedagojik yönlendirme/ceza-ödül kuralı tespit edildi.`,
        "🚀 Aşama 3/3: Yapay zeka geri beslemeleriyle (penalties & rewards) desteklenmiş 2. aşama Genetik Algoritma optimizasyonu koşturuluyor..."
      ]);
      setAiLoopStep("ga2");

      // Step 3: Run the reinforced GA with hints injected
      const finalSchedule = await new Promise<PlanItem[]>((resolve, reject) => {
        const runner = runGeneticOptimizer(
          teachers,
          classes,
          classrooms,
          courses,
          config,
          {
            populationSize: gaPopulationSize,
            generations: gaGenerations === -1 ? 250 : gaGenerations,
            mutationRate: gaMutationRate,
            seed: activeSeed + 1,
            aiHints: feedback.hints || [],
          },
          (progress) => {
            setGaProgress({
              generation: progress.generation,
              bestScore: progress.bestScore,
              bestSchedule: progress.bestSchedule,
            });
            setSolverLogs(progress.logs);
            onUpdatePlans(progress.bestSchedule);
          }
        );
        gaRunnerRef.current = runner;

        runner.then((res) => {
          resolve(res.plans);
        }).catch((err) => {
          reject(err);
        });
      });

      onUpdatePlans(finalSchedule);
      setSolverLogs(prev => [
        ...prev,
        "🎉 Tebrikler! Yapay Zeka geri besleme döngüsü tamamlandı ve optimal pedagojik program başarıyla oluşturuldu!"
      ]);
      setAiLoopStep("completed");
      setShowLogsPanel(true);
      setActiveReportTab("logs");
    } catch (err: any) {
      console.error("AI Feedback loop failed:", err);
      setSolverLogs(prev => [...prev, `❌ Yapay Zeka Döngü Hatası: ${err.message || "Bilinmeyen bir hata oluştu"}`]);
      setAiLoopStep("idle");
    } finally {
      setSolverRunning(false);
      setGaProgress(null);
      gaRunnerRef.current = null;
    }
  };

  // Run Local Backtracking CP-SAT or Genetic Algorithm Optimizer
  const triggerOptimizer = (overrideSeed?: number) => {
    const activeSeed = overrideSeed !== undefined ? overrideSeed : seed;

    if (solverType === "genetic" && isAiLoopEnabled) {
      runAiFeedbackLoop(activeSeed);
      return;
    }

    setSolverRunning(true);
    setGaProgress(null);
    setSolverLogs([
      `📡 Optimizasyon motoru kuruluyor [Yöntem: ${solverType === "genetic" ? "Genetik Algoritma" : "Sezgisel Çözücü"} ]...`,
      "🔍 Kurum kısıt matrisleri çıkarılıyor..."
    ]);

    if (solverType === "genetic") {
      setTimeout(() => {
        try {
          const runner = runGeneticOptimizer(
            teachers,
            classes,
            classrooms,
            courses,
            config,
            {
              populationSize: gaPopulationSize,
              generations: gaGenerations,
              mutationRate: gaMutationRate,
              seed: activeSeed,
            },
            (progress) => {
              setGaProgress({
                generation: progress.generation,
                bestScore: progress.bestScore,
                bestSchedule: progress.bestSchedule,
              });
              setSolverLogs(progress.logs);
              // Canlı olarak en iyi sonucu haritaya yansıt
              onUpdatePlans(progress.bestSchedule);
            }
          );
          gaRunnerRef.current = runner;

          runner.then((result) => {
            setSolverLogs(result.logs);
            setUnassignedReqs([]); // GA her şeyi yerleştirir
            setClassReports([]);
            onUpdatePlans(result.plans);
            setShowLogsPanel(true);
            setActiveReportTab("logs");
            setSolverRunning(false);
            setGaProgress(null);
            gaRunnerRef.current = null;
          }).catch((error) => {
            console.error("GA error:", error);
            setSolverLogs(prev => [...prev, `❌ GA Hatası: ${error.message || "Bilinmeyen bir hata oluştu"}`]);
            setShowLogsPanel(true);
            setSolverRunning(false);
            setGaProgress(null);
            gaRunnerRef.current = null;
          });
        } catch (error: any) {
          console.error("GA init error:", error);
          setSolverLogs(prev => [...prev, `❌ GA Kurulum Hatası: ${error.message || "Bilinmeyen bir hata oluştu"}`]);
          setShowLogsPanel(true);
          setSolverRunning(false);
          setGaProgress(null);
          gaRunnerRef.current = null;
        }
      }, 500);
    } else {
      setTimeout(async () => {
        try {
          // En baştan oluşturmak için mevcut planları siliyoruz (boş array veriyoruz)
          const result = await runAlgorithmicOptimizer([], teachers, classes, classrooms, courses, config, { 
            optimizationMode,
            seed: activeSeed
          });
          
          setSolverLogs(result.logs);
          setUnassignedReqs(result.unassignedRequirements || []);
          setClassReports(result.classReports || []);
          onUpdatePlans(result.plans);
          setShowLogsPanel(true);
          setActiveReportTab("logs");
        } catch (error: any) {
          console.error("Optimizer error:", error);
          setSolverLogs(prev => [...prev, `❌ Kritik Hata: ${error.message || "Bilinmeyen bir hata oluştu"}`]);
          setShowLogsPanel(true);
        } finally {
          setSolverRunning(false);
        }
      }, 1200);
    }
  };

  // GA'yı El ile Durdurma Metodu
  const stopGaOptimizer = () => {
    if (gaRunnerRef.current) {
      gaRunnerRef.current.terminate();
      gaRunnerRef.current = null;
      setSolverRunning(false);
      setGaProgress(null);
      setSolverLogs(prev => [...prev, "🛑 Kullanıcı tarafından Genetik Algoritma durduruldu (İptal Edildi)."]);
    }
  };

  // Akıllı Otomatik Tamamlama (Smart Auto-Complete) simulation/heuristic
  const handleAutoComplete = async () => {
    setSolverRunning(true);
    setGaProgress(null);
    setSolverLogs([
      "📡 Akıllı Otomatik Tamamlama Başlatıldı...",
      "🔍 Mevcut yerleşimler taranıyor ve kilitleniyor...",
      "⚡ Atanmamış dersleri en uygun zaman dilimlerine yerleştirmek için simülasyon çalıştırılıyor..."
    ]);
    
    setTimeout(async () => {
      try {
        // Pass current plans to fill remaining hours
        const result = await runAlgorithmicOptimizer(plans, teachers, classes, classrooms, courses, config, { 
          optimizationMode: "balanced",
          seed: seed
        });
        
        setSolverLogs(result.logs);
        setUnassignedReqs(result.unassignedRequirements || []);
        setClassReports(result.classReports || []);
        onUpdatePlans(result.plans);
        setShowLogsPanel(true);
        setActiveReportTab("logs");
      } catch (error: any) {
        console.error("Auto-complete error:", error);
        setSolverLogs(prev => [...prev, `❌ Akıllı Otomatik Tamamlama Hatası: ${error.message || "Bilinmeyen bir hata oluştu"}`]);
        setShowLogsPanel(true);
      } finally {
        setSolverRunning(false);
      }
    }, 800);
  };

  // Fast Constraint-Based Auto-Assign (6-hour ideal limit and hard/soft constraints)
  const runFastAutoAssign = () => {
    setSolverRunning(true);
    setSolverLogs([
      "🧬 Akıllı Boşluk Doldurucu (Auto-Assign) Başlatıldı...",
      "🔍 Kısıtlar ve haftalık ders ihtiyaçları analiz ediliyor...",
      "📐 Hedef: Öğretmenler ve sınıflar için günlük ideal 6 saat sınırına sadık kalmak.",
    ]);

    setTimeout(() => {
      try {
        let currentPlans = [...plans];
        let totalAssigned = 0;
        const logsList: string[] = [];

        // Helper: get current remaining hours of a course for a class
        const getRemainingHours = (classId: string, courseId: string) => {
          const cls = classes.find(c => c.id === classId);
          if (!cls || !cls.aktifPasif) return 0;
          const course = courses.find(co => co.id === courseId);
          if (!course) return 0;
          
          const targetHours = Number(cls.haftalikDersIhtiyaci?.[course.dersAdi] || 0);
          const assignedHours = currentPlans.filter(p => p.sinifId === classId && p.dersId === courseId && p.planTuru !== PlanTuru.BOS).length;
          return Math.max(0, targetHours - assignedHours);
        };

        // Gather all empty slots for all active classes across active days/periods
        const activeDays = config.activeDays;
        const masterTimeSlots = getMasterTimeSlots(config);

        const emptySlots: { classId: string; day: string; periodNo: number; key: string }[] = [];
        classes.forEach(cls => {
          if (!cls.aktifPasif) return;
          
          // Sınıfın seviye politikası veya uygun periyot kısıtlarını kontrol et
          let allowedPeriods: string[] = [];
          if (cls.uygunPeriyotlar && cls.uygunPeriyotlar.length > 0) {
            allowedPeriods = [...cls.uygunPeriyotlar];
          } else {
            const policy = getLevelPolicy(cls);
            const activeCount = Math.max(14, masterTimeSlots.length);
            activeDays.forEach(day => {
              for (let pNo = 1; pNo <= activeCount; pNo++) {
                if (config.ogleArasiPeriyotNo && pNo === config.ogleArasiPeriyotNo) continue;
                if (!policy || isSlotAllowedForClassPolicy(cls, day, pNo, activeCount)) {
                  allowedPeriods.push(`${day}-${pNo}`);
                }
              }
            });
          }

          activeDays.forEach(day => {
            const activeCount = getActivePeriodsCountForDay(day, config);
            masterTimeSlots.forEach(slot => {
              if (slot.periyotNo > activeCount) return;
              if (config.ogleArasiPeriyotNo && slot.periyotNo === config.ogleArasiPeriyotNo) return;

              const slotId = `${day}-${slot.periyotNo}`;
              if (!allowedPeriods.includes(slotId)) return; // Sınıf penceresi dışı

              // Check if class has an assignment at this slot
              const hasPlan = currentPlans.some(p => p.sinifId === cls.id && p.periyotId === slotId && p.planTuru !== PlanTuru.BOS);
              if (!hasPlan) {
                emptySlots.push({
                  classId: cls.id,
                  day,
                  periodNo: slot.periyotNo,
                  key: `${cls.id}-${slotId}`
                });
              }
            });
          });
        });

        logsList.push(`📋 Toplam doldurulabilir boş hücre sayısı: ${emptySlots.length}`);

        if (emptySlots.length === 0) {
          logsList.push("✅ Doldurulacak boş hücre bulunmadı!");
          setSolverLogs(prev => [...prev, ...logsList, "🎉 Çizelge zaten tamamen dolu veya kısıtlar izin vermiyor."]);
          setSolverRunning(false);
          return;
        }

        // Shuffle empty slots with simple pseudo-randomness for variety
        let s = seed;
        const simpleRng = () => {
          let t = s += 0x6D2B79F5;
          t = Math.imul(t ^ (t >>> 15), t | 1);
          t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
          return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
        };

        for (let i = emptySlots.length - 1; i > 0; i--) {
          const j = Math.floor(simpleRng() * (i + 1));
          [emptySlots[i], emptySlots[j]] = [emptySlots[j], emptySlots[i]];
        }

        let madeProgress = true;
        let iteration = 0;
        
        while (madeProgress && emptySlots.length > 0 && iteration < 300) {
          madeProgress = false;
          iteration++;
          
          let bestAssignment: {
            emptySlotIdx: number;
            teacherId: string;
            courseId: string;
            roomId: string;
            score: number;
          } | null = null;

          for (let i = 0; i < emptySlots.length; i++) {
            const { classId, day, periodNo } = emptySlots[i];
            const slotId = `${day}-${periodNo}`;

            // Find courses this class still needs
            const cls = classes.find(c => c.id === classId)!;
            const neededCourses = courses.filter(co => {
              const remaining = getRemainingHours(classId, co.id);
              return remaining > 0 && (!co.kademe || !cls.kademe || co.kademe === cls.kademe);
            });

            for (const course of neededCourses) {
              // Find teachers who can teach this course and are available
              const availableTeachers = teachers.filter(t => {
                if (!t.aktifPasif) return false;
                if (t.brans !== course.brans) return false;
                
                // Weekly maximum check
                const assignedWeekly = currentPlans.filter(p => p.ogretmenId === t.id && p.planTuru !== PlanTuru.BOS).length;
                if (assignedWeekly >= (t.haftalikMaksimumDers || 30)) return false;

                // Teacher schedule availability check
                let isAvailable = false;
                if (t.uygunPeriyotlar && t.uygunPeriyotlar.length > 0) {
                  isAvailable = t.uygunPeriyotlar.includes(slotId);
                } else {
                  const hasDay = !t.uygunGunler || t.uygunGunler.length === 0 || t.uygunGunler.includes(day);
                  const hasHour = !t.uygunSaatler || t.uygunSaatler.length === 0 || t.uygunSaatler.includes(periodNo.toString());
                  isAvailable = hasDay && hasHour;
                }
                if (!isAvailable) return false;

                // Busy in this slot?
                const isBusy = currentPlans.some(p => p.ogretmenId === t.id && p.periyotId === slotId && p.planTuru !== PlanTuru.BOS);
                if (isBusy) return false;

                return true;
              });

              for (const teacher of availableTeachers) {
                // Find classrooms
                const busyRooms = currentPlans.filter(p => p.periyotId === slotId && p.planTuru !== PlanTuru.BOS).map(p => p.derslikId);
                const freeRooms = classrooms.filter(r => r.aktifPasif && !busyRooms.includes(r.id) && (r.kapasite >= cls.mevcutOgrenciSayisi));
                if (freeRooms.length === 0) continue;
                const room = freeRooms[0];

                // Scoring Model
                let score = 1000;

                // 1. Adherence to 6-hour daily ideal limit for teachers
                const teacherDailyHours = currentPlans.filter(p => p.ogretmenId === teacher.id && p.periyotId.startsWith(day) && p.planTuru !== PlanTuru.BOS).length;
                const teacherIdealLimit = teacher.idealGunlukDers || 6;
                const teacherMaxLimit = teacher.gunlukMaksimumDers || 8;

                if (teacherDailyHours >= teacherMaxLimit) {
                  score -= 1000; // Violates hard maximum
                } else if (teacherDailyHours >= teacherIdealLimit) {
                  score -= 350; // soft constraint violation (ideal daily limit)
                } else {
                  score += 150; // Reward for staying within ideal limit
                }

                // 2. Class daily hours limit (keep it balanced around 6 hours if possible)
                const classDailyHours = currentPlans.filter(p => p.sinifId === classId && p.periyotId.startsWith(day) && p.planTuru !== PlanTuru.BOS).length;
                if (classDailyHours >= 6) {
                  score -= 100;
                } else {
                  score += 50;
                }

                // 3. Teacher Gap Minimization (proximity to existing lessons)
                const otherTeacherPeriods = currentPlans
                  .filter(p => p.ogretmenId === teacher.id && p.periyotId.startsWith(day) && p.planTuru !== PlanTuru.BOS)
                  .map(p => {
                    const parts = p.periyotId.split("-");
                    return Number(parts[1]);
                  });

                if (otherTeacherPeriods.length > 0) {
                  const hasAdjacent = otherTeacherPeriods.some(pNum => Math.abs(pNum - periodNo) === 1);
                  if (hasAdjacent) {
                    score += 250; // Huge bonus to make schedule continuous
                  } else {
                    score -= 80; // Penalty for scattered lessons causing gaps
                  }
                } else {
                  score += 20; // First lesson of the day is fine
                }

                // 4. Same subject block preference
                const otherClassCoursePeriods = currentPlans
                  .filter(p => p.sinifId === classId && p.dersId === course.id && p.periyotId.startsWith(day) && p.planTuru !== PlanTuru.BOS)
                  .map(p => {
                    const parts = p.periyotId.split("-");
                    return Number(parts[1]);
                  });
                if (otherClassCoursePeriods.length > 0) {
                  const hasAdjacentCourse = otherClassCoursePeriods.some(pNum => Math.abs(pNum - periodNo) === 1);
                  if (hasAdjacentCourse) {
                    score += 150; // Prefer block lessons
                  }
                }

                // 5. Remaining hours pressure
                const remHours = getRemainingHours(classId, course.id);
                score += remHours * 30;

                if (score > 0 && (!bestAssignment || score > bestAssignment.score)) {
                  bestAssignment = {
                    emptySlotIdx: i,
                    teacherId: teacher.id,
                    courseId: course.id,
                    roomId: room.id,
                    score
                  };
                }
              }
            }
          }

          if (bestAssignment && bestAssignment.score > -100) {
            const { emptySlotIdx, teacherId, courseId, roomId } = bestAssignment;
            const slot = emptySlots[emptySlotIdx];
            const slotId = `${slot.day}-${slot.periodNo}`;

            const cls = classes.find(c => c.id === slot.classId)!;
            const t = teachers.find(te => te.id === teacherId)!;
            const co = courses.find(c => c.id === courseId)!;
            const r = classrooms.find(cl => cl.id === roomId)!;

            const newPlan: PlanItem = {
              id: `app-auto-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
              planTuru: co.brans === "Rehberlik" ? PlanTuru.REHBERLIK : PlanTuru.NORMAL_DERS,
              durum: "Onaylı",
              sinifId: cls.id,
              dersId: co.id,
              ogretmenId: t.id,
              derslikId: r.id,
              periyotId: slotId,
            };

            currentPlans.push(newPlan);
            totalAssigned++;

            if (totalAssigned <= 15) {
              logsList.push(`✍️ [Eşleşme] Sınıf: ${cls.sinifAdi} | ${slot.day} Periyot ${slot.periodNo} ➡️ ${t.adSoyad} (${co.dersAdi}) [Derslik: ${r.derslikAdi}]`);
            } else if (totalAssigned === 16) {
              logsList.push(`... ve diğer boş zaman pencereleri dolduruluyor ...`);
            }

            emptySlots.splice(emptySlotIdx, 1);
            madeProgress = true;
          }
        }

        logsList.push(`🎉 Otomatik Boşluk Doldurma Tamamlandı!`);
        logsList.push(`🎯 Toplam yerleştirilen ders saati: ${totalAssigned}`);

        onUpdatePlans(currentPlans);
        setSolverLogs(prev => [...prev, ...logsList, "✅ Otomatik atama başarıyla tamamlandı."]);
        setShowLogsPanel(true);
        setActiveReportTab("logs");
      } catch (error: any) {
        console.error("Auto-assign error:", error);
        setSolverLogs(prev => [...prev, `❌ Boşluk doldurma hatası: ${error.message || "Bilinmeyen hata"}`]);
      } finally {
        setSolverRunning(false);
      }
    }, 600);
  };


  // Add individual assignment manually
  const saveManualAssignment = (day: string, periodNo: number, overrideClassId?: string) => {
    const slotId = `${day}-${periodNo}`;
    const targetClassId = overrideClassId || (viewType === "class" ? selectedEntityId : setupClassId);
    const targetTeId = viewType === "teacher" ? selectedEntityId : setupTeacherId;
    const targetRoomId = setupClassroomId; // since we removed classroom view, it always comes from setup
    
    if (!setupCourseId || !targetTeId || !targetRoomId || !targetClassId) {
      setSetupError("Lütfen tüm alanları doldurun.");
      return;
    }

    const teacherObj = teachers.find((t) => t.id === targetTeId);
    if (teacherObj) {
      const isAvailableDay = teacherObj.uygunGunler.includes(day);
      const isAvailableHour = teacherObj.uygunSaatler.includes(periodNo.toString());
      if (!isAvailableDay || !isAvailableHour) {
        setSetupError("Öğretmen takvimi bu zaman dilimi için uygun değil!");
        return;
      }
    }

    const courseObj = courses.find((c) => c.id === setupCourseId);

    const newAssignment: PlanItem = {
      id: `man-plan-${Date.now()}`,
      sinifId: targetClassId,
      dersId: setupCourseId,
      ogretmenId: targetTeId,
      derslikId: targetRoomId,
      periyotId: slotId,
      planTuru: courseObj?.brans === "Rehberlik" ? PlanTuru.REHBERLIK : PlanTuru.NORMAL_DERS,
      durum: "Onaylı",
    };

    // Filter out existing exact slot configurations for this class to allow overwrites cleanly
    const filteredPlans = plans.filter(
      (p) => !(p.sinifId === targetClassId && p.periyotId === slotId)
    );

    onUpdatePlans([...filteredPlans, newAssignment]);
    setActiveSetupSlot(null);
    clearSetupFields();
  };

  const deleteAssignment = (planId: string) => {
    const filtered = plans.filter((p) => p.id !== planId);
    onUpdatePlans(filtered);
  };

  const clearSetupFields = () => {
    setSetupCourseId("");
    setSetupTeacherId("");
    setSetupClassroomId("");
    setSetupClassId("");
    setSetupError(null);
  };

  const triggerResetEntity = () => {
    if (viewType === "all") return;
    const name = viewType === "class" 
      ? (currentEntity as ClassUnit)?.sinifAdi
      : (currentEntity as Teacher)?.adSoyad;
    
    setEntityToReset({
      id: selectedEntityId,
      name: name || "Bilinmiyor",
      type: viewType
    });
  };

  const handleConfirmReset = () => {
    if (!entityToReset) return;
    const filteredPlans = plans.filter(p => {
      if (entityToReset.type === "class") return p.sinifId !== entityToReset.id;
      if (entityToReset.type === "teacher") return p.ogretmenId !== entityToReset.id;
      return true;
    });
    onUpdatePlans(filteredPlans);
    setEntityToReset(null);
  };

  const handleCopySchedule = () => {
    if (!copyTargetId) return;

    const currentPlans = plans.filter(p => {
      if (viewType === "class") return p.sinifId === selectedEntityId;
      if (viewType === "teacher") return p.ogretmenId === selectedEntityId;
      return false;
    });

    if (currentPlans.length === 0) {
      setSetupError("Kopyalanacak ders bulunamadı.");
      return;
    }

    const newPlans = currentPlans.map(p => ({
      ...p,
      id: `copy-${Date.now()}-${Math.random().toString(36).substring(7)}`,
      sinifId: viewType === "class" ? copyTargetId : p.sinifId,
      ogretmenId: viewType === "teacher" ? copyTargetId : p.ogretmenId,
    }));

    const withoutTargetPlans = plans.filter(p => {
        if (viewType === "class") return p.sinifId !== copyTargetId;
        if (viewType === "teacher") return p.ogretmenId !== copyTargetId;
        return true;
    });

    onUpdatePlans([...withoutTargetPlans, ...newPlans]);
    setIsCopying(false);
    setCopyTargetId("");
    setSelectedEntityId(copyTargetId);
  };

  // Helper selectors
  const visibleEntities = 
    viewType === "class" 
      ? classes 
      : teachers;

  const currentEntity = visibleEntities.find((e) => e.id === selectedEntityId);

  // Filter plans related to current entity for rendering grid
  const getPlanAtCell = (day: string, periodNo: number, explicitEntityId?: string) => {
    const slot = `${day}-${periodNo}`;
    const entityIdToCheck = explicitEntityId || selectedEntityId;
    
    return plans.find((p) => {
      if (viewType === "class" || viewType === "all") {
        return p.sinifId === entityIdToCheck && p.periyotId === slot;
      } else if (viewType === "teacher") {
        return p.ogretmenId === entityIdToCheck && p.periyotId === slot;
      } else if (viewType === "day") {
        if (dayViewMode === "class") {
          return p.sinifId === entityIdToCheck && p.periyotId === slot;
        } else {
          return p.ogretmenId === entityIdToCheck && p.periyotId === slot;
        }
      }
      return false;
    });
  };

  // Get all associated violations for a cell
  const getCellViolations = (day: string, periodNo: number, explicitEntityId?: string) => {
    const slot = `${day}-${periodNo}`;
    const entityIdToCheck = explicitEntityId || selectedEntityId;

    return violations.filter((v) => {
      return v.bilesenIds.some((bId) => {
        const pItem = plans.find((pl) => pl.id === bId);
        return pItem?.periyotId === slot && (
          ((viewType === "class" || viewType === "all") && pItem.sinifId === entityIdToCheck) ||
          (viewType === "teacher" && pItem.ogretmenId === entityIdToCheck) ||
          (viewType === "day" && (
            (dayViewMode === "class" && pItem.sinifId === entityIdToCheck) ||
            (dayViewMode === "teacher" && pItem.ogretmenId === entityIdToCheck)
          ))
        );
      });
    });
  };

  // State to hold sidebar errors if any
  const [sidebarError, setSidebarError] = useState<string | null>(null);

  // Suggested Teachers helper logic
  const getSuggestedTeachersForSlot = (classId: string, day: string, periodNo: number) => {
    const classObj = classes.find(c => c.id === classId);
    if (!classObj) return [];

    const neededBranches = Object.keys(classObj.haftalikDersIhtiyaci || {});

    return teachers.map((t) => {
      // 1. Calculate remaining hours
      const assignedHours = plans.filter(p => p.ogretmenId === t.id && p.planTuru !== PlanTuru.BOS).length;
      const remainingHours = Math.max(0, t.haftalikMaksimumDers - assignedHours);

      // 2. Check subject expertise match
      const teachesNeededSubject = neededBranches.includes(t.brans);

      // 3. Check time availability (takvim)
      const cellSlotKey = `${day}-${periodNo}`;
      let isTakvimAvailable = false;
      if (t.uygunPeriyotlar && t.uygunPeriyotlar.length > 0) {
        isTakvimAvailable = t.uygunPeriyotlar.includes(cellSlotKey);
      } else {
        const isAvailableDay = t.uygunGunler.includes(day);
        const isAvailableHour = t.uygunSaatler.includes(periodNo.toString());
        isTakvimAvailable = isAvailableDay && isAvailableHour;
      }

      // 4. Check if already teaching another class at this slot
      const isAlreadyTeaching = plans.some(
        (p) => p.ogretmenId === t.id && p.periyotId === cellSlotKey && p.planTuru !== PlanTuru.BOS
      );

      // 5. Determine score and status
      let score = 0;
      let status: "excellent" | "busy" | "unavail" | "full" = "excellent";
      let reason = "Müsait ve ders saati var";

      if (isAlreadyTeaching) {
        status = "busy";
        reason = "Bu saatte başka sınıfta derste";
        score -= 50;
      } else if (!isTakvimAvailable) {
        status = "unavail";
        reason = "Kendi takvimine göre bu saatte müsait değil";
        score -= 100;
      } else if (remainingHours <= 0) {
        status = "full";
        reason = "Haftalık maksimum ders saati dolmuş";
        score -= 30;
      }

      if (teachesNeededSubject) {
        score += 100; // Prefer expertise
      }

      score += remainingHours * 2;

      if (t.bosGunTercihi !== day) {
        score += 10;
      } else {
        reason += " (Boş Gün Tercihi)";
      }

      return {
        teacher: t,
        remainingHours,
        totalHours: t.haftalikMaksimumDers,
        assignedHours,
        teachesNeededSubject,
        isTakvimAvailable,
        isAlreadyTeaching,
        status,
        reason,
        score
      };
    }).sort((a, b) => b.score - a.score);
  };

  const assignSuggestedTeacher = (teacher: Teacher, day: string, periodNo: number, classId: string) => {
    setSidebarError(null);
    const classObj = classes.find(c => c.id === classId);
    if (!classObj) return;

    const matchedCourse = courses.find(c => c.brans === teacher.brans && c.kademe === classObj.kademe);
    if (!matchedCourse) {
      setSidebarError(`Öğretmenin branşı (${teacher.brans}) bu sınıfın kademesi (${classObj.kademe}) ile uyumlu bir dersle eşleşmiyor.`);
      return;
    }

    const busyRooms = plans.filter(p => p.periyotId === `${day}-${periodNo}` && p.planTuru !== PlanTuru.BOS).map(p => p.derslikId);
    const availableRoom = classrooms.find(r => r.aktifPasif && !busyRooms.includes(r.id));
    const classroomId = availableRoom?.id || classrooms[0]?.id || "";

    const newAssignment: PlanItem = {
      id: `sug-plan-${Date.now()}`,
      sinifId: classId,
      dersId: matchedCourse.id,
      ogretmenId: teacher.id,
      derslikId: classroomId,
      periyotId: `${day}-${periodNo}`,
      planTuru: matchedCourse.brans === "Rehberlik" ? PlanTuru.REHBERLIK : PlanTuru.NORMAL_DERS,
      durum: "Onaylı",
    };

    const filteredPlans = plans.filter(
      (p) => !(p.sinifId === classId && p.periyotId === `${day}-${periodNo}`)
    );

    onUpdatePlans([...filteredPlans, newAssignment]);
  };

  const entitiesToRender = (viewType === "all" || viewType === "day") ? [] : currentEntity ? [currentEntity] : [];

  return (
    <div className="space-y-6">
      {entityToReset && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl w-full max-w-sm overflow-hidden flex flex-col shadow-2xl">
            <div className="px-5 py-6 flex flex-col items-center text-center">
              <div className="w-12 h-12 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center mb-4 border border-rose-200">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-800 mb-2 font-sans tracking-tight">Emin misiniz?</h3>
              <p className="text-xs text-slate-500 font-medium leading-relaxed px-2">
                {entityToReset.name} ({entityToReset.type === "class" ? "Sınıf" : "Öğretmen"}) programı tamamen silinecektir.
              </p>
            </div>
            <div className="flex items-center p-4 gap-3 bg-slate-50 border-t border-slate-100 rounded-b-3xl">
              <button 
                onClick={() => setEntityToReset(null)}
                className="flex-1 px-4 py-2 bg-white border border-slate-200 text-slate-700 text-sm font-bold rounded-xl hover:bg-slate-100 transition-colors shadow-sm"
              >
                İptal
              </button>
              <button 
                onClick={handleConfirmReset}
                className="flex-1 px-4 py-2 bg-rose-600 text-white text-sm font-bold rounded-xl hover:bg-rose-700 transition-all shadow-md shadow-rose-600/20"
              >
                Evet, Sıfırla
              </button>
            </div>
          </div>
        </div>
      )}

      {resolutionSuggestion && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" id="auto-resolve-modal">
          <div className="bg-white rounded-3xl w-full max-w-lg overflow-hidden flex flex-col shadow-2xl border border-slate-100 max-h-[90vh]">
            <div className="bg-indigo-600 text-white px-6 py-5 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Sparkles className="w-5 h-5 text-indigo-200 animate-pulse" />
                <div>
                  <h3 className="text-sm font-extrabold font-sans tracking-tight">Oto-Çözüm & Akıllı Slot Önerici</h3>
                  <span className="text-[10px] text-indigo-100 font-medium block mt-0.5">Uyumlu ders programı koordinasyon motoru</span>
                </div>
              </div>
              <button 
                onClick={() => setResolutionSuggestion(null)}
                className="text-indigo-100 hover:text-white bg-indigo-700/50 hover:bg-indigo-700/80 px-2 py-1 rounded-xl transition font-sans text-sm font-bold"
              >
                Kapat
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4">
              <div className="bg-indigo-50/50 p-4 rounded-2xl border border-indigo-100 flex items-center justify-between gap-4">
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider block">Yeri Değişecek Ders Bilgisi</span>
                  <h4 className="text-sm font-bold text-slate-800 font-sans">
                    {courses.find(c => c.id === resolutionSuggestion.planItem.dersId)?.dersAdi || "Ders"}
                  </h4>
                  <div className="flex items-center gap-2 text-[11px] text-slate-500 font-medium">
                    <span className="flex items-center gap-1">
                      <User className="w-3.5 h-3.5 text-indigo-500" />
                      {teachers.find(t => t.id === resolutionSuggestion.planItem.ogretmenId)?.adSoyad}
                    </span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <BookOpen className="w-3.5 h-3.5 text-indigo-500" />
                      {classes.find(c => c.id === resolutionSuggestion.planItem.sinifId)?.sinifAdi}
                    </span>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Mevcut Çizelge</span>
                  <span className="text-xs font-mono font-bold bg-slate-100 text-slate-600 px-2.5 py-1 rounded-lg inline-block mt-1">
                    {resolutionSuggestion.planItem.durum === "Conflict Detected" 
                      ? "Çakışma / Atanamadı" 
                      : `${resolutionSuggestion.currentDay} - ${resolutionSuggestion.currentPeriod}. Periyot`}
                  </span>
                </div>
              </div>

              <div className="space-y-1">
                <span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider block">
                  En Uygun Boş Slot Önerileri (Etki Simülasyonu)
                </span>
                <p className="text-[11px] text-slate-400 leading-relaxed font-sans">
                  Sınıf, derslik ve öğretmen müsaitlikleri kısıt kurallarına göre taranmıştır. Uygulamak istediğiniz seçeneği işaretleyin.
                </p>
              </div>

              <div className="space-y-2 max-h-[35vh] overflow-y-auto pr-1">
                {resolutionSuggestion.suggestions.length === 0 ? (
                  <div className="text-center py-8 text-xs text-slate-400 border border-dashed border-slate-200 rounded-xl leading-relaxed">
                    Haftalık planda bu ders için hiçbir alternatif boş zaman dilimi bulunamadı. Lütfen öğretmen uygunluklarını kontrol edin ya da kısıtları hafifletin.
                  </div>
                ) : (
                  resolutionSuggestion.suggestions.slice(0, 5).map((sug, idx) => {
                    const isSelected = resolutionSuggestion.selectedIndex === idx;
                    const hasHard = sug.hardViolationsCount > 0;
                    const hasSoft = sug.violationsCount > 0 && !hasHard;

                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setResolutionSuggestion({ ...resolutionSuggestion, selectedIndex: idx })}
                        className={`w-full text-left p-3 rounded-xl border transition-all flex justify-between items-center gap-4 ${
                          isSelected 
                            ? "border-indigo-650 bg-indigo-50/50 ring-1 ring-indigo-500 shadow-sm" 
                            : "border-slate-200 hover:border-slate-350 bg-white"
                        }`}
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className={`text-[10px] font-mono font-extrabold px-2 py-0.5 rounded-lg uppercase block ${
                              isSelected ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-700"
                            }`}>
                              {sug.day} / {sug.periodNo}. Periyot
                            </span>
                            <span className={`text-[10px] font-bold ${
                              hasHard ? "text-rose-600" : hasSoft ? "text-amber-600" : "text-emerald-600"
                            }`}>
                              {sug.message}
                            </span>
                          </div>
                          
                          {isSelected && sug.violationsList.length > 0 && (
                            <div className="pt-1 space-y-0.5 border-t border-indigo-100/50 mt-1">
                              {sug.violationsList.map((err, errIdx) => (
                                <p key={errIdx} className="text-[9.5px] text-slate-500 leading-tight flex items-start gap-1">
                                  <span className="text-rose-500 shrink-0 select-none">•</span>
                                  <span>{err}</span>
                                </p>
                              ))}
                            </div>
                          )}
                        </div>

                        <div className="text-right shrink-0">
                          <span className={`text-[9px] uppercase font-extrabold px-2 py-1 rounded-lg ${
                            hasHard 
                              ? "bg-rose-50 text-rose-700 border border-rose-100" 
                              : hasSoft 
                                ? "bg-amber-50 text-amber-700 border border-amber-100" 
                                : "bg-emerald-50 text-emerald-700 border border-emerald-100"
                          }`}>
                            {hasHard ? "Riskli Slot" : hasSoft ? "Yarı Uygun" : "Sıfır Çakışma"}
                          </span>
                        </div>
                      </button>
                    );
                  })
                )}
              </div>

              {resolutionSuggestion.suggestions[resolutionSuggestion.selectedIndex] && (
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/50 text-[11px] text-slate-500 leading-relaxed font-sans">
                  <span className="font-bold text-slate-700 block text-[10px] uppercase tracking-wider mb-0.5">Etki Analizi Özeti</span>
                  Dersi <strong>{resolutionSuggestion.suggestions[resolutionSuggestion.selectedIndex].day} - {resolutionSuggestion.suggestions[resolutionSuggestion.selectedIndex].periodNo}. Periyot</strong> dilimine taşıdığınızda tüm ilgili çakışmalar otomatik olarak çözümlenecek ve program güncellenecektir.
                </div>
              )}
            </div>

            <div className="flex items-center p-4 gap-3 bg-slate-50 border-t border-slate-100 rounded-b-3xl">
              <button 
                type="button"
                onClick={() => setResolutionSuggestion(null)}
                className="flex-1 py-2 bg-white border border-slate-200 text-slate-700 text-xs font-bold rounded-xl hover:bg-slate-50 transition shadow-sm"
              >
                Vazgeç / İptal
              </button>
              <button 
                type="button"
                disabled={resolutionSuggestion.suggestions.length === 0}
                onClick={handleApplyResolution}
                className="flex-1 py-2 bg-indigo-600 text-white text-xs font-bold rounded-xl hover:bg-indigo-700 disabled:opacity-50 shadow-md shadow-indigo-600/20 transition-all font-sans"
              >
                Yeni Slot Önerisini Uygula
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Top action block */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200/60 shadow-xl shadow-slate-105 space-y-6">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 pb-4 border-b border-slate-100">
          <div>
            <h2 className="text-xl font-extrabold text-slate-900 font-sans flex items-center gap-2 tracking-tight">
              <SlidersHorizontal className="w-5 h-5 text-indigo-600" />
              İnteraktif Algoritmik Çizelgeleyici
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Ders programını kurum kısıtları doğrultusunda optimize edin. Çakışmaları süpürmek için sezgisel veya genetik motoru koşturun.
            </p>
          </div>

          {/* Model Solver Type Selector */}
          <div className="flex flex-col gap-1.5 w-full sm:w-auto shrink-0">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Algoritma Çözücü Tipi</span>
            <div className="inline-flex bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-sans font-semibold">
              <button
                type="button"
                disabled={solverRunning}
                onClick={() => setSolverType("heuristic")}
                className={`px-4 py-2 rounded-lg transition-all flex items-center gap-1.5 ${
                  solverType === "heuristic"
                    ? "bg-white text-indigo-600 shadow-md border border-slate-200/50"
                    : "text-slate-600 hover:text-slate-900 duration-150"
                } ${solverRunning ? "opacity-60 cursor-not-allowed" : ""}`}
              >
                ⚙️ Sezgisel Backtracking
              </button>
              <button
                type="button"
                disabled={solverRunning}
                onClick={() => setSolverType("genetic")}
                className={`px-4 py-2 rounded-lg transition-all flex items-center gap-1.5 ${
                  solverType === "genetic"
                    ? "bg-white text-indigo-600 shadow-md border border-slate-200/50"
                    : "text-slate-600 hover:text-slate-905 duration-150"
                } ${solverRunning ? "opacity-60 cursor-not-allowed" : ""}`}
              >
                🧬 Genetik Algoritma (GA)
              </button>
            </div>
          </div>
        </div>

        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
          <div className="flex flex-wrap items-center gap-5 w-full lg:w-auto">
            {/* Conditional options rendering based on solverType */}
            {solverType === "heuristic" ? (
              /* Heuristic constraints options */
              <div className="flex flex-col gap-1.5">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Optimizasyon Önceliği</span>
                <div className="inline-flex bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-sans font-semibold">
                  <button
                    type="button"
                    disabled={solverRunning}
                    onClick={() => setOptimizationMode("completeness")}
                    className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1 ${
                      optimizationMode === "completeness"
                        ? "bg-white text-indigo-600 shadow-sm border border-slate-200/50"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                    title="Derslerin eksiksiz sığdırılması için gerektiğinde 1 saatlik bloklara bölünmesini sağlar."
                  >
                    🎯 Tamamlama
                  </button>
                  <button
                    type="button"
                    disabled={solverRunning}
                    onClick={() => setOptimizationMode("balanced")}
                    className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1 ${
                      optimizationMode === "balanced"
                        ? "bg-white text-indigo-600 shadow-sm border border-slate-200/50"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                    title="Önce çiftli/üçlü blokları dener. Sadece yerleşemeyen dersleri 1 saatlik bağımsız parçalara düşürür."
                  >
                    ⚖️ Dengeli
                  </button>
                  <button
                    type="button"
                    disabled={solverRunning}
                    onClick={() => setOptimizationMode("pedagogical")}
                    className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1 ${
                      optimizationMode === "pedagogical"
                        ? "bg-white text-indigo-600 shadow-sm border border-slate-200/50"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                    title="Çiftli/üçlü blok bütünlüğünü sıkıca korur; dersleri asla 1 saate parçalamaz."
                  >
                    🎓 Pedagojik
                  </button>
                </div>
              </div>
            ) : (
              /* Genetic Algorithm constraints options */
              <div className="flex flex-wrap items-center gap-4">
                <div className="flex flex-col gap-1.5">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Popülasyon</span>
                  <select
                    value={gaPopulationSize}
                    onChange={(e) => setGaPopulationSize(Number(e.target.value))}
                    disabled={solverRunning}
                    className="bg-slate-100 border border-slate-200 text-xs font-bold font-sans rounded-xl h-[38px] px-3 focus:outline-none focus:ring-2 focus:ring-indigo-505 text-slate-705 transition"
                  >
                    <option value={30}>30 (Hızlı)</option>
                    <option value={60}>60 (Dengeli)</option>
                    <option value={100}>100 (Kapsamlı)</option>
                    <option value={150}>150 (Yüksek Kalite)</option>
                  </select>
                </div>
                
                <div className="flex flex-col gap-1.5">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Maks Nesil</span>
                  <select
                    value={gaGenerations}
                    onChange={(e) => setGaGenerations(Number(e.target.value))}
                    disabled={solverRunning}
                    className="bg-slate-100 border border-slate-200 text-xs font-bold font-sans rounded-xl h-[38px] px-3 focus:outline-none focus:ring-2 focus:ring-indigo-505 text-slate-705 transition"
                  >
                    <option value={50}>50 Jenerasyon</option>
                    <option value={100}>100 Jenerasyon</option>
                    <option value={200}>200 Jenerasyon</option>
                    <option value={350}>350 Jenerasyon</option>
                    <option value={500}>500 Jenerasyon</option>
                    <option value={1000}>1000 Jenerasyon</option>
                    <option value={2000}>2000 Jenerasyon</option>
                    <option value={5000}>5000 Jenerasyon</option>
                    <option value={10000}>10000 Jenerasyon</option>
                    <option value={-1}>Dinamik (0 Hata / Maks 10000 Jenerasyon)</option>
                  </select>
                </div>

                <div className="flex flex-col gap-1.5">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider font-sans">Mutasyon Oranı</span>
                  <select
                    value={gaMutationRate}
                    onChange={(e) => setGaMutationRate(Number(e.target.value))}
                    disabled={solverRunning}
                    className="bg-slate-100 border border-slate-200 text-xs font-bold font-sans rounded-xl h-[38px] px-3 focus:outline-none focus:ring-2 focus:ring-indigo-505 text-slate-705 transition"
                  >
                    <option value={0.05}>%5 (Kararlı)</option>
                    <option value={0.10}>%10</option>
                    <option value={0.15}>%15 (Optimal)</option>
                    <option value={0.25}>%25 (Agresif)</option>
                    <option value={0.35}>%35 (Aşırı Değişim)</option>
                  </select>
                </div>

                <div className="flex flex-col gap-1.5 border-l border-slate-200 pl-4">
                  <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider flex items-center gap-1 font-sans">
                    <Sparkles className="w-3 h-3 text-indigo-505 animate-pulse" /> AI Geri Besleme
                  </span>
                  <label className="relative inline-flex items-center cursor-pointer h-[38px]">
                    <input
                      type="checkbox"
                      checked={isAiLoopEnabled}
                      onChange={(e) => setIsAiLoopEnabled(e.target.checked)}
                      disabled={solverRunning}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                    <span className="ml-2 text-xs font-bold text-slate-700 font-sans">
                      {isAiLoopEnabled ? "Aktif (3 Aşama)" : "Pasif"}
                    </span>
                  </label>
                </div>
              </div>
            )}

            {/* Çözüm Tohumu (Seed) */}
            <div className="flex flex-col gap-1.5 w-full sm:w-auto">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Çözüm Seed (Tohum)</span>
              <div className="flex items-center justify-between bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-sans font-semibold h-[38px] px-3 gap-2 min-w-[100px]">
                <span className="text-slate-600 flex items-center gap-1" title="Mevcut deterministik tohum değeri">
                  🌱 {seed}
                </span>
                <button
                  type="button"
                  onClick={() => setSeed(Math.floor(Math.random() * 9000 + 1000))}
                  className="p-1 rounded-lg hover:bg-slate-200 text-slate-500 hover:text-slate-700 transition"
                  title="Rastgele yeni bir tohum seç"
                  disabled={solverRunning}
                >
                  <RefreshCw className="w-3 h-3" />
                </button>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap lg:flex-nowrap items-center gap-3 w-full lg:w-auto justify-end">
            {/* Live Progress Bar for Genetic Algorithm */}
            {solverRunning && solverType === "genetic" && gaProgress && (
              <div className="flex flex-col gap-1 w-full sm:w-48 bg-slate-50 border border-slate-200 p-2 rounded-xl shrink-0">
                <div className="flex justify-between items-center text-[10px] font-bold text-slate-600 font-mono">
                  <span>Jenerasyon {gaProgress.generation}/{gaGenerations === -1 ? "Dinamik" : gaGenerations}</span>
                  <span className="text-indigo-600">{gaProgress.bestScore} Puan</span>
                </div>
                <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                  <div 
                    className="bg-indigo-600 h-full transition-all duration-300"
                    style={{ width: `${Math.min(100, (gaProgress.generation / (gaGenerations === -1 ? 10000 : gaGenerations)) * 100)}%` }}
                  />
                </div>
              </div>
            )}

            <div className="flex gap-2 w-full sm:w-auto">
              {solverRunning && solverType === "genetic" && (
                <button
                  type="button"
                  onClick={stopGaOptimizer}
                  className="text-xs font-bold font-sans bg-rose-50 border border-rose-250 text-rose-600 hover:bg-rose-100 px-4 py-3 rounded-xl flex items-center justify-center gap-2 shadow-sm transition duration-150 w-full sm:w-auto"
                >
                  <span className="w-2 h-2 bg-rose-600 rounded-full animate-ping shrink-0" />
                  GA Durdur
                </button>
              )}

              <button 
                disabled={solverRunning}
                onClick={() => triggerOptimizer()}
                className={`text-xs font-bold font-sans text-white px-5 py-3 rounded-xl flex items-center justify-center gap-2 shadow-lg transition w-full sm:w-auto ${
                  solverRunning 
                    ? "bg-indigo-400 cursor-not-allowed" 
                    : "bg-indigo-600 hover:bg-indigo-700 hover:shadow-indigo-500/20"
                }`}
                title="Aynı tohum (seed) değeri ile her zaman aynı yerleşimi üretir (determnistirmik)."
              >
                <Sparkles className={`w-4 h-4 ${solverRunning ? "animate-spin" : "animate-pulse"}`} />
                {solverRunning ? (solverType === "genetic" ? "Yerleştiriliyor..." : "Çizelge Çözülüyor...") : "Otomatik Yerleştirme"}
              </button>

              <button 
                disabled={solverRunning}
                onClick={handleAutoComplete}
                className={`text-xs font-bold font-sans text-white px-5 py-3 rounded-xl flex items-center justify-center gap-2 shadow-lg transition w-full sm:w-auto ${
                  solverRunning 
                    ? "bg-teal-400 cursor-not-allowed" 
                    : "bg-teal-600 hover:bg-teal-700 hover:shadow-teal-500/20"
                }`}
                title="Mevcut yerleşimleri koruyarak atanmamış dersleri kısıtlara göre otomatik tamamlar."
              >
                <Wand2 className={`w-4 h-4 ${solverRunning ? "animate-spin" : ""}`} />
                Akıllı Otomatik Tamamlama
              </button>

              <button 
                disabled={solverRunning}
                onClick={runFastAutoAssign}
                className={`text-xs font-bold font-sans text-white px-5 py-3 rounded-xl flex items-center justify-center gap-2 shadow-lg transition w-full sm:w-auto ${
                  solverRunning 
                    ? "bg-purple-400 cursor-not-allowed" 
                    : "bg-purple-600 hover:bg-purple-700 hover:shadow-purple-500/20"
                }`}
                title="Kısıt ve 6-saat ideal günlük ders limitini gözeterek boşlukları hızlıca otomatik doldurur."
              >
                <CheckCircle2 className={`w-4 h-4 ${solverRunning ? "animate-spin" : ""}`} />
                Hızlı Otomatik Ata
              </button>

              {!solverRunning && (
                <button 
                  type="button"
                  disabled={solverRunning}
                  onClick={() => {
                    const newSeed = Math.floor(Math.random() * 9000 + 1000);
                    setSeed(newSeed);
                    triggerOptimizer(newSeed);
                  }}
                  className="text-xs font-bold font-sans px-4 py-3 bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 hover:text-slate-950 rounded-xl flex items-center justify-center gap-2 transition w-full sm:w-auto shadow-sm"
                  title="Yeni rastgele tohum atayarak farklı bir yerleşim kombinasyonu dener."
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  Alternatif Üret
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Solver logs block */}
      {showLogsPanel && (
        <div id="optimizer-reports-panel" className="bg-slate-900 text-slate-300 p-5 rounded-2xl border border-slate-800 space-y-4 relative shadow-xl">
          
          {/* AI Loop Progress Stepper */}
          {solverRunning && isAiLoopEnabled && (
            <div className="bg-slate-950 p-4 rounded-xl border border-slate-850 mb-4 font-sans">
              <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2 mb-3">
                <Sparkles className="w-4 h-4 text-indigo-400 animate-pulse" />
                Döngüsel Yapay Zeka Geri Besleme Durumu
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {/* Step 1 */}
                <div className={`p-3 rounded-lg border transition ${
                  aiLoopStep === "ga1" 
                    ? "bg-indigo-950/40 border-indigo-500/40 text-white shadow-md shadow-indigo-500/5" 
                    : aiLoopStep !== "idle"
                    ? "bg-slate-900/40 border-slate-850 text-slate-400"
                    : "bg-slate-950/20 border-slate-900 text-slate-600"
                }`}>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wider">Aşama 1/3</span>
                    {aiLoopStep === "ga1" ? (
                      <span className="text-[10px] bg-indigo-500/20 text-indigo-300 px-2 py-0.5 rounded-full animate-pulse font-bold">Çözülüyor</span>
                    ) : aiLoopStep !== "idle" ? (
                      <span className="text-[10px] bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full font-bold">Tamamlandı</span>
                    ) : (
                      <span className="text-[10px] bg-slate-850 text-slate-500 px-2 py-0.5 rounded-full">Bekliyor</span>
                    )}
                  </div>
                  <p className="text-xs font-bold mt-1.5 text-slate-200">İlk Taslak Planlama (GA 1)</p>
                  <p className="text-[10px] text-slate-400 mt-1 leading-normal font-sans">Çakışmasız fiziksel temel programı kurar.</p>
                </div>

                {/* Step 2 */}
                <div className={`p-3 rounded-lg border transition ${
                  aiLoopStep === "ai_eval" 
                    ? "bg-indigo-950/40 border-indigo-500/40 text-white shadow-md shadow-indigo-500/5" 
                    : (aiLoopStep === "ga2" || aiLoopStep === "completed")
                    ? "bg-slate-900/40 border-slate-850 text-slate-400"
                    : "bg-slate-950/20 border-slate-900 text-slate-600"
                }`}>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wider">Aşama 2/3</span>
                    {aiLoopStep === "ai_eval" ? (
                      <span className="text-[10px] bg-indigo-500/20 text-indigo-300 px-2 py-0.5 rounded-full animate-pulse font-bold">Analiz Ediliyor</span>
                    ) : (aiLoopStep === "ga2" || aiLoopStep === "completed") ? (
                      <span className="text-[10px] bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full font-bold">Puanlandı: {aiFeedbackResult?.grade || "N/A"}</span>
                    ) : (
                      <span className="text-[10px] bg-slate-850 text-slate-500 px-2 py-0.5 rounded-full">Bekliyor</span>
                    )}
                  </div>
                  <p className="text-xs font-bold mt-1.5 text-slate-200">AI Pedagojik Değerlendirme</p>
                  <p className="text-[10px] text-slate-400 mt-1 leading-normal font-sans">Bilişsel yük, öğretmen boşlukları ve pedagojiyi eleştirir.</p>
                </div>

                {/* Step 3 */}
                <div className={`p-3 rounded-lg border transition ${
                  aiLoopStep === "ga2" 
                    ? "bg-indigo-950/40 border-indigo-500/40 text-white shadow-md shadow-indigo-500/5" 
                    : aiLoopStep === "completed"
                    ? "bg-slate-900/40 border-slate-850 text-slate-400"
                    : "bg-slate-950/20 border-slate-900 text-slate-600"
                }`}>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wider">Aşama 3/3</span>
                    {aiLoopStep === "ga2" ? (
                      <span className="text-[10px] bg-indigo-500/20 text-indigo-300 px-2 py-0.5 rounded-full animate-pulse font-bold">İyileştiriliyor</span>
                    ) : aiLoopStep === "completed" ? (
                      <span className="text-[10px] bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full font-bold">Optimize Edildi</span>
                    ) : (
                      <span className="text-[10px] bg-slate-850 text-slate-500 px-2 py-0.5 rounded-full">Bekliyor</span>
                    )}
                  </div>
                  <p className="text-xs font-bold mt-1.5 text-slate-200">Geri Beslemeli İyileştirme (GA 2)</p>
                  <p className="text-[10px] text-slate-400 mt-1 leading-normal font-sans">Yapay zeka cezalarıyla programı kusursuzlaştırır.</p>
                </div>
              </div>
            </div>
          )}

          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pb-3 border-b border-slate-800">
            <div className="flex items-center gap-3">
              <Sparkles className="w-5 h-5 text-indigo-400 animate-pulse shrink-0" />
              <div>
                <h3 className="font-sans font-bold text-sm text-white">Optimizasyon Motoru Rapor Paneli</h3>
                <p className="text-[10px] text-slate-400 font-sans mt-0.5">Algoritmik kısıt tabanlı çizelgeleme motoru teşhis ve analiz raporları</p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <div className="flex bg-slate-800 p-0.5 rounded-lg border border-slate-750 text-xs font-sans font-medium flex-wrap gap-1">
                {aiFeedbackResult && (
                  <button
                    type="button"
                    onClick={() => setActiveReportTab("aiFeedback")}
                    className={`px-3 py-1 rounded-md transition-all flex items-center gap-1.5 font-bold ${
                      activeReportTab === "aiFeedback" ? "bg-indigo-600 text-white shadow-sm" : "text-indigo-400 hover:text-indigo-200"
                    }`}
                  >
                    ✨ AI Pedagojik Raporu (Not: {aiFeedbackResult.grade})
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setActiveReportTab("logs")}
                  className={`px-3 py-1 rounded-md transition-all ${
                    activeReportTab === "logs" ? "bg-indigo-600 text-white shadow-sm" : "text-slate-400 hover:text-white"
                  }`}
                >
                  Çözücü Günlüğü ({solverLogs.length})
                </button>
                <button
                  type="button"
                  onClick={() => setActiveReportTab("unassigned")}
                  className={`px-3 py-1 rounded-md transition-all flex items-center gap-1 ${
                    activeReportTab === "unassigned" ? "bg-indigo-600 text-white shadow-sm" : "text-slate-400 hover:text-white"
                  }`}
                >
                  Yerleştirilemeyenler ({unassignedReqs.length})
                </button>
                <button
                  type="button"
                  onClick={() => setActiveReportTab("classReports")}
                  className={`px-3 py-1 rounded-md transition-all ${
                    activeReportTab === "classReports" ? "bg-indigo-600 text-white shadow-sm" : "text-slate-400 hover:text-white"
                  }`}
                >
                  Sınıf Raporları ({classReports.length})
                </button>
              </div>
              <button 
                type="button"
                onClick={() => setShowLogsPanel(false)}
                className="text-xs text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-750 px-3 py-1.5 rounded-lg font-semibold transition"
              >
                Kapat
              </button>
            </div>
          </div>

          {/* TAB 4: AI FEEDBACK & PEDAGOGICAL SCORECARD */}
          {activeReportTab === "aiFeedback" && aiFeedbackResult && (
            <div className="space-y-4 font-sans text-slate-300">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Score Circle Card */}
                <div className="bg-slate-950 p-4 rounded-xl border border-slate-850 flex flex-col items-center justify-center text-center relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-600/5 rounded-full blur-2xl" />
                  <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider mb-2">Pedagojik Derece</span>
                  <div className="w-20 h-20 rounded-full border-4 border-indigo-500 flex items-center justify-center text-3xl font-black text-white shadow-lg shadow-indigo-550/20 bg-indigo-950/20">
                    {aiFeedbackResult.grade}
                  </div>
                  <p className="text-[10px] text-slate-400 mt-2.5 leading-relaxed font-semibold">
                    Ata Akademi Standardı
                  </p>
                </div>

                {/* Strengths Card */}
                <div className="bg-slate-950 p-4 rounded-xl border border-slate-850 space-y-2 col-span-1 md:col-span-2">
                  <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Güçlü Yönler (Uyumlu Kararlar)
                  </span>
                  <div className="space-y-1.5 max-h-28 overflow-y-auto pr-1">
                    {aiFeedbackResult.strengths?.map((str, idx) => (
                      <p key={idx} className="text-xs text-slate-300 flex items-start gap-2">
                        <span className="text-emerald-500 font-bold">✓</span>
                        <span>{str}</span>
                      </p>
                    ))}
                    {(!aiFeedbackResult.strengths || aiFeedbackResult.strengths.length === 0) && (
                      <p className="text-xs text-slate-500 italic">Güçlü yön belirtilmedi.</p>
                    )}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Weaknesses/Critiques Card */}
                <div className="bg-slate-950 p-4 rounded-xl border border-slate-850 space-y-2">
                  <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5" /> İyileştirilen Sapmalar & Eleştiriler
                  </span>
                  <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                    {aiFeedbackResult.weaknesses?.map((weak, idx) => (
                      <p key={idx} className="text-xs text-slate-300 flex items-start gap-2">
                        <span className="text-amber-500 font-bold">⚠</span>
                        <span>{weak}</span>
                      </p>
                    ))}
                    {(!aiFeedbackResult.weaknesses || aiFeedbackResult.weaknesses.length === 0) && (
                      <p className="text-xs text-slate-500 italic">Kritik eleştiri belirtilmedi.</p>
                    )}
                  </div>
                </div>

                {/* AI Advice Summary Card */}
                <div className="bg-slate-950 p-4 rounded-xl border border-slate-850 space-y-2">
                  <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5" /> Akademik Koordinatör Notu
                  </span>
                  <div className="text-xs text-slate-300 leading-relaxed max-h-36 overflow-y-auto pr-1 whitespace-pre-line">
                    {aiFeedbackResult.generalFeedback}
                  </div>
                </div>
              </div>

              {/* GA Reinforcement Rules table */}
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-850 space-y-3">
                <div className="flex justify-between items-center">
                  <div>
                    <h4 className="text-xs font-bold text-white uppercase tracking-wider">GA Geri Besleme Matrisi (Algoritma Yönlendirme Kuralları)</h4>
                    <p className="text-[10px] text-slate-500 mt-0.5">Yapay zekanın ürettiği ve Genetik Algoritma uygunluk (fitness) fonksiyonuna ceza/ödül olarak enjekte edilen kısıtlar.</p>
                  </div>
                  <span className="text-xs font-mono font-bold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 px-2.5 py-1 rounded-full">
                    {aiFeedbackResult.hints?.length || 0} Kural Uygulandı
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left text-slate-300">
                    <thead className="bg-slate-900 text-slate-400 text-[10px] uppercase font-bold tracking-wider">
                      <tr>
                        <th className="p-2.5 rounded-l-lg">Hedef Tanım</th>
                        <th className="p-2.5">Kural Türü</th>
                        <th className="p-2.5 font-mono">Ek Puan / Ceza</th>
                        <th className="p-2.5 rounded-r-lg">Pedagojik Gerekçe</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-900">
                      {aiFeedbackResult.hints?.map((hint, idx) => {
                        const targetParts = [];
                        if (hint.sinifId) {
                          const cls = classes.find(c => c.id === hint.sinifId);
                          targetParts.push(`Sınıf: ${cls?.sinifAdi || hint.sinifId}`);
                        }
                        if (hint.ogretmenId) {
                          const t = teachers.find(x => x.id === hint.ogretmenId);
                          targetParts.push(`Öğrt: ${t?.adSoyad || hint.ogretmenId}`);
                        }
                        if (hint.dersId) {
                          const cr = courses.find(c => c.id === hint.dersId);
                          targetParts.push(`Ders: ${cr?.dersAdi || hint.dersId}`);
                        }
                        if (hint.periyotId) {
                          targetParts.push(`Saat: ${hint.periyotId}`);
                        }
                        const targetStr = targetParts.join(" / ") || "Genel Kısıt";

                        return (
                          <tr key={idx} className="hover:bg-slate-900/40 transition">
                            <td className="p-2.5 font-bold text-slate-200">{targetStr}</td>
                            <td className="p-2.5">
                              <span className={`inline-flex items-center gap-1 font-bold px-2 py-0.5 rounded-full text-[10px] ${
                                hint.type === "penalty" 
                                  ? "bg-rose-500/10 text-rose-400 border border-rose-500/20" 
                                  : "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                              }`}>
                                {hint.type === "penalty" ? "⬇ Ceza (Penalty)" : "⬆ Ödül (Reward)"}
                              </span>
                            </td>
                            <td className={`p-2.5 font-mono font-bold ${hint.type === "penalty" ? "text-rose-400" : "text-emerald-400"}`}>
                              {hint.type === "penalty" ? "-" : "+"}{hint.value} Puan
                            </td>
                            <td className="p-2.5 text-slate-300 leading-relaxed">{hint.reason}</td>
                          </tr>
                        );
                      })}
                      {(!aiFeedbackResult.hints || aiFeedbackResult.hints.length === 0) && (
                        <tr>
                          <td colSpan={4} className="p-4 text-center text-slate-500 italic">Hiç yönlendirme kuralı üretilmedi.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 1: RUN LOGS */}
          {activeReportTab === "logs" && (
            <div className="bg-slate-950 p-4 rounded-xl border border-slate-850 font-mono text-xs max-h-60 overflow-y-auto space-y-1">
              {solverLogs.map((log, index) => (
                <p key={index} className="leading-relaxed text-slate-300">
                  {log.startsWith("❌") ? (
                    <span className="text-rose-400 font-semibold">{log}</span>
                  ) : log.startsWith("✨") || log.startsWith("✅") ? (
                    <span className="text-emerald-400 font-semibold">{log}</span>
                  ) : log.startsWith("⚠️") ? (
                    <span className="text-amber-400 font-semibold">{log}</span>
                  ) : (
                    log
                  )}
                </p>
              ))}
            </div>
          )}

          {/* TAB 2: UNASSIGNED REQUIREMENT DIAGNOSTICS */}
          {activeReportTab === "unassigned" && (
            <div className="space-y-3 font-sans">
              {unassignedReqs.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-6 text-center text-slate-500 bg-slate-950/40 rounded-xl border border-dashed border-slate-800">
                  <CheckCircle2 className="w-8 h-8 text-emerald-500 mb-2" />
                  <p className="text-xs font-semibold text-slate-300">Tüm ders istekleri başarıyla yerleştirildi!</p>
                  <p className="text-[10px] text-slate-500 mt-0.5">Programda yerleştirilemeyen veya havada kalan ders bulunmuyor.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-80 overflow-y-auto pr-1">
                  {unassignedReqs.map((req, idx) => (
                    <div key={idx} className="bg-slate-950 p-3.5 rounded-xl border border-slate-850 space-y-2.5 hover:border-slate-750 transition">
                      <div className="flex justify-between items-start gap-2">
                        <div>
                          <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider">{req.className}</span>
                          <h4 className="text-xs font-bold text-white mt-0.5">{req.courseName}</h4>
                        </div>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                          req.severity === "Kritik" 
                            ? "bg-rose-500/20 text-rose-300 border border-rose-500/30" 
                            : "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                        }`}>
                          {req.severity}
                        </span>
                      </div>
                      
                      <div className="flex items-center justify-between text-[11px] text-slate-400 bg-slate-900/60 px-2.5 py-1.5 rounded-lg">
                        <span>Eksik Kalan Ders Yükü:</span>
                        <span className="font-bold text-white font-mono">{req.missingHours} Saat</span>
                      </div>

                      <div className="space-y-1.5">
                        <span className="text-[9px] font-bold text-slate-500 uppercase">Teşhis ve Kilit Analizi:</span>
                        <div className="space-y-2">
                          {req.reasons.map((reason, rIdx) => {
                            let badgeColor = "bg-slate-900 border-slate-800 text-slate-300";
                            let lockType = "";
                            
                            if (reason.includes("Kombinasyon Kilidi")) {
                              badgeColor = "bg-amber-950/40 border-amber-500/30 text-amber-350";
                              lockType = "🔒 Spatiotemporal Kombinasyon Kilidi";
                            } else if (reason.includes("Öğretmen Kilidi")) {
                              badgeColor = "bg-violet-950/40 border-violet-500/30 text-violet-300";
                              lockType = "👨‍🏫 Öğretmen Kilidi";
                            } else if (reason.includes("Derslik Kilidi")) {
                              badgeColor = "bg-emerald-950/40 border-emerald-500/30 text-emerald-300";
                              lockType = "🏫 Derslik Kilidi";
                            } else if (reason.includes("Pencere Açığı")) {
                              badgeColor = "bg-blue-950/40 border-blue-500/30 text-blue-300";
                              lockType = "📅 Zaman Penceresi Kilidi";
                            }

                            return (
                              <div key={rIdx} className={`p-2.5 rounded-xl border text-[11px] leading-relaxed space-y-1 ${badgeColor}`}>
                                {lockType && <div className="text-[9px] font-extrabold uppercase tracking-wider flex items-center gap-1">{lockType}</div>}
                                <div className="text-[11px] text-slate-200">
                                  {reason.replace(/^(Kombinasyon Kilidi|Öğretmen Kilidi|Derslik Kilidi|Fiziksel Pencere Açığı):\s*/, "")}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: CLASS OPTIMIZER REPORTS */}
          {activeReportTab === "classReports" && (
            <div className="space-y-2 font-sans overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                    <th className="py-2.5 px-3">Sınıf</th>
                    <th className="py-2.5 px-2 text-center">Haftalık İhtiyaç</th>
                    <th className="py-2.5 px-2 text-center">Planlanan / Kalan</th>
                    <th className="py-2.5 px-2 text-center">İzinli Periyot</th>
                    <th className="py-2.5 px-2 text-center">Ortak Uygunluk (Öğrt)</th>
                    <th className="py-2.5 px-2 text-center">Uygun Derslik</th>
                    <th className="py-2.5 px-3 text-right">Kısıt Kaynağı</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-850/60">
                  {classReports.map((report) => {
                    const isFullyAssigned = report.missingHours === 0;
                    
                    return (
                      <tr key={report.classId} className="hover:bg-slate-850/40 transition">
                        <td className="py-3 px-3 font-bold text-white">
                          {report.className}
                        </td>
                        <td className="py-3 px-2 text-center font-mono text-slate-300">
                          {report.weeklyNeed} Saat
                        </td>
                        <td className="py-3 px-2 text-center font-sans">
                          <span className={`inline-flex items-center gap-1 font-mono font-bold px-2 py-0.5 rounded-full ${
                            isFullyAssigned 
                              ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" 
                              : "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                          }`}>
                            {report.assignedHours} / {report.weeklyNeed}
                            {!isFullyAssigned && <span className="text-[9px] text-rose-300">(-{report.missingHours})</span>}
                          </span>
                        </td>
                        <td className="py-3 px-2 text-center font-mono font-semibold text-slate-300">
                          {report.allowedPeriodsCount}
                        </td>
                        <td className="py-3 px-2 text-center">
                          <span className={`font-mono font-semibold px-2 py-0.5 rounded ${
                            report.teacherJointAvailability < report.weeklyNeed
                              ? "text-rose-400 bg-rose-500/10"
                              : "text-slate-300"
                          }`}>
                            {report.teacherJointAvailability}
                          </span>
                        </td>
                        <td className="py-3 px-2 text-center">
                          <span className={`font-mono font-semibold px-2 py-0.5 rounded ${
                            report.classroomAvailability === 0
                              ? "text-rose-400 bg-rose-500/10"
                              : "text-slate-300"
                          }`}>
                            {report.classroomAvailability} Derslik
                          </span>
                        </td>
                        <td className="py-3 px-3 text-right">
                          <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full uppercase ${
                            report.constraintSource === "USER"
                              ? "bg-purple-500/20 text-purple-300 border border-purple-500/30"
                              : report.constraintSource === "CLASS_TIME_WINDOWS"
                              ? "bg-blue-500/20 text-blue-300 border border-blue-500/30"
                              : report.constraintSource === "PRESET"
                              ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30"
                              : "bg-slate-800 text-slate-400 border border-slate-700"
                          }`}>
                            {report.constraintSource === "USER" 
                              ? "Özel Kısıt" 
                              : report.constraintSource === "CLASS_TIME_WINDOWS" 
                              ? "Zaman Penceresi" 
                              : report.constraintSource === "PRESET" 
                              ? "Şablon Kuralları" 
                              : "Serbest"}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              <div className="text-[10px] text-slate-500 leading-relaxed font-sans mt-3 border-t border-slate-850 pt-3">
                💡 <span className="font-semibold text-slate-400">Ortak Uygunluk sayısı</span>, o sınıfın ders isteklerini verebilecek kademe uyumlu öğretmenlerin, sınıfın izinli zaman penceresinde sahip olduğu toplam kesişim saatleridir. Eğer ortak uygunluk haftalık ihtiyaçtan düşükse derslerin yerleşmesi matematiksel olarak imkansızdır.
              </div>
            </div>
          )}
        </div>
      )}

      {/* View Selector Filters & Controls */}
      <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row justify-between gap-4">
          {/* Toggle Mode buttons */}
          <div className="flex border border-slate-150 rounded-xl p-1 bg-slate-50 flex-wrap gap-1 self-start text-xs font-semibold">
            <button 
              onClick={() => handleViewTypeChange("class")}
              className={`px-4 py-1.5 rounded-lg transition ${
                viewType === "class" ? "bg-white text-indigo-950 shadow-sm cursor-pointer" : "text-slate-500 hover:text-slate-800 cursor-pointer"
              }`}
            >
              Sınıf Bazlı Program
            </button>
            <button 
              onClick={() => handleViewTypeChange("teacher")}
              className={`px-4 py-1.5 rounded-lg transition ${
                viewType === "teacher" ? "bg-white text-indigo-950 shadow-sm cursor-pointer" : "text-slate-500 hover:text-slate-800 cursor-pointer"
              }`}
            >
              Öğretmen Bazlı Program
            </button>
            <button 
              onClick={() => handleViewTypeChange("day")}
              className={`px-4 py-1.5 rounded-lg transition ${
                viewType === "day" ? "bg-white text-indigo-950 shadow-sm cursor-pointer" : "text-slate-500 hover:text-slate-800 cursor-pointer"
              }`}
            >
              Gün Bazlı Program 📅
            </button>
            <button 
              onClick={() => handleViewTypeChange("all")}
              className={`px-4 py-1.5 rounded-lg transition ${
                viewType === "all" ? "bg-white text-indigo-950 shadow-sm cursor-pointer" : "text-slate-500 hover:text-slate-800 cursor-pointer"
              }`}
            >
              Tüm Program (Genel Bakış)
            </button>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center flex-wrap">
            {viewType === "day" && (
              <div className="flex flex-wrap items-center gap-4">
                {/* Active Day Selector */}
                <div className="flex items-center gap-2 text-xs font-semibold">
                  <span className="text-slate-550 font-sans font-bold">Aktif Gün:</span>
                  <div className="flex bg-slate-100 p-0.5 rounded-xl border border-slate-200 gap-1">
                    {config.activeDays.map((day) => (
                      <button
                        key={day}
                        type="button"
                        onClick={() => setSelectedDayDayView(day)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition duration-155 cursor-pointer ${
                          selectedDayDayView === day
                            ? "bg-indigo-600 text-white shadow-sm"
                            : "text-slate-650 hover:bg-slate-200"
                        }`}
                      >
                        {day}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Day View Mode selection: Class based or Teacher based */}
                <div className="flex items-center gap-2 text-xs font-semibold">
                  <span className="text-slate-550 font-sans font-bold">Görünüm Modu:</span>
                  <div className="flex bg-slate-100 p-0.5 rounded-xl border border-slate-200 gap-1">
                    <button
                      type="button"
                      onClick={() => setDayViewMode("class")}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition duration-155 cursor-pointer ${
                        dayViewMode === "class"
                          ? "bg-slate-800 text-white shadow-sm"
                          : "text-slate-650 hover:bg-slate-200"
                      }`}
                    >
                      Sınıflar
                    </button>
                    <button
                      type="button"
                      onClick={() => setDayViewMode("teacher")}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition duration-155 cursor-pointer ${
                        dayViewMode === "teacher"
                          ? "bg-slate-800 text-white shadow-sm"
                          : "text-slate-650 hover:bg-slate-200"
                      }`}
                    >
                      Öğretmenler
                    </button>
                  </div>
                </div>
              </div>
            )}

            {viewType !== "all" && viewType !== "day" && (
              <>
                {/* Dropdown selects current entity */}
                <div className="flex items-center gap-2 text-xs font-semibold">
                  <span className="text-slate-500">Çizelge Seçimi:</span>
                  <select 
                    value={selectedEntityId}
                    onChange={(e) => {
                      setSelectedEntityId(e.target.value);
                      setIsCopying(false);
                      setCopyTargetId("");
                    }}
                    className="bg-slate-50 border border-slate-150 px-3 py-2 rounded-xl text-slate-900 font-bold focus:ring-1 focus:ring-indigo-500"
                  >
                    {visibleEntities.map((item) => (
                      <option key={item.id} value={item.id}>
                        {viewType === "class" 
                          ? (item as ClassUnit).sinifAdi 
                          : `${(item as Teacher).adSoyad} (${(item as Teacher).brans})`}
                      </option>
                    ))}
                  </select>
                </div>
                
                {/* Action Buttons for Selection */}
                <div className="flex items-center gap-2 text-xs font-semibold">
                  <button 
                    onClick={triggerResetEntity}
                    className="px-3 py-2 bg-rose-50 text-rose-600 rounded-xl border border-rose-200 hover:bg-rose-100 flex items-center gap-1.5 transition"
                    title="Bu Öğenin Programını Sıfırla"
                  >
                      <RotateCcw className="w-3.5 h-3.5" />
                      Sıfırla
                  </button>
                  <button
                    onClick={() => setIsCopying(!isCopying)}
                    className="px-3 py-2 bg-blue-50 text-blue-600 rounded-xl border border-blue-200 hover:bg-blue-100 flex items-center gap-1.5 transition"
                    title="Bu Programı Başkasına Kopyala"
                  >
                      <Copy className="w-3.5 h-3.5" />
                      Kopyala
                  </button>
                </div>
              </>
            )}
          </div>
        </div>

        {isCopying && (
          <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-100 flex flex-wrap items-center gap-3">
              <span className="text-sm font-bold text-blue-800 flex items-center gap-2">
                  Kopyalanacak Hedef:
              </span>
              <select 
                value={copyTargetId}
                onChange={(e) => setCopyTargetId(e.target.value)}
                className="bg-white border border-blue-200 px-3 py-2 rounded-xl text-slate-800 font-semibold focus:ring-1 focus:ring-blue-500 text-sm"
              >
                <option value="">Seçin...</option>
                {visibleEntities.filter(item => item.id !== selectedEntityId).map((item) => (
                  <option key={item.id} value={item.id}>
                    {viewType === "class" 
                      ? (item as ClassUnit).sinifAdi 
                      : `${(item as Teacher).adSoyad} (${(item as Teacher).brans})`}
                  </option>
                ))}
              </select>
              <button
                 onClick={handleCopySchedule}
                 disabled={!copyTargetId}
                 className="px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-bold shadow hover:bg-blue-700 disabled:opacity-50 transition"
              >
                 Yapıştır
              </button>
              <button onClick={() => { setIsCopying(false); setCopyTargetId(""); }} className="px-3 py-2 text-slate-500 hover:text-slate-800 text-sm font-medium transition">İptal</button>
              
              <span className="text-xs text-blue-600 opacity-80 flex items-center mt-2 sm:mt-0 sm:ml-auto">
                  <AlertTriangle className="w-4 h-4 mr-1.5 shrink-0" />
                  Hedefin mevcut programı (varsa) üzerine yazılacaktır.
              </span>
          </div>
        )}
      </div>

      <div className="flex flex-col lg:flex-row gap-6 items-start">
        <div className="flex-1 min-w-0 w-full space-y-6">
          {/* Schedule Core Grid UI */}
          {entitiesToRender.map(entity => {
         const entityId = entity.id;
         const isClassEnt = viewType === "class" || viewType === "all";

         return (
         <div key={entityId} className="bg-white rounded-2xl border border-slate-150 shadow-sm overflow-hidden mt-6">
           <div className="p-4 bg-slate-50 border-b border-slate-150 flex justify-between items-center flex-wrap gap-2">
             <div className="text-xs text-slate-500">
               {viewType === "all" ? "Program Gösterimi:" : "Filtrelenmiş Profil Durumu:"} <strong className="text-slate-800 text-sm font-sans">{
                 isClassEnt
                   ? `${(entity as ClassUnit).sinifAdi} sınıfının ders planı` 
                   : `${(entity as Teacher).adSoyad} öğretmenin ders planı`
               }</strong>
             </div>
             {isClassEnt && (entity as ClassUnit) && (
               <div className="flex items-center gap-1 bg-indigo-50 border border-indigo-100 text-indigo-800 px-3 py-1 rounded text-[11px] font-semibold">
                 <Calendar className="w-3.5 h-3.5" />
                 Sınıf Mevcudu: {(entity as ClassUnit).mevcutOgrenciSayisi} / {(entity as ClassUnit).kapasite} Öğrenci
               </div>
             )}
           </div>

           {/* Schedule grid layout */}
           <div className="overflow-x-auto">
             <table 
               className="w-full text-left text-xs text-slate-700 table-fixed border-collapse"
               style={{ minWidth: `${Math.max(800, 128 + getMasterTimeSlots(config).length * 160)}px` }}
             >
            <thead>
              <tr className="bg-slate-100 text-slate-600 font-bold uppercase border-b border-slate-150 text-center">
                <th className="px-4 py-3 text-left w-32">Gün / Saat</th>
                {getMasterTimeSlots(config).map((slot) => (
                  <th key={slot.periyotNo} className="px-4 py-3 w-40 border-l border-slate-150 font-sans">
                    <div>Periyot {slot.periyotNo}</div>
                    <div className="text-[10px] text-slate-400 font-mono font-normal">{slot.baslangicSaati} - {slot.bitisSaati}</div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-150">
              {config.activeDays.map((day) => (
                <tr key={day} className="hover:bg-slate-50/50 transition">
                  {/* Row headers representing Days */}
                  <td className="px-4 py-4 font-bold text-slate-800 bg-slate-50 font-sans border-r border-slate-150">
                    {day}
                  </td>
                  
                  {/* Cells representing Hours */}
                  {getMasterTimeSlots(config).map((slot) => {
                    const dayActiveCount = getActivePeriodsCountForDay(day, config);
                    const isClosedPeriod = slot.periyotNo > dayActiveCount;

                    if (isClosedPeriod) {
                      return (
                        <td 
                          key={slot.periyotNo} 
                          className="bg-slate-100/75 border-l border-slate-150 p-2 text-center text-slate-400 select-none cursor-not-allowed"
                        >
                          <div className="flex flex-col items-center justify-center py-4 space-y-1">
                            <span className="text-[10px] uppercase font-bold text-slate-400/80 tracking-wider">Kurum Kapalı</span>
                            <span className="text-[9px] text-slate-400">Çalışma Dışı</span>
                          </div>
                        </td>
                      );
                    }

                    const planItem = getPlanAtCell(day, slot.periyotNo, entityId);
                    const cellViolations = getCellViolations(day, slot.periyotNo, entityId);
                    const hasZorunlu = cellViolations.some(v => v.seviye === "Zorunlu");
                    const hasEsnek = cellViolations.some(v => v.seviye === "Esnek");
                    
                    const cellKey = `${day}-${slot.periyotNo}-${entityId}`;
                    const isCreatingCell = activeSetupSlot === cellKey;

                    let isTeacherUnavailableHere = false;
                    if (!isClassEnt && entity) {
                      const t = entity as Teacher;
                      const cellSlotKey = `${day}-${slot.periyotNo}`;
                      if (t.uygunPeriyotlar && t.uygunPeriyotlar.length > 0) {
                        isTeacherUnavailableHere = !t.uygunPeriyotlar.includes(cellSlotKey);
                      } else {
                        isTeacherUnavailableHere = !t.uygunGunler.includes(day) || !t.uygunSaatler.includes(slot.periyotNo.toString());
                      }
                    }

                    // Dynamic teacher list based on branch & availability
                    const selectedCourse = courses.find((c) => c.id === setupCourseId);
                    const filteredSetupTeachers = teachers.filter((t) => {
                      if (!t.aktifPasif) return false;
                      if (selectedCourse) {
                        if (selectedCourse.brans === "Rehberlik") {
                          return t.brans === "Rehberlik";
                        } else {
                          return t.brans === selectedCourse.brans;
                        }
                      }
                      return true;
                    });

                    const isDraggedOver = dragOverCell === cellKey;
                    const isTargetCell = planItem && targetPlanIds && targetPlanIds.includes(planItem.id);

                    return (
                      <td 
                        key={slot.periyotNo} 
                        className={`p-2.5 vertical-top border-l border-slate-150 relative transition ${
                          isDraggedOver ? "bg-indigo-50 border-2 border-indigo-400" : ""
                        } ${
                          hasZorunlu 
                            ? "bg-rose-50/60 border-2 border-rose-300" 
                            : hasEsnek
                              ? "bg-amber-50/60 border border-amber-300"
                              : isTeacherUnavailableHere
                                ? "bg-slate-100/70 select-none border-dashed border-slate-200"
                                : ""
                        } ${isTargetCell ? "ring-2 ring-indigo-500 ring-offset-2 animate-pulse bg-indigo-50/30" : ""}`}
                        onDragOver={(e) => {
                          if (isTeacherUnavailableHere) return;
                          e.preventDefault();
                          if (dragOverCell !== cellKey) {
                            setDragOverCell(cellKey);
                          }
                        }}
                        onDragLeave={() => {
                          if (dragOverCell === cellKey) {
                            setDragOverCell(null);
                          }
                        }}
                        onDrop={(e) => {
                          setDragOverCell(null);
                          if (isTeacherUnavailableHere) return;
                          handleDropOnCell(e, day, slot.periyotNo, entityId);
                        }}
                      >
                        {/* If teacher is unavailable here */}
                        {isTeacherUnavailableHere ? (
                          <div className="flex flex-col items-center justify-center py-4 space-y-1">
                            <span className="text-[9px] bg-slate-200 text-slate-500 font-bold px-1.5 py-0.5 rounded leading-none select-none">Müsait Değil</span>
                            <span className="text-[9px] text-slate-400 select-none">Takvim Dışı</span>
                          </div>
                        ) : planItem && planItem.durum === "Conflict Detected" && !isCreatingCell ? (
                          <div className="flex flex-col items-center justify-center py-4 space-y-1 h-full w-full">
                            <span className="inline-block text-[10px] font-bold px-2 py-0.5 rounded font-sans bg-rose-100 text-rose-700">
                              {courses.find((c) => c.id === planItem.dersId)?.dersAdi || "Ders"}
                            </span>
                            <div className="flex flex-col items-center gap-1 mt-2 text-[9px] font-bold text-rose-600 bg-rose-50 px-1.5 py-1 rounded w-full border border-rose-200">
                              <AlertTriangle className="w-3 h-3 flex-shrink-0" />
                              <span className="text-center">Conflict Detected</span>
                              <span className="text-[8px] font-normal text-rose-500 text-center leading-tight mt-0.5">Uygun slot bulunamadı, boş bırakıldı.</span>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleAutoResolve(planItem)}
                              className="mt-2 w-full py-1 bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-[9px] rounded-lg shadow-sm transition hover:scale-105 flex items-center justify-center gap-1 font-sans"
                              title="Oto-Çözüm / Uygun Slot Öner"
                            >
                              <Sparkles className="w-2.5 h-2.5" />
                              Oto-Çöz
                            </button>
                          </div>
                        ) : planItem && !isCreatingCell ? (
                          <div 
                            draggable
                            onDragStart={(e) => handleDragStart(e, planItem.id)}
                            className="space-y-1.5 flex flex-col justify-between h-full cursor-grab active:cursor-grabbing hover:opacity-90 bg-slate-50 p-2 rounded-xl border border-slate-200 hover:border-slate-400 shadow-sm transition"
                          >
                            <div>
                              {/* Course Title Badge */}
                              <div className="flex justify-between items-start gap-1">
                                <span className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded font-sans ${
                                  planItem.planTuru === PlanTuru.REHBERLIK 
                                    ? "bg-purple-100 text-purple-700 font-sans" 
                                    : "bg-indigo-50 text-indigo-700 font-sans"
                                }`}>
                                  {courses.find((c) => c.id === planItem.dersId)?.dersAdi || "Ders"}
                                </span>
                                <button 
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedSlotForSuggestions({
                                      day,
                                      periodNo: slot.periyotNo,
                                      classId: planItem.sinifId
                                    });
                                    setShowSuggestionsSidebar(true);
                                  }}
                                  className="text-indigo-500 hover:text-indigo-705 rounded p-0.5"
                                  title="Öğretmen Önerileri Göster"
                                >
                                  <Sparkles className="w-3.5 h-3.5" />
                                </button>
                                <button 
                                  onClick={() => deleteAssignment(planItem.id)}
                                  className="text-slate-400 hover:text-rose-500 rounded p-0.5"
                                  title="Görevi İptal Et"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>

                              {/* Information list item details */}
                              <div className="text-[10px] text-slate-600 mt-1.5 space-y-1 font-sans">
                                {viewType !== "class" && viewType !== "all" && (
                                  <div className="flex items-center gap-1 font-bold">
                                    <BookOpen className="w-3 h-3 text-slate-400" />
                                    <span>{classes.find((c) => c.id === planItem.sinifId)?.sinifAdi}</span>
                                  </div>
                                )}
                                {viewType !== "teacher" && (
                                  <div className="flex items-center gap-1">
                                    <User className="w-3 h-3 text-slate-400" />
                                    <span className="truncate">{teachers.find((t) => t.id === planItem.ogretmenId)?.adSoyad}</span>
                                  </div>
                                )}
                                {viewType !== "classroom" && (
                                  <div className="flex items-center gap-1 text-slate-500">
                                    <MapPin className="w-3 h-3 text-slate-450" />
                                    <span className="truncate">{classrooms.find((r) => r.id === planItem.derslikId)?.derslikAdi}</span>
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Verification Warning Alert dot inside cell */}
                            {cellViolations.length > 0 && (
                              <div className="space-y-1.5 mt-1.5 w-full">
                                <div 
                                  className={`flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.5 rounded break-all w-full leading-relaxed ${
                                    hasZorunlu ? "text-rose-600 bg-rose-100" : "text-amber-700 bg-amber-100"
                                  }`} 
                                  title={cellViolations.map(cv => cv.mesaj).join("\n")}
                                >
                                  <AlertTriangle className="w-3 h-3 flex-shrink-0" />
                                  <span>{hasZorunlu ? "Çakışma / İhlal!" : "Uyarı: " + cellViolations[0].tip}</span>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => handleAutoResolve(planItem)}
                                  className={`w-full py-1 text-[9px] font-bold rounded-lg flex items-center justify-center gap-1 transition-all ${
                                    hasZorunlu 
                                      ? "bg-rose-600 hover:bg-rose-700 text-white" 
                                      : "bg-amber-600 hover:bg-amber-700 text-white"
                                  }`}
                                  title="Bu çakışmayı otomatik alternatif slotlarla gider."
                                >
                                  <Sparkles className="w-2.5 h-2.5" />
                                  Oto-Çöz
                                </button>
                              </div>
                            )}
                          </div>
                        ) : isCreatingCell ? (
                          /* Setup micro assignment popover inside Cell */
                          <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-300 space-y-2 text-[11px] z-10 relative">
                            <div className="font-bold text-slate-700 border-b border-slate-200 pb-1">
                              {day} - Periyot {slot.periyotNo} Yerleştir
                            </div>

                            {setupError && (
                              <div className="bg-rose-50 border border-rose-200 text-rose-700 p-1.5 rounded text-[10px] font-semibold leading-tight">
                                {setupError}
                              </div>
                            )}

                            {/* Class select (if not in class view) */}
                            {(viewType !== "class" && viewType !== "all") && (
                              <div className="space-y-0.5">
                                <span className="text-[10px] text-slate-500 font-bold">Sınıf Seç</span>
                                <select 
                                  value={setupClassId}
                                  onChange={(e) => setSetupClassId(e.target.value)}
                                  className="w-full text-[11px] p-1 border rounded bg-white"
                                >
                                  <option value="">Seçin...</option>
                                  {classes.map((cls) => {
                                    const isClassBusy = plans.some(
                                      (p) => p.sinifId === cls.id && p.periyotId === `${day}-${slot.periyotNo}` && p.planTuru !== PlanTuru.BOS
                                    );
                                    return (
                                      <option key={cls.id} value={cls.id} disabled={isClassBusy}>
                                        {cls.sinifAdi}{isClassBusy ? " (Dolu)" : ""}
                                      </option>
                                    );
                                  })}
                                </select>
                              </div>
                            )}

                            {/* Course select */}
                            <div className="space-y-0.5">
                              <span className="text-[10px] text-slate-500 font-bold">Ders Branş</span>
                              <select 
                                value={setupCourseId}
                                onChange={(e) => setSetupCourseId(e.target.value)}
                                className="w-full text-[11px] p-1 border rounded bg-white"
                              >
                                <option value="">Seçin...</option>
                                {courses.map((c) => (
                                  <option key={c.id} value={c.id}>{c.dersAdi} ({c.kademe})</option>
                                ))}
                              </select>
                            </div>

                            {/* Teacher select (if not in teacher view) */}
                            {viewType !== "teacher" && (
                              <div className="space-y-0.5">
                                <span className="text-[10px] text-slate-500 font-bold">Öğretmen</span>
                                <select 
                                  value={setupTeacherId}
                                  onChange={(e) => setSetupTeacherId(e.target.value)}
                                  className="w-full text-[11px] p-1 border rounded bg-white"
                                >
                                  <option value="">Seçin...</option>
                                  {filteredSetupTeachers.map((t) => {
                                    let isAvailable = false;
                                    const cellSlotKey = `${day}-${slot.periyotNo}`;
                                    
                                    if (t.uygunPeriyotlar && t.uygunPeriyotlar.length > 0) {
                                      isAvailable = t.uygunPeriyotlar.includes(cellSlotKey);
                                    } else {
                                      const isAvailableDay = t.uygunGunler.includes(day);
                                      const isAvailableHour = t.uygunSaatler.includes(slot.periyotNo.toString());
                                      isAvailable = isAvailableDay && isAvailableHour;
                                    }

                                    const isAlreadyTeaching = plans.some(
                                      (p) => p.ogretmenId === t.id && p.periyotId === cellSlotKey && p.planTuru !== PlanTuru.BOS
                                    );
                                    
                                    let info = "";
                                    if (isAlreadyTeaching) info = " (Dolu)";
                                    else if (!isAvailable) info = " (Takvim Dışı)";
                                    else if (t.bosGunTercihi === day) info = " (Boş Gün Tercihi)";

                                    return (
                                      <option 
                                        key={t.id} 
                                        value={t.id}
                                        disabled={!isAvailable || isAlreadyTeaching}
                                      >
                                        {t.adSoyad} ({t.brans}){info}
                                      </option>
                                    );
                                  })}
                                </select>
                              </div>
                            )}

                            {/* Classroom select (if not in room view) */}
                            {viewType !== "classroom" && (() => {
                              const targetClassId = viewType === "class" ? entityId : setupClassId;
                              const targetClass = classes.find(c => c.id === targetClassId);
                              return (
                                <div className="space-y-0.5">
                                  <span className="text-[10px] text-slate-500 font-bold">Salon / Oda</span>
                                  <select 
                                    value={setupClassroomId}
                                    onChange={(e) => setSetupClassroomId(e.target.value)}
                                    className="w-full text-[11px] p-1 border rounded bg-white font-medium text-slate-800"
                                  >
                                    <option value="">Seçin...</option>
                                    {classrooms
                                      .filter(r => r.aktifPasif && (!targetClass || !r.hizmetBirimi || r.hizmetBirimi === "Tümü" || r.hizmetBirimi === targetClass.kademe))
                                      .map((r) => {
                                        const isRoomBusy = plans.some(
                                          (p) => p.derslikId === r.id && p.periyotId === `${day}-${slot.periyotNo}` && p.planTuru !== PlanTuru.BOS
                                        );
                                        return (
                                          <option key={r.id} value={r.id} disabled={isRoomBusy}>
                                            {r.derslikAdi} (Kap: {r.kapasite}{r.hizmetBirimi && r.hizmetBirimi !== "Tümü" ? ` - ${r.hizmetBirimi}` : ""}){isRoomBusy ? " (Dolu)" : ""}
                                          </option>
                                        );
                                      })}
                                  </select>
                                </div>
                              );
                            })()}

                            {/* Controls */}
                            <div className="flex gap-1 pt-1">
                              <button 
                                onClick={() => saveManualAssignment(day, slot.periyotNo, isClassEnt ? entityId : undefined)}
                                className="flex-1 bg-indigo-600 text-white p-1 rounded font-bold text-[10px]"
                              >
                                Ekle
                              </button>
                              <button 
                                onClick={() => setActiveSetupSlot(null)}
                                className="bg-transparent border border-slate-200 text-slate-600 p-1 rounded text-[10px]"
                              >
                                Kapat
                              </button>
                            </div>
                          </div>
                        ) : (
                          /* Elegant quick insert button */
                          <button 
                            onClick={() => {
                              clearSetupFields();
                              setActiveSetupSlot(cellKey);
                              setSelectedSlotForSuggestions({
                                day,
                                periodNo: slot.periyotNo,
                                classId: isClassEnt ? entityId : setupClassId || selectedEntityId
                              });
                              setShowSuggestionsSidebar(true);
                            }}
                            className="absolute inset-0 w-full h-full hover:bg-slate-100 flex items-center justify-center text-slate-350 opacity-0 hover:opacity-100 transition rounded-lg"
                          >
                            <Plus className="w-5 h-5 text-indigo-500" />
                          </button>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      );
      })}

      {/* Unified All-Program Master Grid (Tüm Program Genel Bakış) */}
      {viewType === "all" && (
        <div className="bg-white rounded-2xl border border-slate-150 shadow-sm overflow-hidden mt-6 animate-fade-in">
          {/* Enhanced Header with Responsive Day Quick-Filters */}
          <div className="p-4 bg-slate-50 border-b border-slate-150 flex flex-col gap-4">
            <div className="flex flex-col lg:flex-row justify-between lg:items-center gap-4">
              <div>
                <strong className="text-slate-800 text-sm font-sans flex items-center gap-1.5 font-bold">
                  <SlidersHorizontal className="w-4 h-4 text-indigo-600 animate-none" />
                  Tüm Program Genel Bakış (Tek Çizelge)
                </strong>
                <p className="text-[11px] text-slate-500 mt-0.5">Sınıflar Satır, Zaman Dilimleri Sütun olarak listelenmektedir. Sürükleyip bırakarak veya hücre içi pratik düzenlemelerle yönetebilirsiniz.</p>
              </div>

              {/* Day Quick filter selectors inside master list to prevent extreme sizing */}
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-slate-100/50 p-3 rounded-xl border border-slate-200">
                <div className="flex flex-wrap items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-semibold">
                  <span className="text-[10px] text-slate-500 font-bold px-2 uppercase">Gün Filtreleme:</span>
                  <button
                    type="button"
                    onClick={() => setAllViewDayFilter("all")}
                    className={`px-3 py-1.5 rounded-lg transition duration-155 cursor-pointer text-[11px] font-bold ${
                      allViewDayFilter === "all"
                        ? "bg-indigo-600 text-white shadow-sm"
                        : "text-slate-650 hover:bg-slate-200"
                    }`}
                  >
                    Tüm Haftayı Göster
                  </button>
                  {config.activeDays.map((day) => (
                    <button
                      key={day}
                      type="button"
                      onClick={() => setAllViewDayFilter(day)}
                      className={`px-3 py-1.5 rounded-lg transition duration-155 cursor-pointer text-[11px] font-bold ${
                        allViewDayFilter === day
                          ? "bg-indigo-600 text-white shadow-sm"
                          : "text-slate-650 hover:bg-slate-200"
                      }`}
                    >
                      {day}
                    </button>
                  ))}
                </div>

                <div className="flex items-center gap-2">
                  {/* Akıllı Otomatik Tamamlama Button */}
                  <button
                    type="button"
                    disabled={solverRunning}
                    onClick={handleAutoComplete}
                    className={`px-3 py-2 rounded-xl text-xs font-bold font-sans text-white flex items-center gap-1.5 transition shadow-sm ${
                      solverRunning 
                        ? "bg-teal-400 cursor-not-allowed" 
                        : "bg-teal-600 hover:bg-teal-700"
                    }`}
                    title="Atanmamış dersleri kısıtlara göre otomatik olarak tamamlama simülasyonu çalıştırır."
                  >
                    <Wand2 className={`w-3.5 h-3.5 ${solverRunning ? "animate-spin" : ""}`} />
                    Akıllı Otomatik Tamamlama
                  </button>

                  {/* Hızlı Otomatik Ata Button */}
                  <button
                    type="button"
                    disabled={solverRunning}
                    onClick={runFastAutoAssign}
                    className={`px-3 py-2 rounded-xl text-xs font-bold font-sans text-white flex items-center gap-1.5 transition shadow-sm ${
                      solverRunning 
                        ? "bg-purple-400 cursor-not-allowed" 
                        : "bg-purple-600 hover:bg-purple-700"
                    }`}
                    title="Kısıt ve 6-saat ideal limitini gözeterek boşlukları otomatik doldurur."
                  >
                    <CheckCircle2 className={`w-3.5 h-3.5 ${solverRunning ? "animate-spin" : ""}`} />
                    Hızlı Otomatik Ata
                  </button>

                  {/* Tümünü Temizle Button */}
                  {!showClearConfirm ? (
                    <button
                      type="button"
                      onClick={() => setShowClearConfirm(true)}
                      className="px-3 py-2 bg-rose-50 text-rose-600 border border-rose-200 hover:bg-rose-100 hover:text-rose-700 rounded-xl text-xs font-bold font-sans flex items-center gap-1.5 transition"
                      title="Mevcut tüm ders atamalarını siler."
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Tümünü Temizle
                    </button>
                  ) : (
                    <div className="flex items-center gap-1.5 bg-rose-50 p-1 rounded-xl border border-rose-200 animate-fade-in">
                      <span className="text-[11px] text-rose-700 font-bold px-2">Emin misiniz?</span>
                      <button
                        type="button"
                        onClick={() => {
                          onUpdatePlans([]);
                          setShowClearConfirm(false);
                        }}
                        className="px-2.5 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-[11px] font-bold transition"
                      >
                        Evet, Sil
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowClearConfirm(false)}
                        className="px-2.5 py-1 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-lg text-[11px] font-bold transition"
                      >
                        İptal
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
          
          <div className="overflow-x-auto max-w-full">
            <table 
              className="w-full text-left text-xs text-slate-705 table-fixed border-collapse"
              style={{ minWidth: `${getAllViewMinWidth()}px` }}
            >
              <thead>
                <tr className="bg-slate-100 text-slate-600 font-bold uppercase border-b border-slate-150 text-center">
                  <th className="px-3 py-3 text-left w-52 sticky left-0 z-20 bg-slate-100 border-r border-slate-200">Sınıf</th>
                  {config.activeDays
                    .filter((day) => allViewDayFilter === "all" || day === allViewDayFilter)
                    .map((day) => {
                      const dayActiveCount = getActivePeriodsCountForDay(day, config);
                      const activeSlotsForDay = getMasterTimeSlots(config).filter(slot => slot.periyotNo <= dayActiveCount);
                      
                      return activeSlotsForDay.map((slot) => (
                        <th key={`${day}-${slot.periyotNo}`} className="px-3 py-3 border-l border-slate-150 font-sans min-w-[180px] text-slate-800">
                          <div className="flex flex-col">
                            <span className="text-slate-900 font-bold text-[11px]">{day}</span>
                            <span className="text-[9px] text-slate-500 font-mono font-normal mt-0.5">Periyot {slot.periyotNo} ({slot.baslangicSaati} - {slot.bitisSaati})</span>
                          </div>
                        </th>
                      ));
                    })}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-150">
                {classes.map((cls) => {
                  return (
                    <tr key={cls.id} className="hover:bg-slate-50/50 transition">
                      {/* Row header: Class */}
                      <td className="px-3 py-3 w-52 font-bold text-slate-850 bg-slate-50/95 font-sans border-r border-slate-200 sticky left-0 z-10 shadow-[2px_0_5px_rgba(0,0,0,0.03)]">
                        <div className="flex flex-col justify-center h-full min-h-[90px]">
                          <span className="font-bold text-indigo-950">{cls.sinifAdi}</span>
                          <span className="text-[10px] text-slate-500 font-mono font-normal mt-0.5">Kapasite: {cls.kapasite}</span>
                        </div>
                      </td>
                      
                      {/* Time Slots Columns */}
                      {config.activeDays
                        .filter((day) => allViewDayFilter === "all" || day === allViewDayFilter)
                        .map((day) => {
                          const dayActiveCount = getActivePeriodsCountForDay(day, config);
                          const activeSlotsForDay = getMasterTimeSlots(config).filter(slot => slot.periyotNo <= dayActiveCount);
                          
                          return activeSlotsForDay.map((slot) => {
                          const cellKey = `${day}-${slot.periyotNo}-${cls.id}`;
                          const planItem = getPlanAtCell(day, slot.periyotNo, cls.id);
                          const cellViolations = getCellViolations(day, slot.periyotNo, cls.id);
                          const hasZorunlu = cellViolations.some(v => v.seviye === "Zorunlu");
                          const hasEsnek = cellViolations.some(v => v.seviye === "Esnek");
                          const isCreatingCell = activeSetupSlot === cellKey;
                          
                          const isDraggedOver = dragOverCell === cellKey;
                          const isTargetCell = planItem && targetPlanIds && targetPlanIds.includes(planItem.id);
                          
                          return (
                            <td
                              key={`${day}-${slot.periyotNo}`}
                              className={`p-2 vertical-top border-l border-slate-100 relative transition-all min-h-[90px] ${
                                isDraggedOver ? "bg-indigo-50 border-2 border-indigo-400" : ""
                              } ${
                                hasZorunlu 
                                  ? "bg-rose-50/60 border-l border-rose-300" 
                                  : hasEsnek
                                    ? "bg-amber-50/65 border-l border-amber-300"
                                    : ""
                              } ${isTargetCell ? "ring-2 ring-indigo-500 ring-offset-2 animate-pulse bg-indigo-50/30" : ""}`}
                              onDragOver={(e) => {
                                e.preventDefault();
                                if (dragOverCell !== cellKey) {
                                  setDragOverCell(cellKey);
                                }
                              }}
                              onDragLeave={() => {
                                if (dragOverCell === cellKey) {
                                  setDragOverCell(null);
                                }
                              }}
                              onDrop={(e) => {
                                setDragOverCell(null);
                                handleDropOnCell(e, day, slot.periyotNo, cls.id);
                              }}
                            >
                              {planItem && planItem.durum === "Conflict Detected" && !isCreatingCell ? (
                                 <div className="flex flex-col items-center justify-center py-2 h-full w-full">
                                   <span className="inline-block text-[9px] font-bold px-1.5 py-0.5 rounded font-sans bg-rose-100 text-rose-700">
                                     {courses.find((c) => c.id === planItem.dersId)?.dersAdi || "Ders"}
                                   </span>
                                   <div className="flex flex-col items-center gap-0.5 mt-1 text-[8px] font-bold text-rose-600 bg-rose-50 px-1 py-0.5 rounded border border-rose-200 w-full">
                                     <AlertTriangle className="w-2.5 h-2.5 shrink-0" />
                                     <span>Conflict Detected</span>
                                   </div>
                                   <button
                                     type="button"
                                     onClick={() => handleAutoResolve(planItem)}
                                     className="mt-1 w-full py-0.5 bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-[8px] rounded-md transition-all flex items-center justify-center gap-1 font-sans"
                                     title="Oto-Çözüm / Uygun Slot Öner"
                                   >
                                     <Sparkles className="w-2 h-2" />
                                     Oto-Çöz
                                   </button>
                                 </div>
                              ) : planItem && !isCreatingCell ? (
                                <div 
                                  draggable
                                  onDragStart={(e) => handleDragStart(e, planItem.id)}
                                  className="space-y-1.5 flex flex-col justify-between bg-white p-2 rounded-xl border border-slate-200 shadow-sm transition hover:shadow-md hover:border-indigo-350 cursor-grab active:cursor-grabbing h-full min-h-[75px]"
                                >
                                  <div>
                                    <div className="flex justify-between items-start gap-1">
                                      <span className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded font-sans truncate max-w-[80%] ${
                                        planItem.planTuru === PlanTuru.REHBERLIK 
                                          ? "bg-purple-100 text-purple-700" 
                                          : "bg-indigo-100 text-indigo-700"
                                      }`}>
                                        {courses.find((c) => c.id === planItem.dersId)?.dersAdi || "Ders"}
                                      </span>
                                      <button 
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setSelectedSlotForSuggestions({
                                            day,
                                            periodNo: slot.periyotNo,
                                            classId: planItem.sinifId
                                          });
                                          setShowSuggestionsSidebar(true);
                                        }}
                                        className="text-indigo-500 hover:text-indigo-705 rounded p-0.5"
                                        title="Öğretmen Önerileri Göster"
                                      >
                                        <Sparkles className="w-3.5 h-3.5" />
                                      </button>
                                      <button 
                                        onClick={() => deleteAssignment(planItem.id)}
                                        className="text-slate-400 hover:text-rose-500 rounded p-0.5 transition cursor-pointer"
                                        title="Görevi İptal Et"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    </div>
                                    <div className="text-[10px] text-slate-655 mt-1 space-y-0.5 font-sans leading-tight">
                                      <div className="flex items-center gap-1 font-semibold text-slate-700">
                                        <User className="w-2.5 h-2.5 text-slate-400 shrink-0" />
                                        <span className="truncate">{teachers.find((t) => t.id === planItem.ogretmenId)?.adSoyad}</span>
                                      </div>
                                      <div className="flex items-center gap-1 text-slate-500">
                                        <MapPin className="w-2.5 h-2.5 text-slate-400 shrink-0" />
                                        <span className="truncate">{classrooms.find((r) => r.id === planItem.derslikId)?.derslikAdi}</span>
                                      </div>
                                    </div>
                                  </div>
                                  
                                  {cellViolations.length > 0 && (
                                    <div className="space-y-1 mt-1">
                                      <div 
                                        className={`flex items-center gap-0.5 text-[8px] font-bold px-1 py-0.5 rounded break-all leading-tight ${
                                          hasZorunlu ? "text-rose-600 bg-rose-100" : "text-amber-700 bg-amber-100"
                                        }`} 
                                        title={cellViolations.map(cv => cv.mesaj).join("\n")}
                                      >
                                        <AlertTriangle className="w-2.5 h-2.5 shrink-0" />
                                        <span className="truncate">{hasZorunlu ? "Çakışma" : "Uyar."}</span>
                                      </div>
                                      <button
                                        type="button"
                                        onClick={() => handleAutoResolve(planItem)}
                                        className={`w-full py-0.5 text-[8px] font-bold rounded flex items-center justify-center gap-0.5 transition-all cursor-pointer ${
                                          hasZorunlu 
                                            ? "bg-rose-600 hover:bg-rose-700 text-white" 
                                            : "bg-amber-600 hover:bg-amber-700 text-white"
                                        }`}
                                        title="Bu çakışmayı otomatik alternatif slotlarla gider."
                                      >
                                        <Sparkles className="w-2 h-2" />
                                        Oto-Çöz
                                      </button>
                                    </div>
                                  )}
                                </div>
                              ) : isCreatingCell ? (
                                /* Setup micro assignment inside Cell */
                                <div className="bg-slate-50 p-2 rounded-lg border border-slate-300 space-y-2 text-[10px] z-10 relative">
                                  <div className="font-bold text-slate-700 border-b border-slate-200 pb-1 text-center font-sans">
                                    Ekle
                                  </div>
                                  {setupError && (
                                    <div className="bg-rose-50 border border-rose-200 text-rose-700 p-1 rounded text-[9px] font-semibold leading-tight0">
                                      {setupError}
                                    </div>
                                  )}
                                  <div className="space-y-0.5">
                                    <span className="text-[9px] text-slate-500 font-bold">Ders Branş</span>
                                    <select 
                                      value={setupCourseId}
                                      onChange={(e) => setSetupCourseId(e.target.value)}
                                      className="w-full text-[10px] p-0.5 border rounded bg-white text-slate-800 font-medium"
                                    >
                                      <option value="">Seçin...</option>
                                      {courses.map((c) => (
                                        <option key={c.id} value={c.id}>{c.dersAdi}</option>
                                      ))}
                                    </select>
                                  </div>
                                  
                                  <div className="space-y-0.5">
                                    <span className="text-[9px] text-slate-500 font-bold">Öğretmen</span>
                                    <select 
                                      value={setupTeacherId}
                                      onChange={(e) => setSetupTeacherId(e.target.value)}
                                      className="w-full text-[10px] p-0.5 border rounded bg-white text-slate-800 font-medium"
                                    >
                                      <option value="">Seçin...</option>
                                      {teachers.filter((t) => {
                                        if (!t.aktifPasif) return false;
                                        const c = courses.find((crs) => crs.id === setupCourseId);
                                        if (c) {
                                          return c.brans === "Rehberlik" ? t.brans === "Rehberlik" : t.brans === c.brans;
                                        }
                                        return true;
                                      }).map((t) => {
                                        let isAvailable = false;
                                        const cellSlotKey = `${day}-${slot.periyotNo}`;
                                        if (t.uygunPeriyotlar && t.uygunPeriyotlar.length > 0) {
                                          isAvailable = t.uygunPeriyotlar.includes(cellSlotKey);
                                        } else {
                                          isAvailable = t.uygunGunler.includes(day) && t.uygunSaatler.includes(slot.periyotNo.toString());
                                        }
                                        const isAlreadyTeaching = plans.some(p => p.ogretmenId === t.id && p.periyotId === cellSlotKey && p.planTuru !== PlanTuru.BOS);
                                        return (
                                          <option key={t.id} value={t.id} disabled={!isAvailable || isAlreadyTeaching}>
                                            {t.adSoyad} {isAlreadyTeaching ? "(Dolu)" : !isAvailable ? "(Uyg. Değil)" : ""}
                                          </option>
                                        );
                                      })}
                                    </select>
                                  </div>

                                  <div className="space-y-0.5">
                                    <span className="text-[9px] text-slate-500 font-bold">Derslik</span>
                                    <select 
                                      value={setupClassroomId}
                                      onChange={(e) => setSetupClassroomId(e.target.value)}
                                      className="w-full text-[10px] p-0.5 border rounded bg-white text-slate-800 font-medium"
                                    >
                                      <option value="">Seçin...</option>
                                      {classrooms
                                        .filter(r => r.aktifPasif && (!cls || !r.hizmetBirimi || r.hizmetBirimi === "Tümü" || r.hizmetBirimi === cls.kademe))
                                        .map((r) => {
                                          const isRoomBusy = plans.some(p => p.derslikId === r.id && p.periyotId === `${day}-${slot.periyotNo}` && p.planTuru !== PlanTuru.BOS);
                                          return (
                                            <option key={r.id} value={r.id} disabled={isRoomBusy}>
                                              {r.derslikAdi} (Kap: {r.kapasite}{r.hizmetBirimi && r.hizmetBirimi !== "Tümü" ? ` - ${r.hizmetBirimi}` : ""}) {isRoomBusy ? "(Dolu)" : ""}
                                            </option>
                                          );
                                        })}
                                    </select>
                                  </div>

                                  <div className="flex gap-1 pt-1">
                                    <button 
                                      onClick={() => saveManualAssignment(day, slot.periyotNo, cls.id)}
                                      className="flex-1 bg-indigo-600 text-white py-1 rounded font-bold text-[9px] hover:bg-indigo-700"
                                    >
                                      Ekle
                                    </button>
                                    <button 
                                      onClick={() => setActiveSetupSlot(null)}
                                      className="bg-transparent border border-slate-200 text-slate-600 px-1 py-1 rounded text-[9px] hover:bg-slate-100"
                                    >
                                      X
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <button 
                                  onClick={() => {
                                    clearSetupFields();
                                    setSetupClassId(cls.id);
                                    setActiveSetupSlot(cellKey);
                                    setSelectedSlotForSuggestions({
                                      day,
                                      periodNo: slot.periyotNo,
                                      classId: cls.id
                                    });
                                    setShowSuggestionsSidebar(true);
                                  }}
                                  className="absolute inset-0 w-full h-full hover:bg-indigo-50/50 flex items-center justify-center text-slate-350 opacity-0 hover:opacity-100 transition rounded"
                                >
                                  <Plus className="w-4 h-4 text-indigo-500" />
                                </button>
                              )}
                            </td>
                          );
                        });
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Gün Bazlı Program Menüsü */}
      {viewType === "day" && (
        <div className="bg-white rounded-2xl border border-slate-150 shadow-sm overflow-hidden mt-6 animate-fade-in">
          {/* Day View Header */}
          <div className="p-4 bg-slate-50 border-b border-slate-150">
            <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
              <div>
                <strong className="text-slate-800 text-sm font-sans flex items-center gap-1.5 font-bold">
                  <Calendar className="w-4 h-4 text-indigo-600 animate-none" />
                  Gün Bazlı Ders Programı - {selectedDayDayView} ({dayViewMode === "class" ? "Sınıflar" : "Öğretmenler"})
                </strong>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Seçilen güne ait tüm {dayViewMode === "class" ? "sınıfların" : "öğretmenlerin"} yerleşim tablosu. Hücrelerde sürükle-bırak yapabilirsiniz.
                </p>
              </div>

              {/* Legend/Legend info indicators */}
              <div className="flex gap-2 text-[10px] font-semibold text-slate-500 flex-wrap">
                <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 bg-rose-100 border border-rose-300 rounded"></span> Zorunlu Çakışma</span>
                <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 bg-amber-100 border border-amber-300 rounded"></span> Esnek Kural Uyarısı</span>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto select-none">
            <table 
              className="w-full text-left text-xs text-slate-705 table-fixed border-collapse"
              style={{ minWidth: `${getDayViewMinWidth()}px` }}
            >
              <thead>
                <tr className="bg-slate-100 text-slate-600 font-bold uppercase border-b border-slate-150 text-center">
                  <th className="px-3 py-3 text-left w-52 sticky left-0 z-20 bg-slate-100 border-r border-slate-200">
                    {dayViewMode === "class" ? "Sınıf" : "Öğretmen / Branş"}
                  </th>
                  {(() => {
                    const dayActiveCount = getActivePeriodsCountForDay(selectedDayDayView, config);
                    const activeSlotsForDay = getMasterTimeSlots(config).filter(slot => slot.periyotNo <= dayActiveCount);
                    return activeSlotsForDay.map((slot) => (
                      <th key={slot.periyotNo} className="px-3 py-3 border-l border-slate-150 font-sans min-w-[180px] text-slate-800">
                        <div className="flex flex-col">
                          <span className="text-slate-900 font-bold text-[11px]">Periyot {slot.periyotNo}</span>
                          <span className="text-[9px] text-slate-400 font-mono font-normal mt-0.5">({slot.baslangicSaati} - {slot.bitisSaati})</span>
                        </div>
                      </th>
                    ));
                  })()}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-150">
                {(dayViewMode === "class" ? classes : teachers.filter(t => t.aktifPasif)).map((entity) => {
                  const dayActiveCount = getActivePeriodsCountForDay(selectedDayDayView, config);
                  const activeSlotsForDay = getMasterTimeSlots(config).filter(slot => slot.periyotNo <= dayActiveCount);

                  return (
                    <tr key={entity.id} className="hover:bg-slate-50/50 transition">
                      {/* Left sticky column header */}
                      <td className="px-3 py-3 w-52 font-bold text-slate-850 bg-slate-50/95 font-sans border-r border-slate-200 sticky left-0 z-10 shadow-[2px_0_5px_rgba(0,0,0,0.03)]">
                        <div className="flex flex-col justify-center h-full min-h-[90px]">
                          {dayViewMode === "class" ? (
                            <>
                              <span className="font-bold text-indigo-950">{(entity as ClassUnit).sinifAdi}</span>
                              <span className="text-[10px] text-slate-500 font-mono font-normal mt-0.5">Kapasite: {(entity as ClassUnit).kapasite}</span>
                            </>
                          ) : (
                            <>
                              <span className="font-bold text-slate-850">{(entity as Teacher).adSoyad}</span>
                              <span className="text-[10px] text-slate-500 font-sans font-medium mt-0.5 text-indigo-800 bg-indigo-50 border border-indigo-100/50 px-1.5 py-0.5 rounded self-start truncate max-w-full">{(entity as Teacher).brans}</span>
                            </>
                          )}
                        </div>
                      </td>

                      {/* Period columns for this entity */}
                      {activeSlotsForDay.map((slot) => {
                        const cellKey = `${selectedDayDayView}-${slot.periyotNo}-${entity.id}`;
                        const planItem = getPlanAtCell(selectedDayDayView, slot.periyotNo, entity.id);
                        const cellViolations = getCellViolations(selectedDayDayView, slot.periyotNo, entity.id);
                        const hasZorunlu = cellViolations.some(v => v.seviye === "Zorunlu");
                        const hasEsnek = cellViolations.some(v => v.seviye === "Esnek");
                        const isCreatingCell = activeSetupSlot === cellKey;
                        const isDraggedOver = dragOverCell === cellKey;
                        const isTargetCell = planItem && targetPlanIds && targetPlanIds.includes(planItem.id);

                        return (
                          <td
                            key={slot.periyotNo}
                            className={`p-1.5 vertical-top border-l border-slate-100 relative transition-all min-h-[90px] ${
                              isDraggedOver ? "bg-indigo-50 border-2 border-indigo-400" : ""
                            } ${
                              hasZorunlu 
                                ? "bg-rose-50/60 border-l border-rose-300" 
                                : hasEsnek
                                  ? "bg-amber-50/65 border-l border-amber-300"
                                  : ""
                            } ${isTargetCell ? "ring-2 ring-indigo-500 ring-offset-2 animate-pulse bg-indigo-50/30" : ""}`}
                            onDragOver={(e) => {
                              e.preventDefault();
                              if (dragOverCell !== cellKey) {
                                setDragOverCell(cellKey);
                              }
                            }}
                            onDragLeave={() => {
                              if (dragOverCell === cellKey) {
                                setDragOverCell(null);
                              }
                            }}
                            onDrop={(e) => {
                              setDragOverCell(null);
                              handleDropOnCell(e, selectedDayDayView, slot.periyotNo, entity.id);
                            }}
                          >
                            {planItem && planItem.durum === "Conflict Detected" && !isCreatingCell ? (
                              <div className="flex flex-col items-center justify-center p-1.5 h-full w-full">
                                <span className="inline-block text-[9px] font-extrabold px-1.5 py-0.5 rounded font-sans bg-rose-100 text-rose-700 max-w-full truncate">
                                  {courses.find((c) => c.id === planItem.dersId)?.dersAdi || "Ders"}
                                </span>
                                <div className="flex flex-col items-center gap-0.5 mt-1 text-[8px] font-bold text-rose-600 bg-rose-50 px-1 py-0.5 rounded border border-rose-200 w-full text-center">
                                  <AlertTriangle className="w-2.5 h-2.5 shrink-0" />
                                  <span className="truncate w-full">Conflict Detected</span>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => handleAutoResolve(planItem)}
                                  className="mt-1 w-full py-0.5 bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-[8px] rounded-md transition-all flex items-center justify-center gap-1 font-sans cursor-pointer"
                                >
                                  <Sparkles className="w-2 h-2" />
                                  Oto-Çöz
                                </button>
                              </div>
                            ) : planItem && !isCreatingCell ? (
                              <div
                                draggable
                                onDragStart={(e) => handleDragStart(e, planItem.id)}
                                className="space-y-1 flex flex-col justify-between bg-white p-1.5 rounded-lg border border-slate-200 cursor-grab hover:border-slate-400 active:cursor-grabbing hover:bg-slate-50 transition shadow-sm h-full min-h-[72px]"
                              >
                                <div>
                                  <div className="flex justify-between items-start gap-1">
                                    <span className={`inline-block text-[9px] font-bold px-1.5 py-0.5 rounded font-sans truncate max-w-[80%] ${
                                      planItem.planTuru === PlanTuru.REHBERLIK
                                        ? "bg-purple-100 text-purple-700"
                                        : "bg-indigo-100 text-indigo-700"
                                    }`}>
                                      {courses.find((c) => c.id === planItem.dersId)?.dersAdi || "Ders"}
                                    </span>
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setSelectedSlotForSuggestions({
                                          day: selectedDayDayView,
                                          periodNo: slot.periyotNo,
                                          classId: planItem.sinifId
                                        });
                                        setShowSuggestionsSidebar(true);
                                      }}
                                      className="text-indigo-500 hover:text-indigo-705 rounded p-0.5"
                                      title="Öğretmen Önerileri Göster"
                                    >
                                      <Sparkles className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => deleteAssignment(planItem.id)}
                                      className="text-slate-400 hover:text-rose-500 rounded p-0.5 transition cursor-pointer"
                                      title="Görevi İptal Et"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </div>

                                  <div className="text-[9px] text-slate-605 mt-1 space-y-0.5 font-sans leading-tight">
                                    {dayViewMode === "class" ? (
                                      <div className="flex items-center gap-1 font-semibold text-slate-700">
                                        <User className="w-2.5 h-2.5 text-slate-400 shrink-0" />
                                        <span className="truncate">{teachers.find((t) => t.id === planItem.ogretmenId)?.adSoyad}</span>
                                      </div>
                                    ) : (
                                      <div className="flex items-center gap-1 font-semibold text-slate-700">
                                        <GraduationCap className="w-2.5 h-2.5 text-slate-400 shrink-0" />
                                        <span className="truncate">{classes.find((c) => c.id === planItem.sinifId)?.sinifAdi}</span>
                                      </div>
                                    )}

                                    <div className="flex items-center gap-1 text-slate-500">
                                      <MapPin className="w-2.5 h-2.5 text-slate-400 shrink-0" />
                                      <span className="truncate">{classrooms.find((r) => r.id === planItem.derslikId)?.derslikAdi}</span>
                                    </div>
                                  </div>
                                </div>

                                {cellViolations.length > 0 && (
                                  <div className="space-y-1 mt-1">
                                    <div
                                      className={`flex items-center gap-0.5 text-[8px] font-bold px-1 py-0.5 rounded break-all leading-tight ${
                                        hasZorunlu ? "text-rose-600 bg-rose-100" : "text-amber-700 bg-amber-100"
                                      }`}
                                      title={cellViolations.map(cv => cv.mesaj).join("\n")}
                                    >
                                      <AlertTriangle className="w-2.5 h-2.5 shrink-0" />
                                      <span className="truncate">{hasZorunlu ? "Çakışma" : "Uyar."}</span>
                                    </div>
                                    <button
                                      type="button"
                                      onClick={() => handleAutoResolve(planItem)}
                                      className={`w-full py-0.5 text-[8px] font-bold rounded flex items-center justify-center gap-0.5 transition-all cursor-pointer ${
                                        hasZorunlu
                                          ? "bg-rose-600 hover:bg-rose-700 text-white"
                                          : "bg-amber-600 hover:bg-amber-700 text-white"
                                      }`}
                                    >
                                      <Sparkles className="w-2 h-2" />
                                      Oto-Çöz
                                    </button>
                                  </div>
                                )}
                              </div>
                            ) : isCreatingCell ? (
                              <div className="bg-slate-50 p-2 rounded-lg border border-slate-300 space-y-2 text-[10px] z-10 relative animate-fade-in">
                                <div className="font-bold text-slate-705 border-b border-slate-200 pb-1 text-center font-sans">
                                  Ekle
                                </div>
                                {setupError && (
                                  <div className="bg-rose-50 border border-rose-200 text-rose-700 p-1 rounded text-[9px] font-semibold leading-tight0">
                                    {setupError}
                                  </div>
                                )}
                                
                                {dayViewMode === "teacher" && (
                                  <div className="space-y-0.5">
                                    <span className="text-[9px] text-slate-505 font-bold">Sınıf</span>
                                    <select
                                      value={setupClassId}
                                      onChange={(e) => setSetupClassId(e.target.value)}
                                      className="w-full text-[10px] p-0.5 border rounded bg-white text-slate-800 font-medium font-sans"
                                    >
                                      <option value="">Seçin...</option>
                                      {classes.map((c) => (
                                        <option key={c.id} value={c.id}>{c.sinifAdi}</option>
                                      ))}
                                    </select>
                                  </div>
                                )}

                                <div className="space-y-0.5">
                                  <span className="text-[9px] text-slate-500 font-bold">Ders Branş</span>
                                  <select
                                    value={setupCourseId}
                                    onChange={(e) => setSetupCourseId(e.target.value)}
                                    className="w-full text-[10px] p-0.5 border rounded bg-white text-slate-800 font-medium font-sans"
                                  >
                                    <option value="">Seçin...</option>
                                    {courses.map((c) => (
                                      <option key={c.id} value={c.id}>{c.dersAdi}</option>
                                    ))}
                                  </select>
                                </div>

                                {dayViewMode === "class" && (
                                  <div className="space-y-0.5">
                                    <span className="text-[9px] text-slate-500 font-bold">Öğretmen</span>
                                    <select
                                      value={setupTeacherId}
                                      onChange={(e) => setSetupTeacherId(e.target.value)}
                                      className="w-full text-[10px] p-0.5 border rounded bg-white text-slate-800 font-medium font-sans"
                                    >
                                      <option value="">Seçin...</option>
                                      {teachers.filter((t) => {
                                        if (!t.aktifPasif) return false;
                                        const c = courses.find((crs) => crs.id === setupCourseId);
                                        if (c) {
                                          return c.brans === "Rehberlik" ? t.brans === "Rehberlik" : t.brans === c.brans;
                                        }
                                        return true;
                                      }).map((t) => {
                                        let isAvailable = false;
                                        const cellSlotKey = `${selectedDayDayView}-${slot.periyotNo}`;
                                        if (t.uygunPeriyotlar && t.uygunPeriyotlar.length > 0) {
                                          isAvailable = t.uygunPeriyotlar.includes(cellSlotKey);
                                        } else {
                                          isAvailable = t.uygunGunler.includes(selectedDayDayView) && t.uygunSaatler.includes(slot.periyotNo.toString());
                                        }
                                        const isAlreadyTeaching = plans.some(p => p.ogretmenId === t.id && p.periyotId === cellSlotKey && p.planTuru !== PlanTuru.BOS);
                                        return (
                                          <option key={t.id} value={t.id} disabled={!isAvailable || isAlreadyTeaching}>
                                            {t.adSoyad} {isAlreadyTeaching ? "(Dolu)" : !isAvailable ? "(Uyg. Değil)" : ""}
                                          </option>
                                        );
                                      })}
                                    </select>
                                  </div>
                                )}

                                <div className="space-y-0.5">
                                  <span className="text-[9px] text-slate-500 font-bold">Derslik</span>
                                  <select
                                    value={setupClassroomId}
                                    onChange={(e) => setSetupClassroomId(e.target.value)}
                                    className="w-full text-[10px] p-0.5 border rounded bg-white text-slate-800 font-medium font-sans"
                                  >
                                    <option value="">Seçin...</option>
                                    {(() => {
                                      const targetClassId = dayViewMode === "class" ? entity.id : setupClassId;
                                      const targetClass = classes.find(c => c.id === targetClassId);
                                      return classrooms
                                        .filter(r => r.aktifPasif && (!targetClass || !r.hizmetBirimi || r.hizmetBirimi === "Tümü" || r.hizmetBirimi === targetClass.kademe))
                                        .map((r) => {
                                          const isRoomBusy = plans.some(p => p.derslikId === r.id && p.periyotId === `${selectedDayDayView}-${slot.periyotNo}` && p.planTuru !== PlanTuru.BOS);
                                          return (
                                            <option key={r.id} value={r.id} disabled={isRoomBusy}>
                                              {r.derslikAdi} (Kap: {r.kapasite}{r.hizmetBirimi && r.hizmetBirimi !== "Tümü" ? ` - ${r.hizmetBirimi}` : ""}) {isRoomBusy ? "(Dolu)" : ""}
                                            </option>
                                          );
                                        });
                                    })()}
                                  </select>
                                </div>

                                <div className="flex gap-1 pt-1">
                                  <button
                                    type="button"
                                    onClick={() => saveManualAssignment(selectedDayDayView, slot.periyotNo, dayViewMode === "class" ? entity.id : setupClassId)}
                                    className="flex-1 bg-indigo-600 text-white py-1 rounded font-bold text-[9px] hover:bg-indigo-700 cursor-pointer"
                                  >
                                    Ekle
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setActiveSetupSlot(null)}
                                    className="bg-transparent border border-slate-200 text-slate-605 px-1 py-1 rounded text-[9px] hover:bg-slate-100 cursor-pointer"
                                  >
                                    X
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => {
                                  clearSetupFields();
                                  if (dayViewMode === "class") {
                                    setSetupClassId(entity.id);
                                    setSelectedSlotForSuggestions({
                                      day: selectedDayDayView,
                                      periodNo: slot.periyotNo,
                                      classId: entity.id
                                    });
                                  } else {
                                    setSetupTeacherId(entity.id);
                                    const teachersBranch = (entity as Teacher).brans;
                                    const matchingCourse = courses.find((c) => c.brans === teachersBranch);
                                    if (matchingCourse) {
                                      setSetupCourseId(matchingCourse.id);
                                    }
                                    setSelectedSlotForSuggestions({
                                      day: selectedDayDayView,
                                      periodNo: slot.periyotNo,
                                      classId: classes[0]?.id || ""
                                    });
                                  }
                                  setActiveSetupSlot(cellKey);
                                  setShowSuggestionsSidebar(true);
                                }}
                                className="absolute inset-0 w-full h-full hover:bg-indigo-50/50 flex items-center justify-center text-slate-350 opacity-0 hover:opacity-100 transition rounded cursor-pointer"
                              >
                                <Plus className="w-4 h-4 text-indigo-505" />
                              </button>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
        </div>

        {/* Suggested Teachers Sidebar */}
        {showSuggestionsSidebar && (
          <div className="w-full lg:w-96 shrink-0 bg-white p-5 rounded-3xl border border-slate-200 shadow-xl space-y-4 animate-fade-in z-20" id="suggested-teachers-sidebar">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-indigo-600 animate-pulse" />
                <div>
                  <h3 className="text-sm font-extrabold text-slate-900 font-sans tracking-tight">Akıllı Öğretmen Önerici</h3>
                  <span className="text-[10px] text-slate-500 font-medium block mt-0.5">Kalan saat ve branş kısıt analizi</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowSuggestionsSidebar(false);
                  setSidebarError(null);
                }}
                className="text-slate-400 hover:text-slate-700 bg-slate-50 hover:bg-slate-100 p-1.5 rounded-lg transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Error alerts inside sidebar if any */}
            {sidebarError && (
              <div className="bg-rose-50 border border-rose-200 text-rose-700 p-3 rounded-xl text-xs font-semibold leading-relaxed animate-fade-in flex items-start gap-1.5">
                <AlertTriangle className="w-4 h-4 shrink-0 text-rose-500 mt-0.5" />
                <span>{sidebarError}</span>
              </div>
            )}

            {/* Selection Status Panel */}
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-150 space-y-3">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Seçilen Çizelge Koordinatları</span>
              
              <div className="grid grid-cols-2 gap-2 text-xs">
                {/* Class selector */}
                <div className="col-span-2 space-y-1">
                  <label className="text-[10px] font-bold text-slate-500">Sınıf:</label>
                  <select
                    value={selectedSlotForSuggestions?.classId || ""}
                    onChange={(e) => {
                      const cid = e.target.value;
                      setSelectedSlotForSuggestions(prev => prev ? { ...prev, classId: cid } : { day: config.activeDays[0], periodNo: 1, classId: cid });
                      setSidebarError(null);
                    }}
                    className="w-full text-xs p-2 border border-slate-200 rounded-xl bg-white font-semibold text-slate-800"
                  >
                    <option value="">Sınıf Seçin...</option>
                    {classes.map(c => (
                      <option key={c.id} value={c.id}>{c.sinifAdi}</option>
                    ))}
                  </select>
                </div>

                {/* Day selector */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500">Gün:</label>
                  <select
                    value={selectedSlotForSuggestions?.day || ""}
                    onChange={(e) => {
                      const d = e.target.value;
                      setSelectedSlotForSuggestions(prev => prev ? { ...prev, day: d } : { day: d, periodNo: 1, classId: classes[0]?.id || "" });
                      setSidebarError(null);
                    }}
                    className="w-full text-xs p-2 border border-slate-200 rounded-xl bg-white font-semibold text-slate-800"
                  >
                    {config.activeDays.map(d => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>

                {/* Period selector */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500">Periyot:</label>
                  <select
                    value={selectedSlotForSuggestions?.periodNo || ""}
                    onChange={(e) => {
                      const pNum = Number(e.target.value);
                      setSelectedSlotForSuggestions(prev => prev ? { ...prev, periodNo: pNum } : { day: config.activeDays[0], periodNo: pNum, classId: classes[0]?.id || "" });
                      setSidebarError(null);
                    }}
                    className="w-full text-xs p-2 border border-slate-200 rounded-xl bg-white font-semibold text-slate-800"
                  >
                    {getMasterTimeSlots(config).map(slot => (
                      <option key={slot.periyotNo} value={slot.periyotNo}>Periyot {slot.periyotNo}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* List of Suggestions */}
            <div className="space-y-3">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Önerilen Öğretmenler Listesi</span>
              
              {!selectedSlotForSuggestions?.classId ? (
                <div className="text-center py-8 text-xs text-slate-400 border border-dashed border-slate-200 rounded-2xl leading-relaxed">
                  Lütfen ders programında bir periyoda tıklayın ya da yukarıdan bir sınıf seçin.
                </div>
              ) : (
                <div className="space-y-2.5 max-h-[50vh] overflow-y-auto pr-1">
                  {(() => {
                    const suggestions = getSuggestedTeachersForSlot(
                      selectedSlotForSuggestions.classId,
                      selectedSlotForSuggestions.day,
                      selectedSlotForSuggestions.periodNo
                    );

                    if (suggestions.length === 0) {
                      return (
                        <div className="text-center py-8 text-xs text-slate-400 border border-dashed border-slate-200 rounded-2xl">
                          Sistemde kayıtlı öğretmen bulunamadı.
                        </div>
                      );
                    }

                    return suggestions.map((sug) => {
                      const isExcellent = sug.status === "excellent";
                      const isBusy = sug.status === "busy";
                      const isUnavail = sug.status === "unavail";
                      const isFull = sug.status === "full";

                      let badgeBg = "bg-emerald-50 text-emerald-700 border-emerald-100";
                      let badgeText = "Uyumlu & Müsait";

                      if (isBusy) {
                        badgeBg = "bg-rose-50 text-rose-700 border-rose-100";
                        badgeText = "Meşgul";
                      } else if (isUnavail) {
                        badgeBg = "bg-slate-100 text-slate-500 border-slate-200";
                        badgeText = "Takvim Dışı";
                      } else if (isFull) {
                        badgeBg = "bg-amber-50 text-amber-700 border-amber-100";
                        badgeText = "Saat Limiti Dolu";
                      }

                      return (
                        <div 
                          key={sug.teacher.id} 
                          className={`p-3 rounded-2xl border transition-all space-y-2 bg-white ${
                            sug.teachesNeededSubject && isExcellent
                              ? "border-indigo-200 shadow-sm shadow-indigo-100/30 bg-indigo-50/5" 
                              : "border-slate-150 hover:border-slate-250"
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <h4 className="text-xs font-bold text-slate-800 font-sans">{sug.teacher.adSoyad}</h4>
                              <div className="flex items-center gap-1.5 mt-0.5">
                                <span className="text-[10px] text-indigo-650 bg-indigo-50 border border-indigo-100/50 px-1.5 py-0.5 rounded font-bold">{sug.teacher.brans}</span>
                                {sug.teachesNeededSubject && (
                                  <span className="text-[9.5px] text-emerald-600 bg-emerald-50 border border-emerald-100 px-1.5 py-0.5 rounded font-bold">Sınıf İhtiyacı</span>
                                )}
                              </div>
                            </div>

                            <span className={`text-[9px] uppercase font-bold border px-2 py-0.5 rounded-lg shrink-0 ${badgeBg}`}>
                              {badgeText}
                            </span>
                          </div>

                          <div className="flex items-center justify-between text-[10.5px] text-slate-500 pt-1 border-t border-slate-100">
                            <div>
                              <span className="font-medium">Kalan Ders:</span>{" "}
                              <strong className="text-slate-700 font-mono">{sug.remainingHours} / {sug.totalHours} saat</strong>
                            </div>

                            {isExcellent && (
                              <button
                                type="button"
                                onClick={() => assignSuggestedTeacher(sug.teacher, selectedSlotForSuggestions.day, selectedSlotForSuggestions.periodNo, selectedSlotForSuggestions.classId)}
                                className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-750 text-white rounded-lg text-[10px] font-bold shadow-md shadow-indigo-600/10 transition-all flex items-center gap-1 font-sans cursor-pointer"
                              >
                                <Sparkles className="w-2.5 h-2.5" />
                                Hızlı Ata
                              </button>
                            )}
                          </div>
                          
                          {/* Reason or Warning description */}
                          <div className="text-[9.5px] text-slate-400 italic leading-relaxed">
                            {sug.reason}
                          </div>
                        </div>
                      );
                    });
                  })()}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
