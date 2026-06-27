/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Teacher, ClassUnit, Course, Classroom, TimePeriod, PlanItem, PlanTuru, Kademe, Alan, Student, CounselingSession, Exam } from "../types";

export const UNITS = [
  "Neşet Ertaş Kültürevi",
  "Kayışdağı Lions Ataevi",
  "Örnek Ataevi",
  "Mevlana Ataevi",
  "Mustafa Kemal Ataevi"
];

const RAW_TEACHERS: Teacher[] = [
  // YKS Teachers
  { id: "yks-fiz-01", adSoyad: "YKS Fizik Öğretmeni 1", kademe: Kademe.YKS, brans: "Fizik", sistemKodu: "YKS-FIZ-01", haftalikMaksimumDers: 24, gunlukMaksimumDers: 6, uygunGunler: ["Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi"], uygunSaatler: ["1", "2", "3", "4", "5", "6"], bosGunTercihi: "Cumartesi", merkez: "Neşet Ertaş Kültürevi", aktifPasif: true },
  { id: "yks-fiz-02", adSoyad: "YKS Fizik Öğretmeni 2", kademe: Kademe.YKS, brans: "Fizik", sistemKodu: "YKS-FIZ-02", haftalikMaksimumDers: 24, gunlukMaksimumDers: 6, uygunGunler: ["Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma"], uygunSaatler: ["1", "2", "3", "4", "5", "6"], bosGunTercihi: "Pazartesi", merkez: "Neşet Ertaş Kültürevi", aktifPasif: true },
  
  { id: "yks-kim-01", adSoyad: "YKS Kimya Öğretmeni 1", kademe: Kademe.YKS, brans: "Kimya", sistemKodu: "YKS-KIM-01", haftalikMaksimumDers: 24, gunlukMaksimumDers: 6, uygunGunler: ["Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi"], uygunSaatler: ["1", "2", "3", "4", "5", "6"], bosGunTercihi: "Cuma", merkez: "Neşet Ertaş Kültürevi", aktifPasif: true },
  { id: "yks-kim-02", adSoyad: "YKS Kimya Öğretmeni 2", kademe: Kademe.YKS, brans: "Kimya", sistemKodu: "YKS-KIM-02", haftalikMaksimumDers: 24, gunlukMaksimumDers: 6, uygunGunler: ["Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma"], uygunSaatler: ["1", "2", "3", "4", "5", "6"], bosGunTercihi: "Salı", merkez: "Neşet Ertaş Kültürevi", aktifPasif: true },
  
  { id: "yks-biy-01", adSoyad: "YKS Biyoloji Öğretmeni 1", kademe: Kademe.YKS, brans: "Biyoloji", sistemKodu: "YKS-BIY-01", haftalikMaksimumDers: 24, gunlukMaksimumDers: 6, uygunGunler: ["Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi"], uygunSaatler: ["1", "2", "3", "4", "5", "6"], bosGunTercihi: "Çarşamba", merkez: "Neşet Ertaş Kültürevi", aktifPasif: true },
  { id: "yks-biy-02", adSoyad: "YKS Biyoloji Öğretmeni 2", kademe: Kademe.YKS, brans: "Biyoloji", sistemKodu: "YKS-BIY-02", haftalikMaksimumDers: 24, gunlukMaksimumDers: 6, uygunGunler: ["Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma"], uygunSaatler: ["1", "2", "3", "4", "5", "6"], bosGunTercihi: "Perşembe", merkez: "Neşet Ertaş Kültürevi", aktifPasif: true },
  
  { id: "yks-tar-01", adSoyad: "YKS Tarih Öğretmeni 1", kademe: Kademe.YKS, brans: "Tarih", sistemKodu: "YKS-TAR-01", haftalikMaksimumDers: 20, gunlukMaksimumDers: 6, uygunGunler: ["Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma"], uygunSaatler: ["1", "2", "3", "4", "5", "6"], bosGunTercihi: "Salı", merkez: "Neşet Ertaş Kültürevi", aktifPasif: true },
  { id: "yks-tar-02", adSoyad: "YKS Tarih Öğretmeni 2", kademe: Kademe.YKS, brans: "Tarih", sistemKodu: "YKS-TAR-02", haftalikMaksimumDers: 20, gunlukMaksimumDers: 6, uygunGunler: ["Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi"], uygunSaatler: ["1", "2", "3", "4", "5", "6"], bosGunTercihi: "Çarşamba", merkez: "Neşet Ertaş Kültürevi", aktifPasif: true },
  
  { id: "yks-cog-01", adSoyad: "YKS Coğrafya Öğretmeni 1", kademe: Kademe.YKS, brans: "Coğrafya", sistemKodu: "YKS-COG-01", haftalikMaksimumDers: 20, gunlukMaksimumDers: 6, uygunGunler: ["Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma"], uygunSaatler: ["1", "2", "3", "4", "5", "6"], bosGunTercihi: "Perşembe", merkez: "Neşet Ertaş Kültürevi", aktifPasif: true },
  { id: "yks-cog-02", adSoyad: "YKS Coğrafya Öğretmeni 2", kademe: Kademe.YKS, brans: "Coğrafya", sistemKodu: "YKS-COG-02", haftalikMaksimumDers: 20, gunlukMaksimumDers: 6, uygunGunler: ["Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi"], uygunSaatler: ["1", "2", "3", "4", "5", "6"], bosGunTercihi: "Cuma", merkez: "Neşet Ertaş Kültürevi", aktifPasif: true },
  
  { id: "yks-fel-01", adSoyad: "YKS Felsefe Öğretmeni 1", kademe: Kademe.YKS, brans: "Felsefe", sistemKodu: "YKS-FEL-01", haftalikMaksimumDers: 16, gunlukMaksimumDers: 5, uygunGunler: ["Salı", "Çarşamba", "Perşembe"], uygunSaatler: ["1", "2", "3", "4", "5", "6"], bosGunTercihi: "Pazartesi", merkez: "Neşet Ertaş Kültürevi", aktifPasif: true },
  
  { id: "yks-mat-01", adSoyad: "YKS Matematik Öğrt. 1", kademe: Kademe.YKS, brans: "Matematik", sistemKodu: "YKS-MAT-01", haftalikMaksimumDers: 30, gunlukMaksimumDers: 7, uygunGunler: ["Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi"], uygunSaatler: ["1", "2", "3", "4", "5", "6"], bosGunTercihi: "Yok", merkez: "Neşet Ertaş Kültürevi", aktifPasif: true },
  { id: "yks-mat-02", adSoyad: "YKS Matematik Öğrt. 2", kademe: Kademe.YKS, brans: "Matematik", sistemKodu: "YKS-MAT-02", haftalikMaksimumDers: 30, gunlukMaksimumDers: 7, uygunGunler: ["Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi"], uygunSaatler: ["1", "2", "3", "4", "5", "6"], bosGunTercihi: "Çarşamba", merkez: "Neşet Ertaş Kültürevi", aktifPasif: true },
  { id: "yks-mat-03", adSoyad: "YKS Matematik Öğrt. 3", kademe: Kademe.YKS, brans: "Matematik", sistemKodu: "YKS-MAT-03", haftalikMaksimumDers: 28, gunlukMaksimumDers: 6, uygunGunler: ["Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma"], uygunSaatler: ["1", "2", "3", "4", "5", "6"], bosGunTercihi: "Perşembe", merkez: "Neşet Ertaş Kültürevi", aktifPasif: true },
  { id: "yks-mat-04", adSoyad: "YKS Matematik Öğrt. 4", kademe: Kademe.YKS, brans: "Matematik", sistemKodu: "YKS-MAT-04", haftalikMaksimumDers: 28, gunlukMaksimumDers: 6, uygunGunler: ["Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma"], uygunSaatler: ["1", "2", "3", "4", "5", "6"], bosGunTercihi: "Cuma", merkez: "Neşet Ertaş Kültürevi", aktifPasif: true },
  { id: "yks-mat-05", adSoyad: "YKS Matematik Öğrt. 5", kademe: Kademe.YKS, brans: "Matematik", sistemKodu: "YKS-MAT-05", haftalikMaksimumDers: 28, gunlukMaksimumDers: 6, uygunGunler: ["Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cumartesi"], uygunSaatler: ["1", "2", "3", "4", "5", "6"], bosGunTercihi: "Cuma", merkez: "Neşet Ertaş Kültürevi", aktifPasif: true },
  { id: "yks-mat-06", adSoyad: "YKS Matematik Öğrt. 6", kademe: Kademe.YKS, brans: "Matematik", sistemKodu: "YKS-MAT-06", haftalikMaksimumDers: 24, gunlukMaksimumDers: 6, uygunGunler: ["Salı", "Çarşamba", "Perşembe", "Cuma"], uygunSaatler: ["1", "2", "3", "4", "5", "6"], bosGunTercihi: "Pazartesi", merkez: "Neşet Ertaş Kültürevi", aktifPasif: true },
  
  { id: "yks-geo-01", adSoyad: "YKS Geometri Öğrt. 1", kademe: Kademe.YKS, brans: "Matematik", sistemKodu: "YKS-GEO-01", haftalikMaksimumDers: 30, gunlukMaksimumDers: 7, uygunGunler: ["Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi"], uygunSaatler: ["1", "2", "3", "4", "5", "6"], bosGunTercihi: "Pazartesi", merkez: "Neşet Ertaş Kültürevi", aktifPasif: true },

  { id: "yks-tde-01", adSoyad: "YKS Türkçe-Edebiyat Öğrt. 1", kademe: Kademe.YKS, brans: "Türkçe-Edebiyat", sistemKodu: "YKS-TDE-01", haftalikMaksimumDers: 26, gunlukMaksimumDers: 6, uygunGunler: ["Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi"], uygunSaatler: ["1", "2", "3", "4", "5", "6"], bosGunTercihi: "Pazartesi", merkez: "Neşet Ertaş Kültürevi", aktifPasif: true },
  { id: "yks-tde-02", adSoyad: "YKS Türkçe-Edebiyat Öğrt. 2", kademe: Kademe.YKS, brans: "Türkçe-Edebiyat", sistemKodu: "YKS-TDE-02", haftalikMaksimumDers: 26, gunlukMaksimumDers: 6, uygunGunler: ["Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma"], uygunSaatler: ["1", "2", "3", "4", "5", "6"], bosGunTercihi: "Cumartesi", merkez: "Neşet Ertaş Kültürevi", aktifPasif: true },
  { id: "yks-tde-03", adSoyad: "YKS Türkçe-Edebiyat Öğrt. 3", kademe: Kademe.YKS, brans: "Türkçe-Edebiyat", sistemKodu: "YKS-TDE-03", haftalikMaksimumDers: 24, gunlukMaksimumDers: 6, uygunGunler: ["Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma"], uygunSaatler: ["1", "2", "3", "4", "5", "6"], bosGunTercihi: "Salı", merkez: "Neşet Ertaş Kültürevi", aktifPasif: true },
  { id: "yks-tde-04", adSoyad: "YKS Türkçe-Edebiyat Öğrt. 4", kademe: Kademe.YKS, brans: "Türkçe-Edebiyat", sistemKodu: "YKS-TDE-04", haftalikMaksimumDers: 24, gunlukMaksimumDers: 6, uygunGunler: ["Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi"], uygunSaatler: ["1", "2", "3", "4", "5", "6"], bosGunTercihi: "Pazartesi", merkez: "Neşet Ertaş Kültürevi", aktifPasif: true },

  { id: "yks-reh-01", adSoyad: "YKS Rehberlik Öğrt. 1", kademe: Kademe.YKS, brans: "Rehberlik", sistemKodu: "YKS-REH-01", haftalikMaksimumDers: 30, gunlukMaksimumDers: 6, uygunGunler: ["Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma"], uygunSaatler: ["1", "2", "3", "4", "5", "6"], bosGunTercihi: "Cumartesi", merkez: "Neşet Ertaş Kültürevi", aktifPasif: true },
  { id: "yks-reh-02", adSoyad: "YKS Rehberlik Öğrt. 2", kademe: Kademe.YKS, brans: "Rehberlik", sistemKodu: "YKS-REH-02", haftalikMaksimumDers: 30, gunlukMaksimumDers: 6, uygunGunler: ["Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma"], uygunSaatler: ["1", "2", "3", "4", "5", "6"], bosGunTercihi: "Cumartesi", merkez: "Neşet Ertaş Kültürevi", aktifPasif: true },
  { id: "yks-reh-03", adSoyad: "YKS Rehberlik Öğrt. 3", kademe: Kademe.YKS, brans: "Rehberlik", sistemKodu: "YKS-REH-03", haftalikMaksimumDers: 30, gunlukMaksimumDers: 6, uygunGunler: ["Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi"], uygunSaatler: ["1", "2", "3", "4", "5", "6"], bosGunTercihi: "Pazar", merkez: "Neşet Ertaş Kültürevi", aktifPasif: true },

  // LGS Teachers (Specific Names)
  { id: "lgs-tur-01", adSoyad: "Sevil Keser", kademe: Kademe.LGS, brans: "Türkçe", sistemKodu: "LGS-TUR-01", haftalikMaksimumDers: 24, gunlukMaksimumDers: 6, uygunGunler: ["Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma"], uygunSaatler: ["1", "2", "3", "4", "5", "6"], bosGunTercihi: "Cumartesi", merkez: "Kayışdağı Lions Ataevi", aktifPasif: true },
  { id: "lgs-tur-02", adSoyad: "Serpil Ateş", kademe: Kademe.LGS, brans: "Türkçe", sistemKodu: "LGS-TUR-02", haftalikMaksimumDers: 24, gunlukMaksimumDers: 6, uygunGunler: ["Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma"], uygunSaatler: ["1", "2", "3", "4", "5", "6"], bosGunTercihi: "Çarşamba", merkez: "Kayışdağı Lions Ataevi", aktifPasif: true },
  { id: "lgs-tur-03", adSoyad: "Nergiz Çetinkaya", kademe: Kademe.LGS, brans: "Türkçe", sistemKodu: "LGS-TUR-03", haftalikMaksimumDers: 24, gunlukMaksimumDers: 6, uygunGunler: ["Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi"], uygunSaatler: ["1", "2", "3", "4", "5", "6"], bosGunTercihi: "Sali", merkez: "Kayışdağı Lions Ataevi", aktifPasif: true },
  
  { id: "lgs-mat-01", adSoyad: "Seda Zengin", kademe: Kademe.LGS, brans: "Matematik", sistemKodu: "LGS-MAT-01", haftalikMaksimumDers: 28, gunlukMaksimumDers: 6, uygunGunler: ["Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma"], uygunSaatler: ["1", "2", "3", "4", "5", "6"], bosGunTercihi: "Cuma", merkez: "Kayışdağı Lions Ataevi", aktifPasif: true },
  { id: "lgs-mat-02", adSoyad: "Özlem Yurtseven", kademe: Kademe.LGS, brans: "Matematik", sistemKodu: "LGS-MAT-02", haftalikMaksimumDers: 28, gunlukMaksimumDers: 6, uygunGunler: ["Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma"], uygunSaatler: ["1", "2", "3", "4", "5", "6"], bosGunTercihi: "Pazartesi", merkez: "Kayışdağı Lions Ataevi", aktifPasif: true },
  { id: "lgs-mat-03", adSoyad: "Ayşe Çömert Yarışoğlu", kademe: Kademe.LGS, brans: "Matematik", sistemKodu: "LGS-MAT-03", haftalikMaksimumDers: 28, gunlukMaksimumDers: 6, uygunGunler: ["Sali", "Çarşamba", "Perşembe", "Cuma", "Cumartesi"], uygunSaatler: ["1", "2", "3", "4", "5", "6"], bosGunTercihi: "Pazartesi", merkez: "Kayışdağı Lions Ataevi", aktifPasif: true },

  { id: "lgs-fen-01", adSoyad: "Fatma Saltuk", kademe: Kademe.LGS, brans: "Fen Bilgisi", sistemKodu: "LGS-FEN-01", haftalikMaksimumDers: 24, gunlukMaksimumDers: 6, uygunGunler: ["Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma"], uygunSaatler: ["1", "2", "3", "4", "5", "6"], bosGunTercihi: "Cuma", merkez: "Kayışdağı Lions Ataevi", aktifPasif: true },
  { id: "lgs-fen-02", adSoyad: "Zehra Sevindik", kademe: Kademe.LGS, brans: "Fen Bilgisi", sistemKodu: "LGS-FEN-02", haftalikMaksimumDers: 24, gunlukMaksimumDers: 6, uygunGunler: ["Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma"], uygunSaatler: ["1", "2", "3", "4", "5", "6"], bosGunTercihi: "Sali", merkez: "Kayışdağı Lions Ataevi", aktifPasif: true },
  { id: "lgs-fen-03", adSoyad: "Melisa Mert", kademe: Kademe.LGS, brans: "Fen Bilgisi", sistemKodu: "LGS-FEN-03", haftalikMaksimumDers: 24, gunlukMaksimumDers: 6, uygunGunler: ["Pazartesi", "Çarşamba", "Perşembe", "Cuma", "Cumartesi"], uygunSaatler: ["1", "2", "3", "4", "5", "6"], bosGunTercihi: "Salı", merkez: "Kayışdağı Lions Ataevi", aktifPasif: true },
  { id: "lgs-fen-04", adSoyad: "Ali Balcıoğlu", kademe: Kademe.LGS, brans: "Fen Bilgisi", sistemKodu: "LGS-FEN-04", haftalikMaksimumDers: 24, gunlukMaksimumDers: 6, uygunGunler: ["Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma"], uygunSaatler: ["1", "2", "3", "4", "5", "6"], bosGunTercihi: "Perşembe", merkez: "Kayışdağı Lions Ataevi", aktifPasif: true },

  { id: "lgs-sos-01", adSoyad: "Birkan Ateş", kademe: Kademe.LGS, brans: "Sosyal Bilgiler", sistemKodu: "LGS-SOS-01", haftalikMaksimumDers: 20, gunlukMaksimumDers: 5, uygunGunler: ["Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma"], uygunSaatler: ["1", "2", "3", "4", "5", "6"], bosGunTercihi: "Salı", merkez: "Kayışdağı Lions Ataevi", aktifPasif: true },
  { id: "lgs-sos-02", adSoyad: "Ceylan Dastan", kademe: Kademe.LGS, brans: "Sosyal Bilgiler", sistemKodu: "LGS-SOS-02", haftalikMaksimumDers: 20, gunlukMaksimumDers: 5, uygunGunler: ["Pazartesi", "Çarşamba", "Perşembe", "Cuma", "Cumartesi"], uygunSaatler: ["1", "2", "3", "4", "5", "6"], bosGunTercihi: "Salı", merkez: "Kayışdağı Lions Ataevi", aktifPasif: true },
  { id: "lgs-sos-03", adSoyad: "Pınar Kaya", kademe: Kademe.LGS, brans: "Sosyal Bilgiler", sistemKodu: "LGS-SOS-03", haftalikMaksimumDers: 20, gunlukMaksimumDers: 5, uygunGunler: ["Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma"], uygunSaatler: ["1", "2", "3", "4", "5", "6"], bosGunTercihi: "Pazartesi", merkez: "Kayışdağı Lions Ataevi", aktifPasif: true },

  { id: "lgs-ing-01", adSoyad: "Berkay Ahmet Arın", kademe: Kademe.LGS, brans: "İngilizce", sistemKodu: "LGS-ING-01", haftalikMaksimumDers: 20, gunlukMaksimumDers: 5, uygunGunler: ["Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma"], uygunSaatler: ["1", "2", "3", "4", "5", "6"], bosGunTercihi: "Çarşamba", merkez: "Kayışdağı Lions Ataevi", aktifPasif: true },
  { id: "lgs-ing-02", adSoyad: "Fatma Duman", kademe: Kademe.LGS, brans: "İngilizce", sistemKodu: "LGS-ING-02", haftalikMaksimumDers: 20, gunlukMaksimumDers: 5, uygunGunler: ["Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi"], uygunSaatler: ["1", "2", "3", "4", "5", "6"], bosGunTercihi: "Pazartesi", merkez: "Kayışdağı Lions Ataevi", aktifPasif: true },
  
  { id: "lgs-reh-01", adSoyad: "LGS Rehberlik Öğrt. 1", kademe: Kademe.LGS, brans: "Rehberlik", sistemKodu: "LGS-REH-01", haftalikMaksimumDers: 20, gunlukMaksimumDers: 5, uygunGunler: ["Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi"], uygunSaatler: ["1", "2", "3", "4", "5", "6"], bosGunTercihi: "Pazartesi", merkez: "Kayışdağı Lions Ataevi", aktifPasif: true },
];

