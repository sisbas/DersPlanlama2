/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useMemo, useState, FormEvent } from "react";
import {
  Plus,
  GraduationCap,
  MapPin,
  Users,
  BookOpen,
  Trash2,
  Calendar,
  Sparkles,
  Clock,
  AlertTriangle,
} from "lucide-react";
import { ClassUnit, Kademe, Alan, PlanItem } from "../types";
import { UNITS, CLASS_TIME_WINDOWS } from "../data/initialData";
import { SchoolScheduleConfig } from "../utils/timeSettings";
import ClassScheduleConstraintsModal from "./ClassScheduleConstraintsModal";

interface ClassManagementProps {
  classes: ClassUnit[];
  plans: PlanItem[];
  config: SchoolScheduleConfig;
  onAddClass: (newCls: ClassUnit) => void;
  onUpdateClass: (updatedCls: ClassUnit) => void;
  onDeleteClass: (id: string) => void;
}

type YksPresetKey =
  | "9-genel"
  | "10-genel"
  | "tet-tyt"
  | "11-sayisal"
  | "11-ea"
  | "12-sayisal"
  | "12-ea"
  | "mezun-sayisal"
  | "mezun-ea";

type YksPreset = {
  key: YksPresetKey;
  label: string;
  shortLabel: string;
  defaultName: string;
  alan: Alan;
  seviye: "9" | "10" | "11" | "12" | "Mezun" | "TET";
  curriculum: Record<string, number>;
  scheduleDescription: string;
  allowedPeriods: string[];
};

const makePeriodIds = (days: string[], slots: number[]) =>
  days.flatMap((day) => slots.map((slot) => `${day}-${slot}`));

const uniq = (values: string[]) => Array.from(new Set(values));

const WEEKEND_LAST_4 = makePeriodIds(["Cumartesi", "Pazar"], [7, 8, 9, 10]);
const TUE_THU_LAST_4 = makePeriodIds(["Salı", "Perşembe"], [7, 8, 9, 10]);
const TUE_THU_BUFFER_2 = makePeriodIds(["Salı", "Perşembe"], [6]);
const TUE_THU_WEEKEND_12_BASE = uniq([
  ...TUE_THU_LAST_4,
  ...makePeriodIds(["Cumartesi", "Pazar"], [1, 2, 3, 4, 5, 6]),
]);
const MEZUN_WEEKDAY_FIRST_6 = makePeriodIds(["Pazartesi", "Salı", "Perşembe", "Cuma"], [1, 2, 3, 4, 5, 6]);
const MEZUN_EA_BUFFER_2 = makePeriodIds(["Salı"], [7, 8]);

const YKS_SUBJECTS = [
  "Matematik",
  "TYT Matematik",
  "AYT Matematik",
  "Geometri",
  "Türkçe",
  "Edebiyat",
  "Fizik",
  "Kimya",
  "Biyoloji",
  "Tarih",
  "Coğrafya",
  "Felsefe",
];

