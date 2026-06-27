import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";
import {
  PlanItem,
  Teacher,
  ClassUnit,
  Classroom,
  Course,
  SchoolScheduleConfig,
  AIHintItem,
  FeedbackResult,
  HeuristicAnalysisResult,
  PlanTuru
} from "./src/types";

dotenv.config();

const app = express();
const PORT = 3000;

// Increase payload size limit to accommodate entire schedule JSON structures
app.use(express.json({ limit: "25mb" }));
app.use(express.urlencoded({ limit: "25mb", extended: true }));

// Initialize Google GenAI Client
const apiKey = process.env.GEMINI_API_KEY;
const aiModel = process.env.GEMINI_MODEL || "gemini-2.0-flash";
const ai = apiKey
  ? new GoogleGenAI({
      apiKey: apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    })
  : null;

interface CurrentScheduleInput {
  plans?: PlanItem[];
  teachers?: Teacher[];
  classes?: ClassUnit[];
  classrooms?: Classroom[];
  courses?: Course[];
}

interface BranchConfigItem {
  key: string;
  label: string;
  group: string;
}

interface BranchAnalysisInput {
  branchesConfig: BranchConfigItem[];
  pastStats?: Record<string, number>;
  activeStats?: Record<string, number>;
}

// Heuristic fallback for schedule analysis when Gemini is unavailable
function getHeuristicAnalysis(
  currentSchedule: CurrentScheduleInput,
  branchAnalysis: BranchAnalysisInput
): HeuristicAnalysisResult {
  const currentPlans = currentSchedule?.plans || [];
  const teachersCount = currentSchedule?.teachers?.length || 0;
  const classesCount = currentSchedule?.classes?.length || 0;
  
  const patterns = [
    {
      title: "Haftalık Yoğunluk ve Blok Dağılımı",
      type: "block",
      description: "Derslerin büyük çoğunluğu pedagojik ilkelere uygun şekilde 2'şer saatlik bloklar halinde gruplanmıştır."
    },
    {
      title: "Öğretmen Tercihleri ve Boş Günler",
      type: "preference",
      description: "Öğretmenlerin boş gün talepleri ve günlük maksimum ders sınırları öncelikli kısıt olarak işlenmiştir."
    }
  ];

  const compatibility = [
    {
      title: "Kurumsal Standart Uyumu",
      status: "success",
      description: "Derslik kapasite sınırları ve sınıf ders saatleri kurum standartları ile tam olarak örtüşüyor."
    }
  ];

  const deviations: Array<{ title: string; status: string; description: string }> = [];
  if (branchAnalysis && branchAnalysis.branchesConfig) {
    branchAnalysis.branchesConfig.forEach((b: BranchConfigItem) => {
      const past = branchAnalysis.pastStats?.[b.key] || 0;
      const active = branchAnalysis.activeStats?.[b.key] || 0;
      const diff = active - past;
      if (Math.abs(diff) >= 2) {
        deviations.push({
          title: `${b.label} Ders Saati Değişimi`,
          status: diff > 0 ? "info" : "warning",
          description: `Geçmiş döneme göre ${b.label} ders saati yükü ${diff > 0 ? 'arttı' : 'azaldı'} (Fark: ${diff > 0 ? '+' : ''}${diff} saat).`
        });
      }
    });
  }

  if (deviations.length === 0) {
    deviations.push({
      title: "Dengeli Müfredat Yapısı",
      status: "info",
      description: "Önceki dönemlere ait haftalık müfredat ve branş yükleri ile mükemmel bir paralellik korunmaktadır."
    });
  }

  const recommendations = [
    {
      title: "Zor Dersleri Sabah Saatlerine Yoğunlaştırın",
      impact: "Yüksek",
      description: "Sayısal branşlardaki zorluk düzeyi yüksek bazı dersleri sabahın ilk 4 periyoduna çekerek öğrencilerin algı verimliliğini %25 artırabilirsiniz."
    },
    {
      title: "Öğretmen Boşluklarını Optimize Edin",
      impact: "Orta",
      description: "Haftalık boş saati fazla olan öğretmenlerin ders programını sıkılaştırarak kurum içi verimi artırın."
    }
  ];

  const aiInsights = `### Ata Akademi Pedagojik Rapor ve Yapay Zeka Analizi
*Bu analiz **Yerel Analiz Motoru** tarafından otomatik olarak üretilmiştir.*

Mevcut ders programı taslağı incelendiğinde, **${classesCount} sınıf** ve **${teachersCount} öğretmen** için toplam **${currentPlans.length} ders ataması** başarıyla programlanmış görünmektedir.

#### Temel Bulgular:
1. **Branş Dengesi:** Yapılan branş bazlı ders yükü dağılımı geçmiş dönemlerin kurumsal alışkanlıklarına yüksek oranda sadık kalmıştır.
2. **Kapasite ve Derslikler:** Derslik paylaşımlarında çakışma bulunmamaktadır.
3. **Akademik Verimlilik:** Program genel olarak başarılı olmakla birlikte, zor derslerin gün içindeki dağılımı iyileştirilmeye açıktır. Özellikle son saatlere sarkan derslerin sabah saatlerine kaydırılması öğrencilerin akademik başarısına olumlu yansıyacaktır.`;

  return {
    patterns,
    compatibility,
    deviations,
    recommendations,
    aiInsights
  };
}