const RAW_CLASSES: ClassUnit[] = [
  // 9-10-11-12 Grades in Neşet Ertaş Kültürevi
  {
    id: "neke-09-gen-01",
    sinifAdi: "9. Sınıf Genel",
    kademe: Kademe.YKS,
    alan: Alan.GENEL,
    sube: "Tek Sınıf",
    merkez: "Neşet Ertaş Kültürevi",
    kapasite: 25,
    mevcutOgrenciSayisi: 24,
    haftalikDersIhtiyaci: { "Matematik": 3, "Türkçe-Edebiyat": 3, "Fizik": 1, "Rehberlik": 1 },
    aktifPasif: true
  },
  {
    id: "neke-10-gen-01",
    sinifAdi: "10. Sınıf Genel",
    kademe: Kademe.YKS,
    alan: Alan.GENEL,
    sube: "Tek Sınıf",
    merkez: "Neşet Ertaş Kültürevi",
    kapasite: 25,
    mevcutOgrenciSayisi: 22,
    haftalikDersIhtiyaci: { "Matematik": 5, "Türkçe-Edebiyat": 5, "Fizik": 3, "Kimya": 3, "Biyoloji": 3, "Rehberlik": 1 },
    aktifPasif: true
  },
  {
    id: "neke-11-ea-01",
    sinifAdi: "11-EA-01",
    kademe: Kademe.YKS,
    alan: Alan.ESIT_AGIRLIK,
    sube: "1",
    merkez: "Neşet Ertaş Kültürevi",
    kapasite: 20,
    mevcutOgrenciSayisi: 18,
    haftalikDersIhtiyaci: { "Matematik": 2, "Türkçe-Edebiyat": 2, "Tarih": 2, "Coğrafya": 2 },
    aktifPasif: true
  },
  {
    id: "neke-11-ea-02",
    sinifAdi: "11-EA-02",
    kademe: Kademe.YKS,
    alan: Alan.ESIT_AGIRLIK,
    sube: "2",
    merkez: "Neşet Ertaş Kültürevi",
    kapasite: 20,
    mevcutOgrenciSayisi: 19,
    haftalikDersIhtiyaci: { "Matematik": 2, "Türkçe-Edebiyat": 2, "Tarih": 2, "Coğrafya": 2 },
    aktifPasif: true
  },
  {
    id: "neke-11-say-01",
    sinifAdi: "11-SAY-01",
    kademe: Kademe.YKS,
    alan: Alan.SAYISAL,
    sube: "1",
    merkez: "Neşet Ertaş Kültürevi",
    kapasite: 20,
    mevcutOgrenciSayisi: 20,
    haftalikDersIhtiyaci: { "Matematik": 2, "Fizik": 2, "Kimya": 2, "Biyoloji": 2 },
    aktifPasif: true
  },
  {
    id: "neke-11-say-02",
    sinifAdi: "11-SAY-02",
    kademe: Kademe.YKS,
    alan: Alan.SAYISAL,
    sube: "2",
    merkez: "Neşet Ertaş Kültürevi",
    kapasite: 20,
    mevcutOgrenciSayisi: 17,
    haftalikDersIhtiyaci: { "Matematik": 2, "Fizik": 2, "Kimya": 2, "Biyoloji": 2 },
    aktifPasif: true
  },
  {
    id: "neke-12-say-01",
    sinifAdi: "12-SAY-01",
    kademe: Kademe.YKS,
    alan: Alan.SAYISAL,
    sube: "1",
    merkez: "Neşet Ertaş Kültürevi",
    kapasite: 18,
    mevcutOgrenciSayisi: 18,
    haftalikDersIhtiyaci: { "Matematik": 8, "Fizik": 4, "Kimya": 4, "Biyoloji": 4, "Türkçe-Edebiyat": 4, "Rehberlik": 1 },
    aktifPasif: true
  },
  {
    id: "neke-12-say-02",
    sinifAdi: "12-SAY-02",
    kademe: Kademe.YKS,
    alan: Alan.SAYISAL,
    sube: "2",
    merkez: "Neşet Ertaş Kültürevi",
    kapasite: 18,
    mevcutOgrenciSayisi: 16,
    haftalikDersIhtiyaci: { "Matematik": 8, "Fizik": 4, "Kimya": 4, "Biyoloji": 4, "Türkçe-Edebiyat": 4, "Rehberlik": 1 },
    aktifPasif: true
  },
  {
    id: "neke-12-say-03",
    sinifAdi: "12-SAY-03",
    kademe: Kademe.YKS,
    alan: Alan.SAYISAL,
    sube: "3",
    merkez: "Neşet Ertaş Kültürevi",
    kapasite: 18,
    mevcutOgrenciSayisi: 17,
    haftalikDersIhtiyaci: { "Matematik": 8, "Fizik": 4, "Kimya": 4, "Biyoloji": 4, "Türkçe-Edebiyat": 4, "Rehberlik": 1 },
    aktifPasif: true
  },
  {
    id: "neke-12-ea-01",
    sinifAdi: "12-EA-01",
    kademe: Kademe.YKS,
    alan: Alan.ESIT_AGIRLIK,
    sube: "1",
    merkez: "Neşet Ertaş Kültürevi",
    kapasite: 18,
    mevcutOgrenciSayisi: 18,
    haftalikDersIhtiyaci: { "Matematik": 8, "Türkçe-Edebiyat": 8, "Tarih": 4, "Coğrafya": 3, "Felsefe": 2, "Rehberlik": 1 },
    aktifPasif: true
  },
  {
    id: "neke-11-ea-03",
    sinifAdi: "12-EA-02",
    kademe: Kademe.YKS,
    alan: Alan.ESIT_AGIRLIK,
    sube: "2",
    merkez: "Neşet Ertaş Kültürevi",
    kapasite: 18,
    mevcutOgrenciSayisi: 17,
    haftalikDersIhtiyaci: { "Matematik": 8, "Türkçe-Edebiyat": 8, "Tarih": 4, "Coğrafya": 3, "Felsefe": 2, "Rehberlik": 1 },
    aktifPasif: true
  },
  {
    id: "neke-12-ea-03",
    sinifAdi: "12-EA-03",
    kademe: Kademe.YKS,
    alan: Alan.ESIT_AGIRLIK,
    sube: "3",
    merkez: "Neşet Ertaş Kültürevi",
    kapasite: 18,
    mevcutOgrenciSayisi: 18,
    haftalikDersIhtiyaci: { "Matematik": 8, "Türkçe-Edebiyat": 8, "Tarih": 4, "Coğrafya": 3, "Felsefe": 2, "Rehberlik": 1 },
    aktifPasif: true
  },
  {
    id: "neke-mez-say-01",
    sinifAdi: "Mezun Sayısal-01",
    kademe: Kademe.YKS,
    alan: Alan.SAYISAL,
    sube: "1",
    merkez: "Neşet Ertaş Kültürevi",
    kapasite: 20,
    mevcutOgrenciSayisi: 20,
    haftalikDersIhtiyaci: { "Matematik": 8, "Fizik": 4, "Kimya": 4, "Biyoloji": 4, "Türkçe-Edebiyat": 4, "Rehberlik": 1 },
    aktifPasif: true
  },
  {
    id: "neke-mez-say-02",
    sinifAdi: "Mezun Sayısal-02",
    kademe: Kademe.YKS,
    alan: Alan.SAYISAL,
    sube: "2",
    merkez: "Neşet Ertaş Kültürevi",
    kapasite: 20,
    mevcutOgrenciSayisi: 18,
    haftalikDersIhtiyaci: { "Matematik": 8, "Fizik": 4, "Kimya": 4, "Biyoloji": 4, "Türkçe-Edebiyat": 4, "Rehberlik": 1 },
    aktifPasif: true
  },
  {
    id: "neke-mez-ea-01",
    sinifAdi: "Mezun EA-01",
    kademe: Kademe.YKS,
    alan: Alan.ESIT_AGIRLIK,
    sube: "1",
    merkez: "Neşet Ertaş Kültürevi",
    kapasite: 20,
    mevcutOgrenciSayisi: 20,
    haftalikDersIhtiyaci: { "Matematik": 8, "Türkçe-Edebiyat": 8, "Tarih": 4, "Coğrafya": 3, "Felsefe": 2, "Rehberlik": 1 },
    aktifPasif: true
  },

  // Sample LGS Classes
  {
    id: "ata-lgs-08-01",
    sinifAdi: "8. Sınıf LGS-01",
    kademe: Kademe.LGS,
    alan: Alan.GENEL,
    sube: "1",
    merkez: "Kayışdağı Lions Ataevi",
    kapasite: 24,
    mevcutOgrenciSayisi: 23,
    haftalikDersIhtiyaci: { "Türkçe": 5, "Matematik": 5, "Fen Bilgisi": 4, "Sosyal Bilgiler": 3, "İngilizce": 3, "Rehberlik": 1 },
    aktifPasif: true
  },
  {
    id: "ata-lgs-08-02",
    sinifAdi: "8. Sınıf LGS-02",
    kademe: Kademe.LGS,
    alan: Alan.GENEL,
    sube: "2",
    merkez: "Kayışdağı Lions Ataevi",
    kapasite: 24,
    mevcutOgrenciSayisi: 21,
    haftalikDersIhtiyaci: { "Türkçe": 5, "Matematik": 5, "Fen Bilgisi": 4, "Sosyal Bilgiler": 3, "İngilizce": 3, "Rehberlik": 1 },
    aktifPasif: true
  }
];

