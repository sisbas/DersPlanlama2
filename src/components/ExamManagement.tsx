/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, FormEvent } from "react";
import { Plus, Calendar, MapPin, ShieldAlert, Award, FileText, CheckCircle2, AlertCircle } from "lucide-react";
import { Exam, Teacher, ClassUnit, Classroom, Kademe } from "../types";

interface ExamManagementProps {
  exams: Exam[];
  teachers: Teacher[];
  classes: ClassUnit[];
  classrooms: Classroom[];
  onAddExam: (newExam: Exam) => void;
}

export default function ExamManagement({
  exams,
  teachers,
  classes,
  classrooms,
  onAddExam,
}: ExamManagementProps) {
  const [isAdding, setIsAdding] = useState(false);
  
  // States
  const [sinavAdi, setSinavAdi] = useState("");
  const [kademe, setKademe] = useState<Kademe>(Kademe.YKS);
  const [sinavTuru, setSinavTuru] = useState<"TYT" | "AYT" | "LGS" | "Branş Denemesi">("TYT");
  const [tarih, setTarih] = useState("2026-06-20");
  const [baslangic, setBaslangic] = useState("09:30");
  const [bitis, setBitis] = useState("12:15");
  
  const [chosenClasses, setChosenClasses] = useState<string[]>([]);
  const [chosenSalons, setChosenSalons] = useState<string[]>([]);
  const [chosenProctors, setChosenProctors] = useState<string[]>([]);

  const handleClassToggle = (id: string) => {
    setChosenClasses(prev => prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]);
  };

  const handleSalonToggle = (id: string) => {
    setChosenSalons(prev => prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]);
  };

  const handleProctorToggle = (id: string) => {
    setChosenProctors(prev => prev.includes(id) ? prev.filter(t => t !== id) : [...prev, id]);
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!sinavAdi || chosenClasses.length === 0 || chosenSalons.length === 0) return;

    const totalHeadcount = chosenClasses.reduce((acc, cId) => {
      const cls = classes.find(cl => cl.id === cId);
      return acc + (cls?.mevcutOgrenciSayisi || 0);
    }, 0);

    const newExam: Exam = {
      id: `exam-${Date.now()}`,
      sinavAdi,
      kademe,
      sinavTuru,
      tarih,
      baslangicSaati: baslangic,
      bitisSaati: bitis,
      katilimciGrupIds: chosenClasses,
      salonIds: chosenSalons,
      gorevliOgretmenIds: chosenProctors,
      katilimciSayisi: totalHeadcount,
    };

    onAddExam(newExam);
    setIsAdding(false);
    clearForm();
  };

  const clearForm = () => {
    setSinavAdi("");
    setChosenClasses([]);
    setChosenSalons([]);
    setChosenProctors([]);
  };

  return (
    <div className="space-y-6">
      
      {/* Header Panel */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
        <div>
          <h2 className="text-xl font-bold text-slate-950 font-sans flex items-center gap-2">
            <Award className="w-5 h-5 text-indigo-600" />
            Deneme Kulübü & Sınav Takvimi
          </h2>
          <p className="text-xs text-slate-500">
            Ata Akademi bünyesinde gerçekleştirilen merkezi TYT, AYT, LGS denemeleri için gözetmen atama ve salon planlamalarını organize edin.
          </p>
        </div>
        <button 
          onClick={() => setIsAdding(!isAdding)}
          className="bg-indigo-600 text-white text-xs font-semibold px-4 py-2.5 rounded-xl hover:bg-indigo-700 flex items-center gap-1.5 shadow"
        >
          <Plus className="w-4 h-4" />
          Yeni Deneme Sınavı Ekle
        </button>
      </div>

      {/* Disruption Warning Panel */}
      <div className="bg-amber-50 border border-amber-200/80 p-4 rounded-xl flex items-start gap-3 text-xs">
        <ShieldAlert className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
        <div className="space-y-1">
          <h4 className="font-bold text-amber-950">Deneme Kulübü Entegrasyonu & Telafi Algoritması</h4>
          <p className="text-amber-805 leading-relaxed">
            Deneme sınav tarihlerinde normal ders planlamalarının çakışması engellenir. Bir sınıfa deneme sınavı tanımlandığında, o günün ders zaman canlandırıcısında otomatik telafi dersleri önerilir veya öğretmenler izinli sayılır.
          </p>
        </div>
      </div>

      {/* Add Exam Form Grid */}
      {isAdding && (
        <form onSubmit={handleSubmit} className="bg-slate-50 p-6 rounded-2xl border border-slate-200 shadow-inner space-y-5 animate-fadeIn">
          <div className="pb-2 border-b border-slate-200">
            <h4 className="font-bold text-slate-800 text-sm">Deneme Kulübü Sezon Kartı Ekle</h4>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1 text-xs">
              <label className="font-bold text-slate-600">Sınav / Yayın Adı</label>
              <input 
                type="text" 
                required
                placeholder="Örn: Özdebir Türkiye Geneli - 03"
                value={sinavAdi}
                onChange={(e) => setSinavAdi(e.target.value)}
                className="w-full bg-white border border-slate-250 rounded-lg p-2 focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            <div className="space-y-1 text-xs">
              <label className="font-bold text-slate-600">Sınav Türü</label>
              <select 
                value={sinavTuru}
                onChange={(e) => setSinavTuru(e.target.value as any)}
                className="w-full bg-white border border-slate-250 rounded-lg p-2 focus:ring-1 focus:ring-indigo-500"
              >
                <option value="TYT">TYT (YKS Temel Yeterlilik)</option>
                <option value="AYT">AYT (YKS Alan Yeterlilik)</option>
                <option value="LGS">LGS (Lise Giriş Sınavı)</option>
                <option value="Branş Denemesi">Branş Denemeleri</option>
              </select>
            </div>

            <div className="space-y-1 text-xs">
              <label className="font-bold text-slate-600">Tarih</label>
              <input 
                type="date" 
                value={tarih}
                onChange={(e) => setTarih(e.target.value)}
                className="w-full bg-white border border-slate-250 rounded-lg p-2 focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            <div className="space-y-1 text-xs">
              <label className="font-bold text-slate-600">Başlangıç Saati</label>
              <input 
                type="text" 
                placeholder="09:30"
                value={baslangic}
                onChange={(e) => setBaslangic(e.target.value)}
                className="w-full bg-white border border-slate-250 rounded-lg p-2 focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            <div className="space-y-1 text-xs">
              <label className="font-bold text-slate-600">Bitiş Saati</label>
              <input 
                type="text" 
                placeholder="12:15"
                value={bitis}
                onChange={(e) => setBitis(e.target.value)}
                className="w-full bg-white border border-slate-250 rounded-lg p-2 focus:ring-1 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 border-t border-slate-200 pt-3">
            {/* Classrooms */}
            <div className="space-y-1.5 text-xs">
              <label className="font-bold text-slate-700 block text-xs">Katılımcı Sınıflar</label>
              <div className="bg-white border rounded-lg p-2 max-h-32 overflow-y-auto space-y-1.5 shadow-inner">
                {classes.map(cl => (
                  <label key={cl.id} className="flex items-center gap-2 text-[11px] cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={chosenClasses.includes(cl.id)}
                      onChange={() => handleClassToggle(cl.id)}
                    />
                    <span>{cl.sinifAdi} ({cl.mevcutOgrenciSayisi} Öğr)</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Salons */}
            <div className="space-y-1.5 text-xs">
              <label className="font-bold text-slate-700 block text-xs">Sınav Salonları</label>
              <div className="bg-white border rounded-lg p-2 max-h-32 overflow-y-auto space-y-1.5 shadow-inner">
                {classrooms.map(room => (
                  <label key={room.id} className="flex items-center gap-2 text-[11px] cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={chosenSalons.includes(room.id)}
                      onChange={() => handleSalonToggle(room.id)}
                    />
                    <span>{room.derslikAdi} (Kap: {room.kapasite})</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Proctors */}
            <div className="space-y-1.5 text-xs">
              <label className="font-bold text-slate-700 block text-xs">Gözetmen Öğretmenler</label>
              <div className="bg-white border rounded-lg p-2 max-h-32 overflow-y-auto space-y-1.5 shadow-inner">
                {teachers.map(t => (
                  <label key={t.id} className="flex items-center gap-2 text-[11px] cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={chosenProctors.includes(t.id)}
                      onChange={() => handleProctorToggle(t.id)}
                    />
                    <span>{t.adSoyad} ({t.brans})</span>
                  </label>
                ))}
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
            <button 
              type="button" 
              onClick={() => setIsAdding(false)}
              className="bg-transparent border border-slate-250 text-slate-700 text-xs px-4 py-2 rounded-xl hover:bg-slate-100"
            >
              Vazgeç
            </button>
            <button 
              type="submit" 
              className="bg-indigo-600 text-white text-xs px-5 py-2 rounded-xl hover:bg-indigo-700 shadow"
            >
              Deneme Planla
            </button>
          </div>
        </form>
      )}

      {/* Sınav Takvimi directory cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {exams.map((exam) => (
          <div key={exam.id} className="bg-white p-5 rounded-2xl border border-slate-150 shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex justify-between items-start">
                <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded uppercase ${
                  exam.sinavTuru === "TYT" || exam.sinavTuru === "AYT" 
                    ? "bg-indigo-100 text-indigo-750" 
                    : "bg-teal-100 text-teal-750"
                }`}>
                  {exam.sinavTuru} DENEMESİ
                </span>
                <span className="text-[11px] text-slate-500 font-mono flex items-center gap-1 font-bold">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  {exam.tarih} | {exam.baslangicSaati} - {exam.bitisSaati}
                </span>
              </div>

              <h3 className="text-base font-bold text-slate-900 mt-2 font-sans leading-tight">
                {exam.sinavAdi}
              </h3>

              {/* Counts */}
              <div className="grid grid-cols-2 gap-3 mt-4 text-xs bg-slate-50 p-3 rounded-xl border border-slate-100">
                <div>
                  <span className="text-slate-500 block text-[10px] uppercase font-bold">Katılımcı Sınıflar</span>
                  <div className="font-semibold text-slate-800 font-sans mt-0.5">
                    {exam.katilimciGrupIds.map(cId => classes.find(c => c.id === cId)?.sinifAdi).join(", ")}
                  </div>
                </div>

                <div>
                  <span className="text-slate-500 block text-[10px] uppercase font-bold">Hedef Öğrenci Sayısı</span>
                  <div className="font-bold text-indigo-700 font-mono mt-0.5">
                    {exam.katilimciSayisi || 50} Katılımcı
                  </div>
                </div>
              </div>

              {/* Salon allocations */}
              <div className="space-y-1 text-xs mt-4">
                <span className="text-slate-400 text-[10px] uppercase font-bold tracking-wider block">Salon ve Gözetmen Atamaları</span>
                
                <div className="flex flex-wrap gap-1.5 mt-1">
                  {exam.salonIds.map(sId => (
                    <span key={sId} className="bg-indigo-50/50 text-indigo-800 border border-indigo-100 text-[10px] px-2 py-0.5 rounded flex items-center gap-1">
                      <MapPin className="w-3 h-3" />
                      {classrooms.find(r => r.id === sId)?.derslikAdi}
                    </span>
                  ))}
                </div>

                <div className="text-[11px] text-slate-600 mt-2 flex items-center gap-1">
                  <strong>Gözetmen Eğitmenler:</strong> 
                  <span className="text-slate-500 font-medium">
                    {exam.gorevliOgretmenIds.map(tId => teachers.find(t => t.id === tId)?.adSoyad).join(", ") || "Atanmadı"}
                  </span>
                </div>
              </div>
            </div>

            <div className="border-t border-slate-100 mt-5 pt-3 flex justify-between items-center text-xs">
              <span className="flex items-center gap-1 text-emerald-600 font-bold">
                <CheckCircle2 className="w-4 h-4" />
                Sınav Giriş Kartları Aktif
              </span>
              <span className="text-slate-400 text-[10px] font-mono select-all">Sınav ID: {exam.id}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
