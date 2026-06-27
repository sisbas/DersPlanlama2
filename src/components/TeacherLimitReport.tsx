/**
 * @license
 * SPDX-License-Identifier: Apache-2.5
 */

import { useState } from "react";
import { 
  ShieldAlert, 
  UserCheck, 
  HelpCircle, 
  Search, 
  CheckCircle, 
  AlertTriangle, 
  Calendar, 
  Clock, 
  Users, 
  BarChart2, 
  TrendingUp, 
  Filter, 
  Briefcase 
} from "lucide-react";
import { Teacher, PlanItem } from "../types";
import { SchoolScheduleConfig } from "../utils/timeSettings";

interface TeacherLimitReportProps {
  teachers: Teacher[];
  plans: PlanItem[];
  config: SchoolScheduleConfig;
}

export default function TeacherLimitReport({
  teachers = [],
  plans = [],
  config,
}: TeacherLimitReportProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "OVERLOAD" | "UNDER_TARGET" | "OPTIMAL">("ALL");
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid");

  const activeDays = config?.activeDays || ["Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma"];

  const analysedTeachers = teachers.map(teacher => {
    // Total weekly hours (excluding empty periods)
    const weeklyPlans = plans.filter(p => p.ogretmenId === teacher.id && p.planTuru !== "Boş Periyot");
    const totalWeeklyHours = weeklyPlans.length;

    // Daily breakdown calculations
    const dailyHours: Record<string, number> = {};
    activeDays.forEach(day => {
      const dayPlans = weeklyPlans.filter(p => p.periyotId.startsWith(day + "-"));
      dailyHours[day] = dayPlans.length;
    });

    // Detect violations:
    // Exceeding 8-hour daily limit on any day
    const exceededDays = activeDays.filter(day => dailyHours[day] > 8);
    // Falling below 6-hour target on days they actually teach
    const underTargetDays = activeDays.filter(day => dailyHours[day] > 0 && dailyHours[day] < 6);

    const hasOverload = exceededDays.length > 0;
    const hasUnderTarget = underTargetDays.length > 0;

    let teachingDaysCount = 0;
    activeDays.forEach(day => {
      if (dailyHours[day] > 0) teachingDaysCount++;
    });

    // Determine status label
    let status: "Aşırı Yük" | "İdeal Altı" | "Dengeli" = "Dengeli";
    if (hasOverload) {
      status = "Aşırı Yük";
    } else if (hasUnderTarget) {
      status = "İdeal Altı";
    }

    return {
      teacher,
      totalWeeklyHours,
      dailyHours,
      exceededDays,
      underTargetDays,
      hasOverload,
      hasUnderTarget,
      teachingDaysCount,
      status,
    };
  });

  // Filter functionality
  const filteredReport = analysedTeachers.filter(item => {
    const matchesSearch = 
      item.teacher.adSoyad.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.teacher.brans.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;

    if (statusFilter === "OVERLOAD") return item.hasOverload;
    if (statusFilter === "UNDER_TARGET") return item.hasUnderTarget && !item.hasOverload;
    if (statusFilter === "OPTIMAL") return !item.hasOverload && !item.hasUnderTarget && item.totalWeeklyHours > 0;
    
    return true;
  });

  // Statistical summary counters
  const totalOverloadedCount = analysedTeachers.filter(t => t.hasOverload).length;
  const totalUnderTargetCount = analysedTeachers.filter(t => t.hasUnderTarget).length;
  const totalOptimalCount = analysedTeachers.filter(t => !t.hasOverload && !t.hasUnderTarget && t.totalWeeklyHours > 0).length;
  
  const totalScheduledHours = plans.filter(p => p.planTuru !== "Boş Periyot").length;
  const avgWeeklyHours = teachers.length > 0 ? (totalScheduledHours / teachers.length) : 0;

  return (
    <div className="space-y-6" id="teacher-limits-report-container">
      {/* Header section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center p-6 bg-white rounded-2xl border border-slate-100 shadow-sm gap-4">
        <div>
          <h3 className="text-lg font-bold text-slate-900 font-sans flex items-center gap-2">
            <Briefcase className="w-5 h-5 text-indigo-600" />
            Öğretmen Çalışma Limitleri ve Hedef Analizi
          </h3>
          <p className="text-xs text-slate-500 mt-1">
            Öğretmenlerin günlük 8 saat üst sınırı aşmalarını veya aktif ders günlerinde 6 saatlik ideal hedefin altında kalmalarını takip eder.
          </p>
        </div>

        {/* View mode buttons */}
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs font-semibold">
          <button 
            onClick={() => setViewMode("grid")}
            className={`px-3 py-1.5 rounded-lg transition ${viewMode === "grid" ? "bg-white text-indigo-950 shadow-sm" : "text-slate-500 hover:text-slate-800"}`}
          >
            Kart Görünümü
          </button>
          <button 
            onClick={() => setViewMode("table")}
            className={`px-3 py-1.5 rounded-lg transition ${viewMode === "table" ? "bg-white text-indigo-950 shadow-sm" : "text-slate-500 hover:text-slate-800"}`}
          >
            Tablo Karşılaştırması
          </button>
        </div>
      </div>

      {/* Metric Counters Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric Card: Overloads */}
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-slate-500 text-xs font-semibold uppercase tracking-wider">Günlük &gt;8 Saat Aşımı</span>
            <h3 className={`text-2xl font-bold font-sans ${totalOverloadedCount > 0 ? "text-rose-600 animate-pulse" : "text-emerald-600"}`}>
              {totalOverloadedCount} Öğretmen
            </h3>
            <span className="text-[10px] text-slate-400">Pedagojik limitleri aşan</span>
          </div>
          <div className="p-3 bg-rose-50 text-rose-600 rounded-xl">
            <ShieldAlert className="w-6 h-6" />
          </div>
        </div>

        {/* Metric Card: Under Target */}
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-slate-500 text-xs font-semibold uppercase tracking-wider">Günlük &lt;6 Saat İdeal Altı</span>
            <h3 className={`text-2xl font-bold font-sans ${totalUnderTargetCount > 0 ? "text-amber-600" : "text-slate-500"}`}>
              {totalUnderTargetCount} Öğretmen
            </h3>
            <span className="text-[10px] text-slate-400">Aktif ders günlerinde hedefin altı</span>
          </div>
          <div className="p-3 bg-amber-50 text-amber-600 rounded-xl">
            <AlertTriangle className="w-6 h-6" />
          </div>
        </div>

        {/* Metric Card: Optimal Target */}
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-slate-500 text-xs font-semibold uppercase tracking-wider">Mükemmel Dengede</span>
            <h3 className="text-2xl font-bold text-emerald-600 font-sans">
              {totalOptimalCount} Öğretmen
            </h3>
            <span className="text-[10px] text-slate-400">Tüm limit ve kurallara uygun</span>
          </div>
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
            <CheckCircle className="w-6 h-6" />
          </div>
        </div>

        {/* Metric Card: Avg Weekly load */}
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-slate-500 text-xs font-semibold uppercase tracking-wider">Haftalık Ortalama Yük</span>
            <h3 className="text-2xl font-bold text-slate-900 font-sans">
              {avgWeeklyHours.toFixed(1)} Saat
            </h3>
            <span className="text-[10px] text-slate-400">Öğretmen başına haftalık ders</span>
          </div>
          <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
            <BarChart2 className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Control / Filter Bar */}
      <div className="bg-slate-50 rounded-2xl p-4 flex flex-col md:flex-row items-center justify-between gap-4 border border-slate-200/55">
        <div className="flex items-center gap-2 self-stretch flex-1">
          <Search className="w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Öğretmen adına veya branşına göre filtreleyin..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="bg-transparent text-xs w-full text-slate-800 placeholder-slate-400 outline-none focus:ring-0"
          />
        </div>

        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-xs text-slate-500 font-semibold flex items-center gap-1">
            <Filter className="w-3.5 h-3.5" />
            Metrik Filtresi:
          </span>
          {[
            { id: "ALL", label: "Tümü" },
            { id: "OVERLOAD", label: "Limit Aşımı (>8h)" },
            { id: "UNDER_TARGET", label: "İdeal Altı (<6h)" },
            { id: "OPTIMAL", label: "İdeal Dengede" }
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setStatusFilter(item.id as any)}
              className={`text-xs px-2.5 py-1 rounded-lg border font-semibold transition ${
                statusFilter === item.id
                  ? "bg-indigo-600 text-white border-indigo-600 shadow-sm"
                  : "bg-white text-slate-600 border-slate-200 hover:bg-slate-100"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {/* Main Report representation */}
      {viewMode === "grid" ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {filteredReport.length === 0 ? (
            <div className="col-span-full text-center py-12 bg-white rounded-2xl border border-dashed border-slate-200 text-slate-400 text-xs font-sans">
              Belirtilen limit filtresine uyan öğretmen bulunamadı.
            </div>
          ) : (
            filteredReport.map(({ teacher, totalWeeklyHours, dailyHours, exceededDays, underTargetDays, status }) => {
              return (
                <div 
                  key={teacher.id} 
                  className={`bg-white rounded-2xl p-5 border shadow-sm flex flex-col justify-between transition hover:shadow-md ${
                    status === "Aşırı Yük" 
                      ? "border-rose-200 ring-1 ring-rose-50" 
                      : status === "İdeal Altı" 
                        ? "border-amber-200" 
                        : "border-slate-150"
                  }`}
                >
                  <div className="space-y-4">
                    {/* Card Header information */}
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-bold text-sm text-slate-900 font-sans">{teacher.adSoyad}</h4>
                        <div className="flex items-center gap-1.5 mt-1">
                          <span className="text-[9px] bg-slate-50 text-slate-600 px-1.5 py-0.5 rounded border font-bold uppercase font-mono">
                            {teacher.brans}
                          </span>
                          <span className="text-[9px] text-slate-400">• {teacher.merkez}</span>
                        </div>
                      </div>

                      {/* Flag states indicator */}
                      <span className={`text-[10px] uppercase tracking-wider font-extrabold px-2.5 py-1 rounded-xl block border ${
                        status === "Aşırı Yük"
                          ? "bg-rose-50 border-rose-200 text-rose-700 font-extrabold"
                          : status === "İdeal Altı"
                            ? "bg-amber-50 border-amber-200 text-amber-700"
                            : "bg-emerald-50 border-emerald-200 text-emerald-700"
                      }`}>
                        {status === "Aşırı Yük" ? "🛑 limit aşımı" : status === "İdeal Altı" ? "⚠️ ideal altı" : "🟢 ideal dengede"}
                      </span>
                    </div>

                    {/* Progress Bar with Hours detail */}
                    <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100 flex justify-between items-center text-xs">
                      <div className="space-y-0.5">
                        <span className="text-slate-400 block text-[10px] font-bold uppercase tracking-wide">Yıllık / Haftalık Yük</span>
                        <div className="flex items-baseline gap-1">
                          <span className="text-base font-extrabold text-slate-800 font-mono">{totalWeeklyHours} saat</span>
                          <span className="text-slate-400 text-[10px]">planlanan</span>
                        </div>
                      </div>
                      <div className="space-y-0.5 text-right">
                        <span className="text-slate-400 block text-[10px] font-bold uppercase tracking-wide">Kota Sınırı</span>
                        <span className="text-xs font-semibold text-slate-600 font-mono">
                          Max: {teacher.haftalikMaksimumDers} hrs
                        </span>
                      </div>
                    </div>

                    {/* Daily Hours Grid representation */}
                    <div className="space-y-2">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Haftalık Günlük Analiz</span>
                      <div className="grid grid-cols-5 gap-1.5">
                        {activeDays.map(day => {
                          const hours = dailyHours[day] || 0;
                          
                          let bgClass = "bg-slate-50 border-slate-100 text-slate-700";
                          if (hours > 8) {
                            bgClass = "bg-rose-500 border-rose-600 text-white font-extrabold shadow-sm";
                          } else if (hours > 0 && hours < 6) {
                            bgClass = "bg-amber-100 border-amber-200 text-amber-800 font-semibold";
                          } else if (hours >= 6 && hours <= 8) {
                            bgClass = "bg-emerald-500 border-emerald-600 text-white font-bold shadow-sm";
                          }

                          return (
                            <div 
                              key={day} 
                              className={`border rounded-xl p-1.5 text-center flex flex-col items-center justify-between min-h-[58px] transition hover:scale-105 ${bgClass}`}
                              title={`${day}: ${hours} Ders`}
                            >
                              <span className="text-[9px] font-bold truncate w-full block uppercase opacity-90">
                                {day.substring(0, 3)}
                              </span>
                              <span className="text-xs font-mono font-extrabold block">
                                {hours}h
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  {/* Warning Messages box if any limits breached */}
                  {(exceededDays.length > 0 || underTargetDays.length > 0) && (
                    <div className="mt-4 pt-3 border-t border-slate-150 space-y-2">
                      {exceededDays.map(day => (
                        <div key={day} className="flex items-start gap-1.5 p-2 bg-rose-50 border border-rose-100 rounded-lg text-[10px] text-rose-800 font-medium">
                          <ShieldAlert className="w-3.5 h-3.5 text-rose-600 shrink-0 mt-0.5" />
                          <p className="leading-tight">
                            <strong>{day}</strong>: Günlük {dailyHours[day]} saat ile 8 limitini aşmaktadır!
                          </p>
                        </div>
                      ))}
                      {underTargetDays.map(day => (
                        <div key={day} className="flex items-start gap-1.5 p-2 bg-amber-50 border border-amber-100 rounded-lg text-[10px] text-amber-800 font-medium pb-2">
                          <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                          <p className="leading-tight">
                            <strong>{day}</strong>: Günlük {dailyHours[day]} saat ile ideal 6 saatlik yükün altındadır.
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      ) : (
        /* Alternative view: Table and Grid comparison sheet */
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/75 border-b border-slate-100 text-slate-500 font-bold text-xs uppercase font-sans">
                  <th className="py-4 px-6">Öğretmen / Branş</th>
                  <th className="py-4 px-6 text-center">Haftalık Toplam</th>
                  {activeDays.map(day => (
                    <th key={day} className="py-4 px-4 text-center">{day}</th>
                  ))}
                  <th className="py-4 px-6 text-right">Zorluk & Limit Durumu</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs font-medium text-slate-700">
                {filteredReport.length === 0 ? (
                  <tr>
                    <td colSpan={2 + activeDays.length + 1} className="py-12 text-center text-slate-400">
                      Rapor kriterlerine uyan veri bulunamadı.
                    </td>
                  </tr>
                ) : (
                  filteredReport.map(({ teacher, totalWeeklyHours, dailyHours, status }) => {
                    return (
                      <tr key={teacher.id} className="hover:bg-slate-50/40 transition">
                        {/* Name Column */}
                        <td className="py-4 px-6">
                          <div>
                            <span className="font-bold text-slate-900 block">{teacher.adSoyad}</span>
                            <span className="text-[10px] text-slate-400 bg-slate-50 rounded border px-1 py-0.5 inline-block mt-0.5 uppercase font-mono font-bold">
                              {teacher.brans}
                            </span>
                          </div>
                        </td>

                        {/* Weekly Box */}
                        <td className="py-4 px-6 text-center">
                          <span className="font-mono font-bold text-slate-800 text-sm">
                            {totalWeeklyHours} / {teacher.haftalikMaksimumDers}
                          </span>
                        </td>

                        {/* Daily Columns */}
                        {activeDays.map(day => {
                          const h = dailyHours[day] || 0;
                          let textClass = "text-slate-500";
                          let badgeClass = "bg-slate-50";

                          if (h > 8) {
                            textClass = "text-rose-700 font-extrabold";
                            badgeClass = "bg-rose-100 border border-rose-200 shadow-sm";
                          } else if (h > 0 && h < 6) {
                            textClass = "text-amber-800 font-semibold";
                            badgeClass = "bg-amber-100 border border-amber-200/60";
                          } else if (h >= 6 && h <= 8) {
                            textClass = "text-emerald-800 font-bold";
                            badgeClass = "bg-emerald-100 border border-emerald-250";
                          }

                          return (
                            <td key={day} className="py-4 px-4 text-center">
                              <span className={`inline-block px-2.5 py-1 rounded-xl text-[11px] font-mono ${badgeClass} ${textClass}`}>
                                {h}h
                              </span>
                            </td>
                          );
                        })}

                        {/* Status Label Columns */}
                        <td className="py-4 px-6 text-right">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-[10px] font-bold uppercase ${
                            status === "Aşırı Yük"
                              ? "bg-rose-50 text-rose-700 border border-rose-150"
                              : status === "İdeal Altı"
                                ? "bg-amber-50 text-amber-700 border border-amber-150"
                                : "bg-emerald-50 text-emerald-700 border border-emerald-150"
                          }`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${status === "Aşırı Yük" ? "bg-rose-500 animate-ping" : status === "İdeal Altı" ? "bg-amber-500" : "bg-emerald-500"}`}></span>
                            {status === "Aşırı Yük" ? "Limit Aşımı" : status === "İdeal Altı" ? "İdeal Altı" : "Dengeli"}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