export const CURRICULUM_TEMPLATES = [
  {
    name: "9. Sınıf Genel Şablonu",
    tag: "9. Sınıf",
    description: "2 Matematik, 1 Tarih, 1 Coğrafya, 1 Fizik, 1 Kimya, 1 Biyoloji, 1 Rehberlik",
    curriculum: { "Matematik": 2, "Tarih": 1, "Coğrafya": 1, "Fizik": 1, "Kimya": 1, "Biyoloji": 1, "Rehberlik": 1 }
  },
  {
    name: "10. Sınıf Genel Şablonu",
    tag: "10. Sınıf",
    description: "2 Matematik, 1 Tarih, 1 Coğrafya, 1 Fizik, 1 Kimya, 1 Biyoloji, 1 Rehberlik",
    curriculum: { "Matematik": 2, "Tarih": 1, "Coğrafya": 1, "Fizik": 1, "Kimya": 1, "Biyoloji": 1, "Rehberlik": 1 }
  },
  {
    name: "11 Sayısal Şablonu",
    tag: "Sayısal",
    description: "2 Matematik, 2 Fizik, 2 Kimya, 2 Biyoloji",
    curriculum: { "Matematik": 2, "Fizik": 2, "Kimya": 2, "Biyoloji": 2 }
  },
  {
    name: "11 Eşit Ağırlık Şablonu",
    tag: "Eşit Ağırlık",
    description: "2 Matematik, 2 Türkçe-Edebiyat, 2 Tarih, 2 Coğrafya",
    curriculum: { "Matematik": 2, "Türkçe-Edebiyat": 2, "Tarih": 2, "Coğrafya": 2 }
  },
  {
    name: "TYT Sınav Hazırlık Şablonu",
    tag: "TYT Kursu",
    description: "2 Matematik, 2 Fizik, 2 Kimya, 2 Biyoloji, 2 Tarih, 2 Coğrafya, 1 Geometri, 1 Rehberlik",
    curriculum: { "Matematik": 2, "Fizik": 2, "Kimya": 2, "Biyoloji": 2, "Tarih": 2, "Coğrafya": 2, "Geometri": 1, "Rehberlik": 1 }
  },
  {
    name: "12 ve Mezun SAY Şablonu",
    tag: "Sayısal",
    description: "4 Fizik, 4 Kimya, 4 Biyoloji, 2 TYT Matematik, 2 AYT Matematik, 2 Geometri, 2 Türkçe, 1 Rehberlik",
    curriculum: { "Fizik": 4, "Kimya": 4, "Biyoloji": 4, "TYT Matematik": 2, "AYT Matematik": 2, "Geometri": 2, "Türkçe": 2, "Rehberlik": 1 }
  },
  {
    name: "12 ve Mezun EA Şablonu",
    tag: "Eşit Ağırlık",
    description: "4 Tarih, 4 Coğrafya, 2 Felsefe, 4 Türkçe, 2 Edebiyat, 2 TYT Matematik, 2 AYT Matematik, 2 Geometri, 1 Rehberlik",
    curriculum: { "Tarih": 4, "Coğrafya": 4, "Felsefe": 2, "Türkçe": 4, "Edebiyat": 2, "TYT Matematik": 2, "AYT Matematik": 2, "Geometri": 2, "Rehberlik": 1 }
  },
  {
    name: "8. Sınıf LGS Şablonu",
    tag: "LGS",
    description: "4 Türkçe, 5 Matematik, 4 Fen, 2 İnkılap (Sosyal), 2 İngilizce, 1 Din",
    curriculum: { "Türkçe": 4, "Matematik": 5, "Fen Bilgisi": 4, "Sosyal Bilgiler": 2, "İngilizce": 2, "Din Kültürü": 1 }
  }
];

