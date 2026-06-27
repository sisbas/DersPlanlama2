/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, FormEvent } from "react";
import { Plus, Search, Filter, Trash2, Calendar, MapPin, UserCheck, Edit3 } from "lucide-react";
import { Teacher, Kademe } from "../types";
import { UNITS } from "../data/initialData";
import { SchoolScheduleConfig, getMasterTimeSlots } from "../utils/timeSettings";
import TeacherScheduleConstraintsModal from "./TeacherScheduleConstraintsModal";

interface TeacherManagementProps {
  teachers: Teacher[];
  config: SchoolScheduleConfig;
  onAddTeacher: (teacher: Teacher) => void;
  onUpdateTeacher: (updatedTeacher: Teacher) => void;
  onDeleteTeacher: (id: string) => void;
  onUpdateTeacherStatus: (id: string, active: boolean) => void;
}

export default function TeacherManagement({
  teachers,
  config,
  onAddTeacher,
  onUpdateTeacher,
  onDeleteTeacher,
  onUpdateTeacherStatus,
}: TeacherManagementProps) {
  const [search, setSearch] = useState("");
  const [filterKademe, setFilterKademe] = useState<string>("TÜMÜ");
  const [filterBrans, setFilterBrans] = useState<string>("TÜMÜ");
  const [editingConstraintsTeacher, setEditingConstraintsTeacher] = useState<Teacher | null>(null);
  
  // Form State
  const [isAdding, setIsAdding] = useState(false);
  const [adSoyad, setAdSoyad] = useState("");
  const [kademe, setKademe] = useState<Kademe>(Kademe.YKS);
  const [brans, setBrans] = useState("");
  const [sistemKodu, setSistemKodu] = useState("");
  const [haftalikMax, setHaftalikMax] = useState(24);
  const [gunlukMax, setGunlukMax] = useState(6);
  const [bosGun, setBosGun] = useState("Pazartesi");
  const [merkez, setMerkez] = useState(UNITS[0]);
  const [selectedDays, setSelectedDays] = useState<string[]>(["Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi", "Pazar"]);

  const daysOfWeek = ["Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi", "Pazar"];

  const handleDayToggle = (day: string) => {
    if (selectedDays.includes(day)) {
      setSelectedDays(selectedDays.filter((d) => d !== day));
    } else {
      setSelectedDays([...selectedDays, day]);
    }
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!adSoyad || !brans || !sistemKodu) return;

    const maxPeriodsCountForNewTeacher = getMasterTimeSlots(config).length;
    const allPossibleHours = Array.from({length: maxPeriodsCountForNewTeacher}, (_, i) => (i + 1).toString());

    const newTeacher: Teacher = {
      id: `teacher-${Date.now()}`,
      adSoyad,
      kademe,
      brans,
      sistemKodu: sistemKodu.toUpperCase(),
      haftalikMaksimumDers: haftalikMax,
      gunlukMaksimumDers: gunlukMax,
      uygunGunler: selectedDays,
      uygunSaatler: allPossibleHours,
      bosGunTercihi: bosGun,
      merkez,
      aktifPasif: true,
    };

    onAddTeacher(newTeacher);
    setIsAdding(false);
    // Reset fields
    setAdSoyad("");
    setBrans("");
    setSistemKodu("");
    setSelectedDays(["Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi", "Pazar"]);
  };

  // Get unique branches for filtering
  const allBranches = Array.from(new Set(teachers.map((t) => t.brans)));

  // Filter teachers
  const filteredTeachers = teachers.filter((teacher) => {
    const matchesSearch = teacher.adSoyad.toLowerCase().includes(search.toLowerCase()) || 
                          teacher.sistemKodu.toLowerCase().includes(search.toLowerCase());
    const matchesKademe = filterKademe === "TÜMÜ" || teacher.kademe === filterKademe;
    const matchesBrans = filterBrans === "TÜMÜ" || teacher.brans === filterBrans;
    return matchesSearch && matchesKademe && matchesBrans;
  });

  return (
    <div className="space-y-6">
      
      {/* Header Panel */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
        <div>
          <h2 className="text-xl font-bold text-slate-950 font-sans flex items-center gap-2">
            <UserCheck className="w-5 h-5 text-indigo-600" />
            Öğretmen Kadro Havuzu
          </h2>
          <p className="text-xs text-slate-500">
            Ata Akademi bünyesindeki YKS ve LGS öğretmenlerin izin, yeterlilik ve tavan yüklerini yönetin.
          </p>
        </div>
        <button 
          onClick={() => setIsAdding(!isAdding)}
          className="bg-indigo-600 text-white text-xs font-semibold font-sans px-4 py-2.5 rounded-xl hover:bg-indigo-700 flex items-center gap-1.5 shadow"
        >
          <Plus className="w-4 h-4" />
          Yeni Öğretmen Ekle
        </button>
      </div>

      {/* Add Teacher Collapsible Form */}
      {isAdding && (
        <form onSubmit={handleSubmit} className="bg-slate-50 p-6 rounded-2xl border border-slate-200/60 shadow-inner grid grid-cols-1 md:grid-cols-3 gap-5 animate-fadeIn">
          <div className="md:col-span-3 pb-2 border-b border-slate-200">
            <h4 className="font-bold text-slate-800 text-sm">Yeni Öğretmen Kayıt Kartı</h4>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-600">Ad Soyad / Kadro Tanımı</label>
            <input 
              type="text" 
              required
              placeholder="Örn: Ahmet Yılmaz"
              value={adSoyad}
              onChange={(e) => setAdSoyad(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-600">Branş</label>
            <input 
              type="text" 
              required
              placeholder="Örn: Matematik, Fizik, Türkçe"
              value={brans}
              onChange={(e) => setBrans(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-600">Sistem Kodu (Tekil)</label>
            <input 
              type="text" 
              required
              placeholder="Örn: YKS-MAT-07, LGS-FEN-05"
              value={sistemKodu}
              onChange={(e) => setSistemKodu(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-600">Kademe Grubu</label>
            <select 
              value={kademe}
              onChange={(e) => setKademe(e.target.value as Kademe)}
              className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-indigo-500"
            >
              <option value={Kademe.YKS}>YKS Grubu</option>
              <option value={Kademe.LGS}>LGS Grubu</option>
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-600">Haftalık Maks Ders Saati</label>
            <input 
              type="number" 
              value={haftalikMax}
              onChange={(e) => setHaftalikMax(Number(e.target.value))}
              className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-600">Boş Gün Tercihi</label>
            <select
              value={bosGun}
              onChange={(e) => setBosGun(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-indigo-500"
            >
              {daysOfWeek.map((day) => (
                <option key={day} value={day}>{day}</option>
              ))}
              <option value="Yok">Yok</option>
            </select>
          </div>

          <div className="md:col-span-3 space-y-2">
            <label className="text-xs font-bold text-slate-600 block">Uygun Olduğu Günler</label>
            <div className="flex flex-wrap gap-2">
              {daysOfWeek.map((day) => (
                <button
                  type="button"
                  key={day}
                  onClick={() => handleDayToggle(day)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium border transition ${
                    selectedDays.includes(day)
                      ? "bg-indigo-600 text-white border-transparent"
                      : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                  }`}
                >
                  {day}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-600">Görev Yeri / Merkez</label>
            <select 
              value={merkez}
              onChange={(e) => setMerkez(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-indigo-500"
            >
              {UNITS.map((u) => (
                <option key={u} value={u}>{u}</option>
              ))}
            </select>
          </div>

          <div className="md:col-span-3 flex justify-end gap-2 pt-3">
            <button 
              type="button"
              onClick={() => setIsAdding(false)}
              className="bg-transparent border border-slate-200 text-slate-700 text-xs px-4 py-2 rounded-xl hover:bg-slate-100"
            >
              Vazgeç
            </button>
            <button 
              type="submit"
              className="bg-indigo-600 text-white text-xs px-5 py-2 rounded-xl hover:bg-indigo-700"
            >
              Kaydet
            </button>
          </div>
        </form>
      )}

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm flex flex-col md:flex-row gap-3">
        {/* Search */}
        <div className="flex-1 relative">
          <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
            <Search className="w-4 h-4" />
          </span>
          <input 
            type="text"
            placeholder="Öğretmen adı veya sistem kodu ile ara..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 bg-slate-50 border border-slate-150 rounded-xl py-2 text-xs font-sans focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-2">
          {/* Kademe Filter */}
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-150 px-3 py-1.5 rounded-xl text-xs">
            <span className="text-slate-500">Kademe:</span>
            <select 
              value={filterKademe}
              onChange={(e) => setFilterKademe(e.target.value)}
              className="bg-transparent border-none p-0 focus:ring-0 font-semibold"
            >
              <option value="TÜMÜ">Tümü</option>
              <option value="YKS">YKS</option>
              <option value="LGS">LGS</option>
            </select>
          </div>

          {/* Branch Filter */}
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-150 px-3 py-1.5 rounded-xl text-xs">
            <span className="text-slate-500">Branş:</span>
            <select 
              value={filterBrans}
              onChange={(e) => setFilterBrans(e.target.value)}
              className="bg-transparent border-none p-0 focus:ring-0 font-semibold"
            >
              <option value="TÜMÜ">Tümü</option>
              {allBranches.map((br) => (
                <option key={br} value={br}>{br}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Teacher List Table */}
      <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-50 text-slate-500 uppercase font-bold border-b border-slate-100">
              <tr>
                <th className="px-5 py-3">Sistem Kodu</th>
                <th className="px-5 py-3">Öğretmen / Eğitmen</th>
                <th className="px-5 py-3">Branş</th>
                <th className="px-5 py-3">Kademe</th>
                <th className="px-5 py-3 text-center">Boş Gün</th>
                <th className="px-5 py-3 text-center">Haftalık Limit</th>
                <th className="px-5 py-3">Görev Yeri</th>
                <th className="px-5 py-3 text-center">Durum</th>
                <th className="px-5 py-3 text-right">İşlemler</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredTeachers.map((teacher) => (
                <tr key={teacher.id} className="hover:bg-slate-50 transition">
                  {/* Sistem Kodu */}
                  <td className="px-5 py-4 font-mono font-bold text-indigo-700 select-all">
                    {teacher.sistemKodu}
                  </td>
                  {/* Ad */}
                  <td className="px-5 py-4 font-bold text-slate-900 font-sans">
                    <div>{teacher.adSoyad}</div>
                    <div className="text-[10px] text-slate-450 font-normal mt-0.5">
                      Takvim: {teacher.uygunGunler.join(", ")}
                    </div>
                  </td>
                  {/* Branş */}
                  <td className="px-5 py-4 text-slate-800">
                    <span className="bg-slate-100 text-slate-800 px-2 py-1 rounded font-medium">
                      {teacher.brans}
                    </span>
                  </td>
                  {/* Kademe */}
                  <td className="px-5 py-4">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold border ${
                      teacher.kademe === "YKS" 
                        ? "bg-indigo-50 border-indigo-100 text-indigo-700" 
                        : "bg-teal-50 border-teal-100 text-teal-700"
                    }`}>
                      {teacher.kademe}
                    </span>
                  </td>
                  {/* Boş Gün */}
                  <td className="px-5 py-4 text-center font-semibold text-slate-600">
                    {teacher.bosGunTercihi}
                  </td>
                  {/* Haftalık max limit */}
                  <td className="px-5 py-4 text-center font-bold text-slate-950 font-mono">
                    {teacher.haftalikMaksimumDers} Saat
                  </td>
                  {/* Merkez */}
                  <td className="px-5 py-4 text-slate-500 flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-slate-400" />
                    {teacher.merkez}
                  </td>
                  {/* Durum toggler */}
                  <td className="px-5 py-4 text-center">
                    <button 
                      onClick={() => onUpdateTeacherStatus(teacher.id, !teacher.aktifPasif)}
                      className={`inline-block px-2.5 py-1 rounded-full text-[10px] font-bold transition ${
                        teacher.aktifPasif 
                          ? "bg-emerald-50 text-emerald-700 border border-emerald-100 hover:bg-emerald-100" 
                          : "bg-rose-50 text-rose-700 border border-rose-100 hover:bg-rose-100"
                      }`}
                    >
                      {teacher.aktifPasif ? "Aktif" : "Pasif"}
                    </button>
                  </td>
                  {/* Actions */}
                  <td className="px-5 py-4 text-right flex items-center justify-end gap-2">
                    <button 
                      onClick={() => setEditingConstraintsTeacher(teacher)}
                      className="text-indigo-500 hover:text-indigo-700 p-1.5 rounded hover:bg-indigo-50 transition"
                      title="Öğretmen Gün/Saat Kısıtları"
                    >
                      <Calendar className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => onDeleteTeacher(teacher.id)}
                      className="text-rose-500 hover:text-rose-700 p-1.5 rounded hover:bg-rose-50 transition"
                      title="Kadro Kaydını Sil"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {editingConstraintsTeacher && (
        <TeacherScheduleConstraintsModal
          teacher={editingConstraintsTeacher}
          config={config}
          isOpen={true}
          onClose={() => setEditingConstraintsTeacher(null)}
          onSave={onUpdateTeacher}
        />
      )}
    </div>
  );
}