const YKS_PRESETS: YksPreset[] = [
  {
    key: "9-genel",
    label: "9. Sınıf Genel",
    shortLabel: "9 Genel",
    defaultName: "9. Sınıf Genel",
    alan: Alan.GENEL,
    seviye: "9",
    curriculum: {
      Matematik: 2,
      Türkçe: 1,
      Coğrafya: 1,
      Tarih: 1,
      Fizik: 1,
      Kimya: 1,
      Biyoloji: 1,
    },
    scheduleDescription: "Cumartesi ve Pazar son 4 ders",
    allowedPeriods: WEEKEND_LAST_4,
  },
  {
    key: "10-genel",
    label: "10. Sınıf Genel",
    shortLabel: "10 Genel",
    defaultName: "10. Sınıf Genel",
    alan: Alan.GENEL,
    seviye: "10",
    curriculum: {
      Matematik: 2,
      Türkçe: 1,
      Coğrafya: 1,
      Tarih: 1,
      Fizik: 1,
      Kimya: 1,
      Biyoloji: 1,
    },
    scheduleDescription: "Salı ve Perşembe son 4 akşam dersi",
    allowedPeriods: TUE_THU_LAST_4,
  },
  {
    key: "tet-tyt",
    label: "TET / TYT Hazırlık",
    shortLabel: "TET/TYT",
    defaultName: "TET / TYT Hazırlık Sınıfı",
    alan: Alan.GENEL,
    seviye: "TET",
    curriculum: {
      Matematik: 2,
      Geometri: 1,
      Türkçe: 2,
      Fizik: 2,
      Kimya: 2,
      Biyoloji: 2,
      Tarih: 1,
      Coğrafya: 1,
    },
    scheduleDescription: "Salı-Perşembe akşam + Cumartesi-Pazar son 4 ders havuzu",
    allowedPeriods: uniq([...TUE_THU_LAST_4, ...WEEKEND_LAST_4]),
  },
  {
    key: "11-sayisal",
    label: "11. Sınıf Sayısal",
    shortLabel: "11 SAY",
    defaultName: "11-SAY-01",
    alan: Alan.SAYISAL,
    seviye: "11",
    curriculum: {
      Matematik: 2,
      Fizik: 2,
      Kimya: 2,
      Biyoloji: 2,
    },
    scheduleDescription: "Salı ve Perşembe son 4 akşam dersi",
    allowedPeriods: TUE_THU_LAST_4,
  },
  {
    key: "11-ea",
    label: "11. Sınıf Eşit Ağırlık",
    shortLabel: "11 EA",
    defaultName: "11-EA-01",
    alan: Alan.ESIT_AGIRLIK,
    seviye: "11",
    curriculum: {
      Matematik: 2,
      Türkçe: 2,
      Tarih: 2,
      Coğrafya: 2,
    },
    scheduleDescription: "Salı ve Perşembe son 4 akşam dersi",
    allowedPeriods: TUE_THU_LAST_4,
  },
  {
    key: "12-sayisal",
    label: "12. Sınıf Sayısal",
    shortLabel: "12 SAY",
    defaultName: "12-SAY-01",
    alan: Alan.SAYISAL,
    seviye: "12",
    curriculum: {
      "TYT Matematik": 2,
      "AYT Matematik": 2,
      Geometri: 2,
      Türkçe: 2,
      Fizik: 4,
      Kimya: 4,
      Biyoloji: 4,
    },
    scheduleDescription: "Salı-Perşembe son 4; Cumartesi-Pazar ilk 6 ders",
    allowedPeriods: TUE_THU_WEEKEND_12_BASE,
  },
  {
    key: "12-ea",
    label: "12. Sınıf Eşit Ağırlık",
    shortLabel: "12 EA",
    defaultName: "12-EA-01",
    alan: Alan.ESIT_AGIRLIK,
    seviye: "12",
    curriculum: {
      "TYT Matematik": 2,
      "AYT Matematik": 2,
      Geometri: 2,
      Türkçe: 4,
      Edebiyat: 2,
      Tarih: 4,
      Felsefe: 2,
      Coğrafya: 4,
    },
    scheduleDescription: "12 SAY ile aynı; Salı/Perşembe 6. periyot tampon",
    allowedPeriods: uniq([...TUE_THU_WEEKEND_12_BASE, ...TUE_THU_BUFFER_2]),
  },
  {
    key: "mezun-sayisal",
    label: "Mezun Sayısal",
    shortLabel: "Mezun SAY",
    defaultName: "Mezun Sayısal-01",
    alan: Alan.SAYISAL,
    seviye: "Mezun",
    curriculum: {
      "TYT Matematik": 2,
      "AYT Matematik": 2,
      Geometri: 2,
      Türkçe: 2,
      Fizik: 4,
      Kimya: 4,
      Biyoloji: 4,
    },
    scheduleDescription: "Pazartesi, Salı, Perşembe, Cuma ilk 6 ders",
    allowedPeriods: MEZUN_WEEKDAY_FIRST_6,
  },
  {
    key: "mezun-ea",
    label: "Mezun Eşit Ağırlık",
    shortLabel: "Mezun EA",
    defaultName: "Mezun EA-01",
    alan: Alan.ESIT_AGIRLIK,
    seviye: "Mezun",
    curriculum: {
      "TYT Matematik": 2,
      "AYT Matematik": 2,
      Geometri: 2,
      Türkçe: 4,
      Edebiyat: 2,
      Tarih: 4,
      Felsefe: 2,
      Coğrafya: 4,
    },
    scheduleDescription: "Mezun SAY ile aynı; Salı 7-8 opsiyonel tampon",
    allowedPeriods: uniq([...MEZUN_WEEKDAY_FIRST_6, ...MEZUN_EA_BUFFER_2]),
  },
];

const cleanCurriculum = (curriculum: Record<string, number>) =>
  Object.fromEntries(
    Object.entries(curriculum)
      .map(([key, value]) => [key, Number(value) || 0] as const)
      .filter(([, value]) => value > 0)
  );