export const DAYS = ["Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi", "Pazar"];

export const TIME_SLOTS = [
  // 1-6: gündüz / hafta sonu ilk 6 ders
  { periyotNo: 1, baslangicSaati: "09:00", bitisSaati: "09:40" },
  { periyotNo: 2, baslangicSaati: "09:50", bitisSaati: "10:30" },
  { periyotNo: 3, baslangicSaati: "10:40", bitisSaati: "11:20" },
  { periyotNo: 4, baslangicSaati: "11:30", bitisSaati: "12:10" },
  { periyotNo: 5, baslangicSaati: "12:50", bitisSaati: "13:30" },
  { periyotNo: 6, baslangicSaati: "13:40", bitisSaati: "14:20" },
  // 7-10: akşam / son 4 ders
  { periyotNo: 7, baslangicSaati: "17:00", bitisSaati: "17:40" },
  { periyotNo: 8, baslangicSaati: "17:50", bitisSaati: "18:30" },
  { periyotNo: 9, baslangicSaati: "18:40", bitisSaati: "19:20" },
  { periyotNo: 10, baslangicSaati: "19:30", bitisSaati: "20:10" },
];

const makePeriodIds = (days: string[], slots: number[]): string[] =>
  days.flatMap(day => slots.map(slot => `${day}-${slot}`));