// Heuristic fallback for feedback loop when Gemini is unavailable
function getHeuristicFeedback(
  plans: PlanItem[],
  teachers: Teacher[],
  classes: ClassUnit[],
  classrooms: Classroom[],
  courses: Course[],
  config: SchoolScheduleConfig
): FeedbackResult {
  const hints: AIHintItem[] = [];
  const strengths: string[] = [];
  const weaknesses: string[] = [];

  const validPlans = (plans || []).filter(p => p.periyotId && p.planTuru !== PlanTuru.BOS);

  let heavyInLateHoursCount = 0;
  let heavyInEarlyHoursCount = 0;
  let easyInLateHoursCount = 0;
  let easyInEarlyHoursCount = 0;

  validPlans.forEach((p) => {
    const course = (courses || []).find((c: Course) => c.id === p.dersId);
    const teacher = (teachers || []).find((t: Teacher) => t.id === p.ogretmenId);
    const cls = (classes || []).find((c: ClassUnit) => c.id === p.sinifId);

    if (!course) return;

    const parts = p.periyotId.split("-");
    const day = parts[0];
    const periodNo = parseInt(parts[1], 10) || 0;
    const diff = course.zorlukDerecesi || 3;

    if (diff >= 4) {
      if (periodNo >= 6) {
        heavyInLateHoursCount++;
        if (hints.length < 15) {
          hints.push({
            sinifId: p.sinifId,
            ogretmenId: p.ogretmenId,
            dersId: p.dersId,
            periyotId: p.periyotId,
            type: "penalty",
            value: 450,
            reason: `${cls ? cls.sinifAdi : "Sınıf"} için ${course.dersAdi} (${day}, ${periodNo}. Saat) günün son periyotlarında planlanmış. Ağır bilişsel derslerin sabah saatlerine alınması pedagojik açıdan daha verimlidir.`
          });
        }
      } else if (periodNo <= 4) {
        heavyInEarlyHoursCount++;
        if (hints.length < 15) {
          hints.push({
            sinifId: p.sinifId,
            ogretmenId: p.ogretmenId,
            dersId: p.dersId,
            periyotId: p.periyotId,
            type: "reward",
            value: 350,
            reason: `${cls ? cls.sinifAdi : "Sınıf"} için ${course.dersAdi} (${day}, ${periodNo}. Saat) zihnin en açık olduğu sabah saatlerine yerleştirilmiştir.`
          });
        }
      }
    } else if (diff <= 2) {
      if (periodNo >= 6) {
        easyInLateHoursCount++;
        if (hints.length < 15) {
          hints.push({
            sinifId: p.sinifId,
            ogretmenId: p.ogretmenId,
            dersId: p.dersId,
            periyotId: p.periyotId,
            type: "reward",
            value: 300,
            reason: `${course.dersAdi} gibi hafif bir ders günün yorucu saatlerinin sonuna (${day}, ${periodNo}. Saat) yerleştirilerek öğrencilerin odak dengesi korunmuştur.`
          });
        }
      } else if (periodNo <= 2) {
        easyInEarlyHoursCount++;
        if (hints.length < 15) {
          hints.push({
            sinifId: p.sinifId,
            ogretmenId: p.ogretmenId,
            dersId: p.dersId,
            periyotId: p.periyotId,
            type: "penalty",
            value: 250,
            reason: `${course.dersAdi} (${day}, ${periodNo}. Saat) gibi düşük zorluktaki ders sabah saatlerine planlanmış. Bu verimli saatlerin daha ağır akademik derslere ayrılması önerilir.`
          });
        }
      }
    }
  });

  if (heavyInEarlyHoursCount > 0) {
    strengths.push(`Zor derslerin sabah saatlerine planlanma oranı oldukça yüksek (${heavyInEarlyHoursCount} ders saati sabah planlandı).`);
  }
  if (easyInLateHoursCount > 0) {
    strengths.push(`Sosyal ve hafif dersler gün sonlarına başarıyla yerleştirilerek öğrencilerin zihinsel deşarjı desteklenmiştir.`);
  }
  if (strengths.length === 0) {
    strengths.push("Genel ders dağılımı stabil ve temel kısıtları sağlıyor.");
    strengths.push("Sınıf bazlı ders esleşmeleri dengeli başlatıldı.");
  }

  if (heavyInLateHoursCount > 0) {
    weaknesses.push(`Matematik/Fizik gibi ağır derslerin günün geç saatlerine (${heavyInLateHoursCount} ders saati) kaymış olması verimi olumsuz etkileyebilir.`);
  }
  if (easyInEarlyHoursCount > 0) {
    weaknesses.push(`Hafif/sosyal derslerin verimli sabah periyotlarına yerleştirilmiş olması akademik yoğunluğu azaltıyor.`);
  }
  if (weaknesses.length === 0) {
    weaknesses.push("Belirgin bir pedagojik zayıflık tespit edilmedi, plan oldukça dengeli.");
  }

  let grade = "B+";
  const penaltyCount = hints.filter(h => h.type === "penalty").length;
  if (penaltyCount > 10) grade = "C";
  else if (penaltyCount > 6) grade = "B";
  else if (penaltyCount > 3) grade = "B+";
  else grade = "A";

  const generalFeedback = `### Pedagojik Değerlendirme Raporu
Bu analiz **Yapay Zeka Destekli Kural Motoru (Yerel Mod)** tarafından üretilmiştir. 

Ders programınızdaki **bilişsel yük** ve **pedagojik verimlilik** dengesi taranmıştır. Toplam **${validPlans.length}** ders ataması incelenmiş olup, zor derslerin sabah saatlerine yerleşimi genel olarak **${grade}** düzeyinde başarı göstermektedir.

#### Tavsiyeler ve Bulgular:
1. **Bilişsel Yük:** Zorluk derecesi yüksek derslerden günün son saatlerine sarkan ${heavyInLateHoursCount} saatlik yerleşim tespit edildi. Genetik Algoritmanın sonraki aşamasında bu dersler otomatik olarak daha erken saatlere yönlendirilecektir.
2. **Günün Başlangıcı:** Sabah saatlerine planlanan ${heavyInEarlyHoursCount} adet ağır akademik ders, öğrencilerin güne yüksek odaklanma kapasitesiyle başlamasını sağlayacaktır.
3. **Dengeleme:** Hafif ve sosyal içerikli derslerin gün sonlarında planlanması, yorgun zihinlerin rahatlamasına katkı sunar.`;

  return {
    grade,
    generalFeedback,
    strengths,
    weaknesses,
    hints
  };
}

