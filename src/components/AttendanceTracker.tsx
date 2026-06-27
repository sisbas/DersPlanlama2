/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from "react";
import { Check, ClipboardList, Send, AlertTriangle, Users, Smile, UserMinus } from "lucide-react";
import { Student, AttendanceRecord, ClassUnit } from "../types";
import { SchoolScheduleConfig, getMasterTimeSlots } from "../utils/timeSettings";

interface AttendanceTrackerProps {
  classes: ClassUnit[];
  students: Student[];
  attendanceRecords: AttendanceRecord[];
  config: SchoolScheduleConfig;
  onAddAttendanceRecords: (records: AttendanceRecord[]) => void;
}

export default function AttendanceTracker({
  classes,
  students,
  attendanceRecords,
  config,
  onAddAttendanceRecords,
}: AttendanceTrackerProps) {
  // Query state
  const [selectedClassId, setSelectedClassId] = useState<string>(classes[0]?.id || "");
  const [selectedDay, setSelectedDay] = useState(config?.activeDays[0] || "Pazartesi");
  const [selectedPeriod, setSelectedPeriod] = useState(1);
  
  // Track modified temporary statuses
  const [rosterStatuses, setRosterStatuses] = useState<Record<string, "Geldi" | "Gelmedi" | "İzinli">>({});
  const [sentLogs, setSentLogs] = useState<string[]>([]);

  const filteredStudents = students.filter((s) => s.sinifId === selectedClassId);

  const handleStatusChange = (studentId: string, status: "Geldi" | "Gelmedi" | "İzinli") => {
    setRosterStatuses((prev) => ({
      ...prev,
      [studentId]: status,
    }));
  };

  const getStatus = (studentId: string) => {
    return rosterStatuses[studentId] || "Geldi";
  };

  // Submit and bulk register records
  const saveAttendanceRoster = () => {
    const newRecords: AttendanceRecord[] = filteredStudents.map((s) => ({
      id: `att-${Date.now()}-${s.id}`,
      planId: `${selectedDay}-${selectedPeriod}`,
      tarih: new Date().toISOString().split("T")[0],
      ogrenciId: s.id,
      durum: getStatus(s.id),
      bildirimGonderildiMi: getStatus(s.id) === "Gelmedi", // Send notices to absent students by default
    }));

    onAddAttendanceRecords(newRecords);

    // Filter absent student listings to trigger mock WhatsApp dispatch SMS
    const absents = filteredStudents.filter(s => getStatus(s.id) === "Gelmedi");
    if (absents.length > 0) {
      const logs = absents.map(s => {
        return `✉️ [WhatsApp API] Sayın Velisi, öğrencimiz ${s.adSoyad} Ata Akademi Ders Programındaki ${selectedDay} Periyot ${selectedPeriod} dersine katılmamıştır.`;
      });
      setSentLogs((prev) => [...logs, ...prev]);
    } else {
      setSentLogs((prev) => [`✅ [Sistem] ${selectedDay} günü Periyot ${selectedPeriod} için yoklama başarıyla kaydedildi. Tüm sınıf mevcuttur.`, ...prev]);
    }
  };

  // Early risk alerts calculation (threshold >= 15% absenteeism)
  const riskStudents = students.filter(s => (s.devamsizlikRiskScore || 0) >= 0.15)
    .sort((a, b) => (b.devamsizlikRiskScore || 0) - (a.devamsizlikRiskScore || 0));

  return (
    <div className="space-y-6">
      
      {/* Header Panel */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
        <div>
          <h2 className="text-xl font-bold text-slate-950 font-sans flex items-center gap-2">
            <ClipboardList className="w-5 h-5 text-indigo-600" />
            Akıllı Yoklama & Devamsızlık Takibi
          </h2>
          <p className="text-xs text-slate-500">
            Sınıfları yükleyin, ders slotlarının yoklamasını alın ve velilere otomatik entegre SMS/WhatsApp uyarıları gönderin.
          </p>
        </div>
      </div>

      {/* Main split dashboard section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left 2 Columns: Yoklama Al */}
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-150 shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-3 font-sans">
              Ders Yoklama Defteri
            </h3>

            {/* Selector Fields */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 my-4">
              <div className="space-y-1 text-xs">
                <span className="text-slate-500 block font-bold">Şube Yükle</span>
                <select 
                  value={selectedClassId}
                  onChange={(e) => {
                    setSelectedClassId(e.target.value);
                    setRosterStatuses({}); // reset temp state
                  }}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 font-semibold text-slate-800"
                >
                  {classes.map(c => (
                    <option key={c.id} value={c.id}>{c.sinifAdi}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1 text-xs">
                <span className="text-slate-500 block font-bold">Gün</span>
                <select 
                  value={selectedDay}
                  onChange={(e) => setSelectedDay(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-205 rounded-lg p-2"
                >
                  {config.activeDays.map(d => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1 text-xs col-span-2 sm:col-span-1">
                <span className="text-slate-500 block font-bold">Periyot Saati</span>
                <select 
                  value={selectedPeriod}
                  onChange={(e) => setSelectedPeriod(Number(e.target.value))}
                  className="w-full bg-slate-50 border border-slate-205 rounded-lg p-2 font-mono"
                >
                  {getMasterTimeSlots(config).map(t => (
                    <option key={t.periyotNo} value={t.periyotNo}>
                      P{t.periyotNo} ({t.baslangicSaati})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Student list roster grid */}
            {filteredStudents.length === 0 ? (
              <p className="text-slate-400 text-xs py-10 text-center">Bu gruba tanımlı öğrenici saptanamadı.</p>
            ) : (
              <div className="space-y-2 border border-slate-100 p-2.5 rounded-xl bg-slate-50 max-h-[280px] overflow-y-auto">
                {filteredStudents.map((s) => {
                  const currentStatus = getStatus(s.id);
                  return (
                    <div key={s.id} className="bg-white p-3 rounded-xl border border-slate-150 flex items-center justify-between gap-3 flex-wrap">
                      <div className="text-xs font-bold text-slate-800 flex items-center gap-1.5 font-sans">
                        <Smile className="w-4 h-4 text-emerald-500" />
                        <span>{s.adSoyad}</span>
                      </div>

                      {/* Toggling buttons */}
                      <div className="flex border border-slate-200 rounded-lg p-0.5 text-[10px] font-bold bg-slate-50">
                        <button 
                          type="button"
                          onClick={() => handleStatusChange(s.id, "Geldi")}
                          className={`px-3 py-1 rounded-md transition ${
                            currentStatus === "Geldi" ? "bg-emerald-600 text-white shadow-sm" : "text-slate-500"
                          }`}
                        >
                          GELDİ
                        </button>
                        <button 
                          type="button"
                          onClick={() => handleStatusChange(s.id, "Gelmedi")}
                          className={`px-3 py-1 rounded-md transition ${
                            currentStatus === "Gelmedi" ? "bg-rose-600 text-white shadow-sm" : "text-slate-500"
                          }`}
                        >
                          KATILMADI
                        </button>
                        <button 
                          type="button"
                          onClick={() => handleStatusChange(s.id, "İzinli")}
                          className={`px-3 py-1 rounded-md transition ${
                            currentStatus === "İzinli" ? "bg-amber-600 text-white shadow-sm" : "text-slate-500"
                          }`}
                        >
                          İZİNLİ
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="mt-4 pt-4 border-t border-slate-100 flex justify-end">
            <button 
              onClick={saveAttendanceRoster}
              className="bg-indigo-600 text-white text-xs font-bold px-4 py-2.5 rounded-xl hover:bg-indigo-700 font-sans shadow-lg flex items-center gap-1"
            >
              <Send className="w-3.5 h-3.5" />
              Yoklamayı Kaydet & Bildirim Gönder
            </button>
          </div>
        </div>

        {/* Right 1 Column: Early Absenteeism Danger Report */}
        <div className="space-y-4">
          
          {/* Absentees Alert warning bento block */}
          <div className="bg-white p-5 rounded-2xl border border-slate-150 shadow-sm space-y-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900 font-sans flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-rose-500" />
                Devamsızlık Erken Uyarı Takibi
              </h3>
              <p className="text-[10px] text-slate-500">
                Ata Akademi katılım kuralları gereği devamsızlığı kritik eşiği (%15+) aşmış öğrenciler.
              </p>
            </div>

            <div className="space-y-2 max-h-44 overflow-y-auto pr-1">
              {riskStudents.map(student => (
                <div key={student.id} className="p-2.5 rounded-xl border border-rose-100 bg-rose-50/40 text-xs flex justify-between items-center">
                  <div className="space-y-0.5">
                    <span className="font-bold text-rose-950 font-sans">{student.adSoyad}</span>
                    <span className="text-[10px] text-slate-500 block font-normal">
                      Sınıf: {classes.find(c => c.id === student.sinifId)?.sinifAdi}
                    </span>
                  </div>
                  <span className="bg-rose-100 text-rose-700 text-[10px] font-bold px-2 py-0.5 rounded font-mono">
                    %{Math.round((student.devamsizlikRiskScore || 0) * 100)} Risk
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* WhatsApp SMS Event Dispatch Logger */}
          <div className="bg-slate-900 text-slate-300 p-4 rounded-2xl border border-slate-800 text-xs flex flex-col justify-between h-48">
            <div>
              <div className="font-bold text-[10px] text-slate-400 border-b border-slate-800 pb-2 uppercase tracking-wider">
                📱 Entegre İletişim & webhook Logu
              </div>
              <div className="space-y-2 mt-2 max-h-32 overflow-y-auto font-mono text-[10px] scrollbar-thin">
                {sentLogs.length === 0 ? (
                  <p className="text-slate-500 italic">Henüz bildirim kuyruğu oluşmadı. Yoklama gönderildiğinde WhatsApp raporları buraya yansır.</p>
                ) : (
                  sentLogs.map((log, i) => (
                    <p key={i} className="text-slate-300 leading-tight">{log}</p>
                  ))
                )}
              </div>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