const uniq = (values: string[]): string[] => Array.from(new Set(values));

const WEEKEND_LAST_4 = makePeriodIds(["Cumartesi", "Pazar"], [7, 8, 9, 10]);
const TUE_THU_LAST_4 = makePeriodIds(["Salı", "Perşembe"], [7, 8, 9, 10]);
const TUE_THU_BUFFER_2 = makePeriodIds(["Salı", "Perşembe"], [6]);
const TUE_THU_WEEKEND_12_BASE = uniq([
  ...TUE_THU_LAST_4,
  ...makePeriodIds(["Cumartesi", "Pazar"], [1, 2, 3, 4, 5, 6]),
]);
const MEZUN_WEEKDAY_FIRST_6 = makePeriodIds(["Pazartesi", "Salı", "Perşembe", "Cuma"], [1, 2, 3, 4, 5, 6]);
const MEZUN_EA_BUFFER_2 = makePeriodIds(["Salı"], [7, 8]);

export type ClassTimeWindow = {
  sinifId: string;
  aciklama: string;
  zorunluPeriyotlar: string[];
  opsiyonelTamponPeriyotlar: string[];
  izinliPeriyotlar: string[];
};

const windowFor = (
  sinifId: string,
  aciklama: string,
  zorunluPeriyotlar: string[],
  opsiyonelTamponPeriyotlar: string[] = []
): ClassTimeWindow => ({
  sinifId,
  aciklama,
  zorunluPeriyotlar,
  opsiyonelTamponPeriyotlar,
  izinliPeriyotlar: uniq([...zorunluPeriyotlar, ...opsiyonelTamponPeriyotlar]),
});

export const CLASS_TIME_WINDOWS: ClassTimeWindow[] = [
  windowFor("neke-09-gen-01", "9. sınıf: Cumartesi ve Pazar son 4 ders", WEEKEND_LAST_4),
  windowFor("neke-10-gen-01", "10. sınıf: Salı ve Perşembe son 4 akşam dersi", TUE_THU_LAST_4),
  windowFor("neke-tet-tyt-01", "TET/TYT: Salı-Perşembe akşam + hafta sonu son 4 ders havuzu", uniq([...TUE_THU_LAST_4, ...WEEKEND_LAST_4])),
  windowFor("neke-11-ea-01", "11 EA: Salı ve Perşembe son 4 akşam dersi", TUE_THU_LAST_4),
  windowFor("neke-11-ea-02", "11 EA: Salı ve Perşembe son 4 akşam dersi", TUE_THU_LAST_4),
  windowFor("neke-11-say-01", "11 SAY: Salı ve Perşembe son 4 akşam dersi", TUE_THU_LAST_4),
  windowFor("neke-11-say-02", "11 SAY: Salı ve Perşembe son 4 akşam dersi", TUE_THU_LAST_4),
  windowFor("neke-12-say-01", "12 SAY: Salı-Perşembe son 4; Cumartesi-Pazar ilk 6", TUE_THU_WEEKEND_12_BASE),
  windowFor("neke-12-say-02", "12 SAY: Salı-Perşembe son 4; Cumartesi-Pazar ilk 6", TUE_THU_WEEKEND_12_BASE),
  windowFor("neke-12-say-03", "12 SAY: Salı-Perşembe son 4; Cumartesi-Pazar ilk 6", TUE_THU_WEEKEND_12_BASE),
  windowFor("neke-12-ea-01", "12 EA: 12 SAY ile aynı; 22 saatlik yük için 2 tampon periyot", TUE_THU_WEEKEND_12_BASE, TUE_THU_BUFFER_2),
  windowFor("neke-12-ea-02", "12 EA: 12 SAY ile aynı; 22 saatlik yük için 2 tampon periyot", TUE_THU_WEEKEND_12_BASE, TUE_THU_BUFFER_2),
  windowFor("neke-12-ea-03", "12 EA: 12 SAY ile aynı; 22 saatlik yük için 2 tampon periyot", TUE_THU_WEEKEND_12_BASE, TUE_THU_BUFFER_2),
  windowFor("neke-mez-say-01", "Mezun SAY: Pazartesi-Salı-Perşembe-Cuma ilk 6 ders", MEZUN_WEEKDAY_FIRST_6),
  windowFor("neke-mez-say-02", "Mezun SAY: Pazartesi-Salı-Perşembe-Cuma ilk 6 ders", MEZUN_WEEKDAY_FIRST_6),
  windowFor("neke-mez-say-03", "Mezun SAY: Pazartesi-Salı-Perşembe-Cuma ilk 6 ders", MEZUN_WEEKDAY_FIRST_6),
  windowFor("neke-mez-ea-01", "Mezun EA: Mezun SAY ile aynı; Salı 7-8 tampon", MEZUN_WEEKDAY_FIRST_6, MEZUN_EA_BUFFER_2),
  windowFor("neke-mez-ea-02", "Mezun EA: Mezun SAY ile aynı; Salı 7-8 tampon", MEZUN_WEEKDAY_FIRST_6, MEZUN_EA_BUFFER_2),
  windowFor("neke-mez-ea-03", "Mezun EA: Mezun SAY ile aynı; Salı 7-8 tampon", MEZUN_WEEKDAY_FIRST_6, MEZUN_EA_BUFFER_2),
];

