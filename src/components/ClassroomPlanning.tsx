/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { 
  Building, 
  MapPin, 
  Plus, 
  Trash2, 
  Edit2, 
  Check, 
  X, 
  Calendar, 
  Users, 
  Sparkles,
  BookOpen,
  Info
} from "lucide-react";
import { Classroom, PlanItem, Teacher, ClassUnit, Course, PlanTuru } from "../types";
import { SchoolScheduleConfig, getActivePeriodsCountForDay, generateFlexibleTimePeriods } from "../utils/timeSettings";

interface ClassroomPlanningProps {
  classrooms: Classroom[];
  plans: PlanItem[];
  teachers: Teacher[];
  classes: ClassUnit[];
  courses: Course[];
  config: SchoolScheduleConfig;
  onAddClassroom: (newRoom: Classroom) => void;
  onUpdateClassroom: (updated: Classroom) => void;
  onDeleteClassroom: (id: string) => void;
  onUpdatePlans: (newPlans: PlanItem[]) => void;
}

const FIVE_CENTERS = [
  "Neşet Ertaş Kültürevi",
  "Kayışdağı Lions Ataevi",
  "Örnek Ataevi",
  "Mevlana Ataevi",
  "Mustafa Kemal Ataevi"
];

const WEEK_DAYS = ["Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi", "Pazar"];

