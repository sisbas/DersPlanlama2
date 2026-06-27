import { PlanItem, PlanTuru } from "../types";

export interface HistoricalSchedule {
  id: string;
  name: string;
  uploadedAt: string;
  description: string;
  plans: PlanItem[];
  teachersCount: number;
  classesCount: number;
}

// Generate sample historical plan items based on real teachers and classes
export const HISTORICAL_SCHEDULES: HistoricalSchedule[] = [
  {
    id: "hist-2025-guz",
    name: "2025-2026 Güz Dönemi Programı",
    uploadedAt: "2025-09-15",
    description: "Geçtiğimiz Güz dönemi uygulanan ve öğretmen memnuniyeti %92 ölçülen başarılı ders dağılım şablonu.",
    teachersCount: 18,
    classesCount: 6,
    plans: [
      { id: "hp-1", sinifId: "lgs-8a", dersId: "lgs-tur", ogretmenId: "lgs-tur-01", derslikId: "class-101", periyotId: "Pazartesi-1", planTuru: PlanTuru.NORMAL_DERS, durum: "Onaylı" },
      { id: "hp-2", sinifId: "lgs-8a", dersId: "lgs-tur", ogretmenId: "lgs-tur-01", derslikId: "class-101", periyotId: "Pazartesi-2", planTuru: PlanTuru.NORMAL_DERS, durum: "Onaylı" },
      { id: "hp-3", sinifId: "lgs-8b", dersId: "lgs-mat", ogretmenId: "lgs-mat-01", derslikId: "class-102", periyotId: "Pazartesi-1", planTuru: PlanTuru.NORMAL_DERS, durum: "Onaylı" },
      { id: "hp-4", sinifId: "lgs-8b", dersId: "lgs-mat", ogretmenId: "lgs-mat-01", derslikId: "class-102", periyotId: "Pazartesi-2", planTuru: PlanTuru.NORMAL_DERS, durum: "Onaylı" },
      { id: "hp-5", sinifId: "yks-12say-a", dersId: "yks-fiz", ogretmenId: "yks-fiz-01", derslikId: "class-201", periyotId: "Pazartesi-3", planTuru: PlanTuru.NORMAL_DERS, durum: "Onaylı" },
      { id: "hp-6", sinifId: "yks-12say-a", dersId: "yks-fiz", ogretmenId: "yks-fiz-01", derslikId: "class-201", periyotId: "Pazartesi-4", planTuru: PlanTuru.NORMAL_DERS, durum: "Onaylı" },
      { id: "hp-7", sinifId: "lgs-8a", dersId: "lgs-mat", ogretmenId: "lgs-mat-02", derslikId: "class-101", periyotId: "Salı-1", planTuru: PlanTuru.NORMAL_DERS, durum: "Onaylı" },
      { id: "hp-8", sinifId: "lgs-8a", dersId: "lgs-mat", ogretmenId: "lgs-mat-02", derslikId: "class-101", periyotId: "Salı-2", planTuru: PlanTuru.NORMAL_DERS, durum: "Onaylı" },
      { id: "hp-9", sinifId: "lgs-8b", dersId: "lgs-tur", ogretmenId: "lgs-tur-02", derslikId: "class-102", periyotId: "Salı-3", planTuru: PlanTuru.NORMAL_DERS, durum: "Onaylı" },
      { id: "hp-10", sinifId: "lgs-8b", dersId: "lgs-tur", ogretmenId: "lgs-tur-02", derslikId: "class-102", periyotId: "Salı-4", planTuru: PlanTuru.NORMAL_DERS, durum: "Onaylı" },
      { id: "hp-11", sinifId: "yks-12ea-a", dersId: "yks-tde", ogretmenId: "yks-tde-01", derslikId: "class-202", periyotId: "Çarşamba-1", planTuru: PlanTuru.NORMAL_DERS, durum: "Onaylı" },
      { id: "hp-12", sinifId: "yks-12ea-a", dersId: "yks-tde", ogretmenId: "yks-tde-01", derslikId: "class-202", periyotId: "Çarşamba-2", planTuru: PlanTuru.NORMAL_DERS, durum: "Onaylı" },
      { id: "hp-13", sinifId: "lgs-8a", dersId: "lgs-fen", ogretmenId: "lgs-fen-01", derslikId: "class-101", periyotId: "Çarşamba-3", planTuru: PlanTuru.NORMAL_DERS, durum: "Onaylı" },
      { id: "hp-14", sinifId: "lgs-8a", dersId: "lgs-fen", ogretmenId: "lgs-fen-01", derslikId: "class-101", periyotId: "Çarşamba-4", planTuru: PlanTuru.NORMAL_DERS, durum: "Onaylı" },
      { id: "hp-15", sinifId: "yks-12say-a", dersId: "yks-mat", ogretmenId: "yks-mat-01", derslikId: "class-201", periyotId: "Perşembe-1", planTuru: PlanTuru.NORMAL_DERS, durum: "Onaylı" },
      { id: "hp-16", sinifId: "yks-12say-a", dersId: "yks-mat", ogretmenId: "yks-mat-01", derslikId: "class-201", periyotId: "Perşembe-2", planTuru: PlanTuru.NORMAL_DERS, durum: "Onaylı" },
    ]
  },
  {
    id: "hist-2024-bahar",
    name: "2024-2025 Bahar Dönemi Programı",
    uploadedAt: "2025-02-10",
    description: "Sınav hazırlık grupları için yoğunlaştırılmış deneme kulübü ve etüt entegrasyonlu ders programı.",
    teachersCount: 16,
    classesCount: 5,
    plans: [
      { id: "hp-20", sinifId: "lgs-8a", dersId: "lgs-mat", ogretmenId: "lgs-mat-01", derslikId: "class-101", periyotId: "Pazartesi-3", planTuru: PlanTuru.NORMAL_DERS, durum: "Onaylı" },
      { id: "hp-21", sinifId: "lgs-8a", dersId: "lgs-mat", ogretmenId: "lgs-mat-01", derslikId: "class-101", periyotId: "Pazartesi-4", planTuru: PlanTuru.NORMAL_DERS, durum: "Onaylı" },
      { id: "hp-22", sinifId: "yks-12say-a", dersId: "yks-kim", ogretmenId: "yks-kim-01", derslikId: "class-201", periyotId: "Salı-1", planTuru: PlanTuru.NORMAL_DERS, durum: "Onaylı" },
      { id: "hp-23", sinifId: "yks-12say-a", dersId: "yks-kim", ogretmenId: "yks-kim-01", derslikId: "class-201", periyotId: "Salı-2", planTuru: PlanTuru.NORMAL_DERS, durum: "Onaylı" },
      { id: "hp-24", sinifId: "lgs-8b", dersId: "lgs-tur", ogretmenId: "lgs-tur-01", derslikId: "class-102", periyotId: "Çarşamba-1", planTuru: PlanTuru.NORMAL_DERS, durum: "Onaylı" },
      { id: "hp-25", sinifId: "lgs-8b", dersId: "lgs-tur", ogretmenId: "lgs-tur-01", derslikId: "class-102", periyotId: "Çarşamba-2", planTuru: PlanTuru.NORMAL_DERS, durum: "Onaylı" },
      { id: "hp-26", sinifId: "yks-12ea-a", dersId: "yks-mat", ogretmenId: "yks-mat-02", derslikId: "class-202", periyotId: "Perşembe-3", planTuru: PlanTuru.NORMAL_DERS, durum: "Onaylı" },
      { id: "hp-27", sinifId: "yks-12ea-a", dersId: "yks-mat", ogretmenId: "yks-mat-02", derslikId: "class-202", periyotId: "Perşembe-4", planTuru: PlanTuru.NORMAL_DERS, durum: "Onaylı" },
    ]
  }
];