export const getAllowedPeriodsForClass = (sinifId: string): string[] =>
  CLASS_TIME_WINDOWS.find(window => window.sinifId === sinifId)?.izinliPeriyotlar || [];

export const INITIAL_TEACHERS: Teacher[] = RAW_TEACHERS.map(t => ({
  ...t,
  uygunPeriyotlar: t.uygunPeriyotlar || []
}));

export const INITIAL_CLASSES: ClassUnit[] = RAW_CLASSES.map(cls => {
  let matchedParams: Record<string, number> = {};
  if (cls.haftalikDersIhtiyaci && Object.keys(cls.haftalikDersIhtiyaci).length > 0) {
    matchedParams = { ...cls.haftalikDersIhtiyaci };
  } else if (cls.kademe === Kademe.LGS) {
    matchedParams = CURRICULUM_TEMPLATES.find(t => t.tag === "LGS")?.curriculum || {};
  } else if (cls.sinifAdi.includes("9. Sınıf")) {
    matchedParams = CURRICULUM_TEMPLATES.find(t => t.tag === "9. Sınıf")?.curriculum || {};
  } else if (cls.sinifAdi.includes("10. Sınıf")) {
    matchedParams = CURRICULUM_TEMPLATES.find(t => t.tag === "10. Sınıf")?.curriculum || {};
  } else if (cls.sinifAdi.includes("11") && cls.alan === Alan.SAYISAL) {
    matchedParams = CURRICULUM_TEMPLATES.find(t => t.name === "11 Sayısal Şablonu")?.curriculum || {};
  } else if (cls.sinifAdi.includes("11") && cls.alan === Alan.ESIT_AGIRLIK) {
    matchedParams = CURRICULUM_TEMPLATES.find(t => t.name === "11 Eşit Ağırlık Şablonu")?.curriculum || {};
  } else if ((cls.sinifAdi.includes("12") || cls.sinifAdi.includes("Mezun")) && cls.alan === Alan.SAYISAL) {
    matchedParams = CURRICULUM_TEMPLATES.find(t => t.tag === "Sayısal" && t.name.includes("12"))?.curriculum || {};
  } else if ((cls.sinifAdi.includes("12") || cls.sinifAdi.includes("Mezun")) && cls.alan === Alan.ESIT_AGIRLIK) {
    matchedParams = CURRICULUM_TEMPLATES.find(t => t.tag === "Eşit Ağırlık" && t.name.includes("12"))?.curriculum || {};
  }

  const timeWindow = CLASS_TIME_WINDOWS.find(w => w.sinifId === cls.id);
  const allowed = timeWindow ? timeWindow.izinliPeriyotlar : [];

  return {
    ...cls,
    kademe: cls.kademe || (cls.sinifAdi.includes("LGS") ? Kademe.LGS : Kademe.YKS),
    seviye: cls.seviye || (cls.sinifAdi.match(/\d+/) ? cls.sinifAdi.match(/\d+/)![0] : "Mezun"),
    haftalikDersIhtiyaci: Object.keys(matchedParams).length > 0 ? matchedParams : cls.haftalikDersIhtiyaci,
    uygunPeriyotlar: cls.uygunPeriyotlar || allowed
  };
});

export const INITIAL_COURSES: Course[] = [
  // YKS Courses
  { id: "c-yks-mat", dersAdi: "Matematik", kademe: Kademe.YKS, brans: "Matematik", haftalikSaat: 8, zorunluMu: true, alanUyumu: Alan.GENEL, maxBlokSaat: 3, zorlukDerecesi: 5 },
  { id: "c-yks-fiz", dersAdi: "Fizik", kademe: Kademe.YKS, brans: "Fizik", haftalikSaat: 4, zorunluMu: true, alanUyumu: Alan.SAYISAL, maxBlokSaat: 2, zorlukDerecesi: 4 },
  { id: "c-yks-kim", dersAdi: "Kimya", kademe: Kademe.YKS, brans: "Kimya", haftalikSaat: 4, zorunluMu: true, alanUyumu: Alan.SAYISAL, maxBlokSaat: 2, zorlukDerecesi: 4 },
  { id: "c-yks-biy", dersAdi: "Biyoloji", kademe: Kademe.YKS, brans: "Biyoloji", haftalikSaat: 4, zorunluMu: true, alanUyumu: Alan.SAYISAL, maxBlokSaat: 2, zorlukDerecesi: 3 },
  { id: "c-yks-tur", dersAdi: "Türkçe-Edebiyat", kademe: Kademe.YKS, brans: "Türkçe-Edebiyat", haftalikSaat: 8, zorunluMu: true, alanUyumu: Alan.GENEL, maxBlokSaat: 3, zorlukDerecesi: 4 },
  { id: "c-yks-tar", dersAdi: "Tarih", kademe: Kademe.YKS, brans: "Tarih", haftalikSaat: 4, zorunluMu: true, alanUyumu: Alan.ESIT_AGIRLIK, maxBlokSaat: 2, zorlukDerecesi: 2 },
  { id: "c-yks-cog", dersAdi: "Coğrafya", kademe: Kademe.YKS, brans: "Coğrafya", haftalikSaat: 3, zorunluMu: true, alanUyumu: Alan.ESIT_AGIRLIK, maxBlokSaat: 2, zorlukDerecesi: 2 },
  { id: "c-yks-fel", dersAdi: "Felsefe", kademe: Kademe.YKS, brans: "Felsefe", haftalikSaat: 2, zorunluMu: true, alanUyumu: Alan.ESIT_AGIRLIK, maxBlokSaat: 2, zorlukDerecesi: 2 },
  { id: "c-yks-reh", dersAdi: "Rehberlik", kademe: Kademe.YKS, brans: "Rehberlik", haftalikSaat: 1, zorunluMu: true, alanUyumu: Alan.GENEL, maxBlokSaat: 1, zorlukDerecesi: 1 },
  { id: "c-yks-geo", dersAdi: "Geometri", kademe: Kademe.YKS, brans: "Matematik", haftalikSaat: 2, zorunluMu: true, alanUyumu: Alan.GENEL, maxBlokSaat: 2, zorlukDerecesi: 4 },
  { id: "c-yks-tytmat", dersAdi: "TYT Matematik", kademe: Kademe.YKS, brans: "Matematik", haftalikSaat: 2, zorunluMu: true, alanUyumu: Alan.GENEL, maxBlokSaat: 2, zorlukDerecesi: 4 },
  { id: "c-yks-aytmat", dersAdi: "AYT Matematik", kademe: Kademe.YKS, brans: "Matematik", haftalikSaat: 2, zorunluMu: true, alanUyumu: Alan.GENEL, maxBlokSaat: 2, zorlukDerecesi: 5 },
  { id: "c-yks-turkce", dersAdi: "Türkçe", kademe: Kademe.YKS, brans: "Türkçe-Edebiyat", haftalikSaat: 4, zorunluMu: true, alanUyumu: Alan.GENEL, maxBlokSaat: 2, zorlukDerecesi: 3 },
  { id: "c-yks-edebiyat", dersAdi: "Edebiyat", kademe: Kademe.YKS, brans: "Türkçe-Edebiyat", haftalikSaat: 2, zorunluMu: true, alanUyumu: Alan.GENEL, maxBlokSaat: 2, zorlukDerecesi: 3 },
  { id: "c-yks-etut", dersAdi: "Etüt", kademe: Kademe.YKS, brans: "Genel", haftalikSaat: 2, zorunluMu: false, alanUyumu: Alan.GENEL, maxBlokSaat: 2, zorlukDerecesi: 2 },
  
  // LGS Courses
  { id: "c-lgs-tur", dersAdi: "Türkçe", kademe: Kademe.LGS, brans: "Türkçe", haftalikSaat: 5, zorunluMu: true, alanUyumu: Alan.GENEL, maxBlokSaat: 2, zorlukDerecesi: 3 },
  { id: "c-lgs-mat", dersAdi: "Matematik", kademe: Kademe.LGS, brans: "Matematik", haftalikSaat: 5, zorunluMu: true, alanUyumu: Alan.GENEL, maxBlokSaat: 2, zorlukDerecesi: 5 },
  { id: "c-lgs-fen", dersAdi: "Fen Bilgisi", kademe: Kademe.LGS, brans: "Fen Bilgisi", haftalikSaat: 4, zorunluMu: true, alanUyumu: Alan.GENEL, maxBlokSaat: 2, zorlukDerecesi: 4 },
  { id: "c-lgs-sos", dersAdi: "Sosyal Bilgiler", kademe: Kademe.LGS, brans: "Sosyal Bilgiler", haftalikSaat: 3, zorunluMu: true, alanUyumu: Alan.GENEL, maxBlokSaat: 2, zorlukDerecesi: 2 },
  { id: "c-lgs-ing", dersAdi: "İngilizce", kademe: Kademe.LGS, brans: "İngilizce", haftalikSaat: 3, zorunluMu: true, alanUyumu: Alan.GENEL, maxBlokSaat: 2, zorlukDerecesi: 2 },
  { id: "c-lgs-din", dersAdi: "Din Kültürü", kademe: Kademe.LGS, brans: "Sosyal Bilgiler", haftalikSaat: 1, zorunluMu: true, alanUyumu: Alan.GENEL, maxBlokSaat: 1, zorlukDerecesi: 1 },
  { id: "c-lgs-reh", dersAdi: "Rehberlik", kademe: Kademe.LGS, brans: "Rehberlik", haftalikSaat: 1, zorunluMu: true, alanUyumu: Alan.GENEL, maxBlokSaat: 1, zorlukDerecesi: 1 },
];