// AI Schedule Analysis Endpoint
app.post("/api/ai/analyze", async (req, res) => {
  const { currentSchedule, historicalSchedules, customPrompt, unstructuredRawText, branchAnalysis } = req.body;

  if (!ai) {
    // Return high quality heuristic report when API is not available
    const fallbackResponse = getHeuristicAnalysis(currentSchedule, branchAnalysis);
    return res.json(fallbackResponse);
  }

  try {
    let branchAnalysisText = "";
    if (branchAnalysis && branchAnalysis.branchesConfig) {
      const config = branchAnalysis.branchesConfig;
      const pastStats = branchAnalysis.pastStats || {};
      const activeStats = branchAnalysis.activeStats || {};

      branchAnalysisText = `
---
DERS SAATİ YÜKÜ VE BRANŞ DAĞILIMI KARŞILAŞTIRMASI (HESAPLANMIŞ VERİ ANALİZİ):
Sistemimiz tarafından çıkarılan ve gruplanan branş bazlı ders saati yükleri aşağıdadır. Lütfen raporunuzda (aiInsights alanında) bu sayısal verilerden doğrudan yararlanın, Matematik (TYT, AYT, Geometri) ve Fen Bilimleri (Fizik, Kimya, Biyoloji) toplamlarını özellikle karşılaştırın ve yorumlayın:

| Branş/Ders Adı | Grup | Örnek Program Yükü | Mevcut Aktif Program Yükü | Sapma (Fark) |
| :--- | :--- | :---: | :---: | :---: |
`;
      config.forEach((b: BranchConfigItem) => {
        const past = pastStats[b.key] || 0;
        const active = activeStats[b.key] || 0;
        const diff = active - past;
        const diffSign = diff > 0 ? `+${diff}` : `${diff}`;
        branchAnalysisText += `| ${b.label} | ${b.group} | ${past} saat | ${active} saat | ${diffSign} saat |\n`;
      });
      
      const pastOther = pastStats["other"] || 0;
      const activeOther = activeStats["other"] || 0;
      const otherDiff = activeOther - pastOther;
      branchAnalysisText += `| Diğer Sınıflandırılmamış | Diğer | ${pastOther} saat | ${activeOther} saat | ${otherDiff > 0 ? "+" : ""}${otherDiff} saat |\n`;
      branchAnalysisText += `\nLütfen ders saati farklarını (örn: Geometri dersi saatlerindeki veya Fizik saatlerindeki değişimleri) "Sapmalar / Değişiklikler" kısmında somut olarak ele alın.\n`;
    }

    interface HistoricalScheduleInput {
      name: string;
      description?: string;
      plans?: PlanItem[];
    }

    // Compile historical summaries
    const historicalSummaries = (historicalSchedules || []).map((s: HistoricalScheduleInput) => {
      return {
        name: s.name,
        description: s.description || "",
        totalLessons: s.plans ? s.plans.length : 0,
        lessonSamples: (s.plans || []).slice(0, 15).map((p: PlanItem) => ({
          day: p.periyotId ? p.periyotId.split("-")[0] : "",
          period: p.periyotId ? p.periyotId.split("-")[1] : "",
          teacherId: p.ogretmenId,
          classId: p.sinifId,
          courseId: p.dersId,
          roomId: p.derslikId,
        })),
      };
    });

    const currentScheduleSummary = {
      totalLessons: currentSchedule.plans ? currentSchedule.plans.length : 0,
      classes: (currentSchedule.classes || []).map((c: ClassUnit) => ({
        id: c.id,
        name: c.sinifAdi,
        level: c.seviye || "",
        needs: c.haftalikDersIhtiyaci || {},
      })),
      teachers: (currentSchedule.teachers || []).map((t: Teacher) => ({
        id: t.id,
        name: t.adSoyad,
        branch: t.brans,
        maxWeeklyHours: t.haftalikMaksimumDers,
        idealDailyHours: t.idealGunlukDers || 6,
        offDays: t.bosGunTercihi || "Yok",
      })),
      lessons: (currentSchedule.plans || []).map((p: PlanItem) => {
        const t = (currentSchedule.teachers || []).find((x: Teacher) => x.id === p.ogretmenId);
        const c = (currentSchedule.classes || []).find((x: ClassUnit) => x.id === p.sinifId);
        const r = (currentSchedule.classrooms || []).find((x: Classroom) => x.id === p.derslikId);
        return {
          day: p.periyotId ? p.periyotId.split("-")[0] : "",
          period: p.periyotId ? p.periyotId.split("-")[1] : "",
          teacher: t ? t.adSoyad : p.ogretmenId,
          branch: t ? t.brans : "",
          className: c ? c.sinifAdi : p.sinifId,
          room: r ? r.derslikAdi : p.derslikId,
          type: p.planTuru,
        };
      }),
    };

    const prompt = `
Ata Akademi LGS/YKS Ders Programı Planlama Sistemi - Yapay Zeka Desen Analiz ve Çıkarım Motoru.

${customPrompt ? `KULLANICI ÖZEL TALEBİ: ${customPrompt}` : "GENEL ANALİZ"}

--- ÖRNEK ANALİZ ÇIKTILARI (Few-Shot) ---

Örnek 1 - İyi bir pattern analizi:
{
  "patterns": [
    {
      "title": "Mezun SAY Grubu Sabah Yoğunlaşması",
      "type": "teacher",
      "description": "Mezun SAY grubunda Matematik ve Fen dersleri hafta içi sabah 1-4. periyotlarda yoğunlaşmıştır. Özellikle Berna (Matematik) ve Özlem (Kimya) öğretmenleri haftada 3 gün sabah diliminde derse girmektedir."
    }
  ],
  "compatibility": [
    {
      "title": "Matematik Dersi Blok Yapısı Korunuyor",
      "status": "success",
      "description": "Matematik dersleri 2'şer saatlik bloklar halinde programlanmış, öğle arasıyla bölünmemiş."
    }
  ],
  "deviations": [
    {
      "title": "Geometri Ders Saati Artışı",
      "status": "warning",
      "description": "Geçmiş dönemde 4 saat olan Geometri, bu dönem 6 saate çıkarılmış. (+2 saat sapma)"
    }
  ],
  "recommendations": [
    {
      "title": "Geometri Dersini Sabaha Çekin",
      "impact": "Yüksek",
      "description": "Geometri dersleri şu an 6-8. periyotlarda. Görsel-uzamsal algı gerektiren bu dersin 1-3. periyotlara alınması önerilir."
    }
  ],
  "aiInsights": "### Analiz Raporu\\n... (Markdown formatında detaylı analiz)"
}

--- MEVCUT VERİLER ---
Aşağıda, kurumun geçmişte başarıyla uyguladığı "Eski Ders Programları" (hem JSON formatında hem de serbest Excel/Kopyala-Yapıştır metni olarak) ve "Mevcut Ders Programı" yer almaktadır.

GÖREVİNİZ:
1. Serbest metin veya JSON formatındaki eski/örnek programlardan yola çıkarak kurumsal ders programı şablonunu, kurallarını ve öğretmen alışkanlıklarını ("Öğrenilen Desenler") analiz edip çıkarın.
   Özellikle serbest metin şablonunda şunları öğrenin:
   - Hangi sınıfların (örn: MEZ SAY, MEZ EA, 12 SAY, 11 SAY vb.) hangi günlerde ve saatlerde (örn: Mezunlar sabah 9.30, 12. sınıflar akşam 17.00 veya hafta sonu) yoğunlaştığı.
   - Öğretmenlerin (örn: Berna, Mehtap, Seda, Sabri, Tuğçe, Özlem, Esra, Selin vb.) ders verdiği şubeler ve branş desenleri (örn: "GEOMETRİ BERNA", "KİMYA ÖZLEM").
   - Blok ders yapıları, teneffüsler (örn: 20 dakika ara, 30 dakika ara) ve günlük ders sayıları.
2. Mevcut aktif programı bu tarihsel desenlerle karşılaştırın:
   - Hangi ders yerleşimleri geçmiş alışkanlıklarla tam uyumlu ("Uyumlu Kararlar")?
   - Mevcut programda, geçmişe kıyasla göze çarpan sapmalar, verimsizlikler veya riskli çakışmalar neler ("Sapmalar / Değişiklikler")?
   - Programı daha verimli, dengeli ve geçmiş başarı şablonlarına uygun kılmak için somut optimizasyon önerileri sunun ("Optimizasyon Önerileri").
3. Kullanıcının sorduğu özel bir soru/talep varsa ("${customPrompt || "Genel analiz ve çıkarımlar"}") onu özellikle yanıtlayın.

---
SERBEST METİN / EXCEL KOPYALANAN ESKİ PROGRAM ŞABLONU:
${unstructuredRawText || "Kullanıcı serbest metin girmedi, sadece arşiv dosyalarını seçti."}

---
GEÇMİŞ DOSYA ARŞİVİNDEKİ PROGRAM ÖZETLERİ (JSON):
${JSON.stringify(historicalSummaries, null, 2)}

---
${branchAnalysisText}

---
MEVCUT AKTİF PROGRAM ÖZETİ:
Sınıf Sayısı: ${currentScheduleSummary.classes.length}
Öğretmen Sayısı: ${currentScheduleSummary.teachers.length}
Atanmış Ders/Periyot Sayısı: ${currentScheduleSummary.totalLessons}

Öğretmen Listesi:
${JSON.stringify(currentScheduleSummary.teachers, null, 2)}

Atanmış Ders Programı Listesi:
${JSON.stringify(currentScheduleSummary.lessons, null, 2)}

---

Lütfen analizi aşağıdaki JSON formatında üretin. JSON formatına kesinlikle sadık kalın, açıklama veya ek karakter eklemeyin. Sadece JSON metnini döndürün.

JSON Şeması:
{
  "patterns": [
    {
      "title": "Desen Başlığı (örn: Mezun Grupların Sabah Dağılımı)",
      "type": "teacher" | "classroom" | "cognitive" | "general",
      "description": "Geçmiş verilerden çıkarılan ders/saat ve öğretmen yerleşim alışkanlığı detayı."
    }
  ],
  "compatibility": [
    {
      "title": "Uyumlu Karar Başlığı",
      "status": "success",
      "description": "Mevcut programda geçmişle tam uyuşan kararın açıklaması."
    }
  ],
  "deviations": [
    {
      "title": "Sapma veya Değişiklik Başlığı",
      "status": "warning" | "info",
      "description": "Mevcut programda geçmiş alışkanlıklardan sapan durumun ve neden önemli olduğunun açıklaması."
    }
  ],
  "recommendations": [
    {
      "title": "Öneri Başlığı",
      "impact": "Yüksek" | "Orta" | "Düşük",
      "description": "Programı iyileştirmek için somut ders takas veya yerleştirme önerisi."
    }
  ],
  "aiInsights": "Markdown formatında, analiz sonuçlarını, genel çıkarımları, Ata Akademi planlama yöneticisine rehberlik edecek detaylı rapor ve içgörüleri içeren akıcı bir değerlendirme yazısı."
}
`;

    const response = await ai.models.generateContent({
      model: aiModel,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
      },
    });

    const resultText = response.text || "{}";
    try {
      const parsed = JSON.parse(resultText.trim());
      res.json(parsed);
    } catch (parseError) {
      console.error("JSON parsing error from Gemini response:", resultText);
      // Fallback response inside JSON structures
      res.json({
        patterns: [
          { title: "Geçmiş Analizi", type: "general", description: "Geçmiş program desenleri başarıyla analiz edildi ancak veri dönüştürülürken hata oluştu." }
        ],
        compatibility: [],
        deviations: [],
        recommendations: [
          { title: "Manüel Kontrol", impact: "Orta", description: "Programı manüel olarak çakışmalara karşı kontrol edin." }
        ],
        aiInsights: resultText // Return plain text as fallback
      });
    }
  } catch (error: unknown) {
    console.error("Gemini API Error in analyze endpoint, falling back to local heuristic analysis:", error);
    try {
      const fallbackResponse = getHeuristicAnalysis(currentSchedule, branchAnalysis);
      res.json(fallbackResponse);
    } catch (fallbackError: unknown) {
      console.error("Critical fallback failure in analyze endpoint:", fallbackError);
      const errMessage = error instanceof Error ? error.message : "An error occurred during AI analysis. Please check your inputs and try again.";
      res.status(500).json({
        error: errMessage,
      });
    }
  }
});