export default function ClassroomPlanning({
  classrooms,
  plans,
  teachers,
  classes,
  courses,
  config,
  onAddClassroom,
  onUpdateClassroom,
  onDeleteClassroom,
  onUpdatePlans
}: ClassroomPlanningProps) {
  const [selectedCenter, setSelectedCenter] = useState<string>(FIVE_CENTERS[0]);
  const [selectedRoomId, setSelectedRoomId] = useState<string>("");

  // Room editing/creation state
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingRoom, setEditingRoom] = useState<Classroom | null>(null);

  // Form states
  const [formDerslikAdi, setFormDerslikAdi] = useState("");
  const [formKapasite, setFormKapasite] = useState<number>(20);
  const [formMerkez, setFormMerkez] = useState(FIVE_CENTERS[0]);
  const [formAktifPasif, setFormAktifPasif] = useState(true);
  const [formHizmetBirimi, setFormHizmetBirimi] = useState<"YKS" | "LGS" | "Tümü">("Tümü");

  // Manual scheduling state
  const [activeSetupSlot, setActiveSetupSlot] = useState<string | null>(null); // "day-periodNo"
  const [setupClassId, setSetupClassId] = useState("");
  const [setupCourseId, setSetupCourseId] = useState("");
  const [setupTeacherId, setSetupTeacherId] = useState("");
  const [setupError, setSetupError] = useState<string | null>(null);

  const filteredClassrooms = classrooms.filter((r) => r.merkez === selectedCenter);
  const activeRoom = filteredClassrooms.find((r) => r.id === selectedRoomId) || filteredClassrooms[0];

  // Sync selectedRoomID when center switches
  const currentRoom = activeRoom;
  if (currentRoom && selectedRoomId !== currentRoom.id) {
    setSelectedRoomId(currentRoom.id);
  }

  const handleOpenAdd = () => {
    setFormDerslikAdi("");
    setFormKapasite(20);
    setFormMerkez(selectedCenter);
    setFormAktifPasif(true);
    setFormHizmetBirimi("Tümü");
    setEditingRoom(null);
    setShowAddModal(true);
  };

  const handleOpenEdit = (room: Classroom) => {
    setFormDerslikAdi(room.derslikAdi);
    setFormKapasite(room.kapasite);
    setFormMerkez(room.merkez);
    setFormAktifPasif(room.aktifPasif);
    setFormHizmetBirimi(room.hizmetBirimi || "Tümü");
    setEditingRoom(room);
    setShowAddModal(true);
  };

  const handleSaveRoom = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formDerslikAdi.trim()) return;

    if (editingRoom) {
      onUpdateClassroom({
        ...editingRoom,
        derslikAdi: formDerslikAdi,
        kapasite: Number(formKapasite) || 20,
        merkez: formMerkez,
        aktifPasif: formAktifPasif,
        hizmetBirimi: formHizmetBirimi
      });
    } else {
      const newRoom: Classroom = {
        id: `room-custom-${Date.now()}`,
        derslikAdi: formFormatedName(formDerslikAdi),
        kapasite: Number(formKapasite) || 20,
        merkez: formMerkez,
        uygunluk: true,
        aktifPasif: formAktifPasif,
        hizmetBirimi: formHizmetBirimi
      };
      onAddClassroom(newRoom);
      setSelectedRoomId(newRoom.id);
    }
    setShowAddModal(false);
  };

  const formFormatedName = (name: string) => {
    return name.trim();
  };

  const handleDeleteRoom = (id: string) => {
    if (confirm("Bu dersliği silmek istediğinize emin misiniz? Atanmış tüm dersler programdan silinecektir.")) {
      // Clear scheduling of deleted room
      const cleanedPlans = plans.filter((p) => p.derslikId !== id);
      onUpdatePlans(cleanedPlans);
      onDeleteClassroom(id);
      setSelectedRoomId("");
    }
  };

  const toggleRoomStatus = (room: Classroom) => {
    onUpdateClassroom({
      ...room,
      aktifPasif: !room.aktifPasif
    });
  };

  // Get plan Item at slot for classroom
  const getPlanAtCell = (day: string, periodNo: number) => {
    if (!activeRoom) return undefined;
    const slot = `${day}-${periodNo}`;
    return plans.find((p) => p.derslikId === activeRoom.id && p.periyotId === slot);
  };

  // Delete an assignment
  const deleteAssignment = (planId: string) => {
    const filtered = plans.filter((p) => p.id !== planId);
    onUpdatePlans(filtered);
  };

  // Manual scheduling save
  const saveManualAssignment = (day: string, periodNo: number) => {
    if (!activeRoom) return;
    const slotId = `${day}-${periodNo}`;

    if (!setupClassId || !setupCourseId || !setupTeacherId) {
      setSetupError("Lütfen tüm alanları doldurun.");
      return;
    }

    const clsObj = classes.find(c => c.id === setupClassId);
    if (clsObj && activeRoom.kapasite < clsObj.mevcutOgrenciSayisi) {
      setSetupError(`Kapasite Yetersiz! Derslik kapasitesi: ${activeRoom.kapasite}, Sınıf mevcudu: ${clsObj.mevcutOgrenciSayisi}`);
      return;
    }

    const teacherObj = teachers.find(t => t.id === setupTeacherId);
    if (teacherObj) {
      const isAvailableDay = teacherObj.uygunGunler.includes(day);
      const isAvailableHour = teacherObj.uygunSaatler.includes(periodNo.toString());
      if (!isAvailableDay || !isAvailableHour) {
        setSetupError("Seçilen öğretmen takvimi bu zaman dilimi için uygun değil!");
        return;
      }

      // Check teacher conflict
      const isAlreadyBusy = plans.some(
        p => p.ogretmenId === setupTeacherId && p.periyotId === slotId
      );
      if (isAlreadyBusy) {
        setSetupError("Seçilen öğretmen belirtilen periyotta başka bir sınıfta ders vermektedir!");
        return;
      }
    }

    // Check class conflict
    const isClassBusy = plans.some(
      p => p.sinifId === setupClassId && p.periyotId === slotId
    );
    if (isClassBusy) {
      setSetupError("Seçilen sınıf bu periyotta zaten başka bir derstedir!");
      return;
    }

    const courseObj = courses.find((c) => c.id === setupCourseId);

    const newAssignment: PlanItem = {
      id: `man-plan-room-${Date.now()}`,
      sinifId: setupClassId,
      dersId: setupCourseId,
      ogretmenId: setupTeacherId,
      derslikId: activeRoom.id,
      periyotId: slotId,
      planTuru: courseObj?.brans === "Rehberlik" ? PlanTuru.REHBERLIK : PlanTuru.NORMAL_DERS,
      durum: "Onaylı"
    };

    // Filter out existing cell items for this class OR room to maintain single assignments cleanly
    const filteredPlans = plans.filter(
      (p) => !(p.periyotId === slotId && (p.sinifId === setupClassId || p.derslikId === activeRoom.id))
    );

    onUpdatePlans([...filteredPlans, newAssignment]);
    setActiveSetupSlot(null);
    setSetupClassId("");
    setSetupCourseId("");
    setSetupTeacherId("");
    setSetupError(null);
  };

  // Determine active slot counts
  const maxPeriods = Math.max(...WEEK_DAYS.map((d) => getActivePeriodsCountForDay(d, config)));
  const masterTimePeriods = generateFlexibleTimePeriods(config);

  return (
    <div className="space-y-6">
      {/* Banner Card info */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-indigo-900 text-white rounded-2xl p-6 shadow-xl border border-indigo-950 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-indigo-300 font-semibold text-xs uppercase tracking-wider">
            <Sparkles className="w-4 h-4 text-amber-400" />
            <span>AKILLI ALAN YÖNETİM SİSTEMİ</span>
          </div>
          <h2 className="text-xl md:text-2xl font-black font-sans tracking-tight">
            Yerleşke, Merkez ve Derslik Planlama Modülü
          </h2>
          <p className="text-slate-300 text-xs font-semibold max-w-xl leading-relaxed">
            Ataşehir bünyesindeki 5 aktif halk eğitim merkezi ve bu şubelere tahsis edilmiş 
            fiziksel dersliklerin kapasite, aktiflik ve haftalık program planlamalarını 
            öğretmen-sınıf takvimleriyle eşdeğer şekilde yönetin.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={handleOpenAdd}
            className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5 px-4 rounded-xl text-xs transition duration-150 shadow"
          >
            <Plus className="w-4 h-4" />
            Yeni Derslik Ekle
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Side: Center selection & Classrooms listing */}
        <div className="lg:col-span-4 space-y-6">
          
          {/* Center selection list card */}
          <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Yerleşke / Merkez Seçimi
            </h3>
            <div className="space-y-1.5">
              {FIVE_CENTERS.map((center) => {
                const centerRooms = classrooms.filter((r) => r.merkez === center);
                const activeCount = centerRooms.filter((r) => r.aktifPasif).length;
                const isSelected = selectedCenter === center;

                return (
                  <button
                    key={center}
                    onClick={() => {
                      setSelectedCenter(center);
                      const rooms = classrooms.filter((r) => r.merkez === center);
                      if (rooms.length > 0) {
                        setSelectedRoomId(rooms[0].id);
                      } else {
                        setSelectedRoomId("");
                      }
                    }}
                    className={`w-full flex items-center justify-between p-3 rounded-xl text-xs font-semibold font-sans border transition ${
                      isSelected
                        ? "bg-indigo-600 border-indigo-600 text-white shadow-md shadow-indigo-600/10"
                        : "bg-white border-slate-100 hover:bg-slate-50 text-slate-700"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Building className={`w-4 h-4 ${isSelected ? "text-white" : "text-slate-400"}`} />
                      <span className="text-left leading-tight">{center}</span>
                    </div>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full ${
                      isSelected ? "bg-indigo-700 text-white" : "bg-slate-150 text-slate-600"
                    }`}>
                      {centerRooms.length} Derslik ({activeCount} Aktif)
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Classrooms for selected Center */}
          <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                {selectedCenter} Derslikleri
              </h3>
              <span className="text-[10px] font-bold text-slate-400 uppercase">
                {filteredClassrooms.length} TOPLAM
              </span>
            </div>

            {filteredClassrooms.length === 0 ? (
              <div className="text-center py-6">
                <Building className="w-10 h-10 text-slate-200 mx-auto mb-2" />
                <p className="text-xs text-slate-450 font-semibold">Bu merkezde henüz derslik tanımlanmamış.</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-[350px] overflow-y-auto pr-1">
                {filteredClassrooms.map((room) => {
                  const isSelected = selectedRoomId === room.id;
                  const roomPlansCount = plans.filter((p) => p.derslikId === room.id).length;

                  return (
                    <div
                      key={room.id}
                      onClick={() => setSelectedRoomId(room.id)}
                      className={`group flex items-center justify-between p-3 rounded-xl border cursor-pointer transition ${
                        isSelected
                          ? "bg-slate-900 border-slate-900 text-white shadow"
                          : "bg-slate-50 border-slate-100 hover:bg-slate-100 text-slate-800"
                      }`}
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-xs">{room.derslikAdi}</span>
                          <span className={`text-[9px] px-1.5 py-0.2 rounded-full font-bold ${
                            room.aktifPasif
                              ? "bg-emerald-100 text-emerald-800"
                              : "bg-rose-100 text-rose-800"
                          }`}>
                            {room.aktifPasif ? "Aktif" : "Pasif"}
                          </span>
                          <span className={`text-[9px] px-1.5 py-0.2 rounded-full font-bold ${
                            room.hizmetBirimi === "YKS"
                              ? isSelected ? "bg-indigo-950 text-indigo-300 border border-indigo-900" : "bg-indigo-100 text-indigo-800"
                              : room.hizmetBirimi === "LGS"
                              ? isSelected ? "bg-amber-950 text-amber-300 border border-amber-900" : "bg-amber-100 text-amber-800"
                              : isSelected ? "bg-slate-800 text-slate-300 border border-slate-700" : "bg-slate-100 text-slate-800"
                          }`}>
                            {room.hizmetBirimi || "Tümü"}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 text-[10px] text-slate-450">
                          <span className="flex items-center gap-1">
                            <Users className="w-3 h-3 text-slate-400" />
                            Kapasite: {room.kapasite}
                          </span>
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3 text-slate-400" />
                            Planlanan: {roomPlansCount} Saat
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition duration-150">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenEdit(room);
                          }}
                          className={`p-1 rounded-lg ${
                            isSelected ? "hover:bg-slate-800 text-slate-300 hover:text-white" : "hover:bg-slate-200 text-slate-500 hover:text-slate-800"
                          }`}
                          title="Dersliği Düzenle"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleRoomStatus(room);
                          }}
                          className={`p-1 rounded-lg text-xs font-bold leading-none ${
                            isSelected ? "hover:bg-slate-800 text-slate-300 hover:text-white" : "hover:bg-slate-205 text-slate-500 hover:text-slate-800"
                          }`}
                          title={room.aktifPasif ? "Pasife Al" : "Aktife Al"}
                        >
                          {room.aktifPasif ? "Pasif Yap" : "Aktif Yap"}
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteRoom(room.id);
                          }}
                          className={`p-1 rounded-lg text-rose-400 hover:text-rose-600 ${
                            isSelected ? "hover:bg-slate-800" : "hover:bg-slate-200"
                          }`}
                          title="Dersliği Sil"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

        </div>

        {/* Right Side: Interactive schedule view for selected Classroom */}
        <div className="lg:col-span-8 space-y-6">
          {activeRoom ? (
            <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-4">
              
              {/* Classroom header card info inside scheduler */}
              <div className="flex flex-col sm:flex-row justify-between sm:items-center border-b border-slate-100 pb-4 gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Building className="w-5 h-5 text-indigo-500" />
                    <h3 className="font-bold text-slate-850 text-base">
                      {activeRoom.derslikAdi} Kullanım Planı
                    </h3>
                    <span className={`text-xs px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                      activeRoom.aktifPasif ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-800"
                    }`}>
                      {activeRoom.aktifPasif ? "Kullanımda (Aktif)" : "Devre Dışı (Pasif)"}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 font-medium">
                    Merkez: <strong>{activeRoom.merkez}</strong> | Kapasite: <strong>{activeRoom.kapasite} Öğrenci Max</strong>
                  </p>
                </div>
                
                <div className="flex items-center gap-4 text-xs font-bold text-slate-600 bg-slate-50 p-2.5 rounded-xl border border-slate-100 self-start">
                  <div>
                    Toplam Doluluk: <strong className="text-indigo-600">{plans.filter((p) => p.derslikId === activeRoom.id).length} Saat / Hafta</strong>
                  </div>
                </div>
              </div>

              {!activeRoom.aktifPasif && (
                <div className="bg-amber-50 rounded-xl p-3 border border-amber-200 flex items-start gap-2.5 text-xs text-amber-800">
                  <Info className="w-4.5 h-4.5 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <strong>Derslik Şu Anda Pasif Durumda!</strong> Bu derslik pasif olduğu için otomatik planlama algoritması tarafından seçilmeyecektir. Ancak isterseniz aşağıda manuel olarak ders atayabilirsiniz.
                  </div>
                </div>
              )}

              {/* Weekly calendar matrix */}
              <div className="overflow-x-auto select-none">
                <table className="w-full text-xs text-slate-800 border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-100">
                      <th className="p-3 text-left font-bold text-slate-500 w-16">Saat</th>
                      {WEEK_DAYS.filter(d => config.activeDays.includes(d)).map((day) => (
                        <th key={day} className="p-3 text-center font-bold text-slate-605">
                          {day}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {Array.from({ length: maxPeriods }).map((_, zeroIndex) => {
                      const periodNo = zeroIndex + 1;
                      
                      // Filter time slot details
                      const matchingTime = masterTimePeriods.find(
                        (p) => p.periyotNo === periodNo
                      );
                      const timeStr = matchingTime 
                        ? `${matchingTime.baslangicSaati} - ${matchingTime.bitisSaati}`
                        : `P${periodNo}`;

                      return (
                        <tr key={periodNo} className="border-b border-slate-100 hover:bg-slate-50/40">
                          <td className="p-3 font-mono font-bold text-slate-400 bg-slate-50/30 text-[10px] leading-tight">
                            Periyot {periodNo}
                            <div className="text-[9px] text-slate-400 font-sans mt-0.5 font-normal">{timeStr}</div>
                          </td>

                          {WEEK_DAYS.filter(d => config.activeDays.includes(d)).map((day) => {
                            const planItem = getPlanAtCell(day, periodNo);
                            const cellKey = `${day}-${periodNo}`;
                            const isCreatingCell = activeSetupSlot === cellKey;
                            
                            // Teachers logic for manual booking inside classroom schedule
                            const eligibleTeachers = teachers.filter(t => t.aktifPasif);

                            return (
                              <td key={day} className="p-2 border-r border-slate-50 min-w-[140px] align-top">
                                {planItem ? (
                                  /* Assignment Block Present */
                                  <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-2.5 select-text relative shadow-sm hover:indigo-100 transition space-y-1.5">
                                    <div className="flex items-start justify-between gap-1.5">
                                      <span className="font-bold text-indigo-950 font-sans leading-snug">
                                        {courses.find((c) => c.id === planItem.dersId)?.dersAdi || "Ders"}
                                      </span>
                                      <button 
                                        onClick={() => deleteAssignment(planItem.id)}
                                        className="text-slate-400 hover:text-rose-500 p-0.5 rounded transition"
                                        title="Planı Sil"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    </div>
                                    
                                    <div className="text-[10px] text-slate-650 space-y-1 leading-normal">
                                      <div className="flex items-center gap-1 font-bold">
                                        <BookOpen className="w-3 h-3 text-indigo-400 shrink-0" />
                                        <span>Sınıf: {classes.find((c) => c.id === planItem.sinifId)?.sinifAdi}</span>
                                      </div>
                                      <div className="flex items-center gap-1">
                                        <Users className="w-3 h-3 text-slate-400 shrink-0" />
                                        <span className="truncate">Öğrt: {teachers.find((t) => t.id === planItem.ogretmenId)?.adSoyad}</span>
                                      </div>
                                    </div>
                                  </div>
                                ) : isCreatingCell ? (
                                  /* Manual Assignment Popover inside cell */
                                  <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-300 space-y-2 text-[10px] relative z-10">
                                    <div className="font-bold text-slate-700 pb-1 border-b border-slate-200">
                                      {day} - P{periodNo} Planla
                                    </div>

                                    {setupError && (
                                      <div className="bg-rose-50 border border-rose-200 text-rose-700 p-1.5 rounded text-[9px] font-semibold leading-relaxed">
                                        {setupError}
                                      </div>
                                    )}

                                    {/* Class setup select */}
                                    <div className="space-y-0.5">
                                      <span className="text-[9px] text-slate-500 font-bold uppercase">Sınıf</span>
                                      <select
                                        value={setupClassId}
                                        onChange={(e) => setSetupClassId(e.target.value)}
                                        className="w-full text-[10px] p-1 border rounded bg-white text-slate-800"
                                      >
                                        <option value="">Seçin...</option>
                                        {classes.filter((c) => c.aktifPasif).map((c) => (
                                          <option key={c.id} value={c.id}>{c.sinifAdi} (Mevcut: {c.mevcutOgrenciSayisi})</option>
                                        ))}
                                      </select>
                                    </div>

                                    {/* Course setup select */}
                                    <div className="space-y-0.5">
                                      <span className="text-[9px] text-slate-500 font-bold uppercase">Ders / Branş</span>
                                      <select
                                        value={setupCourseId}
                                        onChange={(e) => setSetupCourseId(e.target.value)}
                                        className="w-full text-[10px] p-1 border rounded bg-white text-slate-800"
                                      >
                                        <option value="">Seçin...</option>
                                        {courses.map((c) => (
                                          <option key={c.id} value={c.id}>{c.dersAdi} ({c.kademe})</option>
                                        ))}
                                      </select>
                                    </div>

                                    {/* Teacher setup select */}
                                    <div className="space-y-0.5">
                                      <span className="text-[9px] text-slate-500 font-bold uppercase">Öğretmen</span>
                                      <select
                                        value={setupTeacherId}
                                        onChange={(e) => setSetupTeacherId(e.target.value)}
                                        className="w-full text-[10px] p-1 border rounded bg-white text-slate-800"
                                      >
                                        <option value="">Seçin...</option>
                                        {eligibleTeachers.map((t) => (
                                          <option key={t.id} value={t.id}>{t.adSoyad} ({t.brans})</option>
                                        ))}
                                      </select>
                                    </div>

                                    {/* Buttons control */}
                                    <div className="flex gap-1 pt-1.5">
                                      <button
                                        onClick={() => saveManualAssignment(day, periodNo)}
                                        className="flex-1 bg-indigo-600 text-white font-bold p-1 rounded hover:bg-indigo-700"
                                      >
                                        Atama Ekle
                                      </button>
                                      <button
                                        onClick={() => {
                                          setActiveSetupSlot(null);
                                          setSetupError(null);
                                        }}
                                        className="bg-white border border-slate-200 text-slate-550 p-1 rounded hover:bg-slate-100"
                                      >
                                        Kapat
                                      </button>
                                    </div>
                                  </div>
                                ) : (
                                  /* Quick Add Slot Anchor button */
                                  <button
                                    onClick={() => {
                                      setSetupError(null);
                                      setSetupClassId("");
                                      setSetupCourseId("");
                                      setSetupTeacherId("");
                                      setActiveSetupSlot(cellKey);
                                    }}
                                    className="w-full py-3 border border-dashed border-slate-205 hover:border-indigo-400 text-slate-400 hover:text-indigo-600 rounded-xl transition duration-150 flex items-center justify-center gap-1 text-[10px] hover:bg-slate-50/50"
                                  >
                                    <Plus className="w-3.5 h-3.5" />
                                    Planla
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
          ) : (
            <div className="bg-white p-8 rounded-2xl border border-slate-100 shadow-sm text-center">
              <Building className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-450 font-semibold text-sm">Haftalık kullanım planını görmek için soldan bir derslik seçiniz.</p>
            </div>
          )}
        </div>

      </div>

      {/* Slide-over Modal: Classroom Form */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl w-full max-w-md overflow-hidden flex flex-col shadow-2xl border border-slate-100">
            <div className="bg-slate-950 text-white p-5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Building className="w-5 h-5 text-indigo-400" />
                <h3 className="font-bold text-sm font-sans tracking-tight leading-none">
                  {editingRoom ? "Derslik Düzenle" : "Yeni Derslik Ekle"}
                </h3>
              </div>
              <button 
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-white p-1 hover:bg-slate-900 rounded-lg transition"
              >
                <X className="w-4.5 h-4.5" />
              </button>
            </div>

            <form onSubmit={handleSaveRoom}>
              <div className="p-6 space-y-4">
                
                {/* Classroom Name */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-600 uppercase">Derslik Adı / Salon</label>
                  <input
                    type="text"
                    required
                    placeholder="Örn: Derslik 304, Salon B"
                    value={formDerslikAdi}
                    onChange={(e) => setFormDerslikAdi(e.target.value)}
                    className="w-full text-xs p-3 border border-slate-200 rounded-xl focus:ring-1 focus:ring-indigo-500 bg-slate-50 focus:bg-white text-slate-800"
                  />
                </div>

                {/* Center select */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-600 uppercase">Halk Eğitim Merkezi</label>
                  <select
                    value={formMerkez}
                    onChange={(e) => setFormMerkez(e.target.value)}
                    className="w-full text-xs p-3 border border-slate-200 rounded-xl bg-slate-50 text-slate-800"
                  >
                    {FIVE_CENTERS.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>

                {/* Capacity count */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-600 uppercase">Ağırlayabileceği Maksimum Sınıf Mevcudu (Kapasite)</label>
                  <input
                    type="number"
                    min={5}
                    max={100}
                    required
                    value={formKapasite}
                    onChange={(e) => setFormKapasite(parseInt(e.target.value) || 20)}
                    className="w-full text-xs p-3 border border-slate-200 rounded-xl focus:ring-1 focus:ring-indigo-500 bg-slate-50 focus:bg-white text-slate-800"
                  />
                  <p className="text-[9px] text-slate-400 font-medium leading-normal">
                    Kapasite ihlali denetleyicisi, sınıf mevcudu derslik kapasitesinden fazla olan atamalarda otomatik olarak koordinasyon hatası uyarısı üretecektir.
                  </p>
                </div>

                {/* Hizmet Birimi (YKS - LGS) */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-600 uppercase">Hizmet Birimi / Sınıf Kademesi Kısıtı</label>
                  <select
                    value={formHizmetBirimi}
                    onChange={(e) => setFormHizmetBirimi(e.target.value as "YKS" | "LGS" | "Tümü")}
                    className="w-full text-xs p-3 border border-slate-200 rounded-xl bg-slate-50 text-slate-800 focus:ring-1 focus:ring-indigo-500 focus:bg-white font-medium"
                  >
                    <option value="Tümü">Tümü (YKS ve LGS Ortak Kullanabilir)</option>
                    <option value="YKS">YKS (Sadece YKS Sınıfları İçin Ayrılmış)</option>
                    <option value="LGS">LGS (Sadece LGS Sınıfları İçin Ayrılmış)</option>
                  </select>
                  <p className="text-[9px] text-slate-400 font-medium leading-normal">
                    Hizmet birimi kısıtı, otomatik ders programı üretilirken ve el ile planlama yapılırken sınıfların kademesi (YKS/LGS) ile eşleştirilerek kontrol edilecektir.
                  </p>
                </div>

                {/* Status toggle checkbox info */}
                <div className="flex items-center gap-2 pt-2 pb-1">
                  <input
                    type="checkbox"
                    id="form_active_check"
                    checked={formAktifPasif}
                    onChange={(e) => setFormAktifPasif(e.target.checked)}
                    className="w-4 h-4 rounded text-indigo-650 accent-indigo-600"
                  />
                  <label htmlFor="form_active_check" className="text-xs font-bold text-slate-750 cursor-pointer select-none">
                    Derslik Aktif / Planlanabilir Olsun (Öğretmen Takvimi Eşdeğeri)
                  </label>
                </div>

              </div>

              <div className="p-4 bg-slate-50 flex items-center justify-end gap-3 rounded-b-3xl border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 text-slate-600 hover:text-slate-800 text-xs font-bold border border-slate-200 rounded-xl bg-white hover:bg-slate-100 transition"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition shadow"
                >
                  Kaydet
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