export const INITIAL_CLASSROOMS: Classroom[] = [
  { id: "room-neke-101", merkez: "Neşet Ertaş Kültürevi", derslikAdi: "Salon 101", kapasite: 24, uygunluk: true, aktifPasif: true, hizmetBirimi: "LGS" },
  { id: "room-neke-102", merkez: "Neşet Ertaş Kültürevi", derslikAdi: "Salon 102", kapasite: 24, uygunluk: true, aktifPasif: true, hizmetBirimi: "LGS" },
  { id: "room-neke-201", merkez: "Neşet Ertaş Kültürevi", derslikAdi: "Salon 201 (Sayısal)", kapasite: 20, uygunluk: true, aktifPasif: true, hizmetBirimi: "YKS" },
  { id: "room-neke-202", merkez: "Neşet Ertaş Kültürevi", derslikAdi: "Salon 202 (EA)", kapasite: 20, uygunluk: true, aktifPasif: true, hizmetBirimi: "YKS" },
  { id: "room-neke-301", merkez: "Neşet Ertaş Kültürevi", derslikAdi: "Salon 301 (Mezun)", kapasite: 22, uygunluk: true, aktifPasif: true, hizmetBirimi: "YKS" },
  { id: "room-neke-lab", merkez: "Neşet Ertaş Kültürevi", derslikAdi: "Fen Lab", kapasite: 18, uygunluk: true, aktifPasif: true, hizmetBirimi: "Tümü" },
  { id: "room-neke-302", merkez: "Neşet Ertaş Kültürevi", derslikAdi: "Salon 302", kapasite: 15, uygunluk: true, aktifPasif: true, hizmetBirimi: "LGS" },
  { id: "room-neke-pasif-1", merkez: "Neşet Ertaş Kültürevi", derslikAdi: "Ek Alan 303 (Yedek)", kapasite: 20, uygunluk: true, aktifPasif: false, hizmetBirimi: "Tümü" },
  { id: "room-neke-pasif-2", merkez: "Neşet Ertaş Kültürevi", derslikAdi: "Ek Alan 304 (Yedek)", kapasite: 20, uygunluk: true, aktifPasif: false, hizmetBirimi: "Tümü" },
  
  { id: "room-ata-01", merkez: "Kayışdağı Lions Ataevi", derslikAdi: "Lions Sınıf A", kapasite: 25, uygunluk: true, aktifPasif: true, hizmetBirimi: "Tümü" },
  { id: "room-ata-02", merkez: "Kayışdağı Lions Ataevi", derslikAdi: "Lions Sınıf B", kapasite: 25, uygunluk: true, aktifPasif: true, hizmetBirimi: "Tümü" },

  { id: "room-or-1", merkez: "Örnek Ataevi", derslikAdi: "Örnek Sınıf A", kapasite: 20, uygunluk: true, aktifPasif: true, hizmetBirimi: "Tümü" },
  { id: "room-or-2", merkez: "Örnek Ataevi", derslikAdi: "Örnek Sınıf B", kapasite: 20, uygunluk: true, aktifPasif: true, hizmetBirimi: "Tümü" },

  { id: "room-me-1", merkez: "Mevlana Ataevi", derslikAdi: "Mevlana Sınıf A", kapasite: 20, uygunluk: true, aktifPasif: true, hizmetBirimi: "Tümü" },
  { id: "room-me-2", merkez: "Mevlana Ataevi", derslikAdi: "Mevlana Sınıf B", kapasite: 20, uygunluk: true, aktifPasif: true, hizmetBirimi: "Tümü" },

  { id: "room-mk-1", merkez: "Mustafa Kemal Ataevi", derslikAdi: "M. Kemal Sınıf A", kapasite: 20, uygunluk: true, aktifPasif: true, hizmetBirimi: "Tümü" },
  { id: "room-mk-2", merkez: "Mustafa Kemal Ataevi", derslikAdi: "M. Kemal Sınıf B", kapasite: 20, uygunluk: true, aktifPasif: true, hizmetBirimi: "Tümü" },
];

// Helper to generate full default time periods matrix
export function generateTimePeriods(): TimePeriod[] {
  const periods: TimePeriod[] = [];
  DAYS.forEach((day) => {
    TIME_SLOTS.forEach((slot) => {
      periods.push({
        id: `${day}-${slot.periyotNo}`,
        gun: day,
        baslangicSaati: slot.baslangicSaati,
        bitisSaati: slot.bitisSaati,
        periyotNo: slot.periyotNo,
        aktifPasif: true,
      });
    });
  });
  return periods;
}

