/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from "react";
import { Cloud, UploadCloud, FileSpreadsheet, PlayCircle } from "lucide-react";
import { ClassUnit, Teacher, PlanItem, Course, PlanTuru, Kademe, Alan } from "../types";

export interface IntegrationSettingsProps {
  classes?: ClassUnit[];
  onUpdateClasses?: (classes: ClassUnit[]) => void;
  teachers?: Teacher[];
  onUpdateTeachers?: (teachers: Teacher[]) => void;
  plans?: PlanItem[];
  onUpdatePlans?: (plans: PlanItem[]) => void;
  courses?: Course[];
}

export default function IntegrationSettings({
  classes = [],
  onUpdateClasses,
  teachers = [],
  onUpdateTeachers,
  plans = [],
  onUpdatePlans,
  courses = []
}: IntegrationSettingsProps) {
  const [jotformStatus, setJotformStatus] = useState<"connected" | "disconnected">("disconnected");
  const [sheetsStatus, setSheetsStatus] = useState<"connected" | "disconnected">("disconnected");
  const [gcalStatus, setGcalStatus] = useState<"connected" | "disconnected">("disconnected");
  
  const [loading, setLoading] = useState<string | null>(null);

  // Excel Parser State
  const [csvInput, setCsvInput] = useState<string>("");
  const [parseLogs, setParseLogs] = useState<string[]>([]);
  const [isParsing, setIsParsing] = useState(false);

  const handleSyncToggle = (service: string, current: string) => {
    setLoading(service);
    setTimeout(() => {
      setLoading(null);
      if (service === "jotform") setJotformStatus(current === "connected" ? "disconnected" : "connected");
      if (service === "sheets") setSheetsStatus(current === "connected" ? "disconnected" : "connected");
      if (service === "calendar") setGcalStatus(current === "connected" ? "disconnected" : "connected");
    }, 1000);
  };

  const handleParseCsv = () => {
    if (!csvInput.trim()) return;
    setIsParsing(true);
    setParseLogs(["🔄 Excel ayrıştırma başlatılıyor..."]);
    
    setTimeout(() => {
      let logs = ["🔄 Excel ayrıştırma başlatılıyor..."];
      const lines = csvInput.split('\\n').map(l => l.trim()).filter(l => l.length > 0);
      
      if (lines.length < 2) {
        setParseLogs(["❌ Hata: En az bir başlık satırı ve bir veri satırı gereklidir."]);
        setIsParsing(false);
        return;
      }

      // 1. Sütun Okuyucu: Başlıkları alıp Öğrenci Gruplarını (Sınıfları) oluştur/bul.
      const headers = lines[0].split('\\t'); // Assuming tab-separated from Excel copy-paste
      if (headers.length < 2) {
        logs.push("⚠️ Uyarı: Ayırıcı olarak sekme (Tab) bulunamadı. Lütfen Excel'den doğrudan kopyalayıp yapıştırın.");
      }
      
      // İlk kolon genellikle zaman, diğerleri sınıf isimleri
      const timeColumnName = headers[0];
      const classNames = headers.slice(1);
      
      const newClasses = [...classes];
      const classMap = new Map<string, string>(); // ClassName -> ClassId
      
      classNames.forEach((cName, idx) => {
        if (!cName) return;
        let existingClass = newClasses.find(c => c.sinifAdi === cName);
        if (!existingClass) {
          existingClass = {
            id: `cls-import-${Date.now()}-${idx}`,
            sinifAdi: cName,
            seviye: cName.includes("9") ? "9" : cName.includes("10") ? "10" : cName.includes("11") ? "11" : cName.includes("12") ? "12" : cName.toLowerCase().includes("mez") ? "Mezun" : "",
            kademe: Kademe.YKS,
            alan: cName.includes("SAY") ? Alan.SAYISAL : cName.includes("EA") ? Alan.ESIT_AGIRLIK : Alan.GENEL,
            sube: "A",
            merkez: "Ataşehir Merkez",
            kapasite: 20,
            mevcutOgrenciSayisi: 10,
            haftalikDersIhtiyaci: {},
            aktifPasif: true,
            minHaftalikDers: cName.includes("12") || cName.toLowerCase().includes("mez") ? 20 : 8,
            maxHaftalikDers: cName.includes("12") ? 20 : cName.toLowerCase().includes("mez") ? 22 : 12,
          };
          newClasses.push(existingClass);
          logs.push(`✅ Yeni Sınıf Tespiti: ${cName}`);
        }
        classMap.set(cName, existingClass.id);
      });

      // 2. Satır Okuyucu: Dönüşümleri gerçekleştir.
      const newTeachers = [...teachers];
      const addedPlans: PlanItem[] = [];
      const dataLines = lines.slice(1);
      
      dataLines.forEach((line, rowIndex) => {
        const columns = line.split('\\t');
        const timeVal = columns[0]; // e.g. 09.30-10.10
        
        // Mola/Ara kontrolü
        if (timeVal.toUpperCase().includes("ARA") || timeVal.toUpperCase().includes("MOLA")) {
          logs.push(`☕ Mola Tespiti (Satır ${rowIndex+1}): ${timeVal} - Bu satır atlanıyor.`);
          return; // Skip assignment
        }
        
        const periodNo = rowIndex + 1;
        const day = "Cumartesi"; // Varsayılan Demo Günü
        
        // Sınıf hücrelerini gez (Hücre Ayrıştırıcı)
        classNames.forEach((cName, cIdx) => {
          const cellVal = columns[cIdx + 1];
          if (!cellVal || cellVal.trim() === "") return;
          
          if (cellVal.toUpperCase() === "BOS" || cellVal.toUpperCase() === "BOŞ") return;
          
          // Beklenen Format: "FİZİK TUĞÇE" veya "MATEMATİK AHMET"
          const parts = cellVal.split(' ');
          if (parts.length >= 2) {
             const dersIsmi = parts[0];
             const ogretmenIsmi = parts.slice(1).join(' ');
             
             // Öğretmeni bul veya yarat
             let teacherObj = newTeachers.find(t => t.adSoyad.toLowerCase() === ogretmenIsmi.toLowerCase());
             if (!teacherObj) {
               teacherObj = {
                  id: `tr-import-${Date.now()}-${cIdx}-${rowIndex}`,
                  adSoyad: ogretmenIsmi,
                  brans: dersIsmi, // assume first part is branch
                  sistemKodu: "T" + Math.floor(Math.random() * 1000),
                  merkez: "Ataşehir Merkez",
                  aktifPasif: true,
                  haftalikMaksimumDers: 40,
                  gunlukMaksimumDers: 8,
                  uygunGunler: ["Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi", "Pazar"],
                  uygunSaatler: ["1","2","3","4","5","6","7","8","9","10"],
                  bosGunTercihi: "Yok",
                  kademe: Kademe.YKS
               };
               newTeachers.push(teacherObj);
               logs.push(`✅ Yeni Eğitmen Tespiti: ${ogretmenIsmi} (${dersIsmi})`);
             }
             
             // Dersi bul (varsayılan)
             let courseObj = courses.find(c => c.dersAdi.toUpperCase().includes(dersIsmi.toUpperCase()));
             const courseId = courseObj ? courseObj.id : "c1"; // default if missing
             
             const classId = classMap.get(cName);
             if (classId) {
                const pItem: PlanItem = {
                   id: `plan-imp-${Date.now()}-${cIdx}-${rowIndex}`,
                   sinifId: classId,
                   dersId: courseId,
                   ogretmenId: teacherObj.id,
                   derslikId: "r1", // Varsayılan Derslik
                   periyotId: `${day}-${periodNo}`, // e.g. Cumartesi-1
                   planTuru: PlanTuru.NORMAL_DERS,
                   durum: "Taslak"
                };
                addedPlans.push(pItem);
                logs.push(`📝 Atama: ${cName} sınıfına ${timeVal} (${day}-${periodNo}) periodunda ${ogretmenIsmi} atandı.`);
             }
          } else {
             logs.push(`⚠️ Uyarı: ${cName} sınıfı ${timeVal} hücresindeki "${cellVal}" verisi ayrıştırılamadı. Format: DERS_ADI ÖGRETMEN_ADI olmalı.`);
          }
        });
      });
      
      logs.push("✨ Veri parse işlemi tamamlandı.");
      logs.push(`Sonuç: ${newClasses.length - classes.length} yeni sınıf, ${newTeachers.length - teachers.length} yeni öğretmen eklenecek.`);
      logs.push(`${addedPlans.length} yeni ders oturumu (CourseSession) programa dahil edilecek.`);
      
      setParseLogs(logs);
      setIsParsing(false);
      
      // Update global states if handler provided
      if (onUpdateClasses) onUpdateClasses(newClasses);
      if (onUpdateTeachers) onUpdateTeachers(newTeachers);
      if (onUpdatePlans) onUpdatePlans([...plans, ...addedPlans]);
      
    }, 1500);
  };

  return (
    <div className="space-y-6">
      
      {/* Banner */}
      <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
        <div>
          <h2 className="text-xl font-bold text-slate-950 font-sans flex items-center gap-2">
            <Cloud className="w-5 h-5 text-indigo-600 animate-pulse" />
            Dış Entegrasyonlar ve Veri Köprüleri
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Ata Akademi operasyonel entegrasyon ayarları ve Excel İçe Aktarım Paneli.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Excel Importer */}
        <div className="bg-white p-5 rounded-2xl border border-slate-150 shadow-sm flex flex-col space-y-4">
           <div className="space-y-2">
            <div className="flex justify-between items-start">
              <span className="bg-indigo-50 text-indigo-700 text-[10px] font-bold px-2 py-0.5 rounded border border-indigo-100 uppercase">
                Faz 2 - Akıllı OCR / CSV İçe Aktarıcı
              </span>
            </div>
            <h3 className="font-bold text-slate-900 text-sm font-sans flex items-center gap-2">
              <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
              Excel Hücre Ayrıştırıcı
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed font-sans pb-2">
              Excel'den (Örn: Sütunlar: Zaman Seçimi, Sınıf Adları | İçerik: FİZİK TUĞÇE) veriyi kopyalayıp aşağıdaki alana yapıştırın. Sistem otomatik olarak Teacher, ClassUnit ve Course nesnelerini ayıklayıp eşleştirecektir.
            </p>
            
            <textarea 
               value={csvInput}
               onChange={(e) => setCsvInput(e.target.value)}
               placeholder="Zaman\t9 SAY 1\t12 SAY 1\n09.30-10.10\tMATEMATİK ALİ\tFİZİK TUĞÇE\n10.20-11.00\tFİZİK TUĞÇE\tMATEMATİK ALİ\n11.00-11.20\t20 DAKİKA ARA\t20 DAKİKA ARA"
               className="w-full text-xs font-mono bg-slate-50 border border-slate-200 rounded-lg p-3 h-32 focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-700"
            />
            
            <button 
              onClick={handleParseCsv}
              disabled={isParsing || csvInput.trim() === ""}
              className="w-full flex justify-center items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs py-2 rounded-lg transition disabled:opacity-50"
            >
               {isParsing ? "İşleniyor..." : <><PlayCircle className="w-4 h-4" /> Veriyi Çözümle ve Ekle</>}
            </button>
            
            {parseLogs.length > 0 && (
              <div className="mt-4 p-3 bg-slate-800 rounded-lg text-[10px] font-mono text-emerald-400 space-y-1 h-40 overflow-y-auto">
                 {parseLogs.map((log, i) => (
                    <div key={i} className={log.includes("Hata") || log.includes("Uyarı") ? "text-rose-400" : ""}>{log}</div>
                 ))}
               </div>
            )}
            
          </div>
        </div>

        {/* Existing Services Grid */}
        <div className="space-y-4">
            
            {/* Google sheets */}
            <div className="bg-white p-4 rounded-xl border border-slate-150 shadow-sm flex flex-col justify-between space-y-3">
            <div className="space-y-1">
                <div className="flex justify-between items-center mb-1">
                <h3 className="font-bold text-slate-900 text-sm font-sans flex items-center gap-1.5">
                   <UploadCloud className="w-4 h-4 text-emerald-600" />
                   Google Sheets Sync
                </h3>
                <span className={`inline-block w-2.5 h-2.5 rounded-full ${sheetsStatus === "connected" ? "bg-emerald-500" : "bg-slate-300"}`}></span>
                </div>
                <p className="text-xs text-slate-500 leading-relaxed font-sans">
                Eğitmen ders saatlerini, doluluk oranlarını ve devamsızlık istatistiklerini raporlayın.
                </p>
            </div>

            <div className="pt-3 flex justify-between items-center">
                <span className="text-xs font-semibold text-slate-400">
                {sheetsStatus === "connected" ? "Anlık Veri Aktif" : "Senkronizasyon Kapalı"}
                </span>
                <button 
                onClick={() => handleSyncToggle("sheets", sheetsStatus)}
                disabled={loading === "sheets"}
                className={`text-xs font-bold px-3 py-1.5 rounded-lg border transition ${
                    sheetsStatus === "connected" 
                    ? "bg-rose-50 border-rose-100 text-rose-700 hover:bg-rose-100" 
                    : "bg-indigo-50 border-indigo-150 text-indigo-700 hover:bg-indigo-100"
                }`}
                >
                {loading === "sheets" ? "Bağlanıyor..." : sheetsStatus === "connected" ? "Kapat" : "Aktifleştir"}
                </button>
            </div>
            </div>

            {/* JotForm card */}
            <div className="bg-white p-4 rounded-xl border border-slate-150 shadow-sm flex flex-col justify-between space-y-3">
            <div className="space-y-1">
                <div className="flex justify-between items-center mb-1">
                <h3 className="font-bold text-slate-900 text-sm font-sans">Jotform Entegrasyonu</h3>
                <span className={`inline-block w-2.5 h-2.5 rounded-full ${jotformStatus === "connected" ? "bg-emerald-500" : "bg-slate-300"}`}></span>
                </div>
                <p className="text-xs text-slate-500 leading-relaxed font-sans">
                Öğrenci ön kayıt ve kulüp başvuru formlarını otomatik entegre edin.
                </p>
            </div>

            <div className="pt-3 flex justify-between items-center">
                <span className="text-[11px] font-semibold text-slate-400">
                {jotformStatus === "connected" ? "Webhook Dinleniyor" : "Bağlantı Yok"}
                </span>
                <button 
                onClick={() => handleSyncToggle("jotform", jotformStatus)}
                disabled={loading === "jotform"}
                className={`text-xs font-bold px-3 py-1.5 rounded-lg border transition ${
                    jotformStatus === "connected" 
                    ? "bg-rose-50 border-rose-100 text-rose-700 hover:bg-rose-100" 
                    : "bg-indigo-50 border-indigo-150 text-indigo-700 hover:bg-indigo-100"
                }`}
                >
                {loading === "jotform" ? "Bekle..." : jotformStatus === "connected" ? "Devre Dışı" : "Bağlantı Kur"}
                </button>
            </div>
            </div>
        </div>

      </div>

    </div>
  );
}
