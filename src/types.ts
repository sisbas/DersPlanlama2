/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export enum Kademe {
  YKS = "YKS",
  LGS = "LGS",
}

export enum Alan {
  SAYISAL = "Sayısal",
  ESIT_AGIRLIK = "Eşit Ağırlık",
  SOZEL = "Sözel",
  GENEL = "Genel",
}

export enum PlanTuru {
  NORMAL_DERS = "Normal Ders",
  ETUT = "Etüt",
  REHBERLIK = "Rehberlik",
  DENEME_SINAVI = "Deneme Sınavı",
  DENEME_ANALIZI = "Deneme Analizi",
  BOS = "Boş Periyot",
  KAPALI = "Kapalı Periyot",
}

export interface Teacher {
  id: string;
  adSoyad: string;
  kademe: Kademe;
  brans: string;
  sistemKodu: string;
  haftalikMaksimumDers: number;
  gunlukMaksimumDers: number; // e.g. 8
  idealGunlukDers?: number; // e.g. 6
  pesPeseGirebilecegiMaxBlok?: number; // e.g. 4
  uygunGunler: string[]; // e.g. ["Pazartesi", "Salı", ...]
  uygunSaatler: string[]; // e.g. ["09:00", "10:00"] or specific period indices
  uygunPeriyotlar?: string[]; // Array of `${gun}-${periyotNo}`
  bosGunTercihi: string; // e.g. "Pazartesi" or "Yok"
  merkez: string;
  aktifPasif: boolean;
}

export interface ClassUnit {
  id: string;
  sinifAdi: string;
  seviye?: string; // e.g. "9", "10", "11", "12", "Mezun"
  kademe: Kademe;
  alan: Alan;
  sube: string;
  merkez: string;
  kapasite: number;
  mevcutOgrenciSayisi: number;
  haftalikDersIhtiyaci: Record<string, number>; // e.g. { "Matematik": 6, "Fizik": 4 }
  aktifPasif: boolean;
  uygunPeriyotlar?: string[]; // Array of `${gun}-${periyotNo}` specifying when this class can take lessons
  minHaftalikDers?: number;
  maxHaftalikDers?: number;
}

export interface Course {
  id: string;
  dersAdi: string;
  kademe: Kademe;
  brans: string;
  haftalikSaat: number;
  zorunluMu: boolean;
  alanUyumu: Alan;
  zorlukDerecesi?: number; // 1 (Kolay) - 5 (Zor) bilişsel yük hesabı için
  maxBlokSaat?: number;
}

export interface Classroom {
  id: string;
  merkez: string;
  derslikAdi: string;
  kapasite: number;
  uygunluk: boolean;
  aktifPasif: boolean;
  hizmetBirimi?: "YKS" | "LGS" | "Tümü";
}

export interface TimePeriod {
  id: string; // "DAY-PERIOD" e.g. "Pazartesi-1"
  gun: string; // "Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi", "Pazar"
  baslangicSaati: string;
  bitisSaati: string;
  periyotNo: number;
  aktifPasif: boolean;
}

export interface PlanItem {
  id: string;
  sinifId: string;
  dersId: string; // Course ID or special system ID
  ogretmenId: string; // Teacher ID
  derslikId: string; // Classroom ID
  periyotId: string; // TimePeriod ID
  planTuru: PlanTuru;
  durum: "Onaylı" | "Taslak" | "Conflict Detected";
}

export interface Exam {
  id: string;
  sinavAdi: string;
  kademe: Kademe;
  sinavTuru: "TYT" | "AYT" | "LGS" | "Branş Denemesi";
  tarih: string; // YYYY-MM-DD
  baslangicSaati: string;
  bitisSaati: string;
  katilimciGrupIds: string[]; // ClassUnit IDs
  salonIds: string[]; // Classroom IDs
  gorevliOgretmenIds: string[]; // Teacher IDs
  katilimciSayisi?: number;
}