const sumCurriculum = (curriculum: Record<string, number>) =>
  Object.values(curriculum).reduce((acc, curr) => acc + curr, 0);

const inferWindowDescription = (cls: ClassUnit) => {
  const name = cls.sinifAdi.toLocaleLowerCase("tr-TR");
  const savedDescription = (cls as ClassUnit & { zamanPenceresiAciklama?: string }).zamanPenceresiAciklama;
  if (savedDescription) return savedDescription;

  const explicitWindow = CLASS_TIME_WINDOWS?.find((window) => window.sinifId === cls.id);
  if (explicitWindow?.aciklama) return explicitWindow.aciklama;

  if (name.includes("mezun") && cls.alan === Alan.ESIT_AGIRLIK) {
    return "Mezun EA: hafta içi ilk 6 + Salı 7-8 tampon";
  }
  if (name.includes("mezun") && cls.alan === Alan.SAYISAL) {
    return "Mezun SAY: Pazartesi-Salı-Perşembe-Cuma ilk 6";
  }
  if (name.includes("12") && cls.alan === Alan.ESIT_AGIRLIK) {
    return "12 EA: Salı/Perşembe son 4 + hafta sonu ilk 6 + tampon";
  }
  if (name.includes("12") && cls.alan === Alan.SAYISAL) {
    return "12 SAY: Salı/Perşembe son 4 + hafta sonu ilk 6";
  }
  if (name.includes("11")) return "11. sınıf: Salı ve Perşembe son 4 akşam dersi";
  if (name.includes("10")) return "10. sınıf: Salı ve Perşembe son 4 akşam dersi";
  if (name.includes("9")) return "9. sınıf: Cumartesi ve Pazar son 4 ders";
  if (name.includes("tet") || name.includes("tyt")) return "TET/TYT: akşam + hafta sonu havuzu";
  return "Kısıt penceresi tanımlanmadı";
};

const inferAllowedPeriodCount = (cls: ClassUnit) => {
  const savedPeriods = (cls as ClassUnit & { uygunPeriyotlar?: string[] }).uygunPeriyotlar;
  if (savedPeriods?.length) return savedPeriods.length;

  const explicitWindow = CLASS_TIME_WINDOWS?.find((window) => window.sinifId === cls.id);
  if (explicitWindow?.izinliPeriyotlar?.length) return explicitWindow.izinliPeriyotlar.length;

  const name = cls.sinifAdi.toLocaleLowerCase("tr-TR");
  if (name.includes("mezun") && cls.alan === Alan.ESIT_AGIRLIK) return uniq([...MEZUN_WEEKDAY_FIRST_6, ...MEZUN_EA_BUFFER_2]).length;
  if (name.includes("mezun") && cls.alan === Alan.SAYISAL) return MEZUN_WEEKDAY_FIRST_6.length;
  if (name.includes("12") && cls.alan === Alan.ESIT_AGIRLIK) return uniq([...TUE_THU_WEEKEND_12_BASE, ...TUE_THU_BUFFER_2]).length;
  if (name.includes("12") && cls.alan === Alan.SAYISAL) return TUE_THU_WEEKEND_12_BASE.length;
  if (name.includes("11") || name.includes("10")) return TUE_THU_LAST_4.length;
  if (name.includes("9")) return WEEKEND_LAST_4.length;
  if (name.includes("tet") || name.includes("tyt")) return uniq([...TUE_THU_LAST_4, ...WEEKEND_LAST_4]).length;
  return 0;
};

