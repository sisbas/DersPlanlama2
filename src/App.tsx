/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from "react";
import { 
  BarChart2, 
  UserCheck, 
  GraduationCap, 
  Calendar, 
  Award, 
  Heart, 
  ClipboardList, 
  Cloud, 
  Sparkles, 
  Menu, 
  X,
  Compass,
  Clock,
  RotateCcw,
  AlertTriangle,
  Building
} from "lucide-react";

import { 
  Teacher, 
  ClassUnit, 
  PlanItem, 
  Exam, 
  CounselingSession, 
  AttendanceRecord, 
  Student, 
  ConstraintViolation,
  Classroom
} from "./types";
import { 
  INITIAL_TEACHERS, 
  INITIAL_CLASSES, 
  INITIAL_COURSES, 
  INITIAL_CLASSROOMS, 
  INITIAL_PLAN_ITEMS, 
  INITIAL_STUDENTS, 
  INITIAL_EXAMS, 
  INITIAL_COUNSELINGS 
} from "./data/initialData";
import { validateSchedules } from "./utils/scheduler";

// Pages
import Dashboard from "./components/Dashboard";
import TeacherManagement from "./components/TeacherManagement";
import ClassManagement from "./components/ClassManagement";
import SchedulePanel from "./components/SchedulePanel";
import ExamManagement from "./components/ExamManagement";
import CounselingManagement from "./components/CounselingManagement";
import AttendanceTracker from "./components/AttendanceTracker";
import IntegrationSettings from "./components/IntegrationSettings";
import WorkingHoursPanel from "./components/WorkingHoursPanel";
import ClassroomPlanning from "./components/ClassroomPlanning";
import AiLearningPanel from "./components/AiLearningPanel";
import { SchoolScheduleConfig, DEFAULT_SCHEDULE_CONFIG, getActivePeriodsCountForDay } from "./utils/timeSettings";