export const INITIAL_PLAN_ITEMS: PlanItem[] = [
  // Let's seed a beautiful subset of pre-scheduled classes that runs nicely
  // 12-SAY-01 schedule (Pazartesi)
  { id: "plan-1", sinifId: "neke-12-say-01", dersId: "c-yks-mat", ogretmenId: "yks-mat-01", derslikId: "room-neke-201", periyotId: "Pazartesi-1", planTuru: PlanTuru.NORMAL_DERS, durum: "Onaylı" },
  { id: "plan-2", sinifId: "neke-12-say-01", dersId: "c-yks-mat", ogretmenId: "yks-mat-01", derslikId: "room-neke-201", periyotId: "Pazartesi-2", planTuru: PlanTuru.NORMAL_DERS, durum: "Onaylı" },
  { id: "plan-3", sinifId: "neke-12-say-01", dersId: "c-yks-fiz", ogretmenId: "yks-fiz-01", derslikId: "room-neke-201", periyotId: "Pazartesi-3", planTuru: PlanTuru.NORMAL_DERS, durum: "Onaylı" },
  { id: "plan-4", sinifId: "neke-12-say-01", dersId: "c-yks-fiz", ogretmenId: "yks-fiz-01", derslikId: "room-neke-201", periyotId: "Pazartesi-4", planTuru: PlanTuru.NORMAL_DERS, durum: "Onaylı" },
  { id: "plan-5", sinifId: "neke-12-say-01", dersId: "c-yks-tur", ogretmenId: "yks-tde-01", derslikId: "room-neke-201", periyotId: "Pazartesi-5", planTuru: PlanTuru.NORMAL_DERS, durum: "Onaylı" },
  { id: "plan-6", sinifId: "neke-12-say-01", dersId: "c-yks-reh", ogretmenId: "yks-reh-01", derslikId: "room-neke-201", periyotId: "Pazartesi-6", planTuru: PlanTuru.REHBERLIK, durum: "Onaylı" },

  // Let's create an overlapping conflict so that users can resolve it!
  // YKS-MAT-01 is scheduled in 12-SAY-01 at Pazartesi-1. 
  // Let's ALSO schedule YKS-MAT-01 to teach 12-EA-01 at Pazartesi-1.
  // This triggers "Zorunlu Kısıt İhlali: Bir öğretmen aynı anda birden fazla sınıfa atanamaz!" 
  { id: "plan-conflict-1", sinifId: "neke-12-ea-01", dersId: "c-yks-mat", ogretmenId: "yks-mat-01", derslikId: "room-neke-202", periyotId: "Pazartesi-1", planTuru: PlanTuru.NORMAL_DERS, durum: "Onaylı" },

  // Normal 12-EA-01 items (Salı)
  { id: "plan-7", sinifId: "neke-12-ea-01", dersId: "c-yks-tur", ogretmenId: "yks-tde-02", derslikId: "room-neke-202", periyotId: "Salı-1", planTuru: PlanTuru.NORMAL_DERS, durum: "Onaylı" },
  { id: "plan-8", sinifId: "neke-12-ea-01", dersId: "c-yks-tur", ogretmenId: "yks-tde-02", derslikId: "room-neke-202", periyotId: "Salı-2", planTuru: PlanTuru.NORMAL_DERS, durum: "Onaylı" },
  { id: "plan-9", sinifId: "neke-12-ea-01", dersId: "c-yks-tar", ogretmenId: "yks-tar-01", derslikId: "room-neke-202", periyotId: "Salı-3", planTuru: PlanTuru.NORMAL_DERS, durum: "Onaylı" },
  { id: "plan-10", sinifId: "neke-12-ea-01", dersId: "c-yks-cog", ogretmenId: "yks-cog-01", derslikId: "room-neke-202", periyotId: "Salı-4", planTuru: PlanTuru.NORMAL_DERS, durum: "Onaylı" },

  // Let's add active LGS scheduling for 8. Sınıf LGS-01
  { id: "plan-11", sinifId: "ata-lgs-08-01", dersId: "c-lgs-mat", ogretmenId: "lgs-mat-01", derslikId: "room-ata-01", periyotId: "Pazartesi-1", planTuru: PlanTuru.NORMAL_DERS, durum: "Onaylı" },
  { id: "plan-12", sinifId: "ata-lgs-08-01", dersId: "c-lgs-mat", ogretmenId: "lgs-mat-01", derslikId: "room-ata-01", periyotId: "Pazartesi-2", planTuru: PlanTuru.NORMAL_DERS, durum: "Onaylı" },
  { id: "plan-13", sinifId: "ata-lgs-08-01", dersId: "c-lgs-tur", ogretmenId: "lgs-tur-01", derslikId: "room-ata-01", periyotId: "Pazartesi-3", planTuru: PlanTuru.NORMAL_DERS, durum: "Onaylı" },
  { id: "plan-14", sinifId: "ata-lgs-08-01", dersId: "c-lgs-fen", ogretmenId: "lgs-fen-01", derslikId: "room-ata-01", periyotId: "Pazartesi-4", planTuru: PlanTuru.NORMAL_DERS, durum: "Onaylı" },
];

export const INITIAL_STUDENTS: Student[] = [
  // 12-SAY-01 Students
  { id: "stu-1", adSoyad: "Mert Yılmaz", sinifId: "neke-12-say-01", tcNo: "12345678901", telefon: "+90 555 111 2233", veliPhone: "+90 555 999 0011", devamsizlikRiskScore: 0.05 },
  { id: "stu-2", adSoyad: "Ayşe Kaya", sinifId: "neke-12-say-01", tcNo: "12345678902", telefon: "+90 555 111 2234", veliPhone: "+90 555 999 0012", devamsizlikRiskScore: 0.12 },
  { id: "stu-3", adSoyad: "Can Demir", sinifId: "neke-12-say-01", tcNo: "12345678903", telefon: "+90 555 111 2235", veliPhone: "+90 555 999 0013", devamsizlikRiskScore: 0.35 }, // Critical Devamsızlık risk!
  { id: "stu-4", adSoyad: "Zeynep Aslan", sinifId: "neke-12-say-01", tcNo: "12345678904", telefon: "+90 555 111 2236", veliPhone: "+90 555 999 0014", devamsizlikRiskScore: 0.00 },
  { id: "stu-5", adSoyad: "Fatma Yıldız", sinifId: "neke-12-say-01", tcNo: "12345678905", telefon: "+90 555 111 2237", veliPhone: "+90 555 999 0015", devamsizlikRiskScore: 0.18 },

  // 12-EA-01 Students
  { id: "stu-6", adSoyad: "Efe Öztürk", sinifId: "neke-12-ea-01", tcNo: "22345678901", telefon: "+90 555 222 3344", veliPhone: "+90 555 888 1122", devamsizlikRiskScore: 0.28 }, // At risk
  { id: "stu-7", adSoyad: "Selin Şahin", sinifId: "neke-12-ea-01", tcNo: "22345678902", telefon: "+90 555 222 3345", veliPhone: "+90 555 888 1123", devamsizlikRiskScore: 0.08 },
  { id: "stu-8", adSoyad: "Umut Yıldırım", sinifId: "neke-12-ea-01", tcNo: "22345678903", telefon: "+90 555 222 3346", veliPhone: "+90 555 888 1124", devamsizlikRiskScore: 0.02 },

  // LGS-01 Students
  { id: "stu-9", adSoyad: "Kaan Kurt", sinifId: "ata-lgs-08-01", tcNo: "32345678901", telefon: "+90 555 333 4455", veliPhone: "+90 555 777 2233", devamsizlikRiskScore: 0.45 }, // Hyper critical
  { id: "stu-10", adSoyad: "Eda Koç", sinifId: "ata-lgs-08-01", tcNo: "32345678902", telefon: "+90 555 333 4456", veliPhone: "+90 555 777 2234", devamsizlikRiskScore: 0.05 },
];

export const INITIAL_EXAMS: Exam[] = [
  {
    id: "exam-tyt-1",
    sinavAdi: "Deneme Kulübü - TYT Altın Seri 01",
    kademe: Kademe.YKS,
    sinavTuru: "TYT",
    tarih: "2026-06-15",
    baslangicSaati: "09:30",
    bitisSaati: "12:15",
    katilimciGrupIds: ["neke-12-say-01", "neke-12-ea-01", "neke-mez-say-01", "neke-mez-ea-01"],
    salonIds: ["room-neke-101", "room-neke-102", "room-neke-301"],
    gorevliOgretmenIds: ["yks-mat-04", "yks-tde-03", "yks-reh-03"],
    katilimciSayisi: 74
  },
  {
    id: "exam-lgs-1",
    sinavAdi: "Deneme Kulübü - LGS Prova 01",
    kademe: Kademe.LGS,
    sinavTuru: "LGS",
    tarih: "2026-06-16",
    baslangicSaati: "09:30",
    bitisSaati: "11:45",
    katilimciGrupIds: ["ata-lgs-08-01", "ata-lgs-08-02"],
    salonIds: ["room-ata-01", "room-ata-02"],
    gorevliOgretmenIds: ["lgs-mat-02", "lgs-tur-02"],
    katilimciSayisi: 44
  }
];

export const INITIAL_COUNSELINGS: CounselingSession[] = [
  {
    id: "coun-1",
    ogrenciId: "stu-3", // Can Demir (devamsızlık riskli)
    rehberOgretmenId: "yks-reh-01",
    gorusmeTuru: "Devamsızlık Görüşmesi",
    tarih: "2026-06-03",
    saat: "10:40",
    not: "Öğrencinin okula uyum sağlaması ve devamsızlık sebepleri görüşüldü. Ailesiyle irtibata geçildi. Bir sonraki hafta etüt katılımı takip edilecek.",
    takipGerekiyorMu: true
  },
  {
    id: "coun-2",
    ogrenciId: "stu-6", // Efe Öztürk
    rehberOgretmenId: "yks-reh-02",
    gorusmeTuru: "Kaygı Çalışması",
    tarih: "2026-06-05",
    saat: "13:40",
    not: "YKS yaklaşırken sınav stresi ve zaman yönetimi üzerine çalışıldı. Nefes egzersizleri ritmi aktarıldı.",
    takipGerekiyorMu: false
  }
];