export interface Student {
  id: string;
  adSoyad: string;
  sinifId: string;
  tcNo?: string;
  telefon?: string;
  veliPhone?: string;
  devamsizlikRiskScore?: number; // Calculated on percentage
}

export interface AttendanceRecord {
  id: string;
  planId: string; // Reference to PlanItem
  tarih: string; // YYYY-MM-DD
  ogrenciId: string;
  durum: "Geldi" | "Gelmedi" | "İzinli";
  bildirimGonderildiMi: boolean;
}

export interface CounselingSession {
  id: string;
  ogrenciId: string;
  rehberOgretmenId: string;
  gorusmeTuru: "Bireysel Öğrenci" | "Grup Rehberliği" | "Veli Görüşmesi" | "Kaygı Çalışması" | "Tercih Danışmanlığı" | "Devamsızlık Görüşmesi" | "Performans Takip" | "Deneme Analizi";
  tarih: string;
  saat: string;
  not: string;
  takipGerekiyorMu: boolean;
}

export interface ConstraintViolation {
  id: string;
  seviye: "Zorunlu" | "Esnek";
  mesaj: string;
  tip: "Çakışma" | "Kapasite" | "Kural" | "Yük" | "Tercih";
  bilesenIds: string[]; // Linked elements to highlight in red/orange
}

// ---- Genetik Algoritma Tipleri ----

import { SchoolScheduleConfig } from "./utils/timeSettings";
export type { SchoolScheduleConfig };

export interface GADemandTask {
  sinif: ClassUnit;
  courseObj: Course;
  eligibleTeachers: Teacher[];
  eligibleRooms: Classroom[];
}

export interface GAGene {
  slot: string;
  teacherId: string;
  roomId: string;
}

export interface GAIndividual {
  genes: GAGene[];
  fitness: number;
}

export interface GABlock {
  classId: string;
  courseId: string;
  taskIndices: number[];
  size: number;
}

// ---- Worker Mesaj Tipleri ----

export interface AIHintItem {
  sinifId?: string;
  ogretmenId?: string;
  dersId?: string;
  periyotId?: string;
  type: "penalty" | "reward";
  value: number;
  reason?: string;
}

export interface GAOptions {
  populationSize?: number;
  generations?: number;
  mutationRate?: number;
  seed?: number;
  aiHints?: AIHintItem[];
}

export interface FitnessConfig {
  conflictPenaltyBase: number;       // 3000
  conflictPenaltyPerViolation: number; // 500
  hardViolationPenaltyBase: number;  // 1500
  hardViolationPenaltyPerViolation: number; // 200
  softViolationExponent: number;     // 1.2
  softViolationMultiplier: number;   // 50
  zeroConflictBonus: number;         // 5000
  branchImbalanceThreshold: number;  // 0.15
  branchImbalanceMultiplier: number; // 500
  aiPenaltyWeight: number;           // 1.0
  aiRewardWeight: number;            // 1.0
}

export interface GAWorkerInput {
  teachers: Teacher[];
  classes: ClassUnit[];
  classrooms: Classroom[];
  courses: Course[];
  config?: SchoolScheduleConfig;
  options?: GAOptions;
  fitnessConfig?: Partial<FitnessConfig>;
}

export interface GAProgressData {
  generation: number;
  bestScore: number;
  bestSchedule: PlanItem[];
  logs: string[];
}

export interface HeuristicAnalysisResult {
  patterns: Array<{ title: string; type: string; description: string }>;
  compatibility: Array<{ title: string; status: string; description: string }>;
  deviations: Array<{ title: string; status: string; description: string }>;
  recommendations: Array<{ title: string; impact: string; description: string }>;
  aiInsights: string;
}

export interface FeedbackResult {
  grade: string;
  generalFeedback: string;
  strengths: string[];
  weaknesses: string[];
  hints: AIHintItem[];
}