export default function ClassManagement({
  classes,
  plans,
  config,
  onAddClass,
  onUpdateClass,
  onDeleteClass,
}: ClassManagementProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [editingConstraintsClass, setEditingConstraintsClass] = useState<ClassUnit | null>(null);
  const [selectedPresetKey, setSelectedPresetKey] = useState<YksPresetKey>("9-genel");
  const [sinifAdi, setSinifAdi] = useState("9. Sınıf Genel");
  const [alan, setAlan] = useState<Alan>(Alan.GENEL);
  const [sube, setSube] = useState("1");
  const [merkez, setMerkez] = useState(UNITS[0]);
  const [kapasite, setKapasite] = useState(20);
  const [mevcutOgrenci, setMevcutOgrenci] = useState(15);
  const [curriculum, setCurriculum] = useState<Record<string, number>>(YKS_PRESETS[0].curriculum);

  const selectedPreset = useMemo(
    () => YKS_PRESETS.find((preset) => preset.key === selectedPresetKey) ?? YKS_PRESETS[0],
    [selectedPresetKey]
  );

  const targetCount = useMemo(() => sumCurriculum(cleanCurriculum(curriculum)), [curriculum]);
  const maxAllowed = config.maxWeeklyHoursByGrade?.[selectedPreset.seviye];
  const exceedsGradeLimit = Boolean(maxAllowed && targetCount > maxAllowed);
  const exceedsTimeWindow = targetCount > selectedPreset.allowedPeriods.length;
  const yKsClasses = classes.filter((cls) => cls.kademe === Kademe.YKS && cls.aktifPasif !== false);
  const passiveLgsCount = classes.filter((cls) => cls.kademe === Kademe.LGS).length;

  const applyPreset = (presetKey: YksPresetKey) => {
    const preset = YKS_PRESETS.find((item) => item.key === presetKey) ?? YKS_PRESETS[0];
    setSelectedPresetKey(preset.key);
    setAlan(preset.alan);
    setSinifAdi(preset.defaultName);
    setCurriculum(preset.curriculum);
  };

  const updateSubjectHours = (subject: string, value: number) => {
    setCurriculum((prev) => ({
      ...prev,
      [subject]: Math.max(0, Number.isFinite(value) ? value : 0),
    }));
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!sinifAdi.trim()) return;
    if (targetCount <= 0 || exceedsTimeWindow) return;

    const newCls = {
      id: `class-${Date.now()}`,
      sinifAdi: sinifAdi.trim(),
      kademe: Kademe.YKS,
      alan,
      sube,
      merkez,
      kapasite,
      mevcutOgrenciSayisi: mevcutOgrenci,
      haftalikDersIhtiyaci: cleanCurriculum(curriculum),
      aktifPasif: true,
      seviye: selectedPreset.seviye,
      uygunPeriyotlar: selectedPreset.allowedPeriods,
      zamanPenceresiAciklama: selectedPreset.scheduleDescription,
    } as ClassUnit;

    onAddClass(newCls);
    setIsAdding(false);
    setSinifAdi(selectedPreset.defaultName);
    setKapasite(20);
    setMevcutOgrenci(15);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
        <div>
          <h2 className="text-xl font-bold text-slate-950 font-sans flex items-center gap-2">
            <GraduationCap className="w-5 h-5 text-indigo-600" />
            YKS Sınıf & Kurikulum Yönetimi
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Ata Akademi YKS fazı için şube, haftalık ders yükü ve gün/saat kısıtlarını yönetin. LGS şablonları bu ekranda şimdilik pasif bırakıldı.
          </p>
          {passiveLgsCount > 0 && (
            <p className="text-[11px] text-slate-400 mt-1">
              Sistemde {passiveLgsCount} LGS kaydı var; bu fazda liste dışı tutuluyor.
            </p>
          )}
        </div>
        <button
          onClick={() => setIsAdding(!isAdding)}
          className="bg-indigo-600 text-white text-xs font-semibold px-4 py-2.5 rounded-xl hover:bg-indigo-700 flex items-center gap-1.5 shadow"
        >
          <Plus className="w-4 h-4" />
          Yeni YKS Şubesi Tanımla
        </button>
      </div>

      {isAdding && (
        <form onSubmit={handleSubmit} className="bg-slate-50 p-6 rounded-2xl border border-slate-200/60 shadow-inner grid grid-cols-1 md:grid-cols-3 gap-5">
          <div className="md:col-span-3 pb-2 border-b border-slate-200">
            <h4 className="font-bold text-slate-800 text-sm">Yeni YKS Akademik Grup / Şube Ekle</h4>
            <p className="text-[11px] text-slate-500 mt-1">
              Şablon seçimi ders yükünü ve önerilen zaman penceresini birlikte ayarlar. Ders yükleri otomatik azaltılmaz.
            </p>
          </div>

          <div className="md:col-span-3 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
            {YKS_PRESETS.map((preset) => (
              <button
                key={preset.key}
                type="button"
                onClick={() => applyPreset(preset.key)}
                className={`rounded-xl border px-3 py-2 text-left transition ${
                  selectedPresetKey === preset.key
                    ? "bg-indigo-600 text-white border-indigo-600 shadow"
                    : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                }`}
              >
                <span className="block text-xs font-bold">{preset.shortLabel}</span>
                <span className="block text-[10px] opacity-80">{sumCurriculum(preset.curriculum)} ders</span>
              </button>
            ))}
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-600">Sınıf / Şube Adı</label>
            <input
              type="text"
              required
              placeholder="Örn: 12-SAY-04, Mezun EA-03"
              value={sinifAdi}
              onChange={(e) => setSinifAdi(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-600">Hazırlık Kademesi</label>
            <div className="w-full bg-slate-100 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-600 font-semibold">
              YKS Hazırlık Grupları
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-600">Alansal Dağılım</label>
            <select
              value={alan}
              onChange={(e) => setAlan(e.target.value as Alan)}
              className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-indigo-500"
            >
              <option value={Alan.SAYISAL}>Sayısal (SAY)</option>
              <option value={Alan.ESIT_AGIRLIK}>Eşit Ağırlık (EA)</option>
              <option value={Alan.GENEL}>Genel / TET / Ara Sınıf</option>
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-600">Bölge / Kültür Evi</label>
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

          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-600">Şube No</label>
            <input
              type="text"
              value={sube}
              onChange={(e) => setSube(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-600">Salon Kapasitesi</label>
            <input
              type="number"
              min={1}
              value={kapasite}
              onChange={(e) => setKapasite(Number(e.target.value))}
              className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-600">Mevcut Kayıtlı Öğrenci</label>
            <input
              type="number"
              min={0}
              value={mevcutOgrenci}
              onChange={(e) => setMevcutOgrenci(Number(e.target.value))}
              className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          <div className="md:col-span-3 bg-white p-4 rounded-xl border border-slate-200 space-y-4">
            <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-3">
              <div>
                <h5 className="font-bold text-slate-700 text-xs flex items-center gap-1.5">
                  <BookOpen className="w-4 h-4 text-indigo-500" />
                  Şube Müfredatı / Haftalık Hedef Ders Saatleri
                </h5>
                <p className="text-[11px] text-slate-500 mt-1">
                  Seçili şablon: {selectedPreset.label}. Toplam hedef: <strong>{targetCount}</strong> ders.
                </p>
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 min-w-[250px]">
                <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-600">
                  <Clock className="w-3.5 h-3.5 text-indigo-500" />
                  Zaman Penceresi
                </div>
                <p className="text-[11px] text-slate-500 mt-1">{selectedPreset.scheduleDescription}</p>
                <p className="text-[10px] text-slate-400 mt-1">
                  Kullanılabilir slot: {selectedPreset.allowedPeriods.length} / Hedef ders: {targetCount}
                </p>
              </div>
            </div>

            {(exceedsTimeWindow || exceedsGradeLimit) && (
              <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] text-amber-800 flex gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <div>
                  {exceedsTimeWindow && (
                    <p>
                      Ders yükü, seçili zaman penceresindeki kullanılabilir slot sayısını aşıyor. Bu şekilde boş/çözümsüz ders üretme riski yüksek.
                    </p>
                  )}
                  {exceedsGradeLimit && (
                    <p>
                      Tanımlı sınıf üst sınırı {maxAllowed} ders görünüyor; ancak Ata Akademi şablonu {targetCount} ders istiyor. Sistem bu yükü otomatik azaltmayacak.
                    </p>
                  )}
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 text-xs">
              {YKS_SUBJECTS.map((subject) => (
                <div key={subject}>
                  <label className="block text-[10px] text-slate-500 font-semibold mb-1">{subject}</label>
                  <input
                    type="number"
                    min={0}
                    value={curriculum[subject] ?? 0}
                    onChange={(e) => updateSubjectHours(subject, Number(e.target.value))}
                    className="w-full border border-slate-200 rounded-lg p-1.5 font-mono"
                  />
                </div>
              ))}
            </div>
          </div>

          <div className="md:col-span-3 flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setIsAdding(false)}
              className="bg-transparent border border-slate-250 text-slate-700 text-xs px-4 py-2 rounded-xl hover:bg-slate-100"
            >
              İptal
            </button>
            <button
              type="submit"
              disabled={targetCount <= 0 || exceedsTimeWindow}
              className="bg-indigo-600 disabled:bg-slate-300 disabled:cursor-not-allowed text-white text-xs px-5 py-2 rounded-xl hover:bg-indigo-700 shadow"
            >
              YKS Grubunu Oluştur
            </button>
          </div>
        </form>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {yKsClasses.map((cls) => {
          const capacity = cls.kapasite || 1;
          const capPercent = Math.round(((cls.mevcutOgrenciSayisi || 0) / capacity) * 100);
          const target = sumCurriculum(cls.haftalikDersIhtiyaci || {});
          const scheduledCount = plans.filter((p) => p.sinifId === cls.id && String(p.planTuru) !== "Boş Periyot").length;
          const schedulePercent = Math.min(100, Math.round((scheduledCount / (target || 1)) * 100));
          const isScheduleComplete = scheduledCount >= target && target > 0;
          const windowDescription = inferWindowDescription(cls);
          const allowedPeriodCount = inferAllowedPeriodCount(cls);
          const windowHasCapacityProblem = allowedPeriodCount > 0 && target > allowedPeriodCount;

          return (
            <div
              key={cls.id}
              className="bg-white p-5 rounded-2xl border border-slate-150/80 shadow-sm hover:shadow-md transition flex flex-col justify-between"
            >
              <div>
                <div className="flex justify-between items-start">
                  <div>
                    <span className="inline-block text-[9px] font-extrabold px-1.5 py-0.5 rounded uppercase bg-indigo-100 text-indigo-700">
                      {cls.kademe} • {cls.alan}
                    </span>
                    <h3 className="text-base font-bold text-slate-900 mt-1 font-sans">{cls.sinifAdi}</h3>
                  </div>
                  <button
                    onClick={() => onDeleteClass(cls.id)}
                    className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition"
                    title="Şubeyi Kaldır"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-2">
                  <MapPin className="w-3.5 h-3.5 text-slate-400" />
                  <span>{cls.merkez}</span>
                </div>

                <div className="mt-3 bg-slate-50 rounded-xl border border-slate-100 px-3 py-2">
                  <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-600">
                    <Clock className="w-3.5 h-3.5 text-indigo-500" />
                    Planlama Penceresi
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1">{windowDescription}</p>
                  {allowedPeriodCount > 0 && (
                    <p className={`text-[10px] mt-1 ${windowHasCapacityProblem ? "text-rose-600 font-bold" : "text-slate-400"}`}>
                      Slot kapasitesi: {allowedPeriodCount} / Hedef ders: {target}
                    </p>
                  )}
                </div>

                <div className="mt-4 space-y-1 text-xs">
                  <div className="flex justify-between font-medium text-slate-600">
                    <span className="flex items-center gap-1">
                      <Users className="w-3.5 h-3.5 text-slate-400" />
                      Sınıf Doluluğu
                    </span>
                    <span className="font-mono">{cls.mevcutOgrenciSayisi} / {cls.kapasite} Öğrenci</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-1 overflow-hidden">
                    <div
                      className={`h-1 rounded-full ${capPercent > 90 ? "bg-amber-500" : "bg-teal-600"}`}
                      style={{ width: `${Math.min(100, capPercent)}%` }}
                    />
                  </div>
                </div>

                <div className="mt-4 space-y-1 text-xs">
                  <div className="flex justify-between font-medium text-slate-600">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      Planlanan Ders (S/H)
                    </span>
                    <span className={`font-mono ${isScheduleComplete ? "text-emerald-600 font-bold" : ""}`}>
                      {scheduledCount} / {target} Saat
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                    <div
                      className={`h-1.5 rounded-full transition-all ${isScheduleComplete ? "bg-emerald-500" : "bg-indigo-500"}`}
                      style={{ width: `${Math.min(100, schedulePercent)}%` }}
                    />
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
                    Akademik Çizelge Kriterleri
                  </span>

                  <div className="flex flex-wrap gap-1.5">
                    {Object.entries(cls.haftalikDersIhtiyaci || {}).map(([dersAd, saat]) => (
                      <span
                        key={dersAd}
                        className="bg-slate-50 text-slate-700 text-[10px] px-2 py-0.5 rounded border border-slate-100 font-mono"
                      >
                        {dersAd}: <strong>{saat}s</strong>
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              <div className="mt-5 flex justify-between items-center text-[11px] font-medium text-slate-400 pt-3 border-t border-slate-100">
                <span className="flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                  Haftalık {target} Ders
                </span>
                <button
                  onClick={() => setEditingConstraintsClass(cls)}
                  className="flex items-center gap-1.5 text-indigo-600 hover:text-indigo-700 bg-indigo-50 hover:bg-indigo-100 px-2 py-1 rounded transition-colors"
                >
                  <Calendar className="w-3.5 h-3.5" />
                  Gün/Saat Kısıtları
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {editingConstraintsClass && (
        <ClassScheduleConstraintsModal
          cls={editingConstraintsClass}
          config={config}
          isOpen={true}
          onClose={() => setEditingConstraintsClass(null)}
          onSave={onUpdateClass}
        />
      )}
    </div>
  );
}
