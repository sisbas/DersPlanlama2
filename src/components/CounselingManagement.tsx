/**
 * @license
 * SPDX-License-Identifier: Apache-2.5
 */

import { useState, FormEvent } from "react";
import { Plus, User, HelpCircle, FileText, CheckSquare, MessageSquare, Heart, BookmarkCheck } from "lucide-react";
import { CounselingSession, Teacher, Student } from "../types";

interface CounselingManagementProps {
  counselings: CounselingSession[];
  teachers: Teacher[];
  students: Student[];
  onAddCounseling: (newCoun: CounselingSession) => void;
}

export default function CounselingManagement({
  counselings,
  teachers,
  students,
  onAddCounseling,
}: CounselingManagementProps) {
  const [isAdding, setIsAdding] = useState(false);

  // States
  const [studentId, setStudentId] = useState(students[0]?.id || "");
  const [rehTeacherId, setRehTeacherId] = useState(teachers.find(t => t.brans === "Rehberlik")?.id || "");
  const [gorusmeTuru, setGorusmeTuru] = useState<any>("Bireysel Öğrenci");
  const [tarih, setTarih] = useState("2026-06-07");
  const [saat, setSaat] = useState("10:40");
  const [not, setNot] = useState("");
  const [takipGerekiyormu, setTakipGerekiyormu] = useState(false);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!studentId || !rehTeacherId || !not) return;

    const newCoun: CounselingSession = {
      id: `coun-${Date.now()}`,
      ogrenciId: studentId,
      rehberOgretmenId: rehTeacherId,
      gorusmeTuru,
      tarih,
      saat,
      not,
      takipGerekiyorMu: takipGerekiyormu,
    };

    onAddCounseling(newCoun);
    setIsAdding(false);
    setNot("");
  };

  const rehberlikTeachers = teachers.filter(t => t.brans === "Rehberlik" || t.sistemKodu.includes("REH"));

  return (
    <div className="space-y-6">
      
      {/* Header Panel */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
        <div>
          <h2 className="text-xl font-bold text-slate-950 font-sans flex items-center gap-2">
            <Heart className="w-5 h-5 text-rose-500" />
            Psiko-Sosyal & Rehberlik Takip Sistemi
          </h2>
          <p className="text-xs text-slate-500">
            Ata Akademi bünyesindeki 3 rehber öğretmenimiz için görüşme notları, kaygı analizi, veli bilgilendirmeleri ve devamsızlık riski danışmanlık dosyaları.
          </p>
        </div>
        <button 
          onClick={() => setIsAdding(!isAdding)}
          className="bg-indigo-600 text-white text-xs font-semibold px-4 py-2.5 rounded-xl hover:bg-indigo-700 flex items-center gap-1.5 shadow"
        >
          <Plus className="w-4 h-4" />
          Görüşme Raporu Gir
        </button>
      </div>

      {/* Add Counseling Log */}
      {isAdding && (
        <form onSubmit={handleSubmit} className="bg-slate-50 p-6 rounded-2xl border border-slate-200 shadow-inner grid grid-cols-1 md:grid-cols-3 gap-4 animate-fadeIn">
          <div className="md:col-span-3 pb-2 border-b border-slate-200">
            <h4 className="font-bold text-slate-800 text-sm">Yeni Rehberlik / Gelişim Seansı Kaydı</h4>
          </div>

          <div className="space-y-1 text-xs">
            <label className="font-bold text-slate-600">Öğrenci</label>
            <select 
              value={studentId}
              onChange={(e) => setStudentId(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-lg p-2"
            >
              {students.map(s => (
                <option key={s.id} value={s.id}>{s.adSoyad}</option>
              ))}
            </select>
          </div>

          <div className="space-y-1 text-xs">
            <label className="font-bold text-slate-600">Rehber Öğretmen / Psikolog</label>
            <select 
              value={rehTeacherId}
              onChange={(e) => setRehTeacherId(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-lg p-2"
            >
              <option value="">Seçin...</option>
              {rehberlikTeachers.map(t => (
                <option key={t.id} value={t.id}>{t.adSoyad}</option>
              ))}
            </select>
          </div>

          <div className="space-y-1 text-xs">
            <label className="font-bold text-slate-600">Faaliyet Türü</label>
            <select 
              value={gorusmeTuru}
              onChange={(e) => setGorusmeTuru(e.target.value as any)}
              className="w-full bg-white border border-slate-200 rounded-lg p-2"
            >
              <option value="Bireysel Öğrenci">Bireysel Öğrenci Görüşmesi</option>
              <option value="Grup Rehberliği">Grup Rehberliği</option>
              <option value="Veli Görüşmesi">Veli Görüşmesi</option>
              <option value="Kaygı Çalışması">Sınav Kaygısı / Stres Seansı</option>
              <option value="Tercih Danışmanlığı">Tercih Danışmanlığı f-01</option>
              <option value="Devamsızlık Görüşmesi">Devamsızlık Riski Görüşmesi</option>
              <option value="Performans Takip">Akademik Performans İncelemesi</option>
            </select>
          </div>

          <div className="space-y-1 text-xs">
            <label className="font-bold text-slate-600">Tarih</label>
            <input 
              type="date" 
              value={tarih}
              onChange={(e) => setTarih(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-lg p-2"
            />
          </div>

          <div className="space-y-1 text-xs">
            <label className="font-bold text-slate-100">Saat</label>
            <input 
              type="text" 
              placeholder="10:40"
              value={saat}
              onChange={(e) => setSaat(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-lg p-2 text-slate-900"
            />
          </div>

          <div className="md:col-span-3 space-y-1 text-xs">
            <label className="font-bold text-slate-600">Görüşme Seans Notları & Çıkarımları</label>
            <textarea 
              rows={3}
              required
              placeholder="Görüşmenin odak sorunları, yapılan yönlendirmeler, kariyer veya müfredat tercihleri..."
              value={not}
              onChange={(e) => setNot(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-lg p-2 focus:ring-1 focus:ring-indigo-505"
            />
          </div>

          <div className="md:col-span-3 flex items-center gap-2 text-xs">
            <input 
              type="checkbox" 
              id="takipCheck"
              checked={takipGerekiyormu}
              onChange={(e) => setTakipGerekiyormu(e.target.checked)}
              className="cursor-pointer"
            />
            <label htmlFor="takipCheck" className="font-semibold text-slate-700 cursor-pointer">
              Süreç Takip Görüşmesi Gerektiriyor (Veliye veya Başarı Kuruluna sevk)
            </label>
          </div>

          <div className="md:col-span-3 flex justify-end gap-2 pt-2">
            <button 
              type="button" 
              onClick={() => setIsAdding(false)}
              className="bg-transparent border border-slate-250 text-slate-705 px-4 py-2 rounded-xl hover:bg-slate-100"
            >
              Vazgeç
            </button>
            <button 
              type="submit" 
              className="bg-indigo-650 text-white text-xs px-5 py-2 rounded-xl hover:bg-indigo-705 shadow"
            >
              Seans Raporunu Kaydet
            </button>
          </div>
        </form>
      )}

      {/* Rapor list grid items */}
      <div className="space-y-4">
        {counselings.map((coun) => {
          const student = students.find(s => s.id === coun.ogrenciId);
          const teacher = teachers.find(t => t.id === coun.rehberOgretmenId);
          
          return (
            <div 
              key={coun.id}
              className="bg-white p-5 rounded-2xl border border-slate-150 shadow-sm hover:shadow-md transition flex flex-col md:flex-row gap-4 items-start justify-between"
            >
              <div className="space-y-2 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`text-[9px] font-extrabold px-2 py-0.5 rounded uppercase ${
                    coun.gorusmeTuru.includes("Devamsızlık") || coun.gorusmeTuru.includes("Mevcut")
                      ? "bg-rose-100 text-rose-750" 
                      : coun.gorusmeTuru.includes("Kaygı")
                        ? "bg-amber-100 text-amber-750"
                        : "bg-blue-100 text-blue-750"
                  }`}>
                    {coun.gorusmeTuru}
                  </span>
                  <span className="text-[11px] text-slate-400 font-mono italic">
                    {coun.tarih} | {coun.saat}
                  </span>
                </div>

                <div className="flex items-center gap-2 text-slate-900 font-bold text-sm font-sans">
                  <User className="w-4 h-4 text-slate-400" />
                  <span>{student?.adSoyad || "Bilinmeyen Öğrenci"}</span>
                  <span className="text-xs text-slate-400 font-normal">({student?.id && "KAYITLI"})</span>
                </div>

                <p className="text-xs text-slate-700 leading-relaxed font-sans font-medium whitespace-pre-wrap">
                  {coun.not}
                </p>

                <div className="text-[11px] text-slate-400 flex items-center gap-1.5 pt-1 border-t border-slate-100/50">
                  <BookmarkCheck className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Danışman Rehber: <strong>{teacher?.adSoyad || "Atanmadı"}</strong> ({teacher?.sistemKodu})</span>
                </div>
              </div>

              {/* Follow-up block right action status */}
              <div className="flex flex-col items-end gap-2 shrink-0 border-t md:border-t-0 md:border-l border-slate-100 pt-3 md:pt-0 md:pl-4">
                {coun.takipGerekiyorMu ? (
                  <span className="bg-rose-50 border border-rose-100 p-2 text-rose-700 text-[10px] font-bold rounded-xl flex items-center gap-1">
                    <CheckSquare className="w-3.5 h-3.5 text-rose-500" />
                    TAKİP GEREKLİ
                  </span>
                ) : (
                  <span className="bg-slate-50 border border-slate-100 p-2 text-slate-500 text-[10px] rounded-xl">
                    Seans Kapatıldı
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