export default function App() {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [targetPlanIds, setTargetPlanIds] = useState<string[]>([]);

  // States with Local Storage persistence
  const [scheduleConfig, setScheduleConfig] = useState<SchoolScheduleConfig>(() => {
    const saved = localStorage.getItem("ata_schedule_config");
    return saved ? JSON.parse(saved) : DEFAULT_SCHEDULE_CONFIG;
  });

  const [classrooms, setClassrooms] = useState<Classroom[]>(() => {
    const saved = localStorage.getItem("ata_classrooms");
    return saved ? JSON.parse(saved) : INITIAL_CLASSROOMS;
  });

  const [teachers, setTeachers] = useState<Teacher[]>(() => {
    const saved = localStorage.getItem("ata_teachers");
    const rawTeachers = saved ? JSON.parse(saved) : INITIAL_TEACHERS;
    
    const allDays = ["Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi", "Pazar"];
    const allHours = Array.from({ length: 20 }, (_, i) => (i + 1).toString());
    
    return rawTeachers.map((t: Teacher) => ({
      ...t,
      uygunGunler: t.uygunGunler || allDays,
      uygunSaatler: t.uygunSaatler || allHours,
      uygunPeriyotlar: t.uygunPeriyotlar || [],
    }));
  });

  const [classes, setClasses] = useState<ClassUnit[]>(() => {
    const saved = localStorage.getItem("ata_classes");
    let initialClasses = saved ? JSON.parse(saved) : INITIAL_CLASSES;
    
    // Auto-migrate to respect maxWeeklyHoursByGrade config constraint
    const conf = localStorage.getItem("ata_schedule_config");
    const scheduleConfigObj = conf ? JSON.parse(conf) : DEFAULT_SCHEDULE_CONFIG;
    
    initialClasses = initialClasses.map((c: ClassUnit) => {
      const sName = c.sinifAdi;
      const seviye = c.seviye || (sName.startsWith("9") ? "9" : sName.startsWith("10") ? "10" : sName.startsWith("11") ? "11" : sName.startsWith("12") ? "12" : sName.toLowerCase().includes("mezun") ? "Mezun" : "");
      const maxAllowed = scheduleConfigObj.maxWeeklyHoursByGrade?.[seviye];
      
      if (maxAllowed) {
         let currentSum = Object.values(c.haftalikDersIhtiyaci).reduce((a: any, b: any) => a + Number(b), 0);
         if (currentSum > maxAllowed) {
            let newIhtiyac = { ...c.haftalikDersIhtiyaci };
            // Scale down from the largest hours until it fits
            while(currentSum > maxAllowed) {
               const maxSubj = Object.keys(newIhtiyac).reduce((a, b) => newIhtiyac[a] > newIhtiyac[b] ? a : b);
               if (newIhtiyac[maxSubj] > 1) {
                  newIhtiyac[maxSubj]--;
               } else {
                  delete newIhtiyac[maxSubj];
               }
               currentSum--;
            }
            return { ...c, haftalikDersIhtiyaci: newIhtiyac };
         }
      }
      return c;
    });

    return initialClasses;
  });

  const [plans, setPlans] = useState<PlanItem[]>(() => {
    const saved = localStorage.getItem("ata_plans");
    return saved ? JSON.parse(saved) : INITIAL_PLAN_ITEMS;
  });

  const [students, setStudents] = useState<Student[]>(() => {
    const saved = localStorage.getItem("ata_students");
    return saved ? JSON.parse(saved) : INITIAL_STUDENTS;
  });

  const [exams, setExams] = useState<Exam[]>(() => {
    const saved = localStorage.getItem("ata_exams");
    return saved ? JSON.parse(saved) : INITIAL_EXAMS;
  });

  const [counselings, setCounselings] = useState<CounselingSession[]>(() => {
    const saved = localStorage.getItem("ata_counselings");
    return saved ? JSON.parse(saved) : INITIAL_COUNSELINGS;
  });

  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>(() => {
    const saved = localStorage.getItem("ata_attendance");
    return saved ? JSON.parse(saved) : [];
  });

  const [showResetDialog, setShowResetDialog] = useState(false);

  const handleResetAllData = () => {
    setScheduleConfig(DEFAULT_SCHEDULE_CONFIG);
    setTeachers(INITIAL_TEACHERS);
    setClasses(INITIAL_CLASSES);
    setClassrooms(INITIAL_CLASSROOMS);
    setPlans(INITIAL_PLAN_ITEMS);
    setStudents(INITIAL_STUDENTS);
    setExams(INITIAL_EXAMS);
    setCounselings(INITIAL_COUNSELINGS);
    setAttendanceRecords([]);
    setShowResetDialog(false);
  };

  useEffect(() => {
    const hasMigrated = localStorage.getItem("ata_teachers_explicit_slots_migration_2");
    if (!hasMigrated) {
      setTeachers(prev => prev.map(t => {
        // If they already have some populated slots, keep them. Otherwise populate all active.
        if (t.uygunPeriyotlar && t.uygunPeriyotlar.length > 0) return t;

        const allSlots: string[] = [];
        scheduleConfig.activeDays.forEach(day => {
          const maxP = getActivePeriodsCountForDay(day, scheduleConfig);
          for (let p = 1; p <= maxP; p++) {
            allSlots.push(`${day}-${p}`);
          }
        });

        return {
          ...t, 
          uygunPeriyotlar: allSlots, 
          uygunGunler: ["Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi", "Pazar"], 
          uygunSaatler: Array.from({length: 20}, (_, i) => (i+1).toString())
        };
      }));
      localStorage.setItem("ata_teachers_explicit_slots_migration_2", "true");
    }

    const hasMigrated3 = localStorage.getItem("ata_teachers_explicit_slots_migration_3");
    if (!hasMigrated3) {
      setTeachers(prev => prev.map(t => {
        const expandedHours = Array.from({length: 20}, (_, i) => (i+1).toString());
        return {
          ...t,
          uygunSaatler: expandedHours
        };
      }));
      localStorage.setItem("ata_teachers_explicit_slots_migration_3", "true");
    }

    const hasMigrated4 = localStorage.getItem("ata_teachers_explicit_slots_migration_4");
    if (!hasMigrated4) {
      // Force sync logic: we introduced lgs-reh-01 and additional math teachers.
      // Easiest reliable state update is simply pulling INITIAL_TEACHERS & INITIAL_CLASSES & INITIAL_COURSES again
      // into local storage if they are not updated.
      setTeachers(INITIAL_TEACHERS);
      setClasses(INITIAL_CLASSES);
      localStorage.setItem("ata_teachers_explicit_slots_migration_4", "true");
    }

    const hasMigrated5 = localStorage.getItem("ata_teachers_explicit_slots_migration_5");
    if (!hasMigrated5) {
      setTeachers(prev => prev.map(t => {
        const allSlots: string[] = [];
        scheduleConfig.activeDays.forEach(day => {
          const maxP = getActivePeriodsCountForDay(day, scheduleConfig);
          for (let p = 1; p <= maxP; p++) {
            allSlots.push(`${day}-${p}`);
          }
        });

        return {
          ...t,
          uygunPeriyotlar: allSlots,
          uygunGunler: ["Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi", "Pazar"],
          uygunSaatler: Array.from({length: 20}, (_, i) => (i+1).toString())
        };
      }));
      setClassrooms(INITIAL_CLASSROOMS);
      localStorage.setItem("ata_teachers_explicit_slots_migration_5", "true");
    }
  }, [scheduleConfig]);

  // Calculate constraint violations in real time
  const currentViolations: ConstraintViolation[] = validateSchedules(
    plans,
    teachers,
    classes,
    classrooms,
    INITIAL_COURSES,
    scheduleConfig
  );

  // Persists states when modified
  useEffect(() => {
    localStorage.setItem("ata_schedule_config", JSON.stringify(scheduleConfig));
  }, [scheduleConfig]);

  useEffect(() => {
    localStorage.setItem("ata_classrooms", JSON.stringify(classrooms));
  }, [classrooms]);

  useEffect(() => {
    localStorage.setItem("ata_teachers", JSON.stringify(teachers));
  }, [teachers]);

  useEffect(() => {
    localStorage.setItem("ata_classes", JSON.stringify(classes));
  }, [classes]);

  useEffect(() => {
    localStorage.setItem("ata_plans", JSON.stringify(plans));
  }, [plans]);

  useEffect(() => {
    localStorage.setItem("ata_students", JSON.stringify(students));
  }, [students]);

  useEffect(() => {
    localStorage.setItem("ata_exams", JSON.stringify(exams));
  }, [exams]);

  useEffect(() => {
    localStorage.setItem("ata_counselings", JSON.stringify(counselings));
  }, [counselings]);

  useEffect(() => {
    localStorage.setItem("ata_attendance", JSON.stringify(attendanceRecords));
  }, [attendanceRecords]);

  // Handle updates
  const handleAddTeacher = (teacher: Teacher) => {
    // When a brand new teacher is added, ensure they have full default availability if they don't have explicit slots set
    let processedTeacher = { ...teacher };
    if (!processedTeacher.uygunPeriyotlar || processedTeacher.uygunPeriyotlar.length === 0) {
       const allSlots: string[] = [];
       scheduleConfig.activeDays.forEach(day => {
         const maxP = getActivePeriodsCountForDay(day, scheduleConfig);
         for (let p = 1; p <= maxP; p++) {
           allSlots.push(`${day}-${p}`);
         }
       });
       
       processedTeacher.uygunPeriyotlar = allSlots;
       processedTeacher.uygunGunler = ["Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi", "Pazar"];
       processedTeacher.uygunSaatler = Array.from({ length: 20 }, (_, i) => (i + 1).toString());
    }
    setTeachers([...teachers, processedTeacher]);
  };

  const handleUpdateTeacher = (updatedTeacher: Teacher) => {
    setTeachers(teachers.map(t => t.id === updatedTeacher.id ? updatedTeacher : t));
  };

  const handleDeleteTeacher = (id: string) => {
    setTeachers(teachers.filter((t) => t.id !== id));
  };

  const handleUpdateTeacherStatus = (id: string, active: boolean) => {
    setTeachers(
      teachers.map((t) => (t.id === id ? { ...t, aktifPasif: active } : t))
    );
  };

  const handleAddClass = (newCls: ClassUnit) => {
    setClasses([...classes, newCls]);
  };

  const handleAddClassroom = (newRoom: Classroom) => {
    setClassrooms([...classrooms, newRoom]);
  };

  const handleUpdateClassroom = (updated: Classroom) => {
    setClassrooms(classrooms.map(r => r.id === updated.id ? updated : r));
  };

  const handleDeleteClassroom = (id: string) => {
    setClassrooms(classrooms.filter(r => r.id !== id));
  };

  const handleUpdateClass = (updated: ClassUnit) => {
    setClasses(classes.map(c => c.id === updated.id ? updated : c));
  };

  const handleDeleteClass = (id: string) => {
    setClasses(classes.filter((c) => c.id !== id));
  };

  const handleAddExam = (newExam: Exam) => {
    setExams([newExam, ...exams]);
  };

  const handleAddCounseling = (newCoun: CounselingSession) => {
    setCounselings([newCoun, ...counselings]);
  };

  const handleAddAttendanceRecords = (records: AttendanceRecord[]) => {
    setAttendanceRecords([...records, ...attendanceRecords]);
  };

  // Sidebar toggle help
  const renderSidebarItem = (id: string, label: string, icon: any) => {
    const IconCmp = icon;
    const isActive = activeTab === id;
    
    return (
      <button
        onClick={() => {
          setActiveTab(id);
          setSidebarOpen(false);
          setTargetPlanIds([]);
        }}
        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-semibold font-sans transition-all duration-150 ${
          isActive 
            ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/10" 
            : "text-slate-400 hover:text-white hover:bg-slate-850"
        }`}
      >
        <IconCmp className="w-4.5 h-4.5 shrink-0" />
        <span>{label}</span>
      </button>
    );
  };

  return (
    <div className="min-h-screen bg-slate-50 flex font-sans antialiased text-slate-800">
      
      {/* Mobile Header / Quick top bar */}
      <header className="lg:hidden w-full bg-slate-900 text-white px-4 py-3.5 flex items-center justify-between fixed top-0 left-0 z-50 border-b border-slate-800 shadow">
        <div className="flex items-center gap-2">
          <Compass className="w-5 h-5 text-indigo-400 animate-pulse" />
          <span className="font-bold text-sm tracking-tight font-sans">Ata Akademi</span>
        </div>
        <button 
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="p-1.5 bg-slate-800 hover:bg-slate-700 rounded-lg"
        >
          {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </header>

      {/* Navigation Sidebar Panel (Desktop + Mobile overlay) */}
      <aside className={`
        fixed inset-y-0 left-0 w-64 bg-slate-950 text-slate-200 p-5 flex flex-col justify-between z-40 border-r border-slate-900 transition-transform duration-200 lg:translate-x-0 lg:static
        ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}
      `}>
        <div className="space-y-6 pt-12 lg:pt-0">
          
          {/* Municipal block title */}
          <div className="flex items-center gap-2 border-b border-slate-850 pb-4">
            <div className="p-2 bg-indigo-600/15 text-indigo-400 rounded-xl border border-indigo-500/20">
              <Compass className="w-5 h-5 animate-spin-slow" />
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-indigo-400 tracking-wider">Ataşehir Belediyesi</span>
              <h1 className="text-sm font-bold text-white tracking-tight leading-none font-sans">Ata Akademi</h1>
            </div>
          </div>

          {/* Tab lists */}
          <nav className="space-y-1.5">
            {renderSidebarItem("dashboard", "Yönetici Paneli", BarChart2)}
            {renderSidebarItem("working-hours", "Zaman Çizelgesi & Saatler", Clock)}
            {renderSidebarItem("classrooms", "Derslik & Merkezler", Building)}
            {renderSidebarItem("program", "Ders Programı Editörü", Calendar)}
            {renderSidebarItem("ai-learning", "Yapay Zeka & Desen Analizi", Sparkles)}
            {renderSidebarItem("teachers", "Öğretmen Havuzu", UserCheck)}
            {renderSidebarItem("classes", "Sınıf & Şubeler", GraduationCap)}
            {renderSidebarItem("exams", "Deneme Kulübü (Sınav)", Award)}
            {renderSidebarItem("counselings", "Rehberlik Takibi", Heart)}
            {renderSidebarItem("attendance", "Yoklama & Devamsızlık", ClipboardList)}
            {renderSidebarItem("integrations", "Dış Entegrasyonlar", Cloud)}
          </nav>
        </div>

        {/* Bottom context brand footer */}
        <div className="pt-4 border-t border-slate-850 flex flex-col gap-3">
          <button
            onClick={() => setShowResetDialog(true)}
            className="flex items-center gap-2 text-rose-400 hover:text-white hover:bg-rose-600/90 text-xs font-bold py-2 px-3 rounded-xl transition-colors border border-rose-900 shadow-sm shadow-rose-900/20 w-fit"
            title="Tüm formları ve verileri varsayılan ayarlara sıfırla"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Sıfırla
          </button>
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Algoritmik Servis: Aktif</span>
            </div>
            <span className="text-[9px] text-slate-505 font-mono text-slate-500">Ata Akademi © 2026</span>
          </div>
        </div>
      </aside>

      {/* Main Content scroll box space */}
      <main className="flex-1 overflow-x-hidden pt-16 lg:pt-0">
        <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
          
          {/* Pages Router Switch rendering */}
          {activeTab === "dashboard" && (
            <Dashboard 
              teachers={teachers}
              classes={classes}
              classrooms={classrooms}
              exams={exams}
              counselings={counselings}
              violations={currentViolations}
              onNavigate={(tab, params) => {
                setActiveTab(tab);
                if (params?.targetPlanIds) {
                  setTargetPlanIds(params.targetPlanIds);
                } else {
                  setTargetPlanIds([]);
                }
              }}
              onUpdateClasses={(newClasses) => setClasses(newClasses)}
              plans={plans}
              courses={INITIAL_COURSES}
              config={scheduleConfig}
            />
          )}

          {activeTab === "program" && (
            <SchedulePanel 
              plans={plans}
              teachers={teachers}
              classes={classes}
              classrooms={classrooms}
              courses={INITIAL_COURSES}
              violations={currentViolations}
              config={scheduleConfig}
              onUpdatePlans={(newPlans) => setPlans(newPlans)}
              targetPlanIds={targetPlanIds}
              onClearTarget={() => setTargetPlanIds([])}
            />
          )}

          {activeTab === "working-hours" && (
            <WorkingHoursPanel 
              config={scheduleConfig}
              onUpdateConfig={setScheduleConfig}
            />
          )}

          {activeTab === "teachers" && (
            <TeacherManagement 
              teachers={teachers}
              config={scheduleConfig}
              onAddTeacher={handleAddTeacher}
              onUpdateTeacher={handleUpdateTeacher}
              onDeleteTeacher={handleDeleteTeacher}
              onUpdateTeacherStatus={handleUpdateTeacherStatus}
            />
          )}

          {activeTab === "classes" && (
            <ClassManagement 
              classes={classes}
              plans={plans}
              config={scheduleConfig}
              onAddClass={handleAddClass}
              onUpdateClass={handleUpdateClass}
              onDeleteClass={handleDeleteClass}
            />
          )}

          {activeTab === "classrooms" && (
            <ClassroomPlanning 
              classrooms={classrooms}
              plans={plans}
              teachers={teachers}
              classes={classes}
              courses={INITIAL_COURSES}
              config={scheduleConfig}
              onAddClassroom={handleAddClassroom}
              onUpdateClassroom={handleUpdateClassroom}
              onDeleteClassroom={handleDeleteClassroom}
              onUpdatePlans={(newPlans) => setPlans(newPlans)}
            />
          )}

          {activeTab === "exams" && (
            <ExamManagement 
              exams={exams}
              teachers={teachers}
              classes={classes}
              classrooms={classrooms}
              onAddExam={handleAddExam}
            />
          )}

          {activeTab === "counselings" && (
            <CounselingManagement 
              counselings={counselings}
              teachers={teachers}
              students={students}
              onAddCounseling={handleAddCounseling}
            />
          )}

          {activeTab === "attendance" && (
            <AttendanceTracker 
              classes={classes}
              students={students}
              attendanceRecords={attendanceRecords}
              config={scheduleConfig}
              onAddAttendanceRecords={handleAddAttendanceRecords}
            />
          )}

          {activeTab === "integrations" && (
            <IntegrationSettings 
              classes={classes}
              onUpdateClasses={setClasses}
              teachers={teachers}
              onUpdateTeachers={setTeachers}
              plans={plans}
              onUpdatePlans={setPlans}
              courses={INITIAL_COURSES}
            />
          )}

          {activeTab === "ai-learning" && (
            <AiLearningPanel 
              currentPlans={plans}
              teachers={teachers}
              classes={classes}
              classrooms={classrooms}
              courses={INITIAL_COURSES}
            />
          )}

        </div>
      </main>

      {/* Reset Confirmation Modal */}
      {showResetDialog && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl w-full max-w-sm overflow-hidden flex flex-col shadow-2xl">
            <div className="px-5 py-6 flex flex-col items-center text-center">
              <div className="w-12 h-12 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center mb-4 border border-rose-200">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-800 mb-2 font-sans tracking-tight">Tüm Verileri Sıfırla</h3>
              <p className="text-xs text-slate-500 font-medium leading-relaxed px-2 border-l-2 border-rose-300">
                Emin misiniz? Öğretmenler, ders programları, sınıflar ve tüm form kayıtları sistem başlangıç durumuna döndürülecek. Bu işlem geri alınamaz.
              </p>
            </div>
            <div className="flex items-center p-4 gap-3 bg-slate-50 border-t border-slate-100 rounded-b-3xl">
              <button 
                onClick={() => setShowResetDialog(false)}
                className="flex-1 px-4 py-2 bg-white border border-slate-200 text-slate-700 text-sm font-bold rounded-xl hover:bg-slate-100 transition-colors shadow-sm"
              >
                İptal
              </button>
              <button 
                onClick={handleResetAllData}
                className="flex-1 px-4 py-2 bg-rose-600 text-white text-sm font-bold rounded-xl hover:bg-rose-700 transition-all shadow-md shadow-rose-600/20"
              >
                Evet, Sıfırla
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