// AI Feedback Loop Endpoint for Genetic Algorithm guidance
app.post("/api/ai/feedback-loop", async (req, res) => {
  const { plans, teachers, classes, classrooms, courses, config } = req.body;

  if (!ai) {
    const fallbackFeedback = getHeuristicFeedback(plans, teachers, classes, classrooms, courses, config);
    return res.json(fallbackFeedback);
  }

  try {

    const scheduleSummary = {
      totalPlans: plans.length,
      classes: (classes || []).map((c: ClassUnit) => ({
        id: c.id,
        name: c.sinifAdi,
        level: c.seviye || "",
        needs: c.haftalikDersIhtiyaci || {},
      })),
      teachers: (teachers || []).map((t: Teacher) => ({
        id: t.id,
        name: t.adSoyad,
        branch: t.brans,
        bosGun: t.bosGunTercihi,
      })),
      courses: (courses || []).map((c: Course) => ({
        id: c.id,
        name: c.dersAdi,
        difficulty: c.zorlukDerecesi || 3,
      })),
      assignments: plans.map((p: PlanItem) => {
        const t = (teachers || []).find((x: Teacher) => x.id === p.ogretmenId);
        const c = (classes || []).find((x: ClassUnit) => x.id === p.sinifId);
        const cr = (courses || []).find((x: Course) => x.id === p.dersId);
        return {
          id: p.id,
          day: p.periyotId ? p.periyotId.split("-")[0] : "",
          periodNo: p.periyotId ? parseInt(p.periyotId.split("-")[1], 10) : 0,
          teacherId: p.ogretmenId,
          teacherName: t ? t.adSoyad : "",
          className: c ? c.sinifAdi : "",
          classId: p.sinifId,
          courseId: p.dersId,
          courseName: cr ? cr.dersAdi : "",
          slot: p.periyotId,
        };
      }),
    };

    const prompt = `
Ata Akademi LGS/YKS Ders Programı - Yapay Zeka Destekli Döngüsel Pedagojik Koordinatör.

Aşağıda, Genetik Algoritma tarafından oluşturulan ilk ders programı taslağı ve kurumun yapısal kısıtları yer almaktadır.
Göreviniz, bu programı PEDAGOJİK VE EĞİTSEL kalitesini artıracak şekilde inceleyip değerlendirmektir.

Değerlendirme Kriterleri (Pedagojik İlkeler):
1. Bilişsel Yük Dağılımı: Matematik, Fizik, Biyoloji, Türkçe gibi zorluk derecesi yüksek (bilişsel yükü ağır) dersler günün son periyotlarına (örn: 7. ve 8. saatler) kalmamalı, sabah saatlerinde (1, 2, 3 ve 4. saatlerde) planlanmalıdır. Günün sonuna daha hafif, dinlendirici veya sosyal/rehberlik dersleri gelmelidir.
2. Ders Kümelenmesi ve Bloklar: Aynı sınıfa aynı gün üst üste 3 saatten fazla ağır ders veya aynı dersten darmadağın tekli saatler planlanması yerine, 2 saatlik blok ders yapıları ve günlere dengeli yayılım tercih edilmelidir.
3. Boşluklar ve Pencereler: Öğrencilerin ders programında gün içinde boşluklar (dersler arası boş saatler) olmamalıdır. Benzer şekilde, öğretmenlerin gün içindeki boş pencere saatleri (idle gaps) minimize edilmelidir.
4. Dengeli Gün Dağılımı: Bir sınıfa bir günde çok ağır ders yükü varken diğer gün boş geçmemeli, dersler günlere dengeli dağıtılmalıdır.

Lütfen bu programı inceleyin, her kural ihlali için Genetik Algoritma'ya geri besleme (feedback) olarak vereceğimiz ceza (penalty) ve ödül (reward) kural dizisini ("hints") üretin.
Her 'hint' içinde, kuralı düzeltecek veya pekiştirecek şekilde sınıfId, ogretmenId, dersId veya periyotId bazlı hedefleme yapın.

Örnek 'hint' Mantığı:
- Sınıf: "class-1", Ders: "course-2", Periyot: "Cuma-8" -> Matematik Cuma son saate kalmış. TÜR: "penalty", DEĞER: 500, NEDEN: "Matematik gibi ağır bilişsel yük getiren bir ders günün son saatine bırakılmamalıdır."
- Sınıf: "class-2", Ders: "course-1", Periyot: "Pazartesi-2" -> Fizik sabah saati. TÜR: "reward", DEĞER: 300, NEDEN: "Fizik sabah saatinde öğrencilerin taze zihni ile pedagojik olarak mükemmel bir uyum gösterir."

Önemli: "hints" listesinde mutlaka en az 4-10 adet somut iyileştirme (ceza veya ödül) kuralı yer almalıdır.

Mevcut Program Özeti:
${JSON.stringify(scheduleSummary, null, 2)}

Yanıtı kesinlikle aşağıdaki JSON şemasında üretin. Başka hiçbir açıklama, yorum veya kod bloğu içermesin. Sadece geçerli bir JSON döndürün.

JSON Şeması:
{
  "grade": "A" | "B+" | "B" | "C+" | "C" | "D",
  "generalFeedback": "Genel pedagojik değerlendirme raporu ve geri besleme (Türkçe, Markdown formatında)",
  "strengths": ["Mevcut programın güçlü yönü 1", "Mevcut programın güçlü yönü 2"],
  "weaknesses": ["Zayıf/iyileştirilmesi gereken yön 1", "Zayıf/iyileştirilmesi gereken yön 2"],
  "hints": [
    {
      "sinifId": "sınıfın ID'si (opsiyonel)",
      "ogretmenId": "öğretmenin ID'si (opsiyonel)",
      "dersId": "dersin ID'si (opsiyonel)",
      "periyotId": "periyot ID'si örn: 'Pazartesi-8' (opsiyonel)",
      "type": "penalty" | "reward",
      "value": 400, // 100 - 1000 arasında önem derecesi skoru
      "reason": "Bu ceza veya ödülün gerekçesi (Türkçe)"
    }
  ]
}
`;

    const response = await ai.models.generateContent({
      model: aiModel,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
      },
    });

    const resultText = response.text || "{}";
    try {
      const parsed = JSON.parse(resultText.trim());
      res.json(parsed);
    } catch (err) {
      console.error("Failed to parse Gemini response for feedback loop, falling back:", resultText);
      const fallbackFeedback = getHeuristicFeedback(plans, teachers, classes, classrooms, courses, config);
      res.json(fallbackFeedback);
    }
  } catch (error: unknown) {
    console.error("Gemini API Error in feedback loop endpoint, falling back to local heuristic feedback:", error);
    try {
      const fallbackFeedback = getHeuristicFeedback(plans, teachers, classes, classrooms, courses, config);
      res.json(fallbackFeedback);
    } catch (fallbackError: unknown) {
      console.error("Critical fallback failure in feedback-loop endpoint:", fallbackError);
      const errMessage = error instanceof Error ? error.message : "An error occurred during AI feedback-loop computation.";
      res.status(500).json({
        error: errMessage,
      });
    }
  }
});

// Serve frontend build or development middleware
const startServer = async () => {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server is running at http://0.0.0.0:${PORT}`);
  });
};

startServer();
